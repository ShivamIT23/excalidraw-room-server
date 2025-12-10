window.BoardState.clearCanvas = function () {
    if (!window.IS_TEACHER) return;

    // Access state via window.BoardState since 'this' might be bound to button
    const bs = window.BoardState;

    bs.strokes = [];
    bs.remoteLive = {};
    if (bs.currentPageId) {
        bs.pageStrokes[bs.currentPageId] = [];
    }
    bs.redraw();

    bs.sendWS({
        type: 'clear',
        roomId: bs.roomId,
        payload: { pageId: bs.currentPageId }
    });
};
