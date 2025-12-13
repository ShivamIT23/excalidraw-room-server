window.BoardState = {
    fabricCanvas: null, // Fabric.js canvas instance

    // Tools UI references
    tools: {
        pen: null,
        text: null,
        eraser: null,
        hand: null,
        arrow: null,
        colorPicker: null,
        brushSize: null
    },

    // State
    currentTool: 'pen',
    isDrawing: false,
    // We will use Fabric's internal state for objects, but we can keep a reference if needed.
    // However, Fabric manages objects. We might need to track selection or something.

    // Config
    roomId: window.ROOM_ID || 'tutoring-room-1',
    userName: window.USER_NAME || 'User-guest',
    pages: [],
    currentPageId: null,
    backgroundColor: '#000000', // Default background color

    // For storing page state (Fabric JSON objects)
    pageStrokes: {},

    // Helper to get mouse/touch position (Fabric generic helper, though fabric events provide pointer)
    getPos: function (e) {
        // Fabric provides pointer in events, this might not be needed often
        if (!this.fabricCanvas) return { x: 0, y: 0 };
        return this.fabricCanvas.getPointer(e);
    },

    // Send WebSocket message
    sendWS: function (obj) {
        if (window.WSManager) {
            window.WSManager.send(obj);
        }
    },

    // Helper to reset tool button styles
    resetToolStyles: function () {
        const tools = this.tools;
        ['pen', 'text', 'eraser', 'hand', 'arrow'].forEach(toolName => {
            const btn = tools[toolName];
            if (btn) {
                btn.classList.remove('active', 'bg-gray-500', 'text-white');
                btn.classList.add('bg-transparent', 'text-black');
            }
        });
    }
};
