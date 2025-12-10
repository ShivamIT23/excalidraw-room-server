import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.send("Hello from tutorarc.com Node app\n");
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

/**
 * Room structure:
 * rooms = {
 *   roomId: {
 *     teacherId: '<socket.id>',
 *     pages: [{ id: 'page-1', strokes: [] }, ...],
 *     currentPageId: 'page-1',
 *     chat: [ {...}, ... ],
 *     isChatEnabled: true
 *   }
 * }
 */
const rooms = {};
const MAX_CHAT_HISTORY = 10;
const MAX_CHAT_PER_MINUTE = 20;

function ensureRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = { teacherId: null, pages: [], currentPageId: null, chat: [], isChatEnabled: true };
    }
    const room = rooms[roomId];
    if (!room.pages || room.pages.length === 0) {
        const page = { id: "page-1", strokes: [] };
        room.pages = [page];
        room.currentPageId = page.id;
    }
    if (!room.currentPageId) {
        room.currentPageId = room.pages[0].id;
    }
    return room;
}

function getRoom(roomId) {
    return ensureRoom(roomId);
}

function getPage(roomId, pageId) {
    const room = ensureRoom(roomId);
    let page = room.pages.find(p => p.id === pageId);
    if (!page) {
        page = { id: pageId || `page-${room.pages.length + 1}`, strokes: [] };
        room.pages.push(page);
    }
    if (!room.currentPageId) room.currentPageId = page.id;
    return page;
}

function pushStrokeToPage(roomId, pageId, stroke) {
    const room = ensureRoom(roomId);
    const page = getPage(roomId, pageId || room.currentPageId);
    page.strokes.push(stroke);
}

function broadcastPageState(roomId) {
    const room = ensureRoom(roomId);
    io.to(roomId).emit("page_state", {
        roomId,
        payload: {
            pages: room.pages.map(p => ({ id: p.id })),
            currentPageId: room.currentPageId
        }
    });
}

