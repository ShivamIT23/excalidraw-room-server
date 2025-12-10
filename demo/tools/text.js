window.BoardState.selectText = function() {
    window.BoardState.currentTool = 'text';
    const { pen, text, eraser } = window.BoardState.tools;

    // Update UI
    if (text) {
        text.classList.add('active', 'bg-blue-600', 'text-white');
        text.classList.remove('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
    if (pen) {
        pen.classList.remove('active', 'bg-blue-600', 'text-white');
        pen.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
    if (eraser) {
        eraser.classList.remove('active', 'bg-blue-600', 'text-white');
        eraser.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-700');
    }
};

window.BoardState.showTextInput = function(point) {
    const textInput = this.textInput;
    const colorPicker = this.tools.colorPicker;
    const brushSize = this.tools.brushSize;

    if (!textInput) return;

    textInput.style.left = point.x + 'px';
    textInput.style.top = point.y + 'px';
    textInput.style.color = colorPicker ? colorPicker.value : '#000000';
    // Enforce minimum font size of 12px
    const size = Math.max(12, brushSize ? Number(brushSize.value) : 16);
    textInput.style.fontSize = size + 'px';
    textInput.classList.remove('hidden');
    textInput.value = '';
    textInput.focus();
};

window.BoardState.addText = function() {
    const textInput = this.textInput;
    if (!textInput) return;

    const text = textInput.value.trim();
    if (!text) {
        textInput.classList.add('hidden');
        return;
    }

    // Enforce minimum font size of 12px
    const size = Math.max(12, this.tools.brushSize ? Number(this.tools.brushSize.value) : 16);
    const color = this.tools.colorPicker ? this.tools.colorPicker.value : '#000000';

    // Adjust for border (2px) + padding (px-2=8px, py-1=4px) + line-height correction
    const x = parseInt(textInput.style.left) + 11; // increased X slightly too
    const y = parseInt(textInput.style.top) + 6 + (size * 0.30);

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
