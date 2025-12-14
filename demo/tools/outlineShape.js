// Outline Shape tool - supports circle and square
window.BoardState.selectOutlineShape = function () {
    window.BoardState.currentTool = 'outlineShape';
    window.BoardState.shapeType = 'circle'; // Default to circle, can toggle to square
    window.BoardState.shapeFilled = false;

    const { outlineShape } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';

        // Shape drawing state
        window.BoardState.isDrawingShape = false;
        window.BoardState.shapeStartPoint = null;

        // Remove existing shape listeners if any
        if (canvas._hasShapeListener) {
            canvas.off('mouse:down', canvas._shapeMouseDown);
            canvas.off('mouse:move', canvas._shapeMouseMove);
            canvas.off('mouse:up', canvas._shapeMouseUp);
        }

        // Add shape drawing listeners
        canvas._hasShapeListener = true;

        canvas._shapeMouseDown = function (options) {
            if (window.BoardState.currentTool !== 'outlineShape') return;
            if (options.target) return; // clicked on existing object

            const pointer = canvas.getPointer(options.e);
            window.BoardState.isDrawingShape = true;
            window.BoardState.shapeStartPoint = pointer;
        };

        canvas._shapeMouseMove = function (options) {
            if (!window.BoardState.isDrawingShape || !window.BoardState.shapeStartPoint) return;

            const pointer = canvas.getPointer(options.e);
            const start = window.BoardState.shapeStartPoint;

            // Remove previous preview shape
            const objects = canvas.getObjects();
            const preview = objects.find(obj => obj.isShapePreview);
            if (preview) canvas.remove(preview);

            // Create preview shape
            let shape;
            const color = document.getElementById('colorPicker')?.value || '#ffffff';
            const brushSize = parseInt(document.getElementById('brushSize')?.value || 5, 10);

            if (window.BoardState.shapeType === 'circle') {
                const radius = Math.sqrt(Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2));
                shape = new fabric.Circle({
                    left: start.x - radius,
                    top: start.y - radius,
                    radius: radius,
                    stroke: color,
                    fill: 'transparent',
                    strokeWidth: brushSize,
                    isShapePreview: true
                });
            } else {
                const width = Math.abs(pointer.x - start.x);
                const height = Math.abs(pointer.y - start.y);
                shape = new fabric.Rect({
                    left: Math.min(start.x, pointer.x),
                    top: Math.min(start.y, pointer.y),
                    width: width,
                    height: height,
                    stroke: color,
                    fill: 'transparent',
                    strokeWidth: brushSize,
                    isShapePreview: true
                });
            }

            canvas.add(shape);
            canvas.renderAll();
        };

        canvas._shapeMouseUp = function (options) {
            if (!window.BoardState.isDrawingShape || !window.BoardState.shapeStartPoint) return;

            const pointer = canvas.getPointer(options.e);
            const start = window.BoardState.shapeStartPoint;

            // Remove preview
            const objects = canvas.getObjects();
            const preview = objects.find(obj => obj.isShapePreview);
            if (preview) canvas.remove(preview);

            // Create final shape
            const color = document.getElementById('colorPicker')?.value || '#ffffff';
            const brushSize = parseInt(document.getElementById('brushSize')?.value || 5, 10);
            let shape;

            if (window.BoardState.shapeType === 'circle') {
                const radius = Math.sqrt(Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2));
                if (radius < 5) return; // Too small
                shape = new fabric.Circle({
                    left: start.x - radius,
                    top: start.y - radius,
                    radius: radius,
                    stroke: color,
                    fill: 'transparent',
                    strokeWidth: brushSize
                });
            } else {
                const width = Math.abs(pointer.x - start.x);
                const height = Math.abs(pointer.y - start.y);
                if (width < 5 || height < 5) return; // Too small
                shape = new fabric.Rect({
                    left: Math.min(start.x, pointer.x),
                    top: Math.min(start.y, pointer.y),
                    width: width,
                    height: height,
                    stroke: color,
                    fill: 'transparent',
                    strokeWidth: brushSize
                });
            }

            shape.set({
                id: 'shape_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
            });

            canvas.add(shape);
            canvas.renderAll();

            // Send to WebSocket
            window.BoardState.sendWS({
                type: 'stroke',
                roomId: window.BoardState.roomId,
                payload: {
                    pageId: window.BoardState.currentPageId,
                    stroke: shape.toObject(['id'])
                }
            });

            // Reset state
            window.BoardState.isDrawingShape = false;
            window.BoardState.shapeStartPoint = null;
        };

        canvas.on('mouse:down', canvas._shapeMouseDown);
        canvas.on('mouse:move', canvas._shapeMouseMove);
        canvas.on('mouse:up', canvas._shapeMouseUp);
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (outlineShape) {
        outlineShape.classList.add('active', 'bg-gray-500', 'text-white');
        outlineShape.classList.remove('bg-transparent', 'text-black');
    }
};

// Toggle between circle and square
window.BoardState.toggleShapeType = function () {
    if (window.BoardState.currentTool === 'outlineShape' || window.BoardState.currentTool === 'filledShape') {
        window.BoardState.shapeType = window.BoardState.shapeType === 'circle' ? 'square' : 'circle';
    }
};
// Dropdown Logic
// document.addEventListener('DOMContentLoaded', () => {
//     const outlineBtn = document.getElementById('outlineShapeTool');
//     const shapeOptions = document.getElementById('ShapeOptionsOutline');
    
//     if (outlineBtn && shapeOptions) {
//         // Toggle on click
//         outlineBtn.addEventListener('click', (e) => {
//             e.stopPropagation();
//             shapeOptions.classList.toggle('hidden');
//         });

//         // Close when clicking outside
//         document.addEventListener('click', (e) => {
//             if (!outlineBtn.contains(e.target) && !shapeOptions.contains(e.target)) {
//                 shapeOptions.classList.add('hidden');
//             }
//         });
//     }
// });
