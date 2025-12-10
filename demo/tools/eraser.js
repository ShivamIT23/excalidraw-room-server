window.BoardState.selectEraser = function() {
    window.BoardState.currentTool = 'eraser';
    const { pen, text, eraser } = window.BoardState.tools;

    // Update UI
    if (eraser) {
        eraser.classList.add('active', 'bg-blue-600', 'text-white');
        eraser.classList.remove('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
    if (pen) {
        pen.classList.remove('active', 'bg-blue-600', 'text-white');
        pen.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
    if (text) {
        text.classList.remove('active', 'bg-blue-600', 'text-white');
        text.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
};
