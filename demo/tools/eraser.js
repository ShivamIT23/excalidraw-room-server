window.BoardState.selectEraser = function () {
    window.BoardState.currentTool = 'eraser';
    const { pen, text, eraser, hand, arrow } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        // Use EraserBrush if available, else standard PencilBrush with white color (hacky but works if no layering)
        if (fabric.EraserBrush) {
            canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
            canvas.freeDrawingBrush.width = 10; // Default eraser size
        } else {
            // Fallback
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = window.BoardState.backgroundColor || '#000000';
            canvas.freeDrawingBrush.width = 20;
        }
        canvas.defaultCursor = 'crosshair';
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (eraser) {
        eraser.classList.add('active', 'bg-gray-500', 'text-white');
        eraser.classList.remove('bg-transparent', 'text-black');
    }
};
