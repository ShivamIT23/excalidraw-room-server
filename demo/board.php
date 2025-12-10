<!-- Whiteboard Toolbar -->
<!-- Whiteboard Toolbar & Header -->
<div class="absolute top-4 left-4 z-10 flex flex-col gap-4">
    <!-- Logo -->
    <div>
        <img src="./images/logo.png" alt="TutorArc" class="h-8">
    </div>

    <!-- Tools -->
    <div class="bg-white shadow-lg rounded-lg p-2 flex flex-row md:flex-col gap-2 border border-gray-200 max-w-fit">
        <!-- Color Picker -->
        <div class="relative group">
            <input type="color" id="colorPicker" value="#000000"
                class="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden">
            <div
                class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                Color
            </div>
        </div>

        <!-- Pen -->
        <button id="penTool" title="Pen"
            class="tool-btn active w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-blue-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z">
                </path>
            </svg>
        </button>

        <!-- Text -->
        <button id="textTool" title="Text"
            class="tool-btn w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129">
                </path>
            </svg>
        </button>

        <!-- Eraser -->
        <button id="eraserTool" title="Eraser"
            class="tool-btn w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-600">
            <svg width="70%" height="70%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M17.9995 13L10.9995 6.00004M20.9995 21H7.99955M10.9368 20.0628L19.6054 11.3941C20.7935 10.2061 21.3875 9.61207 21.6101 8.92709C21.8058 8.32456 21.8058 7.67551 21.6101 7.07298C21.3875 6.388 20.7935 5.79397 19.6054 4.60592L19.3937 4.39415C18.2056 3.2061 17.6116 2.61207 16.9266 2.38951C16.3241 2.19373 15.675 2.19373 15.0725 2.38951C14.3875 2.61207 13.7935 3.2061 12.6054 4.39415L4.39366 12.6059C3.20561 13.794 2.61158 14.388 2.38902 15.073C2.19324 15.6755 2.19324 16.3246 2.38902 16.9271C2.61158 17.6121 3.20561 18.2061 4.39366 19.3941L5.06229 20.0628C5.40819 20.4087 5.58114 20.5816 5.78298 20.7053C5.96192 20.815 6.15701 20.8958 6.36108 20.9448C6.59126 21 6.83585 21 7.32503 21H8.67406C9.16324 21 9.40784 21 9.63801 20.9448C9.84208 20.8958 10.0372 20.815 10.2161 20.7053C10.418 20.5816 10.5909 20.4087 10.9368 20.0628Z"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </button>
        <button id="clearCanvas" title="Clear"
            class="tool-btn w-8 h-8 flex items-center justify-center rounded hover:bg-red-600/80 transition-colors text-red-500 hover:text-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
            </svg>
        </button>
    </div>
</div>

<!-- Page Controls (Top Right) -->
<div class="absolute bottom-2 right-2 z-10 flex items-center gap-2">
    <button id="prevPageBtn"
        class="bg-white shadow-md border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
        <i class="fa fa-arrow-left" aria-hidden="true"></i>
    </button>
    <div id="pageIndicator"
        class="bg-white shadow-sm border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium">
        1
    </div>
    <button id="nextPageBtn"
        class="bg-white shadow-md border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
        <i class="fa fa-arrow-right" aria-hidden="true"></i>
    </button>
    <button id="addPageBtn" style="display:none;"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Add
    </button>
</div>

<!-- Clear & Size Controls (Bottom Left) -->
<div class="absolute bottom-2 left-2 z-10 flex gap-2">
    <div class="bg-white shadow-lg rounded-lg p-2 flex items-center gap-2 border border-gray-200">
        <label class="text-xs font-medium text-gray-700">Size:</label>
        <input type="range" id="brushSize" min="1" max="40" value="3" class="w-20">
    </div>
</div>

<!-- Canvas Container -->
<div class="flex-1 relative bg-white overflow-auto" id="canvasContainer">
    <canvas id="whiteboardCanvas" class="absolute top-0 left-0 cursor-crosshair"></canvas>
    <!-- Text Input (Hidden by default) -->
    <input type="text" id="textInput" class="absolute hidden border-2 border-blue-500 px-2 py-1 text-lg outline-none"
        style="background: transparent;">
</div>

<!-- WebSocket Connection Status -->
<div class="bg-gray-200 absolute top-2 right-2 rounded-[5px] border-t w-fit border-gray-200 px-2 py-1">
    <div class="flex items-center gap-2">
        <div id="wsStatus" class="w-4 h-4 animate-pulse rounded-full bg-gray-400"></div>
    </div>
</div>

<script src="tools/state.js"></script>
<script src="tools/color.js"></script>
<script src="tools/pen.js"></script>
<script src="tools/text.js"></script>
<script src="tools/eraser.js"></script>
<script src="tools/clear.js"></script>
<script src="tools/main.js"></script>