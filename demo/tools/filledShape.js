// Filled Shape tool - supports circle and square
window.BoardState.selectFilledShape = function () {
    window.BoardState.currentTool = 'filledShape';
    window.BoardState.shapeType = 'circle'; // Default to circle, can toggle to square
    window.BoardState.shapeFilled = true;

    const { filledShape } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';

        // Shape drawing state
        window.BoardState.isDrawingShape = false;
        window.BoardState.shapeStartPoint = null;

        // Remove existing shape listeners if any
        if (canvas._hasFilledShapeListener) {
            canvas.off('mouse:down', canvas._filledShapeMouseDown);
            canvas.off('mouse:move', canvas._filledShapeMouseMove);
            canvas.off('mouse:up', canvas._filledShapeMouseUp);
        }

        // Add shape drawing listeners
        canvas._hasFilledShapeListener = true;

        canvas._filledShapeMouseDown = function (options) {
            if (window.BoardState.currentTool !== 'filledShape') return;
            if (options.target) return; // clicked on existing object

            const pointer = canvas.getPointer(options.e);
            window.BoardState.isDrawingShape = true;
            window.BoardState.shapeStartPoint = pointer;
        };

        canvas._filledShapeMouseMove = function (options) {
            if (!window.BoardState.isDrawingShape || !window.BoardState.shapeStartPoint) return;

            const pointer = canvas.getPointer(options.e);
            const start = window.BoardState.shapeStartPoint;

            // Remove previous preview shape
            const objects = canvas.getObjects();
            const preview = objects.find(obj => obj.isFilledShapePreview);
            if (preview) canvas.remove(preview);

            // Create preview shape
            let shape;
            const color = document.getElementById('colorPicker')?.value || '#ffffff';

            if (window.BoardState.shapeType === 'circle') {
                const radius = Math.sqrt(Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2));
                shape = new fabric.Circle({
                    left: start.x - radius,
                    top: start.y - radius,
                    radius: radius,
                    fill: color,
                    stroke: color,
                    strokeWidth: 0,
                    isFilledShapePreview: true
                });
            } else {
                const width = Math.abs(pointer.x - start.x);
                const height = Math.abs(pointer.y - start.y);
                shape = new fabric.Rect({
                    left: Math.min(start.x, pointer.x),
                    top: Math.min(start.y, pointer.y),
                    width: width,
                    height: height,
                    fill: color,
                    stroke: color,
                    strokeWidth: 0,
                    isFilledShapePreview: true
                });
            }

            canvas.add(shape);
            canvas.renderAll();
        };

        canvas._filledShapeMouseUp = function (options) {
            if (!window.BoardState.isDrawingShape || !window.BoardState.shapeStartPoint) return;

            const pointer = canvas.getPointer(options.e);
            const start = window.BoardState.shapeStartPoint;

            // Remove preview
            const objects = canvas.getObjects();
            const preview = objects.find(obj => obj.isFilledShapePreview);
            if (preview) canvas.remove(preview);

            // Create final shape
            const color = document.getElementById('colorPicker')?.value || '#ffffff';
            let shape;

            if (window.BoardState.shapeType === 'circle') {
                const radius = Math.sqrt(Math.pow(pointer.x - start.x, 2) + Math.pow(pointer.y - start.y, 2));
                if (radius < 5) return; // Too small
                shape = new fabric.Circle({
                    left: start.x - radius,
                    top: start.y - radius,
                    radius: radius,
                    fill: color,
                    stroke: color,
                    strokeWidth: 0
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
                    fill: color,
                    stroke: color,
                    strokeWidth: 0
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

        canvas.on('mouse:down', canvas._filledShapeMouseDown);
        canvas.on('mouse:move', canvas._filledShapeMouseMove);
        canvas.on('mouse:up', canvas._filledShapeMouseUp);
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (filledShape) {
        filledShape.classList.add('active', 'bg-gray-500', 'text-white');
        filledShape.classList.remove('bg-transparent', 'text-black');
    }
};

// // Dropdown Logic
// document.addEventListener('DOMContentLoaded', () => {
//     const filledBtn = document.getElementById('filledShapeTool');
//     const shapeOptions = document.getElementById('ShapeOptionsFilled');

//     if (filledBtn && shapeOptions) {
//         // Toggle on click
//         filledBtn.addEventListener('click', (e) => {
//             e.stopPropagation();
//             shapeOptions.classList.toggle('hidden');
//         });

//         // Close when clicking outside
//         document.addEventListener('click', (e) => {
//             if (!filledBtn.contains(e.target) && !shapeOptions.contains(e.target)) {
//                 shapeOptions.classList.add('hidden');
//             }
//         });
//     }
// });