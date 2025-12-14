window.BoardState.selectPen = function () {
    window.BoardState.currentTool = 'pen';
    const { pen, text, eraser, arrow } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        canvas.isDrawingMode = true;
        canvas.selection = false;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        const brushSizeInput = document.getElementById('brushSize');
        canvas.freeDrawingBrush.width = parseInt(brushSizeInput?.value || 5);
        canvas.freeDrawingBrush.color = document.getElementById('colorPicker')?.value || '#ffffff';
        canvas.defaultCursor = 'crosshair';
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (pen) {
        pen.classList.add('active', 'bg-gray-500', 'text-white');
        pen.classList.remove('bg-transparent', 'text-black');
    }
};
