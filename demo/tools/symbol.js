// Symbol tool - supports emoji
window.BoardState.selectSymbol = function () {
    window.BoardState.currentTool = 'symbol';
    window.BoardState.symbolType = 'emoji'; // Default to emoji

    const { symbol } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'default';

        // Symbol placement state
        if (!canvas._hasSymbolListener) {
            canvas._hasSymbolListener = true;

            canvas.on('mouse:down', function (options) {
                if (window.BoardState.currentTool !== 'symbol') return;
                if (options.target) return; // clicked on existing object

                const pointer = canvas.getPointer(options.e);
                const color = document.getElementById('colorPicker')?.value || '#ffffff';
                const brushSize = parseInt(document.getElementById('brushSize')?.value || 5, 10);

                // Map brush size to emoji size (12-44px range like text)
                const emojiSizeMap = {
                    5: 12,
                    11: 20,
                    17: 28,
                    23: 36,
                    36: 44
                };
                const fontSize = emojiSizeMap[brushSize] || 20;

                // Create emoji text object
                const emoji = new fabric.IText('😊', {
                    left: pointer.x,
                    top: pointer.y,
                    fontFamily: 'Arial',
                    fill: color,
                    fontSize: fontSize
                });

                emoji.set({
                    id: 'symbol_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
                });

                canvas.add(emoji);
                canvas.renderAll();

                // Send to WebSocket
                window.BoardState.sendWS({
                    type: 'stroke',
                    roomId: window.BoardState.roomId,
                    payload: {
                        pageId: window.BoardState.currentPageId,
                        stroke: emoji.toObject(['id'])
                    }
                });
            });
        }
    }

    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (symbol) {
        symbol.classList.add('active', 'bg-gray-500', 'text-white');
        symbol.classList.remove('bg-transparent', 'text-black');
    }
};
