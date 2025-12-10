window.BoardState = {
    canvas: null,
    ctx: null,
    textInput: null,
    canvasContainer: null,

    // Tools UI
    tools: {
        pen: null,
        text: null,
        eraser: null,
        colorPicker: null,
        brushSize: null
    },

    // State
    currentTool: 'pen',
    isDrawing: false,
    strokes: [],
    drawingStroke: null,
    remoteLive: {},
    lastChunkTime: 0,
    isRemoteScrolling: false,
    scrollTimeout: null,

    // Config
    roomId: window.ROOM_ID || 'tutoring-room-1',
    userName: window.USER_NAME || 'User-guest',
    pages: [],
    currentPageId: null,
    pageStrokes: {},

    // Helper to get mouse/touch position
    getPos: function (e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches && e.touches[0]) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    },

    // Send WebSocket message
    sendWS: function (obj) {
        if (window.WSManager) {
            window.WSManager.send(obj);
        }
    },

    // Redraw the canvas
    redraw: function () {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const s of this.strokes) this.drawStroke(s);
        if (this.drawingStroke) this.drawStroke(this.drawingStroke);

        // Draw in-progress remote strokes
        Object.values(this.remoteLive).forEach(s => this.drawStroke(s));
    },

    // Draw a single stroke
    drawStroke: function (s) {
        if (!s) return;

        // Handle text strokes
        if (s.tool === 'text') {
            this.ctx.save();
            this.ctx.font = (s.size || 16) + 'px Arial';
            this.ctx.textBaseline = 'top';
            this.ctx.fillStyle = s.color || '#000';
            this.ctx.fillText(s.text, s.x, s.y + s.size);
            this.ctx.restore();
            return;
        }

        // Handle pen/eraser strokes
        if (!s.points || s.points.length === 0) return;

        this.ctx.save();
        if (s.tool === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = '#000';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = s.color || '#000';
        }
        this.ctx.lineWidth = s.size || 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        const p0 = s.points[0];
        this.ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < s.points.length; i++) {
            const p = s.points[i];
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }
};
