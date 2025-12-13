<!-- Whiteboard Toolbar -->
<!-- Whiteboard Toolbar & Header -->
<div class="flex items-center border-b bg-[#f7f9fb] border-purple-900 p-2 gap-2 w-full">
    <!-- Logo -->
    <div>
        <img src="./images/logo.png" alt="TutorArc" class="h-8 shadow-xs">
    </div>
    <button id="addPageBtn" style="display:none;"
        class="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-[5px] text-sm font-medium transition-colors flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
    </button>
    <button id="prevPageBtn"
        class="bg-transparent border border-gray-200 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-[5px] text-xs font-medium transition-colors">
        <i class="fa fa-arrow-left" aria-hidden="true"></i>
    </button>
    <div id="pageIndicator"
        class="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-[5px] text-xs font-medium">
        1
    </div>
    <button id="nextPageBtn"
        class="bg-transparent border border-gray-200 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-[5px] text-xs font-medium transition-colors">
        <i class="fa fa-arrow-right" aria-hidden="true"></i>
    </button>
    <input type="color" id="backgroundPicker" value="#000000"
        class="rounded cursor-pointer text-shadow-sm border border-gray-50 p-0 h-[34px] w-[34px] rounded-[5px] border border-gray-200  overflow-hidden">
</div>
<div class=" h-full w-full flex ">
    <!-- Tools -->
    <div class="bg-[#f7f9fb] p-2 border-r border-gray-200 flex flex-col gap-2 max-w-fit relative z-20">

        <!-- Color Picker -->
        <div class="relative group">
            <input type="color" id="colorPicker" value="#ffffff"
                class="w-8 h-10 rounded cursor-pointer border border-gray-50 p-0 overflow-hidden">
            <div
                class="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                Stroke
            </div>
        </div>

        <!--Size -->
        <div class="relative group border-y border-gray-600 pt-2">
            <p class="text-sm font-medium text-gray-700 w-full flex justify-center">Size</p>
            <div id="sizeSelector" class="relative group flex flex-col items-center gap-2.5 py-2 cursor-pointer">

                <!-- Option 0 -->
                <div data-size="1"
                    class="size-option w-full h-0.5 bg-black rounded-full opacity-70 hover:opacity-100 transition">
                </div>
                <!--Option 1 -->
                <div data-size="5"
                    class="size-option w-full h-1 bg-black rounded-full opacity-70 hover:opacity-100 transition"></div>

                <!-- Option 2 -->
                <div data-size="11"
                    class="size-option w-full h-1.5 bg-black rounded-full opacity-70 hover:opacity-100 transition">
                </div>

                <!-- Option 3 -->
                <div data-size="17"
                    class="size-option w-full h-2 bg-black rounded-full opacity-70 hover:opacity-100 transition"></div>

                <!-- Option 4 -->
                <div data-size="23"
                    class="size-option w-full h-2.5 bg-black rounded-full opacity-70 hover:opacity-100 transition">
                </div>

            </div>
            <!-- Hidden input for backward compatibility with JS that references brushSize -->
            <input type="hidden" id="brushSize" value="5">
        </div>



        <!-- Arrow (Selection) -->
        <button id="arrowTool" title="Select"
            class="tool-btn active w-8 h-8 flex items-center justify-center rounded bg-gray-500 text-white hover:text-gray-100 hover:bg-gray-500 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122">
                </path>
            </svg>
        </button>

        <!-- Hand (Pan) -->
        <button id="handTool" title="Pan"
            class="tool-btn w-8 h-8 flex items-center bg-transparent justify-center rounded hover:bg-gray-500 hover:text-gray-100 transition-colors text-black">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11">
                </path>
            </svg>
        </button>

        <!-- Pen -->
        <button id="penTool" title="Pen"
            class="tool-btn w-8 h-8 flex items-center justify-center rounded bg-transparent text-black hover:text-gray-100 hover:bg-gray-500 transition-colors">
            <i class="fa fa-pencil scale-y-[-1]" style="color:currentColor" aria-hidden="true"></i>
        </button>

        <!-- Text -->
        <button id="textTool" title="Text"
            class="tool-btn w-8 h-8 flex items-center bg-transparent justify-center rounded hover:bg-gray-500 hover:text-gray-100 transition-colors text-black">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129">
                </path>
            </svg>
        </button>

        <!-- Eraser -->
        <button id="eraserTool" title="Eraser"
            class="tool-btn w-8 h-8 flex items-center bg-transparent justify-center rounded hover:bg-gray-500 hover:text-gray-100 transition-colors text-black">
            <svg width="70%" height="70%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M17.9995 13L10.9995 6.00004M20.9995 21H7.99955M10.9368 20.0628L19.6054 11.3941C20.7935 10.2061 21.3875 9.61207 21.6101 8.92709C21.8058 8.32456 21.8058 7.67551 21.6101 7.07298C21.3875 6.388 20.7935 5.79397 19.6054 4.60592L19.3937 4.39415C18.2056 3.2061 17.6116 2.61207 16.9266 2.38951C16.3241 2.19373 15.675 2.19373 15.0725 2.38951C14.3875 2.61207 13.7935 3.2061 12.6054 4.39415L4.39366 12.6059C3.20561 13.794 2.61158 14.388 2.38902 15.073C2.19324 15.6755 2.19324 16.3246 2.38902 16.9271C2.61158 17.6121 3.20561 18.2061 4.39366 19.3941L5.06229 20.0628C5.40819 20.4087 5.58114 20.5816 5.78298 20.7053C5.96192 20.815 6.15701 20.8958 6.36108 20.9448C6.59126 21 6.83585 21 7.32503 21H8.67406C9.16324 21 9.40784 21 9.63801 20.9448C9.84208 20.8958 10.0372 20.815 10.2161 20.7053C10.418 20.5816 10.5909 20.4087 10.9368 20.0628Z"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </button>

        <!-- Clear -->
        <button id="clearCanvas" title="Clear"
            class="tool-btn w-8 h-8 flex items-center justify-center rounded hover:bg-red-600/80 transition-colors text-red-500 hover:text-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16">
                </path>
            </svg>
        </button>


    </div>
    <div class="flex-1 relative bg-white overflow-hidden" id="canvasContainer">
        <canvas id="whiteboardCanvas" class="absolute top-0 left-0"></canvas>
    </div>
</div>

<!-- Page Controls (Top Right) -->
<div class="absolute bottom-2 right-2 z-10 flex items-center gap-2">

</div>

<!-- Canvas Container -->


<!-- WebSocket Connection Status -->
<div class="bg-gray-200 absolute top-2 right-2 rounded-[5px] border-t w-fit border-gray-200 px-2 py-1">
    <div class="flex items-center gap-2">
        <div id="wsStatus" class="w-4 h-4 animate-pulse rounded-full bg-gray-400"></div>
    </div>
</div>

<script src="tools/state.js"></script>
<script src="tools/color.js"></script>
<script src="tools/arrow.js"></script>
<script src="tools/hand.js"></script>
<script src="tools/pen.js"></script>
<script src="tools/text.js"></script>
<script src="tools/eraser.js"></script>
<script src="tools/clear.js"></script>
<script src="tools/main.js"></script>