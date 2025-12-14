window.BoardState.selectArrow = function () {
    window.BoardState.currentTool = 'arrow';
    const { pen, text, eraser, arrow } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        // Enable selection mode (default Fabric.js behavior)
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';

        // Allow object manipulation
        canvas.forEachObject((obj) => {
            obj.selectable = true;
            obj.evented = true;
        });
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (arrow) {
        arrow.classList.add('active', 'bg-gray-500', 'text-white');
        arrow.classList.remove('bg-transparent', 'text-black');
    }
};

