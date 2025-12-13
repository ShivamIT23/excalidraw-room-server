window.BoardState.selectText = function () {
    window.BoardState.currentTool = 'text';
    const { pen, text, eraser } = window.BoardState.tools;
    const canvas = window.BoardState.fabricCanvas;

    if (canvas) {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'text';

        // Logic to add text on click is handled by a listener or we add it here?
        // Let's add a robust listener that checks tool state.
        // We'll attach it once to the canvas if not present, but better to just use a global handler in main.js? 
        // Or attach here.

        if (!canvas._hasTextListener) {
            canvas._hasTextListener = true;
            canvas.on('mouse:down', function (options) {
                if (window.BoardState.currentTool !== 'text') return;
                if (options.target) return; // clicked on existing object

                const pointer = canvas.getPointer(options.e);
                const iText = new fabric.IText('Type here', {
                    left: pointer.x,
                    top: pointer.y,
                    fontFamily: 'Arial',
                    fill: document.getElementById('colorPicker')?.value || '#ffffff',
                    fontSize: 20
                });

                canvas.add(iText);
                canvas.setActiveObject(iText);
                iText.enterEditing();
                iText.selectAll();

                // Switch back to pen automatically? Or stay in text mode? Use stay in mode.
                // window.BoardState.selectPen(); 
            });
        }
    }

    // Update UI
    // Update UI
    if (window.BoardState.resetToolStyles) window.BoardState.resetToolStyles();

    if (text) {
        text.classList.add('active', 'bg-gray-500', 'text-white');
        text.classList.remove('bg-transparent', 'text-black');
    }
};

window.BoardState.showTextInput = function (point) {
    const textInput = this.textInput;
    const colorPicker = this.tools.colorPicker;
    const brushSize = this.tools.brushSize;

    if (!textInput) return;

    // Enforce minimum font size of 12px
    const size = (this.tools.brushSize ? Number(this.tools.brushSize.value) : 3) * 4;
    textInput.style.left = point.x + 'px';
    textInput.style.top = point.y + 'px';
    textInput.style.color = colorPicker ? colorPicker.value : '#ffffff';
    textInput.style.fontSize = size + 'px';
    textInput.classList.remove('hidden');
    textInput.value = '';
    textInput.focus();
};

window.BoardState.addText = function () {
    const textInput = this.textInput;
    if (!textInput) return;

    const text = textInput.value.trim();
    if (!text) {
        textInput.classList.add('hidden');
        return;
    }

    // Enforce minimum font size of 12px
    const size = (this.tools.brushSize ? Number(this.tools.brushSize.value) : 3) * 4;
    const color = this.tools.colorPicker ? this.tools.colorPicker.value : '#ffffff';

    // Use the exact position from the input (no adjustments)
    const x = parseInt(textInput.style.left) + ((40 - size) * 0.3) + 5;
    const y = parseInt(textInput.style.top) - ((40 - size) * 0.3) + 20;

    this.ctx.save();
    this.ctx.font = size + 'px Arial';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
    this.ctx.restore();

    const textStroke = {
        id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        tool: 'text',
        color: color,
        size: size,
        text: text,
        x: x,
        y: y,
        user: {
            name: this.userName
        }
    };

    this.strokes.push(textStroke);
    this.sendWS({
        type: 'stroke',
        roomId: this.roomId,
        payload: {
            stroke: textStroke
        }
    });

    textInput.classList.add('hidden');
    textInput.value = '';
};
