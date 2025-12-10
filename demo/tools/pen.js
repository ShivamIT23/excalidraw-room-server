// Pen tool specific logic could go here
// Currently, the drawing logic is generic in BoardState.drawStroke
// and event listeners are in main.js.

window.BoardState.selectPen = function() {
    window.BoardState.currentTool = 'pen';
    const { pen, text, eraser } = window.BoardState.tools;
    
    // Update UI
    if (pen) {
        pen.classList.add('active', 'bg-blue-600', 'text-white');
        pen.classList.remove('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
    if (text) {
        text.classList.remove('active', 'bg-blue-600', 'text-white');
        text.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
    if (eraser) {
        eraser.classList.remove('active', 'bg-blue-600', 'text-white');
        eraser.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
};
