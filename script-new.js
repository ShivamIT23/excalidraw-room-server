(() => {

    // DOM
    const canvas = document.getElementById("board");
    const connStatus = document.getElementById("connStatus");
    const connectBtn = document.getElementById("connectBtn");
    const roomInput = document.getElementById("roomId");
    const nameInput = document.getElementById("name");

    const toolInput = document.getElementById("tool");
    const colorInput = document.getElementById("color");
    const sizeInput = document.getElementById("size");

    const undoBtn = document.getElementById("undo");
    const redoBtn = document.getElementById("redo");
    const clearBtn = document.getElementById("clear");

    const exportPNGBtn = document.getElementById("exportPNG");
    const exportJSONBtn = document.getElementById("exportJSON");
    const importFile = document.getElementById("importFile");

    // State
    let socket = null;

    let strokes = [];                 // Finalized strokes
    let drawingStroke = null;         // Local stroke being drawn
    let remoteLive = {};              // Stroke chunks for others

    let isPointerDown = false;

    const undoStack = [];
    const redoStack = [];

    // =========================================================================================
    // CANVAS INIT
    // =========================================================================================

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);

        redraw();
    }

    setTimeout(resizeCanvas, 50);


    // =========================================================================================
    // DRAW HELPERS
    // =========================================================================================

    function drawStroke(ctx, s) {
        if (!s?.points?.length) return;

        ctx.save();

        if (s.tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "#000";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = s.color;
        }

        ctx.lineWidth = s.size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);

        for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
        }

        ctx.stroke();
        ctx.restore();
    }

    function redraw() {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        strokes.forEach(s => drawStroke(ctx, s));

        if (drawingStroke) drawStroke(ctx, drawingStroke);

        Object.values(remoteLive).forEach(s => drawStroke(ctx, s));
    }


    // =========================================================================================
    // STROKE CREATION (LOCAL)
    // =========================================================================================

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const client = e.touches?.[0] ?? e;
        return {
            x: client.clientX - rect.left,
            y: client.clientY - rect.top,
        };
    }

    function startStroke(pt) {
        const id = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);

        drawingStroke = {
            id,
            tool: toolInput.value,
            color: colorInput.value,
            size: Number(sizeInput.value),
            points: [pt],
            user: { name: nameInput.value }
        };

        // send first chunk + meta
        sendSocketIO("stroke_chunk", {
            strokeId: drawingStroke.id,
            point: pt,
            meta: {
                tool: drawingStroke.tool,
                color: drawingStroke.color,
                size: drawingStroke.size,
                user: drawingStroke.user
            }
        });

        redraw();
    }


    // throttle chunks (40 FPS max)
    let lastTime = 0;

    function moveStroke(pt) {
        if (!drawingStroke) return;

        drawingStroke.points.push(pt);

        const now = performance.now();
        if (now - lastTime > 25) {
            sendSocketIO("stroke_chunk", {
                strokeId: drawingStroke.id,
                point: pt,
                meta: {
                    tool: drawingStroke.tool,
                    color: drawingStroke.color,
                    size: drawingStroke.size,
                    user: drawingStroke.user
                }
            });
            lastTime = now;
        }

        // local draw is ALWAYS instant
        const ctx = canvas.getContext("2d");
        const pts = drawingStroke.points;
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = drawingStroke.size;

        if (drawingStroke.tool === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "#000";
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = drawingStroke.color;
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
    }

    function endStroke() {
        if (!drawingStroke) return;

        strokes.push(drawingStroke);
        undoStack.push({ action: "add", stroke: drawingStroke });

        sendSocketIO("stroke_end", { stroke: drawingStroke });

        delete remoteLive[drawingStroke.id];
        drawingStroke = null;

        redraw();
    }


    // =========================================================================================
    // POINTER EVENTS
    // =========================================================================================

    canvas.addEventListener("mousedown", e => {
        isPointerDown = true;
        startStroke(getPos(e));
    });

    window.addEventListener("mousemove", e => {
        if (isPointerDown) moveStroke(getPos(e));
    });

    window.addEventListener("mouseup", () => {
        if (isPointerDown) endStroke();
        isPointerDown = false;
    });


    // touch
    canvas.addEventListener("touchstart", e => {
        isPointerDown = true;
        startStroke(getPos(e));
        e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchmove", e => {
        if (isPointerDown) moveStroke(getPos(e));
        e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchend", () => {
        if (isPointerDown) endStroke();
        isPointerDown = false;
    });


    // =========================================================================================
    // CLEAR / UNDO / REDO
    // =========================================================================================

    clearBtn.onclick = () => {
        undoStack.push({ action: "clear", snapshot: [...strokes] });
        strokes = [];
        remoteLive = {};
        redraw();

        sendSocketIO("clear", {});
    };

    undoBtn.onclick = () => {
        const op = undoStack.pop();
        if (!op) return;

        if (op.action === "add") {
            strokes = strokes.filter(s => s.id !== op.stroke.id);
        } else if (op.action === "clear") {
            strokes = op.snapshot;
        }

        redoStack.push(op);
        redraw();
    };

    redoBtn.onclick = () => {
        const op = redoStack.pop();
        if (!op) return;

        if (op.action === "add") {
            strokes.push(op.stroke);
        } else if (op.action === "clear") {
            strokes = [];
        }

        undoStack.push(op);
        redraw();
    };


    // =========================================================================================
    // SOCKET.IO
    // =========================================================================================

    function setStatus(t, c = "") {
        connStatus.textContent = t;
        connStatus.style.color = c;
    }

    function sendSocketIO(eventName, payload) {
        if (socket && socket.connected) {
            socket.emit(eventName, {
                roomId: roomInput.value,
                payload: payload
            });
        }
    }

    connectBtn.onclick = () => {
        // Use default URL or get from a config
        let url = "http://localhost:4000";
        
        // Disconnect existing socket if any
        if (socket) {
            socket.disconnect();
        }

        // Create Socket.IO connection
        socket = io(url, {
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity
        });

        // Connection established
        socket.on("connect", () => {
            setStatus("Connected", "green");
            console.log("Socket.IO connected:", socket.id);

            // Join room
            socket.emit("join", {
                roomId: roomInput.value,
                payload: { user: { name: nameInput.value } }
            });
        });

        // Reconnection events
        socket.on("reconnect", (attemptNumber) => {
            setStatus("Reconnected", "green");
            console.log("Reconnected after", attemptNumber, "attempts");
            
            // Rejoin room after reconnection
            socket.emit("join", {
                roomId: roomInput.value,
                payload: { user: { name: nameInput.value } }
            });
        });

        socket.on("reconnect_attempt", (attemptNumber) => {
            setStatus("Reconnecting... (attempt " + attemptNumber + ")", "orange");
        });

        socket.on("reconnect_error", (error) => {
            console.error("Reconnection error:", error);
        });

        socket.on("reconnect_failed", () => {
            setStatus("Reconnection failed", "red");
        });

        // Disconnection
        socket.on("disconnect", (reason) => {
            setStatus("Disconnected (" + reason + ")", "red");
            console.log("Disconnected:", reason);
        });

        // Connection error
        socket.on("connect_error", (error) => {
            setStatus("Connection error", "red");
            console.error("Connection error:", error);
        });

        // Receive stroke chunks (live drawing)
        socket.on("stroke_chunk", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;

            const { strokeId, point, meta } = payload;

            if (!remoteLive[strokeId]) {
                remoteLive[strokeId] = {
                    id: strokeId,
                    tool: meta.tool,
                    color: meta.color,
                    size: meta.size,
                    user: meta.user,
                    points: []
                };
            }

            remoteLive[strokeId].points.push(point);
            redraw();
        });

        // Receive finalized stroke
        socket.on("stroke", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;

            strokes.push(payload.stroke);
            delete remoteLive[payload.stroke.id];
            redraw();
        });

        // Receive snapshot (initial state or import)
        socket.on("snapshot", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;

            strokes = payload.strokes || [];
            remoteLive = {};
            redraw();
        });

        // Receive clear command
        socket.on("clear", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;

            strokes = [];
            remoteLive = {};
            redraw();
        });

        // Receive chat history
        socket.on("chat_history", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;
            console.log("Chat history:", payload);
            // Handle chat history display if needed
        });

        // Receive chat message
        socket.on("chat", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;
            console.log("Chat message:", payload);
            // Handle chat message display if needed
        });

        // Receive typing indicator
        socket.on("typing", ({ roomId, payload }) => {
            if (roomId !== roomInput.value) return;
            console.log("Typing:", payload);
            // Handle typing indicator if needed
        });

        // Receive error
        socket.on("error", ({ message }) => {
            console.error("Server error:", message);
            alert(message);
        });

        // Connect to server
        socket.connect();
    };


    // =========================================================================================

    setStatus("Not connected");

})();
