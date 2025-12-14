// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    const bs = window.BoardState;
    console.log("Main.js initializing...");

    // Check Fabric
    if (typeof fabric === 'undefined') {
        console.error("Fabric.js is not loaded!");
        alert("Error: Fabric.js library not loaded. Please checking your internet connection or CDN.");
        return;
    }

    // Initialize Fabric
    const canvasEl = document.getElementById('whiteboardCanvas');

    // Guard: Prevent double initialization
    if (bs.fabricCanvas || (canvasEl && canvasEl.classList.contains('lower-canvas'))) {
        console.warn("Fabric canvas already initialized. Skipping.");
        return;
    }

    // Fixed virtual canvas dimensions
    const VIRTUAL_WIDTH = 1400;
    // For teachers: canvas height is 3x screen height, for students: use fixed 3000
    let VIRTUAL_HEIGHT = 3000;

    if (window.IS_TEACHER) {
        // Calculate 3x screen height for teacher
        const screenHeight = window.innerHeight;
        VIRTUAL_HEIGHT = screenHeight * 3;
    }

    // Set initial dimensions on canvas element
    canvasEl.width = VIRTUAL_WIDTH;
    canvasEl.height = VIRTUAL_HEIGHT;

    // Initialize Fabric Canvas with fixed virtual size
    bs.fabricCanvas = new fabric.Canvas('whiteboardCanvas', {
        isDrawingMode: true,
        width: VIRTUAL_WIDTH,
        height: VIRTUAL_HEIGHT,
        backgroundColor: bs.backgroundColor || '#000000'
    });
    console.log("Fabric canvas initialized", bs.fabricCanvas);

    const canvas = bs.fabricCanvas;
    // Set brush
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 5;
    canvas.freeDrawingBrush.color = '#ffffff';

    // Elements
    bs.canvasContainer = document.getElementById('canvasContainer');
    bs.tools.pen = document.getElementById('penTool');
    bs.tools.text = document.getElementById('textTool');
    bs.tools.eraser = document.getElementById('eraserTool');
    bs.tools.arrow = document.getElementById('arrowTool');
    bs.tools.outlineShape = document.getElementById('outlineShapeTool');
    bs.tools.filledShape = document.getElementById('filledShapeTool');
    bs.tools.symbol = document.getElementById('symbolTool');
    bs.tools.colorPicker = document.getElementById('colorPicker');
    bs.tools.brushSize = document.getElementById('brushSize');

    // Store virtual dimensions
    bs.virtualWidth = VIRTUAL_WIDTH;
    bs.virtualHeight = VIRTUAL_HEIGHT;

    const sizeValue = document.getElementById('sizeValue');
    const clearCanvasBtn = document.getElementById('clearCanvas');
    const wsStatus = document.getElementById('wsStatus');
    const addPageBtn = document.getElementById('addPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageIndicator = document.getElementById('pageIndicator');
    const backgroundPicker = document.getElementById('backgroundPicker');
    const sizeSelector = document.getElementById('sizeSelector');
    bs.textInput = document.getElementById('textInput');

    // Viewport Scaling Logic - Reimplemented for consistent behavior
    function updateViewportScale() {
        if (!bs.canvasContainer || !canvas) return;

        const containerWidth = bs.canvasContainer.clientWidth;
        const containerHeight = bs.canvasContainer.clientHeight;

        if (containerWidth === 0 || containerHeight === 0) {
            // Retry after a short delay if container not ready
            setTimeout(updateViewportScale, 50);
            return;
        }

        // Calculate scale based on container width (consistent approach)
        const scale = containerWidth / VIRTUAL_WIDTH;
        const scaledWidth = VIRTUAL_WIDTH * scale;
        const scaledHeight = VIRTUAL_HEIGHT * scale;

        // Get current viewport transform
        const currentTransform = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const currentScale = currentTransform[0];
        const isInitialLoad = currentScale === 1 && currentTransform[4] === 0 && currentTransform[5] === 0;

        // Calculate offsets
        let offsetX = 0;
        let offsetY = 0;

        if (window.IS_TEACHER) {
            // Teacher: align to top-left, no centering
            offsetX = 0;
            offsetY = 0;

            // Ensure container can scroll by setting its content size
            if (bs.canvasContainer) {
                bs.canvasContainer.style.position = 'relative';
                // Create a spacer div to make container scrollable
                let spacer = bs.canvasContainer.querySelector('.canvas-spacer');
                if (!spacer) {
                    spacer = document.createElement('div');
                    spacer.className = 'canvas-spacer';
                    spacer.style.position = 'absolute';
                    spacer.style.top = '0';
                    spacer.style.left = '0';
                    spacer.style.width = '1px';
                    spacer.style.height = '1px';
                    spacer.style.pointerEvents = 'none';
                    spacer.style.visibility = 'hidden';
                    bs.canvasContainer.appendChild(spacer);
                }
                spacer.style.height = `${scaledHeight}px`;
                spacer.style.width = `${scaledWidth}px`;
            }
        } else {
            // Student: center the canvas
            offsetX = (containerWidth - scaledWidth) / 2;
            if (scaledHeight <= containerHeight) {
                offsetY = (containerHeight - scaledHeight) / 2;
            } else {
                offsetY = 0; // Top align if taller than container
            }
        }

        // Always apply the transform to ensure consistency
        const newTransform = [
            scale, 0,
            0, scale,
            offsetX,
            offsetY
        ];

        canvas.setViewportTransform(newTransform);
        canvas.renderAll();

        // Broadcast if teacher (and not initial load to avoid spam)
        if (window.IS_TEACHER && !isInitialLoad) {
            debouncedBroadcastViewport();
        }
    }


    // Broadcast viewport transform to students
    function broadcastViewportTransform() {
        if (!window.IS_TEACHER) return;

        const transform = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        bs.sendWS({
            type: 'viewport_transform',
            roomId: bs.roomId,
            payload: {
                viewportTransform: transform,
                pageId: bs.currentPageId
            }
        });
    }

    // Debounce viewport broadcast
    let viewportBroadcastTimeout = null;
    function debouncedBroadcastViewport() {
        clearTimeout(viewportBroadcastTimeout);
        viewportBroadcastTimeout = setTimeout(() => {
            broadcastViewportTransform();
        }, 100);
    }

    // Initialize viewport on load (with delay to ensure container is sized)
    setTimeout(() => {
        updateViewportScale();
    }, 100);

    // Update viewport on window resize
    let resizeTimeout = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateViewportScale();
        }, 100);
    });

    // Also update when container size changes (for dynamic layouts)
    if (bs.canvasContainer && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateViewportScale();
            }, 100);
        });
        resizeObserver.observe(bs.canvasContainer);
    }


    // --- State Management ---

    // Get localStorage key for room persistence
    function getStorageKey() {
        return `whiteboard_${bs.roomId}`;
    }

    // Save to localStorage
    function saveToLocalStorage() {
        if (!bs.currentPageId) return;
        try {
            const storageKey = getStorageKey();
            const json = canvas.toJSON();
            // Explicitly save background color if not in JSON
            if (canvas.backgroundColor) {
                json.background = canvas.backgroundColor;
            }

            // Save all pages to localStorage
            const allPages = {
                ...bs.pageStrokes,
                [bs.currentPageId]: json
            };
            localStorage.setItem(storageKey, JSON.stringify(allPages));
        } catch (e) {
            console.warn('Failed to save to localStorage:', e);
        }
    }

    // Load from localStorage
    function loadFromLocalStorage() {
        try {
            const storageKey = getStorageKey();
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                bs.pageStrokes = parsed;
                return parsed;
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
        return null;
    }

    function persistCurrentPage() {
        if (!bs.currentPageId) return;
        const json = canvas.toJSON();
        // Explicitly save background color if not in JSON (Fabric usually includes it)
        if (canvas.backgroundColor) {
            json.background = canvas.backgroundColor;
        }
        bs.pageStrokes[bs.currentPageId] = json;

        // Also save to localStorage
        saveToLocalStorage();
    }

    function updatePageIndicator() {
        if (!pageIndicator) return;
        const total = bs.pages?.length || 1;
        const idx = (bs.pages || []).findIndex(p => p.id === bs.currentPageId);
        const displayIndex = idx >= 0 ? idx + 1 : 1;
        pageIndicator.textContent = `${displayIndex} / ${total}`;
    }

    function setCurrentPage(pageId) {
        if (!pageId) return;
        persistCurrentPage();
        bs.currentPageId = pageId;

        const cached = bs.pageStrokes[pageId];
        canvas.clear();
        canvas.setBackgroundColor('#000000', canvas.renderAll.bind(canvas)); // Reset bg

        if (cached) {
            canvas.loadFromJSON(cached, () => {
                canvas.renderAll();
                const bg = cached.background || cached.backgroundColor || '#000000';
                canvas.setBackgroundColor(bg, canvas.renderAll.bind(canvas));
                if (backgroundPicker) backgroundPicker.value = (typeof bg === 'string') ? bg : '#000000';
            });
        } else {
            // If no cached data, try loading from localStorage
            const storedPages = loadFromLocalStorage();
            if (storedPages && storedPages[pageId]) {
                const stored = storedPages[pageId];
                canvas.loadFromJSON(stored, () => {
                    canvas.renderAll();
                    const bg = stored.background || stored.backgroundColor || '#000000';
                    canvas.setBackgroundColor(bg, canvas.renderAll.bind(canvas));
                    if (backgroundPicker) backgroundPicker.value = (typeof bg === 'string') ? bg : '#000000';
                });
                // Update in-memory cache
                bs.pageStrokes[pageId] = stored;
            }
        }
        updatePageIndicator();
    }

    function applySnapshot(pageId, snapshotData, backgroundColor) {
        bs.pageStrokes[pageId] = snapshotData;

        // If snapshot has background, store it
        if (backgroundColor) {
            if (!bs.pageStrokes[pageId]) bs.pageStrokes[pageId] = { objects: [] }; // Safety
            bs.pageStrokes[pageId].background = backgroundColor;
        }

        // Save to localStorage
        saveToLocalStorage();

        if (!bs.currentPageId || bs.currentPageId === pageId) {
            setCurrentPage(pageId);
        }
    }

    function movePage(step) {
        if (!window.IS_TEACHER) return;
        const pages = bs.pages || [];
        if (!pages.length || !bs.currentPageId) return;
        const currentIdx = pages.findIndex(p => p.id === bs.currentPageId);
        if (currentIdx === -1) return;
        const targetIdx = Math.min(Math.max(currentIdx + step, 0), pages.length - 1);
        const targetPage = pages[targetIdx];
        if (targetPage && targetPage.id !== bs.currentPageId) {
            bs.sendWS({
                type: 'page_set',
                roomId: bs.roomId,
                payload: { pageId: targetPage.id }
            });
        }
    }

    // --- Event Listeners : Local Drawing ---

    canvas.on('path:created', (e) => {
        const path = e.path;
        path.set({
            id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            perPixelTargetFind: true
        });

        bs.sendWS({
            type: 'stroke',
            roomId: bs.roomId,
            payload: {
                pageId: bs.currentPageId,
                stroke: path.toObject(['id'])
            }
        });
        persistCurrentPage();
    });

    // Listen for text editing completion to auto-switch to arrow
    canvas.on('text:editing:exited', (e) => {
        // Switch to arrow tool after text editing is complete
        if (bs.currentTool === 'text' && bs.selectArrow) {
            setTimeout(() => {
                bs.selectArrow();
            }, 100);
        }
    });

    canvas.on('object:modified', (e) => {
        const obj = e.target;
        if (!obj) return;

        bs.sendWS({
            type: 'object_modified',
            roomId: bs.roomId,
            payload: {
                pageId: bs.currentPageId,
                object: obj.toObject(['id'])
            }
        });
        persistCurrentPage();
    });

    canvas.on('object:added', (e) => {
        const obj = e.target;
        if (obj.is_remote) return;
        if (obj.type === 'path') return;

        if (!obj.id) obj.set('id', 'o_' + Date.now());

        bs.sendWS({
            type: 'stroke',
            roomId: bs.roomId,
            payload: {
                pageId: bs.currentPageId,
                stroke: obj.toObject(['id'])
            }
        });
        persistCurrentPage();
    });

    // --- Tools Setup ---

    // Color
    if (bs.tools.colorPicker) {
        bs.tools.colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            canvas.freeDrawingBrush.color = color;
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                if (activeObj.type === 'i-text' || activeObj.type === 'text') {
                    activeObj.set('fill', color);
                } else {
                    activeObj.set('stroke', color);
                }
                canvas.requestRenderAll();
                canvas.fire('object:modified', { target: activeObj });
            }
        });
    }

    // Brush Size
    if (bs.tools.brushSize) {
        bs.tools.brushSize.addEventListener('input', (e) => {
            const size = parseInt(e.target.value, 10);
            if (sizeValue) sizeValue.textContent = size;
            canvas.freeDrawingBrush.width = size;
        });
    }

    // Background Color
    if (backgroundPicker) {
        backgroundPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            bs.backgroundColor = color; // Update global state
            canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas));

            // If Eraser is active and using fallback (PencilBrush), update its color
            if (bs.currentTool === 'eraser' && !fabric.EraserBrush && canvas.freeDrawingBrush) {
                canvas.freeDrawingBrush.color = color;
            }

            bs.sendWS({
                type: 'background_change',
                roomId: bs.roomId,
                payload: {
                    backgroundColor: color,
                    pageId: bs.currentPageId
                }
            });
            persistCurrentPage();
        });
    }

    // Clear
    if (clearCanvasBtn) {
        clearCanvasBtn.addEventListener('click', () => {
            canvas.clear();
            canvas.setBackgroundColor('#000000', canvas.renderAll.bind(canvas));
            bs.sendWS({
                type: 'clear',
                roomId: bs.roomId,
                payload: { pageId: bs.currentPageId }
            });
            persistCurrentPage();
        });
    }

    // Size Selector
    if (sizeSelector) {
        const sizeOptions = sizeSelector.querySelectorAll('.size-option');
        sizeOptions.forEach((option) => {
            option.addEventListener('click', () => {
                const size = parseInt(option.getAttribute('data-size'), 10);
                if (size && bs.tools.brushSize) {
                    bs.tools.brushSize.value = size;
                    // canvas.freeDrawingBrush.width = size;
                    // Update brush width if drawing mode is active
                    if (canvas.freeDrawingBrush) {
                        canvas.freeDrawingBrush.width = size;
                    }
                    // Update visual feedback
                    sizeOptions.forEach(opt => opt.classList.remove('opacity-100'));
                    sizeOptions.forEach(opt => opt.classList.add('opacity-70'));
                    option.classList.remove('opacity-70');
                    option.classList.add('opacity-100');
                }
            });
        });
    }

    // --- UI Helpers ---
    if (addPageBtn) {
        if (window.IS_TEACHER) {
            addPageBtn.style.display = 'flex';
            addPageBtn.addEventListener('click', () => {
                bs.sendWS({ type: 'page_add', roomId: bs.roomId, payload: {} });
            });
        } else {
            addPageBtn.style.display = 'none';
        }
    }
    if (prevPageBtn) {
        if (!window.IS_TEACHER) {
            prevPageBtn.disabled = true;
            prevPageBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            prevPageBtn.addEventListener('click', () => movePage(-1));
        }
    }
    if (nextPageBtn) {
        if (!window.IS_TEACHER) {
            nextPageBtn.disabled = true;
            nextPageBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            nextPageBtn.addEventListener('click', () => movePage(1));
        }
    }

    // Remove old scroll-based viewport sync (we use viewportTransform now)

    // --- WebSocket Handling ---
    if (!window._boardHandlersRegistered && window.WSManager) {
        window._boardHandlersRegistered = true;

        window.WSManager.on('message', (msg) => {
            if (msg.roomId && msg.roomId !== bs.roomId) return;

            if (msg.type === 'page_state') {
                bs.pages = msg.payload?.pages || [];
                if (msg.payload?.currentPageId) {
                    // If we switched page, setCurrentPage handles valid persisted data
                    // But if it's a join, we might wait for snapshot
                    const pageId = msg.payload.currentPageId;
                    setCurrentPage(pageId);

                    // If no snapshot received yet, try loading from localStorage as fallback
                    setTimeout(() => {
                        if (!bs.pageStrokes[pageId] || (bs.pageStrokes[pageId].objects && bs.pageStrokes[pageId].objects.length === 0)) {
                            const storedPages = loadFromLocalStorage();
                            if (storedPages && storedPages[pageId] && storedPages[pageId].objects && storedPages[pageId].objects.length > 0) {
                                setCurrentPage(pageId);
                            }
                        }
                    }, 500); // Wait a bit for snapshot to arrive
                }
                updatePageIndicator();
                return;
            }

            if (msg.type === 'snapshot') {
                const targetPageId = msg.payload?.pageId || bs.currentPageId || 'page-1';
                // msg.payload.strokes is strictly strokes array if from server standard
                // But server sends { objects: [...] } structure?
                // Server code sends `strokes: page.strokes`.
                // Fabric loadFromJSON expects { objects: [], background: ... } usually.
                // We need to wrap it if it's just an array of objects.

                let dataToStore = {};
                if (Array.isArray(msg.payload.strokes)) {
                    dataToStore = { objects: msg.payload.strokes };
                } else {
                    dataToStore = msg.payload.strokes || { objects: [] };
                }

                applySnapshot(targetPageId, dataToStore, msg.payload.backgroundColor);
                return;
            }

            const targetPageId = msg.payload?.pageId || bs.currentPageId;
            if (targetPageId && bs.currentPageId && targetPageId !== bs.currentPageId) {
                return;
            }

            if (msg.type === 'stroke') {
                const objData = msg.payload.stroke;
                if (!objData) return;

                fabric.util.enlivenObjects([objData], (enlivened) => {
                    enlivened.forEach((obj) => {
                        obj.is_remote = true;
                        const exists = canvas.getObjects().find(o => o.id === obj.id);
                        if (!exists) {
                            canvas.add(obj);
                            canvas.requestRenderAll();
                        }
                    });
                });
                persistCurrentPage();

            } else if (msg.type === 'background_change') {
                // Check if it's for current page or we need to update storage
                const pId = msg.payload.pageId || bs.currentPageId;
                if (pId === bs.currentPageId) {
                    if (msg.payload.backgroundColor) {
                        const newBg = msg.payload.backgroundColor;
                        bs.backgroundColor = newBg;
                        canvas.setBackgroundColor(newBg, canvas.renderAll.bind(canvas));
                        if (backgroundPicker) backgroundPicker.value = newBg;

                        // Update eraser if active
                        if (bs.currentTool === 'eraser' && !fabric.EraserBrush && canvas.freeDrawingBrush) {
                            canvas.freeDrawingBrush.color = newBg;
                        }
                    }
                }
                // Store it
                if (bs.pageStrokes[pId]) {
                    bs.pageStrokes[pId].background = msg.payload.backgroundColor;
                }
                persistCurrentPage();

            } else if (msg.type === 'clear') {
                canvas.clear();
                canvas.setBackgroundColor('#000000', canvas.renderAll.bind(canvas));
                // Clear localStorage for this page
                try {
                    const storageKey = getStorageKey();
                    const stored = localStorage.getItem(storageKey);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed[bs.currentPageId]) {
                            parsed[bs.currentPageId] = { objects: [], background: '#000000' };
                            localStorage.setItem(storageKey, JSON.stringify(parsed));
                        }
                    }
                } catch (e) {
                    console.warn('Failed to clear localStorage:', e);
                }
                persistCurrentPage();
            } else if (msg.type === 'viewport_change') {
                // Students receive and apply teacher's scroll position
                if (!window.IS_TEACHER && msg.payload) {
                    bs.isRemoteScrolling = true;
                    if (bs.canvasContainer) {
                        if (msg.payload.scrollTop !== undefined) bs.canvasContainer.scrollTop = msg.payload.scrollTop;
                        if (msg.payload.scrollLeft !== undefined) bs.canvasContainer.scrollLeft = msg.payload.scrollLeft;
                    }
                    setTimeout(() => { bs.isRemoteScrolling = false; }, 100);
                }
            } else if (msg.type === 'viewport_transform') {
                // Students receive and apply teacher's viewport transform (zoom/pan)
                if (!window.IS_TEACHER && msg.payload.viewportTransform) {
                    const transform = msg.payload.viewportTransform;
                    canvas.setViewportTransform(transform);
                    canvas.renderAll();
                }
            } else if (msg.type === 'object_modified') {
                const objData = msg.payload.object;
                if (objData && objData.id) {
                    const exists = canvas.getObjects().find(o => o.id === objData.id);
                    if (exists) {
                        exists.set(objData);
                        exists.setCoords();
                        canvas.requestRenderAll();
                        persistCurrentPage();
                    }
                }
            }
        });

        window.WSManager.on('open', () => {
            if (wsStatus) {
                wsStatus.classList.remove('bg-gray-400', 'bg-red-500');
                wsStatus.classList.add('bg-green-500');
            }
        });
        window.WSManager.on('close', () => {
            if (wsStatus) {
                wsStatus.classList.remove('bg-green-500');
                wsStatus.classList.add('bg-gray-400');
            }
        });
    }

    // Listeners for Tools
    bs.tools.pen && bs.tools.pen.addEventListener('click', () => bs.selectPen());
    bs.tools.text && bs.tools.text.addEventListener('click', () => bs.selectText());
    bs.tools.eraser && bs.tools.eraser.addEventListener('click', () => bs.selectEraser());
    bs.tools.arrow && bs.tools.arrow.addEventListener('click', () => bs.selectArrow());

    // Try loading from localStorage on initial load (before WebSocket snapshot)
    setTimeout(() => {
        if (bs.currentPageId) {
            const storedPages = loadFromLocalStorage();
            if (storedPages && storedPages[bs.currentPageId]) {
                // Only load if we don't have data yet
                if (!bs.pageStrokes[bs.currentPageId] ||
                    (bs.pageStrokes[bs.currentPageId].objects && bs.pageStrokes[bs.currentPageId].objects.length === 0)) {
                    setCurrentPage(bs.currentPageId);
                }
            }
        }
    }, 200);

    // Select Arrow by default (handles UI reset)
    if (bs.selectArrow) {
        bs.selectArrow();
    }
});
