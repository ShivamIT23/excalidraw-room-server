// /**
//  * COLLABORATIVE WHITEBOARD - WEBSOCKET SERVER
//  * 
//  * This server handles real-time communication between multiple clients
//  * drawing on a shared whiteboard canvas. It uses WebSocket for bidirectional
//  * communication and Express for optional REST API endpoints.
//  */

// // ============================================================================
// // IMPORTS AND DEPENDENCIES
// // ============================================================================

// import express from "express";        // Web framework for REST API
// import http from "http";              // HTTP server to attach WebSocket
// import cors from "cors";              // Enable Cross-Origin Resource Sharing
// import bodyParser from "body-parser"; // Parse JSON request bodies
// import { WebSocketServer } from "ws"; // WebSocket server implementation

// // ============================================================================
// // EXPRESS APP SETUP
// // ============================================================================

// const app = express();
// app.use(cors());                      // Allow requests from any origin
// app.use(bodyParser.json());           // Parse incoming JSON payloads

// // ============================================================================
// // HTTP & WEBSOCKET SERVER SETUP
// // ============================================================================

// // Create HTTP server and attach WebSocket server to it
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

// // ============================================================================
// // ROOM MANAGEMENT DATA STRUCTURE
// // ============================================================================

// /*
//     Room Data Structure:
//     rooms = {
//       "room1": {
//         clients: [ws1, ws2, ...],      // Array of WebSocket connections
//         snapshot: { strokes: [...] }   // Current state of the canvas
//       }
//     }
    
//     - Each room is identified by a unique roomId (string)
//     - clients: Array of active WebSocket connections in this room
//     - snapshot: The latest full canvas state (all strokes)
// */
// const rooms = {};

// /**
//  * Get or create a room by ID
//  * @param {string} roomId - The unique identifier for the room
//  * @returns {Object} Room object with clients array and snapshot
//  */
// function getRoom(roomId) {
//     // If room doesn't exist, create it with empty clients and null snapshot
//     if (!rooms[roomId]) {
//         rooms[roomId] = { clients: [], snapshot: null };
//     }
//     return rooms[roomId];
// }

// /**
//  * Broadcast a message to all clients in a room except the sender
//  * @param {string} roomId - The room to broadcast to
//  * @param {string} message - JSON string message to send
//  * @param {WebSocket} except - WebSocket connection to exclude (usually the sender)
//  */
// function broadcast(roomId, message, except = null) {
//     const room = rooms[roomId];
//     if (!room) return; // Room doesn't exist, nothing to broadcast

//     // Send message to all clients in the room
//     room.clients.forEach((client) => {
//         // Skip the sender and only send to open connections (readyState === 1)
//         if (client !== except && client.readyState === 1) {
//             client.send(message);
//         }
//     });
// }

// // ============================================================================
// // WEBSOCKET CONNECTION HANDLING
// // ============================================================================

// /**
//  * Handle new WebSocket connections
//  * Each client that connects triggers this event
//  */
// wss.on("connection", (ws) => {
//     // Mark connection as alive for heartbeat mechanism
//     ws.isAlive = true;

//     /**
//      * Heartbeat: When client responds to ping with pong, mark as alive
//      * This helps detect and remove dead connections
//      */
//     ws.on("pong", () => (ws.isAlive = true));

//     /**
//      * Handle incoming messages from clients
//      * Messages are expected to be JSON with format:
//      * { type: string, roomId: string, payload: object }
//      */
//     ws.on("message", (raw) => {
//         let msg = null;

//         // Parse incoming JSON message
//         try {
//             msg = JSON.parse(raw);
//         } catch (err) {
//             console.log("Invalid JSON received:", raw);
//             return; // Ignore malformed messages
//         }

//         // Extract message components
//         const { type, roomId, payload } = msg;

//         // ====================================================================
//         // JOIN EVENT - User joins a room
//         // ====================================================================
//         if (type === "join") {
//             // Store room and user info on the WebSocket connection
//             ws.roomId = roomId;
//             ws.user = payload?.user || {};

//             // Get or create the room
//             const room = getRoom(roomId);

