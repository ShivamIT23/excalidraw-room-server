import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(bodyParser.json());

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
 *     snapshot: { strokes: [ {...}, ... ] },
 *     chat: [ {...}, ... ]
 *   }
 * }
 */
const rooms = {};
const MAX_CHAT_HISTORY = 10;
const MAX_CHAT_PER_MINUTE = 20;


function getRoom(roomId) {
    if (!rooms[roomId]) rooms[roomId] = { snapshot: { strokes: [] }, chat: [] };
    return rooms[roomId];
}

function pushStrokeToSnapshot(roomId, stroke) {
    const room = getRoom(roomId);
    room.snapshot = room.snapshot || { strokes: [] };
    room.snapshot.strokes.push(stroke);
}

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Handle join event
    socket.on("join", ({ roomId, payload }) => {
        socket.roomId = roomId;
        socket.user = payload?.user || {};
        
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

        console.log("User joined:", socket.user?.name || "anon", "room:", roomId);

        const room = getRoom(roomId);

        // send current snapshot (full canvas) to the joining client
        if (room.snapshot && Array.isArray(room.snapshot.strokes)) {
            socket.emit("snapshot", { roomId, payload: room.snapshot });
        }

        // send chat history
        if (room.chat?.length) {
            socket.emit("chat_history", {
                roomId,
                payload: room.chat
            });
        }
    });

    // Live streaming of stroke points while drawing
    socket.on("stroke_chunk", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
        // Broadcast chunks to others so they can render preview in real-time
        socket.to(socket.roomId).emit("stroke_chunk", { roomId: socket.roomId, payload });
    });

    // Final stroke sent as a separate event after streaming
    socket.on("stroke_end", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
        const stroke = payload?.stroke;
        if (stroke) {
            pushStrokeToSnapshot(socket.roomId, stroke);
            socket.to(socket.roomId).emit("stroke", { roomId: socket.roomId, payload: { stroke } });
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

    // Viewport synchronization
    socket.on("viewport_change", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
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

    // Chat messages
    socket.on("chat", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
        socket.chatRate.count++;
        if (socket.chatRate.count > MAX_CHAT_PER_MINUTE) {
            socket.emit("error", {
                message: "Message limit exceeded. Please wait a minute."
            });
            return;
        }
        
        const messageObj = {
            user: socket.user,
            message: payload.message,
            timestamp: Date.now()
        };

        // save to chat history (keep last 10 only)
        const room = getRoom(socket.roomId);
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

    // Backwards-compatible single-message stroke (legacy)
    socket.on("stroke", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
        const stroke = payload?.stroke;
        if (stroke) {
            pushStrokeToSnapshot(socket.roomId, stroke);
            socket.to(socket.roomId).emit("stroke", { roomId: socket.roomId, payload: { stroke } });
        }
    });

    // Clear canvas for the room
    socket.on("clear", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
        // reset snapshot
        rooms[socket.roomId].snapshot = { strokes: [] };
        // Broadcast to all clients in room including sender
        io.to(socket.roomId).emit("clear", { roomId: socket.roomId, payload: {} });
    });

    // Full snapshot (e.g., import JSON)
    socket.on("snapshot", ({ roomId, payload }) => {
        if (!socket.roomId) return;
        
        // payload should be { strokes: [...] }
        rooms[socket.roomId].snapshot = payload || { strokes: [] };
        socket.to(socket.roomId).emit("snapshot", { roomId: socket.roomId, payload: rooms[socket.roomId].snapshot });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        if (socket.chatRate?.timer) clearInterval(socket.chatRate.timer);
        console.log("Client disconnected:", socket.id);
    });
});

// REST endpoints to save/load snapshots
app.post("/save/:roomId", (req, res) => {
    const room = getRoom(req.params.roomId);
    room.snapshot = req.body || { strokes: [] };
    res.json({ ok: true });
});

app.get("/load/:roomId", (req, res) => {
    const room = rooms[req.params.roomId];
    if (!room || !room.snapshot) return res.status(404).json({ ok: false, message: "No snapshot" });
    res.json({ ok: true, snapshot: room.snapshot });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => console.log("Socket.IO Whiteboard Server running on", PORT));
