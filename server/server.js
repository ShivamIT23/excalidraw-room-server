import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configure multer for recording uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Extract roomId from the filename pattern (safer approach)
        // Filename format: {roomId}_{timestamp}_chunk{N}.webm
        let roomId = 'default';
        
        if (file.originalname) {
            // Extract roomId from filename before first underscore
            const match = file.originalname.match(/^([^_]+)_/);
            if (match && match[1]) {
                roomId = match[1];
            }
        }
        
        const dir = path.join(__dirname, 'recordings', roomId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Use original filename from client
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
}

app.get("/", (req, res) => {
    res.send("Hello from tutorarc.com Node app\n");
});

// Upload endpoint for recording chunks
app.post("/upload-recording-chunk", upload.single('chunk'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ ok: false, message: 'No file uploaded' });
    }
    console.log(`Recording chunk uploaded: ${req.file.filename} to room: ${path.basename(path.dirname(req.file.path))}`);
    res.json({ ok: true, path: req.file.path, filename: req.file.filename });
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

const wait = (ms) => new Promise(res => setTimeout(res, ms));

function ensureRoom(roomId) {
    if (!rooms[roomId]) {
        rooms[roomId] = { 
            teacherId: null, 
            pages: [], 
            currentPageId: null, 
            chat: [], 
            isChatEnabled: true,
            recordingState: {
                isRecording: false,
                startTime: null,
                chunkCount: 0
            }
        };
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

/**
 * Merge all recording chunks for a room into a single MP4 file
 * @param {string} roomId - The room ID
 */
async function mergeRecordingChunks(roomId) {
    const recordingDir = path.join(__dirname, 'recordings', roomId);
    
    // Check if recording directory exists
    if (!fs.existsSync(recordingDir)) {
        console.log(`[Merge] No recording directory for room: ${roomId}`);
        return;
    }

    // Get all chunk files (*.webm) and filter out corrupted ones
    const allFiles = fs.readdirSync(recordingDir)
        .filter(file => file.endsWith('.webm'))
        .sort(); // Sort to ensure correct order

    if (allFiles.length === 0) {
        console.log(`[Merge] No chunks found for room: ${roomId}`);
        return;
    }

    // Validate chunks - filter out corrupted/incomplete files
    // A valid WebM file should be at least a few KB (minimum viable chunk)
    const MIN_CHUNK_SIZE = 1024; // 1KB minimum
    const validFiles = [];
    const corruptedFiles = [];

    for (const file of allFiles) {
        const filePath = path.join(recordingDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (stats.size >= MIN_CHUNK_SIZE) {
                validFiles.push(file);
            } else {
                console.log(`[Merge] Skipping corrupted/incomplete chunk: ${file} (size: ${stats.size} bytes)`);
                corruptedFiles.push(file);
            }
        } catch (err) {
            console.error(`[Merge] Error checking file ${file}:`, err.message);
            corruptedFiles.push(file);
        }
    }

    const files = validFiles;

    if (files.length === 0) {
        console.log(`[Merge] No valid chunks found for room: ${roomId} (all ${allFiles.length} chunks were corrupted)`);
        return;
    }

    console.log(`[Merge] Found ${files.length} valid chunks for room: ${roomId} (${corruptedFiles.length} corrupted skipped)`);
    console.log(`[Merge] Valid chunks:`, files);
    if (corruptedFiles.length > 0) {
        console.log(`[Merge] Skipped corrupted:`, corruptedFiles);
    }

    // Generate output filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputFilename = `${roomId}_${timestamp}_merged.mp4`;
    const outputPath = path.join(recordingDir, outputFilename);

    // Create a concat list file for ffmpeg with ABSOLUTE paths
    const concatListPath = path.join(recordingDir, 'concat_list.txt');
    // Use absolute paths for each file
    const concatContent = files.map(file => {
        const absolutePath = path.join(recordingDir, file);
        // Escape single quotes in path for ffmpeg
        const escapedPath = absolutePath.replace(/'/g, "'\\''");
        return `file '${escapedPath}'`;
    }).join('\n');
    
    fs.writeFileSync(concatListPath, concatContent);
    console.log(`[Merge] Concat list created with ${files.length} valid files`);

    console.log(`[Merge] Starting merge to: ${outputFilename}`);

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatListPath)
            .inputOptions(['-f concat', '-safe 0'])
            .outputOptions([
                '-c:v libx264',      // H.264 codec for video
                '-preset fast',       // Encoding speed
                '-crf 22',            // Quality (lower = better, 18-28 is good range)
                '-c:a aac',           // AAC codec for audio
                '-b:a 128k',          // Audio bitrate
                '-movflags +faststart' // Enable streaming
            ])
            .output(outputPath)
            .on('start', (commandLine) => {
                console.log(`[Merge] FFmpeg command: ${commandLine}`);
            })
            .on('stderr', (stderrLine) => {
                // Log ffmpeg output for debugging
                console.log(`[Merge] FFmpeg: ${stderrLine}`);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`[Merge] Progress: ${Math.round(progress.percent)}%`);
                } else if (progress.timemark) {
                    console.log(`[Merge] Processing: ${progress.timemark}`);
                }
            })
            .on('end', () => {
                console.log(`[Merge] ✓ Merge completed: ${outputFilename}`);
                
                // Get final file size
                try {
                    const stats = fs.statSync(outputPath);
                    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                    console.log(`[Merge] Output file size: ${sizeMB} MB`);
                } catch (err) {
                    // Ignore stat errors
                }
                
                // Delete concat list file
                try {
                    fs.unlinkSync(concatListPath);
                } catch (err) {
                    console.error(`[Merge] Failed to delete concat list:`, err.message);
                }

                // Optional: Delete individual chunk files after successful merge
                // Uncomment if you want to clean up chunks automatically
                /*
                files.forEach(file => {
                    try {
                        fs.unlinkSync(path.join(recordingDir, file));
                        console.log(`[Merge] Deleted chunk: ${file}`);
                    } catch (err) {
                        console.error(`[Merge] Failed to delete chunk ${file}:`, err.message);
                    }
                });
                */

                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(`[Merge] ✗ FFmpeg error:`, err.message);
                console.error(`[Merge] Full error:`, err);
                
                // Delete concat list file
                try {
                    fs.unlinkSync(concatListPath);
                } catch (cleanupErr) {
                    // Ignore cleanup errors
                }
                
                reject(err);
            })
            .run();
    });
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

    // Background color synchronization
    socket.on("background_change", ({ roomId, payload }) => {
        if (!socket.roomId) return;

        // Broadcast background color change to all users in the room
        socket.to(socket.roomId).emit("background_change", {
            roomId: socket.roomId,
            payload: {
                backgroundColor: payload.backgroundColor
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
            timestamp: payload.timestamp
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

            // If room is now empty, merge recording chunks
            if (roomSize === 0) {
                console.log(`Room ${socket.roomId} is now empty, triggering chunk merge...`);
                mergeRecordingChunks(socket.roomId);
            }
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
