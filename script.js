/**
 * COLLABORATIVE WHITEBOARD - CLIENT-SIDE JAVASCRIPT
 * 
 * This script handles all client-side functionality for the collaborative whiteboard:
 * - Canvas drawing and rendering
 * - WebSocket communication with the server
 * - User input handling (mouse and touch)
 * - Undo/redo functionality
 * - Export/import features
 * 
 * Stroke Data Structure:
 * {
 *   id: "s_timestamp_random",  // Unique identifier
 *   tool: "pen" | "eraser",    // Drawing tool type
 *   color: "#000000",          // Hex color code (for pen)
 *   size: 3,                   // Brush/eraser size in pixels
 *   points: [{x, y}, ...],     // Array of coordinate points
 *   user: { name: "username" } // User who created the stroke
 * }
 */

// ============================================================================
// INITIALIZATION - Wrap everything in IIFE to avoid global scope pollution
// ============================================================================

(() => {
    // ==========================================================================
    // DOM ELEMENT REFERENCES
    // ==========================================================================

    // Canvas and status elements
    const canvas = document.getElementById('board');           // The drawing canvas
    const connStatus = document.getElementById('connStatus'); // Connection status text

    // Connection controls
    const connectBtn = document.getElementById('connectBtn'); // Connect to WebSocket button
    const roomInput = document.getElementById('roomId');      // Room ID input field
    const nameInput = document.getElementById('name');        // User name input field

    // Drawing tool controls
    const toolInput = document.getElementById('tool');        // Tool selector (pen/eraser)
    const colorInput = document.getElementById('color');      // Color picker
    const sizeInput = document.getElementById('size');        // Size slider

    // Action buttons
    const undoBtn = document.getElementById('undo');          // Undo button
    const redoBtn = document.getElementById('redo');          // Redo button
    const clearBtn = document.getElementById('clear');        // Clear canvas button
    const exportPNGBtn = document.getElementById('exportPNG'); // Export as PNG button
    const exportJSONBtn = document.getElementById('exportJSON'); // Export as JSON button
    const importFile = document.getElementById('importFile'); // Import JSON file input

    // ==========================================================================
    // INITIALIZE RANDOM USERNAME
    // ==========================================================================

    // Generate a random username (e.g., "user-123") when page loads
    nameInput.value = 'user-' + Math.floor(Math.random() * 1000);

    // ==========================================================================
    // APPLICATION STATE
    // ==========================================================================

    let strokes = [];               // Array of all committed strokes on the canvas
    let drawingStroke = null;       // The stroke currently being drawn (null when not drawing)
    const undoStack = [];           // Stack of actions that can be undone
    const redoStack = [];           // Stack of actions that can be redone

    // ==========================================================================
    // WEBSOCKET CONNECTION
    // ==========================================================================

    let ws = null;                  // WebSocket connection object

    // ==========================================================================
    // CANVAS SETUP & HIGH-DPI SUPPORT
    // ==========================================================================

    /**
     * Resize the canvas to fill its container and handle high-DPI displays
     * This ensures crisp rendering on retina displays
     */
    function resizeCanvas() {
        // Get the actual display size of the canvas element
        const rect = canvas.getBoundingClientRect();

        // Get device pixel ratio (2 for retina displays, 1 for standard)
        const dpr = window.devicePixelRatio || 1;

        // Set internal canvas resolution (accounting for DPR)
        canvas.width = Math.max(300, rect.width * dpr);
        canvas.height = Math.max(150, rect.height * dpr);

        // Set CSS display size (what user sees)
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        // Scale the drawing context to match DPR
        // This allows us to draw in CSS pixels while rendering at device resolution
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Redraw all strokes after resize
        redraw();
    }

    // ==========================================================================
    // COORDINATE CONVERSION
    // ==========================================================================

    /**
     * Convert mouse/touch event coordinates to canvas coordinates
     * @param {MouseEvent|TouchEvent} e - The input event
     * @returns {{x: number, y: number}} Canvas coordinates
     */
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();

        // Handle touch events
        if (e.touches && e.touches[0]) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        // Handle mouse events
        else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    }

    // ==========================================================================
    // CANVAS RENDERING
    // ==========================================================================

    /**
     * Redraw the entire canvas from scratch
     * Renders all committed strokes and the current drawing stroke
     */
    function redraw() {
        const ctx = canvas.getContext('2d');

        // Clear the entire canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all committed strokes
        // Note: We scaled the context in resizeCanvas, so we draw in CSS pixels
        for (const s of strokes) drawStroke(ctx, s);

        // Draw the stroke currently being drawn (if any)
        if (drawingStroke) drawStroke(ctx, drawingStroke);
    }

    /**
     * Draw a single stroke on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
     * @param {Object} s - Stroke object with tool, color, size, and points
     */
    function drawStroke(ctx, s) {
        // Validate stroke has points
        if (!s || !s.points || s.points.length === 0) return;

        // Save current context state
        ctx.save();

        // Configure drawing based on tool type
        if (s.tool === 'eraser') {
            // Eraser removes pixels by using destination-out composite mode
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = '#000'; // Color doesn't matter for eraser
        } else {
            // Pen draws normally
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = s.color || '#000';
        }

        // Set stroke properties
        ctx.lineWidth = s.size || 3;
        ctx.lineCap = 'round';    // Rounded ends for smooth appearance
        ctx.lineJoin = 'round';   // Rounded corners for smooth curves

        // Draw the path
        ctx.beginPath();
        const p0 = s.points[0];
        ctx.moveTo(p0.x, p0.y);   // Start at first point

        // Draw lines to all subsequent points
        for (let i = 1; i < s.points.length; i++) {
            const p = s.points[i];
            ctx.lineTo(p.x, p.y);
        }

        ctx.stroke();             // Actually render the stroke
        ctx.restore();            // Restore context state
    }

    // ==========================================================================
    // STROKE CREATION & MANAGEMENT
    // ==========================================================================

    /**
     * Begin a new stroke at the given point
     * @param {{x: number, y: number}} point - Starting point
     */
    function beginStroke(point) {
        // Create a new stroke object with current tool settings
        drawingStroke = {
            // Generate unique ID using timestamp and random string
            id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            tool: toolInput.value,           // Current tool (pen/eraser)
            color: colorInput.value,         // Current color
            size: Number(sizeInput.value),   // Current size
            points: [point],                 // Start with one point
            user: { name: nameInput.value || 'anon' } // User info
        };

        // Redraw to show the first point
        redraw();
    }

    /**
     * Add a point to the current stroke
     * @param {{x: number, y: number}} point - New point to add
     */
    function extendStroke(point) {
        if (!drawingStroke) return; // No stroke in progress

        // Add point to the stroke
        drawingStroke.points.push(point);

        // Performance optimization: Only draw the new segment instead of redrawing everything
        const ctx = canvas.getContext('2d');
        const pts = drawingStroke.points;

        if (pts.length > 1) {
            // Get the last two points
            const a = pts[pts.length - 2], b = pts[pts.length - 1];

            // Draw just the new segment
            ctx.save();
            if (drawingStroke.tool === 'eraser')
                ctx.globalCompositeOperation = 'destination-out';
            else
                ctx.globalCompositeOperation = 'source-over';

            ctx.strokeStyle = drawingStroke.color;
            ctx.lineWidth = drawingStroke.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
        }
    }

    /**
     * Finish the current stroke and commit it
     * Sends the stroke to the server for other users to see
     */
    function endStroke() {
        if (!drawingStroke) return; // No stroke in progress

        // Add stroke to committed strokes
        strokes.push(drawingStroke);

        // Add to undo stack
        undoStack.push({ action: 'add', stroke: drawingStroke });

        // Clear redo stack (new action invalidates redo history)
        redoStack.length = 0;

        // Broadcast stroke to other users via WebSocket
        sendWS({
            type: 'stroke',
            roomId: roomInput.value,
            payload: { stroke: drawingStroke }
        });

        // Clear the drawing stroke
        drawingStroke = null;

        // Redraw canvas
        redraw();
    }

    // ==========================================================================
    // POINTER/TOUCH EVENT HANDLERS
    // ==========================================================================

    let isPointerDown = false; // Track if user is currently drawing

    /**
     * Handle pointer/touch down event - start drawing
     */
    function onPointerDown(e) {
        isPointerDown = true;
        const p = getPos(e);
        beginStroke(p);
        e.preventDefault(); // Prevent scrolling on touch devices
    }

    /**
     * Handle pointer/touch move event - continue drawing
     */
    function onPointerMove(e) {
        if (!isPointerDown) return; // Only draw if pointer is down
        const p = getPos(e);
        extendStroke(p);
        e.preventDefault(); // Prevent scrolling on touch devices
    }

    /**
     * Handle pointer/touch up event - finish drawing
     */
    function onPointerUp(e) {
        if (!isPointerDown) return;
        isPointerDown = false;
        endStroke();
        e.preventDefault();
    }

    // ==========================================================================
    // UNDO/REDO/CLEAR FUNCTIONALITY
    // ==========================================================================

    /**
     * Undo the last action
     */
    function doUndo() {
        const op = undoStack.pop();
        if (!op) return; // Nothing to undo

        if (op.action === 'add') {
            // Remove the stroke from canvas
            strokes = strokes.filter(s => s.id !== op.stroke.id);
            redoStack.push(op); // Add to redo stack
            redraw();
        } else if (op.action === 'clear') {
            // Restore the snapshot from before clear
            strokes = op.snapshot || [];
            redoStack.push(op);
            redraw();
        }
    }

    /**
     * Redo the last undone action
     */
    function doRedo() {
        const op = redoStack.pop();
        if (!op) return; // Nothing to redo

        if (op.action === 'add') {
            // Re-add the stroke
            strokes.push(op.stroke);
            undoStack.push(op);
            redraw();
        } else if (op.action === 'clear') {
            // Re-clear the canvas
            undoStack.push(op);
            strokes = [];
            redraw();
        }
    }

    /**
     * Clear the entire canvas
     * @param {boolean} broadcast - Whether to broadcast to other users
     */
    function doClear(broadcast = true) {
        // Save current state for undo
        undoStack.push({ action: 'clear', snapshot: strokes.slice() });
        redoStack.length = 0;

        // Clear all strokes
        strokes = [];
        redraw();

        // Notify other users if requested
        if (broadcast)
            sendWS({ type: 'clear', roomId: roomInput.value, payload: {} });
    }

    // ==========================================================================
    // EXPORT FUNCTIONALITY
    // ==========================================================================

    /**
     * Export the canvas as a PNG image
     */
    function exportPNG() {
        canvas.toBlob(blob => {
            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whiteboard_${roomInput.value || 'room'}.png`;
            a.click();

            // Clean up
            URL.revokeObjectURL(url);
        });
    }

    /**
     * Export all strokes as a JSON file
     */
    function exportJSON() {
        // Create JSON blob with all strokes
        const blob = new Blob([JSON.stringify({ strokes })], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiteboard_${roomInput.value || 'room'}.json`;
        a.click();

        // Clean up
        URL.revokeObjectURL(url);
    }

    /**
     * Import strokes from a JSON file
     * @param {File} file - The JSON file to import
     */
    function importJSONFile(file) {
        if (!file) return;

        const r = new FileReader();
        r.onload = (ev) => {
            try {
                // Parse the JSON file
                const parsed = JSON.parse(ev.target.result);

                if (Array.isArray(parsed.strokes)) {
                    // Replace current strokes with imported ones
                    strokes = parsed.strokes;
                    undoStack.length = 0;
                    redoStack.length = 0;
                    redraw();

                    // Broadcast the new snapshot to other users
                    sendWS({
                        type: 'snapshot',
                        roomId: roomInput.value,
                        payload: { strokes }
                    });
                } else {
                    alert('Invalid JSON: missing strokes array');
                }
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        r.readAsText(file);
    }

    // ==========================================================================
    // WEBSOCKET HELPERS
    // ==========================================================================

    /**
     * Update the connection status display
     * @param {string} s - Status text to display
     * @param {string} color - CSS color for the text
     */
    function setStatus(s, color = '') {
        connStatus.textContent = s;
        connStatus.style.color = color || '';
    }

    /**
     * Connect to the WebSocket server
     * Prompts user for server URL and establishes connection
     */
    function connectWS() {
        // Close existing connection if any
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
        }

        // Ask user for server URL
        let url = prompt(
            'WebSocket server URL (ws:// or wss://). Leave blank for ws://localhost:4000',
            'ws://localhost:4000'
        );
        if (!url) return; // User cancelled

        // Create WebSocket connection
        try {
            ws = new WebSocket(url);
        } catch (err) {
            alert('Invalid WebSocket URL');
            return;
        }

        /**
         * Handle successful connection
         */
        ws.addEventListener('open', () => {
            setStatus('Connected', 'green');

            // Send join message to server
            sendWS({
                type: 'join',
                roomId: roomInput.value,
                payload: { user: { name: nameInput.value } }
            });
        });

        /**
         * Handle incoming messages from server
         */
        ws.addEventListener('message', (ev) => {
            try {
                const msg = JSON.parse(ev.data);

                // Ignore messages from other rooms
                if (msg.roomId && msg.roomId !== roomInput.value) return;

                // Handle different message types
                if (msg.type === 'stroke' && msg.payload?.stroke) {
                    // Another user drew a stroke
                    strokes.push(msg.payload.stroke);
                    redraw();
                }
                else if (msg.type === 'clear') {
                    // Another user cleared the canvas
                    strokes = [];
                    undoStack.length = 0;
                    redoStack.length = 0;
                    redraw();
                }
                else if (msg.type === 'snapshot' && msg.payload?.strokes) {
                    // Received full canvas state (on join or import)
                    strokes = msg.payload.strokes;
                    undoStack.length = 0;
                    redoStack.length = 0;
                    redraw();
                }
            } catch (e) {
                console.error('ws parse', e);
            }
        });

        /**
         * Handle connection close
         */
        ws.addEventListener('close', () => setStatus('Disconnected'));

        /**
         * Handle connection errors
         */
        ws.addEventListener('error', (e) => {
            setStatus('Error', 'red');
            console.error('ws error', e);
        });
    }

    /**
     * Send a message to the WebSocket server
     * @param {Object} obj - Message object to send
     */
    function sendWS(obj) {
        // Only send if connected
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(obj));
    }

    // ==========================================================================
    // EVENT LISTENERS - Attach UI controls
    // ==========================================================================

    // Button click handlers
    connectBtn.addEventListener('click', connectWS);
    undoBtn.addEventListener('click', doUndo);
    redoBtn.addEventListener('click', doRedo);
    clearBtn.addEventListener('click', () => doClear(true));
    exportPNGBtn.addEventListener('click', exportPNG);
    exportJSONBtn.addEventListener('click', exportJSON);
    importFile.addEventListener('change', (e) => importJSONFile(e.target.files[0]));

    // ==========================================================================
    // CANVAS EVENT LISTENERS - Mouse input
    // ==========================================================================

    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // ==========================================================================
    // CANVAS EVENT LISTENERS - Touch input
    // ==========================================================================

    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // ==========================================================================
    // WINDOW RESIZE HANDLER
    // ==========================================================================

    /**
     * Debounced resize handler to avoid excessive redraws
     */
    window.addEventListener('resize', () => {
        // Clear any pending resize timeout
        clearTimeout(window._wb_resize_timeout);

        // Wait 120ms after last resize event before redrawing
        window._wb_resize_timeout = setTimeout(resizeCanvas, 120);
    });

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================

    // Initial canvas setup (delayed to ensure DOM is ready)
    setTimeout(resizeCanvas, 50);

    // Set initial status
    setStatus('Not connected');
})();
