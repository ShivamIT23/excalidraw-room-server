// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    const bs = window.BoardState;

    // Initialize elements
    bs.canvas = document.getElementById('whiteboardCanvas');
    bs.ctx = bs.canvas.getContext('2d');
    bs.textInput = document.getElementById('textInput');
    bs.canvasContainer = document.getElementById('canvasContainer');
    
    bs.tools.pen = document.getElementById('penTool');
    bs.tools.text = document.getElementById('textTool');
    bs.tools.eraser = document.getElementById('eraserTool');
    bs.tools.colorPicker = document.getElementById('colorPicker');
    bs.tools.brushSize = document.getElementById('brushSize');
    
    const sizeValue = document.getElementById('sizeValue');
    const clearCanvasBtn = document.getElementById('clearCanvas');
    const wsStatus = document.getElementById('wsStatus');
    const wsStatusText = document.getElementById('wsStatusText');

    // Drawing Logic
    function beginStroke(point) {
        bs.drawingStroke = {
            id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            tool: bs.currentTool,
            color: bs.tools.colorPicker.value,
            size: Number(bs.tools.brushSize.value),
            points: [point],
            user: { name: bs.userName }
        };

        bs.sendWS({
            type: 'stroke_chunk',
            roomId: bs.roomId,
            payload: {
                strokeId: bs.drawingStroke.id,
                point: point,
                meta: {
                    tool: bs.drawingStroke.tool,
                    color: bs.drawingStroke.color,
                    size: bs.drawingStroke.size,
                    user: bs.drawingStroke.user
                }
            }
        });

        bs.redraw();
    }

    function extendStroke(point) {
        if (!bs.drawingStroke) return;
        bs.drawingStroke.points.push(point);

        const now = performance.now();
        if (now - bs.lastChunkTime > 25) {
            bs.sendWS({
                type: 'stroke_chunk',
                roomId: bs.roomId,
                payload: {
                    strokeId: bs.drawingStroke.id,
                    point: point,
                    meta: {
                        tool: bs.drawingStroke.tool,
                        color: bs.drawingStroke.color,
                        size: bs.drawingStroke.size,
                        user: bs.drawingStroke.user
                    }
                }
            });
            bs.lastChunkTime = now;
        }

        // Local instant draw
        const pts = bs.drawingStroke.points;
        if (pts.length > 1) {
            const a = pts[pts.length - 2];
            const b = pts[pts.length - 1];
            bs.ctx.save();
            if (bs.drawingStroke.tool === 'eraser') {
                bs.ctx.globalCompositeOperation = 'destination-out';
            } else {
                bs.ctx.globalCompositeOperation = 'source-over';
            }
            bs.ctx.strokeStyle = bs.drawingStroke.color;
            bs.ctx.lineWidth = bs.drawingStroke.size;
            bs.ctx.lineCap = 'round';
            bs.ctx.lineJoin = 'round';
            bs.ctx.beginPath();
            bs.ctx.moveTo(a.x, a.y);
            bs.ctx.lineTo(b.x, b.y);
            bs.ctx.stroke();
            bs.ctx.restore();
        }
    }

    function endStroke() {
        if (!bs.drawingStroke) return;
        bs.strokes.push(bs.drawingStroke);

        bs.sendWS({
            type: 'stroke_end',
            roomId: bs.roomId,
            payload: {
                stroke: bs.drawingStroke
            }
        });

        delete bs.remoteLive[bs.drawingStroke.id];
        bs.drawingStroke = null;
        bs.redraw();
    }

    // Input Events
    let isPointerDown = false;

    function onPointerDown(e) {
        const pos = bs.getPos(e);
        if (bs.currentTool === 'text') {
            bs.showTextInput(pos);
        } else {
            isPointerDown = true;
            beginStroke(pos);
        }
        e.preventDefault();
    }

    function onPointerMove(e) {
        if (!isPointerDown || bs.currentTool === 'text') return;
        const pos = bs.getPos(e);
        extendStroke(pos);
        e.preventDefault();
    }

    function onPointerUp(e) {
        if (!isPointerDown) return;
        isPointerDown = false;
        endStroke();
        e.preventDefault();
    }

    // Listeners
    bs.tools.pen && bs.tools.pen.addEventListener('click', () => bs.selectPen());
    bs.tools.text && bs.tools.text.addEventListener('click', () => bs.selectText());
    bs.tools.eraser && bs.tools.eraser.addEventListener('click', () => bs.selectEraser());
    
    bs.tools.brushSize && bs.tools.brushSize.addEventListener('input', (e) => {
        if(sizeValue) sizeValue.textContent = e.target.value;
    });

    clearCanvasBtn && clearCanvasBtn.addEventListener('click', () => bs.clearCanvas());

    bs.textInput && bs.textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') bs.addText();
        if (e.key === 'Escape') bs.textInput.classList.add('hidden');
    });

    bs.textInput && bs.textInput.addEventListener('blur', () => {
        setTimeout(() => bs.addText(), 100);
    });

    // Canvas Events
    if (bs.canvas) {
        bs.canvas.addEventListener('mousedown', onPointerDown);
        bs.canvas.addEventListener('mousemove', onPointerMove);
        bs.canvas.addEventListener('mouseup', onPointerUp);
        bs.canvas.addEventListener('mouseleave', onPointerUp);
        bs.canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        bs.canvas.addEventListener('touchmove', onPointerMove, { passive: false });
        bs.canvas.addEventListener('touchend', onPointerUp);
    }
    
    // Resize
    function resizeCanvas() {
        if (!bs.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        bs.canvas.width = 2000 * dpr;
        bs.canvas.height = 3000 * dpr;
        bs.canvas.style.width = '2000px';
        bs.canvas.style.height = '3000px';
        bs.ctx.scale(dpr, dpr);
        bs.redraw();
    }
    window.addEventListener('resize', () => {
        clearTimeout(window._wb_resize_timeout);
        window._wb_resize_timeout = setTimeout(resizeCanvas, 120);
    });
    
    // Scroll
    if (bs.canvasContainer) {
        bs.canvasContainer.addEventListener('scroll', () => {
            if (bs.isRemoteScrolling) return;
            clearTimeout(bs.scrollTimeout);
            bs.scrollTimeout = setTimeout(() => {
                bs.sendWS({
                    type: 'viewport_change',
                    roomId: bs.roomId,
                    payload: {
                        scrollTop: bs.canvasContainer.scrollTop,
                        scrollLeft: bs.canvasContainer.scrollLeft
                    }
                });
            }, 50);
        });
    }

    // WebSocket Handling
    if (!window._boardHandlersRegistered && window.WSManager) {
        window._boardHandlersRegistered = true;
        
        window.WSManager.on('message', (msg) => {
            if (msg.roomId && msg.roomId !== bs.roomId) return;

            if (msg.type === 'stroke_chunk') {
                const { strokeId, point, meta } = msg.payload;
                if (!bs.remoteLive[strokeId]) {
                    bs.remoteLive[strokeId] = {
                        id: strokeId,
                        tool: meta.tool,
                        color: meta.color,
                        size: meta.size,
                        user: meta.user,
                        points: []
                    };
                }
                bs.remoteLive[strokeId].points.push(point);
                bs.redraw();
            } else if (msg.type === 'stroke_end') {
                const stroke = msg.payload.stroke;
                bs.strokes.push(stroke);
                delete bs.remoteLive[stroke.id];
                bs.redraw();
            } else if (msg.type === 'stroke' && msg.payload?.stroke) {
                 bs.strokes.push(msg.payload.stroke);
                 bs.redraw();
            } else if (msg.type === 'clear') {
                bs.strokes = [];
                bs.remoteLive = {};
                bs.redraw();
            } else if (msg.type === 'snapshot') {
                if (msg.payload && Array.isArray(msg.payload.strokes)) {
                    bs.strokes = msg.payload.strokes;
                    bs.redraw();
                }
            } else if (msg.type === 'viewport_change') {
                if (bs.canvasContainer) {
                    bs.isRemoteScrolling = true;
                    bs.canvasContainer.scrollTop = msg.payload.scrollTop;
                    bs.canvasContainer.scrollLeft = msg.payload.scrollLeft;
                    setTimeout(() => { bs.isRemoteScrolling = false; }, 50);
                }
            }
        });

        window.WSManager.on('open', () => {
            if (wsStatus) {
                wsStatus.classList.remove('bg-gray-400', 'bg-red-500');
                wsStatus.classList.add('bg-green-500');
            }
            if (wsStatusText) wsStatusText.textContent = 'Connected';
        });

        window.WSManager.on('close', () => {
             if (wsStatus) {
                wsStatus.classList.remove('bg-green-500');
                wsStatus.classList.add('bg-gray-400');
            }
            if (wsStatusText) wsStatusText.textContent = 'Disconnected';
        });

        window.WSManager.on('error', () => {
             if (wsStatus) {
                wsStatus.classList.remove('bg-green-500', 'bg-gray-400');
                wsStatus.classList.add('bg-red-500');
            }
            if (wsStatusText) wsStatusText.textContent = 'Error';
        });
    }

    // Init call
    setTimeout(() => {
        resizeCanvas();
        if (!window.IS_TEACHER && clearCanvasBtn) {
            clearCanvasBtn.style.display = 'none';
        }
    }, 100);
});
