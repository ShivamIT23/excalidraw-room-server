import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * Room structure:
 * rooms = {
 *   roomId: {
 *     clients: [ws, ...],
 *     snapshot: { strokes: [ {...}, ... ] }
 *   }
 * }
 */
const rooms = {};
const MAX_STROKES = 5000; // cap to avoid unbounded memory growth

function getRoom(roomId) {
    if (!rooms[roomId]) rooms[roomId] = { clients: [], snapshot: { strokes: [] } };
    return rooms[roomId];
}

function broadcast(roomId, message, except = null) {
    const room = rooms[roomId];
    if (!room) return;
    for (const client of room.clients) {
        if (client !== except && client.readyState === 1) client.send(message);
    }
}

function pushStrokeToSnapshot(roomId, stroke) {
    const room = getRoom(roomId);
    room.snapshot = room.snapshot || { strokes: [] };
    room.snapshot.strokes.push(stroke);
    // enforce max strokes
    if (room.snapshot.strokes.length > MAX_STROKES) {
        // drop oldest strokes
        room.snapshot.strokes.splice(0, room.snapshot.strokes.length - MAX_STROKES);
    }
}

wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));

    ws.on("message", (raw) => {
        let msg = null;
        try {
            msg = JSON.parse(raw);
        } catch (err) {
            console.warn("Invalid JSON received:", raw);
            return;
        }

        const { type, roomId, payload } = msg;

        if (type === "join") {
            ws.roomId = roomId;
            ws.user = payload?.user || {};
            const room = getRoom(roomId);
            room.clients.push(ws);

            console.log("User joined:", ws.user?.name || "anon", "room:", roomId);

            // send current snapshot (full canvas) to the joining client
            if (room.snapshot && Array.isArray(room.snapshot.strokes)) {
                ws.send(JSON.stringify({ type: "snapshot", roomId, payload: room.snapshot }));
            }

            return;
        }

        // ignore any non-joined client messages
        if (!ws.roomId) return;

        const room = getRoom(ws.roomId);

        // Live streaming of stroke points while drawing
        // payload: { strokeId, point: {x,y}, meta? }
        if (type === "stroke_chunk") {
            // Broadcast chunks to others so they can render preview in real-time
            // We do NOT store chunks in snapshot until stroke_end arrives
            broadcast(ws.roomId, JSON.stringify({ type: "stroke_chunk", roomId: ws.roomId, payload }), ws);
            return;
        }

        // Final stroke sent as a separate event after streaming (preferred)
        // payload: { stroke: { id, tool, color, size, points: [...] , user } }
        if (type === "stroke_end") {
            // append to snapshot and broadcast finalized stroke
            const stroke = payload?.stroke;
            if (stroke) {
                pushStrokeToSnapshot(ws.roomId, stroke);
                broadcast(ws.roomId, JSON.stringify({ type: "stroke", roomId: ws.roomId, payload: { stroke } }), ws);
            }
            return;
        }

        // Backwards-compatible single-message stroke (legacy)
        if (type === "stroke") {
            const stroke = payload?.stroke;
            if (stroke) {
                pushStrokeToSnapshot(ws.roomId, stroke);
                broadcast(ws.roomId, JSON.stringify({ type: "stroke", roomId: ws.roomId, payload: { stroke } }), ws);
            }
            return;
        }

        // Clear canvas for the room
        if (type === "clear") {
            // reset snapshot
            rooms[ws.roomId].snapshot = { strokes: [] };
            broadcast(ws.roomId, JSON.stringify({ type: "clear", roomId: ws.roomId, payload: {} }), ws);
            return;
        }

        // Full snapshot (e.g., import JSON)
        if (type === "snapshot") {
            // payload should be { strokes: [...] }
            rooms[ws.roomId].snapshot = payload || { strokes: [] };
            // enforce cap
            if (rooms[ws.roomId].snapshot.strokes.length > MAX_STROKES) {
                rooms[ws.roomId].snapshot.strokes = rooms[ws.roomId].snapshot.strokes.slice(-MAX_STROKES);
            }
            broadcast(ws.roomId, JSON.stringify({ type: "snapshot", roomId: ws.roomId, payload: rooms[ws.roomId].snapshot }), ws);
            return;
        }

        // Unknown type - ignore
    });

    ws.on("close", () => {
        if (ws.roomId) {
            const r = rooms[ws.roomId];
            if (r) r.clients = r.clients.filter((c) => c !== ws);
        }
    });
});

// heartbeat to clean dead connections
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// REST endpoints to save/load snapshots
app.post("/save/:roomId", (req, res) => {
    const room = getRoom(req.params.roomId);
    room.snapshot = req.body || { strokes: [] };
    // cap
    if (room.snapshot.strokes.length > MAX_STROKES) {
        room.snapshot.strokes = room.snapshot.strokes.slice(-MAX_STROKES);
    }
    res.json({ ok: true });
});

app.get("/load/:roomId", (req, res) => {
    const room = rooms[req.params.roomId];
    if (!room || !room.snapshot) return res.status(404).json({ ok: false, message: "No snapshot" });
    res.json({ ok: true, snapshot: room.snapshot });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("WS Whiteboard Server running on", PORT));
