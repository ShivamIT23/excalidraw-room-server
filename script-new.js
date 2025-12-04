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
    let ws = null;

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
        sendWS({
            type: "stroke_chunk",
            roomId: roomInput.value,
            payload: {
                strokeId: drawingStroke.id,
                point: pt,
                meta: {
                    tool: drawingStroke.tool,
                    color: drawingStroke.color,
                    size: drawingStroke.size,
                    user: drawingStroke.user
                }
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
            sendWS({
                type: "stroke_chunk",
                roomId: roomInput.value,
                payload: {
                    strokeId: drawingStroke.id,
                    point: pt,
                    meta: {
                        tool: drawingStroke.tool,
                        color: drawingStroke.color,
                        size: drawingStroke.size,
                        user: drawingStroke.user
                    }
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

        sendWS({
            type: "stroke_end",
            roomId: roomInput.value,
            payload: { stroke: drawingStroke }
        });

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

        sendWS({
            type: "clear",
            roomId: roomInput.value,
            payload: {}
        });
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
    // WEBSOCKET
    // =========================================================================================

    function setStatus(t, c = "") {
        connStatus.textContent = t;
        connStatus.style.color = c;
    }

    function sendWS(obj) {
        if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    }

    connectBtn.onclick = () => {
        let url = prompt("WebSocket URL", "ws://localhost:4000");
        if (!url) return;

        ws = new WebSocket(url);

        ws.onopen = () => {
            setStatus("Connected", "green");

            sendWS({
                type: "join",
                roomId: roomInput.value,
                payload: { user: { name: nameInput.value } }
            });
        };

        ws.onmessage = ev => {
            const msg = JSON.parse(ev.data);
            if (msg.roomId !== roomInput.value) return;

            if (msg.type === "stroke_chunk") {
                const { strokeId, point, meta } = msg.payload;

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
            }

            else if (msg.type === "stroke") {
                strokes.push(msg.payload.stroke);
                delete remoteLive[msg.payload.stroke.id];
                redraw();
            }

            else if (msg.type === "snapshot") {
                strokes = msg.payload.strokes;
                remoteLive = {};
                redraw();
            }

            else if (msg.type === "clear") {
                strokes = [];
                remoteLive = {};
                redraw();
            }
        };

        ws.onclose = () => setStatus("Disconnected", "red");
    };


    // =========================================================================================

    setStatus("Not connected");

})();