//             // Add this client to the room's client list
//             room.clients.push(ws);

//             console.log("User joined:", ws.user?.name, "Room:", roomId);

//             // Send the current canvas state to the new user
//             // This ensures they see what others have already drawn
//             if (room.snapshot) {
//                 ws.send(
//                     JSON.stringify({
//                         type: "snapshot",
//                         roomId,
//                         payload: room.snapshot,
//                     })
//                 );
//             }

//             return; // Done processing join event
//         }

//         // ====================================================================
//         // SECURITY CHECK - Ignore messages from users who haven't joined
//         // ====================================================================
//         if (!ws.roomId) return;

//         // Get the room this user is in
//         const room = getRoom(ws.roomId);

//         // ====================================================================
//         // STROKE EVENT - User drew a new stroke
//         // ====================================================================
//         if (type === "stroke") {
//             // Broadcast the stroke to all other users in the room
//             // Note: We don't store individual strokes in snapshot here
//             // The snapshot is only updated when explicitly set (import/clear)
//             broadcast(ws.roomId, JSON.stringify(msg), ws);
//         }

//         // ====================================================================
//         // CLEAR EVENT - User cleared the canvas
//         // ====================================================================
//         else if (type === "clear") {
//             // Reset the room's snapshot to empty
//             room.snapshot = { strokes: [] };

//             // Tell all other users to clear their canvas
//             broadcast(ws.roomId, JSON.stringify(msg), ws);
//         }

//         // ====================================================================
//         // SNAPSHOT EVENT - Full canvas state update (e.g., JSON import)
//         // ====================================================================
//         else if (type === "snapshot") {
//             // Store the complete canvas state
//             room.snapshot = payload; // payload should be { strokes: [...] }

//             // Broadcast to all other users so they update their canvas
//             broadcast(ws.roomId, JSON.stringify(msg), ws);
//         }
//     });

//     /**
//      * Handle client disconnection
//      * Remove the client from their room when they disconnect
//      */
//     ws.on("close", () => {
//         if (ws.roomId) {
//             const room = rooms[ws.roomId];
//             if (room) {
//                 // Remove this client from the room's client list
//                 room.clients = room.clients.filter((c) => c !== ws);
//             }
//         }
//     });
// });

// // ============================================================================
// // HEARTBEAT MECHANISM - Detect and remove dead connections
// // ============================================================================

// /**
//  * Ping all clients every 30 seconds
//  * If a client doesn't respond (pong), terminate the connection
//  * This prevents accumulation of zombie connections
//  */
// setInterval(() => {
//     wss.clients.forEach((ws) => {
//         // If client didn't respond to last ping, terminate
//         if (!ws.isAlive) return ws.terminate();

//         // Mark as not alive and send ping
//         // If they respond with pong, the pong handler will mark them alive
//         ws.isAlive = false;
//         ws.ping();
//     });
// }, 30000); // Run every 30 seconds

// // ============================================================================
// // REST API ENDPOINTS (Optional)
// // ============================================================================

// /*
//   These endpoints allow external systems to save/load canvas states
//   via HTTP instead of WebSocket
// */

// /**
//  * POST /save/:roomId
//  * Save a canvas snapshot for a specific room
//  * Body should contain the snapshot data (e.g., { strokes: [...] })
//  */
// app.post("/save/:roomId", (req, res) => {
//     const room = getRoom(req.params.roomId);
//     room.snapshot = req.body; // Store the snapshot
//     res.json({ ok: true });
// });

// /**
//  * GET /load/:roomId
//  * Retrieve the saved canvas snapshot for a specific room
//  * Returns 404 if no snapshot exists
//  */
// app.get("/load/:roomId", (req, res) => {
//     const room = rooms[req.params.roomId];

//     // Check if room and snapshot exist
//     if (!room || !room.snapshot)
//         return res.status(404).json({ ok: false, message: "No snapshot" });

//     // Return the snapshot
//     res.json({ ok: true, snapshot: room.snapshot });
// });

// // ============================================================================
// // START THE SERVER
// // ============================================================================

// const PORT = 4000;
// server.listen(PORT, () => console.log("WS Whiteboard Server running on", PORT));

