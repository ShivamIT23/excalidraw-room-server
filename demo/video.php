<!-- Video Container -->
<!-- Video Container -->

<div class="relative h-full bg-gray-900 overflow-hidden flex items-center justify-center group">
    <!-- Others Video (Main Background) -->
    <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center">
            <svg class="w-20 h-20 mx-auto text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z">
                </path>
            </svg>
            <p class="text-gray-500 text-lg font-medium">Video section</p>
            <p class="text-gray-600 text-sm mt-1">Others video</p>
        </div>
    </div>

    <!-- My Video (Picture-in-Picture) -->
    <!-- Increased size as requested -->
    <!-- My Video (Picture-in-Picture) -->
    <!-- Increased size as requested -->
    <div
        class="absolute bottom-4 right-4 w-24 h-16 md:w-32 md:h-24 bg-gray-800 rounded-lg border-2 border-gray-700 shadow-xl overflow-hidden flex items-center justify-center z-10 transition-all duration-300">
        <!-- Placeholder Icon (hidden when video is active) -->
        <div id="myVideoPlaceholder" class="text-center">
            <svg class="w-8 h-8 mx-auto text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            <p class="text-gray-500 text-xs">My Video</p>
        </div>
        <!-- Local Video Element -->
        <video id="myVideo" autoplay muted playsinline class="w-full h-full object-cover scale-x-[-1] hidden"></video>
    </div>

    <!-- Mute/Unmute Button -->
    <button id="muteBtn"
        class="absolute top-4 right-4 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all backdrop-blur-sm">
        <svg id="muteIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z">
            </path>
        </svg>
        <svg id="unmuteIcon" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                clip-rule="evenodd"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
        </svg>
    </button>
    <!-- Swap/Maximize Button -->
    <button onclick="window.swapLayout()"
        class="absolute top-4 left-4 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-lg transition-all backdrop-blur-sm flex items-center gap-1">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
        </svg>
        <span class="text-xs font-medium">Swap</span>
    </button>
</div>

<script>
    // Video Controls
    (() => {
        const muteBtn = document.getElementById('muteBtn');
        const muteIcon = document.getElementById('muteIcon');
        const unmuteIcon = document.getElementById('unmuteIcon');
        const myVideo = document.getElementById('myVideo');
        const myVideoPlaceholder = document.getElementById('myVideoPlaceholder');

        let localStream = null;
        let isMuted = false;

        // Initialize user media
        async function initCamera() {
            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                if (myVideo) {
                    myVideo.srcObject = localStream;
                    myVideo.classList.remove('hidden');
                    myVideoPlaceholder.classList.add('hidden');
                }
            } catch (err) {
                console.error("Error accessing webcam: ", err);
                // Keep placeholder if error
            }
        }

        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;

            // Toggle audio tracks
            if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                    track.enabled = !isMuted;
                });
            }

            if (isMuted) {
                muteIcon.classList.add('hidden');
                unmuteIcon.classList.remove('hidden');
            } else {
                muteIcon.classList.remove('hidden');
                unmuteIcon.classList.add('hidden');
            }
        });

        // Start camera on load
        initCamera();
    })();
</script>