function isTeacherSocket(socket) {
    if (!socket?.roomId) return false;
    const room = rooms[socket.roomId];
    if (!room) return false;
    return room.teacherId === socket.id;
}

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle join event
    socket.on("join", ({ roomId, payload }) => {
        socket.roomId = roomId;
        // TRUST THE CLIENT PAYLOAD FOR NOW regarding isTeacher
        socket.user = payload?.user || {};
        if (!socket.user.id) socket.user.id = socket.id;
        // Ensure isTeacher is boolean if present
        if (socket.user.isTeacher === 'true') socket.user.isTeacher = true;
        if (socket.user.isTeacher === 'false') socket.user.isTeacher = false;

        const room = getRoom(roomId);
        if (socket.user.isTeacher) {
            room.teacherId = socket.id;
        }

        // Join the Socket.IO room
        socket.join(roomId);

        // Initialize chat rate limiting
        socket.chatRate = {
            count: 0,
            timer: null
        };

        socket.chatRate.timer = setInterval(() => {
            socket.chatRate.count = 0;
        }, 60000);

        console.log("User joined:", socket.user?.name || "anon", "isTeacher:", socket.user?.isTeacher, "room:", roomId);

        // Broadcast user_join to others
        socket.to(roomId).emit("user_join", {
            roomId,
            payload: { user: socket.user }
        });

        // Broadcast room_users count to EVERYONE (including self)
        const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
        io.to(roomId).emit("room_users", {
            roomId,
            payload: { count: roomSize }
        });

        // Send available pages and current page
        socket.emit("page_state", {
            roomId,
            payload: {
                pages: room.pages.map(p => ({ id: p.id })),
                currentPageId: room.currentPageId
            }
        });

        // send current snapshot (full canvas) to the joining client for the active page
        const currentPage = getPage(roomId, room.currentPageId);
        socket.emit("snapshot", {
            roomId,
            payload: { pageId: currentPage.id, strokes: currentPage.strokes }
        });

        // send chat history
        if (room.chat && room.chat.length > 0) {
            socket.emit("chat_history", {
                roomId,
                payload: room.chat
            });
        }

        // send current chat state
        socket.emit("chat_state", {
            roomId,
            payload: { enabled: room.isChatEnabled !== false } // Default true
        });
    });

    // Live streaming of stroke points while drawing
    socket.on("stroke_chunk", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        const room = getRoom(socket.roomId);
        const pageId = payload?.pageId || room.currentPageId;

        // Broadcast chunks to others so they can render preview in real-time
        socket.to(socket.roomId).emit("stroke_chunk", { roomId: socket.roomId, payload: { ...payload, pageId } });
    });

    // Final stroke sent as a separate event after streaming
    socket.on("stroke_end", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        const room = getRoom(socket.roomId);
        const stroke = payload?.stroke;
        const pageId = payload?.pageId || room.currentPageId;

        if (stroke) {
            pushStrokeToPage(socket.roomId, pageId, stroke);
            socket.to(socket.roomId).emit("stroke", { roomId: socket.roomId, payload: { stroke, pageId } });
        }
    });

    // Typing indicator
    socket.on("typing", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        socket.to(socket.roomId).emit("typing", {
            roomId: socket.roomId,
            payload: {
                user: socket.user,
                isTyping: payload.isTyping
            }
        });
    });

    // Viewport synchronization - TEACHER ONLY
    socket.on("viewport_change", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        // Only teacher can control viewport
        if (!isTeacherSocket(socket)) {
            return;
        }

        socket.to(socket.roomId).emit("viewport_change", {
            roomId: socket.roomId,
            payload: {
                user: socket.user,
                scrollTop: payload.scrollTop,
                scrollLeft: payload.scrollLeft
            }
        });
    });

    // Layout synchronization
    socket.on("layout_change", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        // Broadcast to everyone in the room (including sender if needed, but usually sender updates locally)
        // Using socket.to() excludes sender, which is fine since sender initiates it.
        // If we want to enforce server-source-of-truth, we'd use io.to() and not update locally until confirmed.
        // For responsiveness, local update + broadcast is better.
        socket.to(socket.roomId).emit("layout_change", {
            roomId: socket.roomId,
            payload: {
                layout: payload.layout // 'default' or 'swapped'
            }
        });
    });

    // Canvas page management - TEACHER ONLY
    socket.on("page_add", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        if (!isTeacherSocket(socket)) return;

        const room = getRoom(socket.roomId);
        const newPage = { id: `page-${room.pages.length + 1}`, strokes: [] };
        room.pages.push(newPage);
        room.currentPageId = newPage.id;

        broadcastPageState(socket.roomId);
        io.to(socket.roomId).emit("snapshot", {
            roomId: socket.roomId,
            payload: { pageId: newPage.id, strokes: newPage.strokes }
        });
    });

    socket.on("page_set", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        if (!isTeacherSocket(socket)) return;

        const targetPageId = payload?.pageId;
        if (!targetPageId) return;

        const room = getRoom(socket.roomId);
        const page = getPage(socket.roomId, targetPageId);
        room.currentPageId = page.id;

        broadcastPageState(socket.roomId);
        io.to(socket.roomId).emit("snapshot", {
            roomId: socket.roomId,
            payload: { pageId: page.id, strokes: page.strokes }
        });
    });

    // Chat messages
    socket.on("chat", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        const room = getRoom(socket.roomId);

        if (!room.isChatEnabled) return;

        socket.chatRate.count++;
        if (socket.chatRate.count > MAX_CHAT_PER_MINUTE) {
            socket.emit("error", {
                message: "Message limit exceeded. Please wait a minute."
            });
            return;
        }

        const messageObj = {
            id: payload.id, // Pass ID from client or generate one
            user: socket.user,
            message: payload.message,
            timestamp: Date.now()
        };
        // Ensure ID
        if (!messageObj.id) messageObj.id = 'msg_' + Date.now() + Math.random().toString(36).substr(2, 5);

        // save to chat history (keep last 10 only)
        // room is already defined above
        room.chat.push(messageObj);
        if (room.chat.length > MAX_CHAT_HISTORY) {
            room.chat.splice(0, room.chat.length - MAX_CHAT_HISTORY);
        }

        // broadcast to others (including sender for confirmation)
        io.to(socket.roomId).emit("chat", {
            roomId: socket.roomId,
            payload: messageObj
        });
    });

    // Chat delete - TEACHER ONLY
    socket.on("chat_delete", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        if (!isTeacherSocket(socket)) return;

        const msgId = payload.id;
        if (!msgId) return;

        const room = getRoom(roomId);
        // Remove from history
        room.chat = room.chat.filter(m => m.id !== msgId);

        // Broadcast delete
        io.to(roomId).emit("chat_delete", {
            roomId,
            payload: { id: msgId }
        });
    });

    // Chat clear - TEACHER ONLY
    socket.on("chat_clear", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        if (!isTeacherSocket(socket)) return;

        const room = getRoom(roomId);
        // Clear history
        room.chat = [];

        console.log(roomId);

        // Broadcast clear
        io.to(roomId).emit("chat_clear", {
            roomId,
            payload: {}
        });
    });

    // Chat Toggle - TEACHER ONLY
    socket.on("chat_toggle", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        if (!isTeacherSocket(socket)) return;

        const room = getRoom(roomId);
        room.isChatEnabled = payload.enabled;

        io.to(roomId).emit("chat_state", {
            roomId,
            payload: { enabled: room.isChatEnabled }
        });
    });

    // Backwards-compatible single-message stroke (legacy)
    socket.on("stroke", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        const room = getRoom(socket.roomId);
        const stroke = payload?.stroke;
        const pageId = payload?.pageId || room.currentPageId;

        if (stroke) {
            pushStrokeToPage(socket.roomId, pageId, stroke);
            socket.to(socket.roomId).emit("stroke", { roomId: socket.roomId, payload: { stroke, pageId } });
        }
    });

    // Clear canvas for the room - TEACHER ONLY
    socket.on("clear", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        if (!isTeacherSocket(socket)) return;

        const room = getRoom(socket.roomId);
        const pageId = payload?.pageId || room.currentPageId;
        const page = getPage(socket.roomId, pageId);
        page.strokes = [];

        // Broadcast to all clients in room including sender
        io.to(socket.roomId).emit("clear", { roomId: socket.roomId, payload: { pageId } });
    });

    // Full snapshot (e.g., import JSON)
    socket.on("snapshot", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        if (!isTeacherSocket(socket)) return;

        const room = getRoom(socket.roomId);
        const pageId = payload?.pageId || room.currentPageId;
        const page = getPage(socket.roomId, pageId);

        // payload should be { strokes: [...] }
        page.strokes = payload?.strokes || [];
        socket.to(socket.roomId).emit("snapshot", { roomId: socket.roomId, payload: { pageId: page.id, strokes: page.strokes } });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        if (socket.chatRate?.timer) clearInterval(socket.chatRate.timer);
        console.log("Client disconnected:", socket.id);

        if (socket.roomId) {
            const roomSize = io.sockets.adapter.rooms.get(socket.roomId)?.size || 0;
            io.to(socket.roomId).emit("room_users", {
                roomId: socket.roomId,
                payload: { count: roomSize }
            });
        }
    });
});

// REST endpoints to save/load snapshots
app.post("/save/:roomId", (req, res) => {
    const room = getRoom(req.params.roomId);
    const body = req.body || {};
    const targetPageId = body.pageId || room.currentPageId;
    const page = getPage(req.params.roomId, targetPageId);

    page.strokes = body.strokes || body.snapshot?.strokes || [];
    room.currentPageId = page.id;

    res.json({ ok: true, pageId: page.id });
});

app.get("/load/:roomId", (req, res) => {
    const room = rooms[req.params.roomId];
    if (!room || !room.pages || room.pages.length === 0) return res.status(404).json({ ok: false, message: "No snapshot" });
    const currentPage = getPage(req.params.roomId, room.currentPageId);
    res.json({ ok: true, snapshot: { pageId: currentPage.id, strokes: currentPage.strokes } });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, '127.0.0.1', () => console.log("Socket.IO Whiteboard Server running on", PORT));
