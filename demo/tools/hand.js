window.BoardState.selectHand = function () {
    window.BoardState.currentTool = 'hand';
    const { pen, text, eraser, hand, arrow } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        // Disable drawing mode for panning
        canvas.isDrawingMode = false;
        canvas.selection = false; // Disable selection during panning

        // Make all objects non-selectable during panning
        canvas.forEachObject((obj) => {
            obj.selectable = false;
            obj.evented = false;
        });

        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (hand) {
        hand.classList.add('active', 'bg-gray-500', 'text-white');
        hand.classList.remove('bg-transparent', 'text-black');
    }
};

