<?php
// include 'admin.tutorarc.com/config7.php';

$websiteurl = "http://localhost:8080";
$pagename = "Global One-to-One Online Tutoring Platform";
$metatitle = "One-to-One Online Tutoring | Expert Tutors for US, UK & India Students";
$metadescription = "TutorArc offers personalized one-to-one online tutoring for students across the US, UK, and India. Learn from certified tutors in Math, Science, English, Coding, and more — tailored to your school curriculum and learning goals.";
$metakeywords = "TutorArc, demo, one-to-one tutoring, online tutoring platform, private tutors, US UK India tutoring, personalized learning, online education, live tutoring, academic support, homework help, test prep";
// $metapic =  $websiteurl . "/images/logo.png";
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <?php
    // Parse room ID from PATH_INFO (e.g., /index.php/room1) or GET parameter
    $roomId = 'default-room';
    if (isset($_GET['id']) && !empty($_GET['id'])) {
        $roomId = $_GET['id'];
    } elseif (isset($_SERVER['PATH_INFO']) && !empty($_SERVER['PATH_INFO'])) {
        $roomId = trim($_SERVER['PATH_INFO'], '/');
    }
    ?>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script>
        // Global variables accessible from all components
        window.ROOM_ID = "<?php echo htmlspecialchars($roomId); ?>";
        window.WS_URL = "https://board-smart-tarc.tutorarc.com"; // Centralized WebSocket URL
        // window.WS_URL = "https://excalidraw-room-server-1.onrender.com"; // Centralized WebSocket URL
        // window.WS_URL = "https://excalidraw-room-server-production-130f.up.railway.app/"; // Centralized WebSocket URL

        // Generate or retrieve persistent user ID
        if (!localStorage.getItem('user_id')) {
            const newID = Math.random().toString(36).substr(2, 5);
            localStorage.setItem('user_id', newID);
        }
        window.USER_NAME = 'User-' + localStorage.getItem('user_id');

        // Teacher Logic
        window.IS_TEACHER = localStorage.getItem('isTeacher') === 'true';
    </script>

    <script>
        // Shared WebSocket Manager (Socket.IO version)
        window.WSManager = {
            socket: null,
            handlers: {},

            connect: function() {
                this.socket = io(window.WS_URL, {
                    transports: ['websocket', 'polling'],
                    reconnection: true
                });

                this.socket.on('connect', () => {
                    console.log('Socket.IO connected');
                    // Join room
                    this.send({
                        type: 'join',
                        roomId: window.ROOM_ID,
                        payload: {
                            user: {
                                name: window.USER_NAME,
                                isTeacher: window.IS_TEACHER
                            }
                        }
                    });
                    this.trigger('open');
                });

                // Listen to all relevant events and map to 'message' handler
                const events = ['stroke_chunk', 'stroke', 'stroke_end', 'clear', 'chat', 'chat_history', 'chat_state', 'chat_delete', 'chat_toggle', 'chat_clear', 'typing', 'snapshot', 'error', 'viewport_change', 'layout_change', 'user_join', 'room_users', 'cursor'];

                events.forEach(event => {
                    this.socket.on(event, (data) => {
                        // Reconstruct msg object: { type, roomId, payload }
                        const msg = {
                            type: event,
                            roomId: data.roomId,
                            payload: data.payload || data
                        };

                        // Special handling for 'error'
                        if (event === 'error') {
                            msg.message = data.message;
                        }

                        this.trigger('message', msg);
                    });
                });

                this.socket.on('disconnect', () => {
                    console.log('Socket.IO disconnected');
                    this.trigger('close');
                });

                this.socket.on('connect_error', (err) => {
                    console.error('Socket.IO error', err);
                    this.trigger('error', err);
                });
            },

            send: function(obj) {
                if (this.socket && this.socket.connected) {
                    const {
                        type,
                        roomId,
                        payload
                    } = obj;
                    this.socket.emit(type, {
                        roomId,
                        payload
                    });
                }
            },

            on: function(event, handler) {
                if (!this.handlers[event]) this.handlers[event] = [];
                // Prevent duplicate handlers
                if (!this.handlers[event].includes(handler)) {
                    this.handlers[event].push(handler);
                }
            },

            trigger: function(event, data) {
                if (this.handlers[event]) {
                    this.handlers[event].forEach(h => h(data));
                }
            }
        };

        // Auto-connect when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            window.WSManager.connect();
        });


        // Layout Swap Function
        window.isSwapped = false;

        window.swapLayout = function(isRemote = false) {
            const whiteboardContainer = document.getElementById('whiteboardContainer');
            const videoWrapper = document.getElementById('videoWrapper'); // Moves freely

            // If we are swapping, we need to know current state.
            // Simplified: we just toggle parent containers.

            const leftPanel = document.getElementById('leftPanel');
            const rightVideoSection = document.getElementById('rightVideoSection');

            // Check where whiteboard currently is
            if (whiteboardContainer.parentElement === leftPanel) {
                // Swap: Video -> Left, Whiteboard -> Right
                leftPanel.appendChild(videoWrapper);
                rightVideoSection.appendChild(whiteboardContainer);
                window.isSwapped = true;
            } else {
                // Restore: Whiteboard -> Left, Video -> Right
                leftPanel.appendChild(whiteboardContainer);
                rightVideoSection.appendChild(videoWrapper);
                window.isSwapped = false;
            }

            // Trigger resize to fix canvas/video dimensions
            window.dispatchEvent(new Event('resize'));

            // Broadcast change if local action
            if (!isRemote) {
                window.WSManager.socket.emit('layout_change', {
                    roomId: window.ROOM_ID,
                    payload: {
                        layout: window.isSwapped ? 'swapped' : 'default'
                    }
                });
            }
        };

        // Listen for layout changes
        document.addEventListener('DOMContentLoaded', () => {
            window.WSManager.connect();

            // Wait for socket to be ready to attach listener via WSManager or direct if exposed
            // Since IDK if WSManager exposes direct 'on', I'll use the mapped message handler or raw socket if available.
            // The events array above maps it to 'message', so we catch it there.

            window.WSManager.on('message', (msg) => {
                if (msg.type === 'layout_change') {
                    const targetLayout = msg.payload.layout; // 'swapped' or 'default'
                    // Only swap if state mismatch
                    if ((targetLayout === 'swapped' && !window.isSwapped) ||
                        (targetLayout === 'default' && window.isSwapped)) {
                        swapLayout(true);
                    }
                }

                // Check for remote user activity to hide the "Please Wait" overlay
                // We check for specific events or simply ANY message from another user
                if (msg.type === 'user_join' || msg.type === 'room_users' || msg.type === 'chat' || msg.type === 'typing' || msg.type === 'stroke' || msg.type === 'cursor' || window.IS_TEACHER) {
                    const overlay = document.getElementById('pleaseWaitOverlay');
                    if (overlay) overlay.style.display = 'none';

                    // If teacher is here, we can hide the overlay (already done by the condition above if THIS user is teacher)
                    // But if this is a student, we wait for events.
                    if (window.IS_TEACHER) return;

                    // Ideally check if payload.user.name != window.USER_NAME
                    // But for 'user_join' it means someone ELSE joined usually (except if echo)
                    // Let's check payload if possible
                    let isRemote = false;

                    // If it's a join event, and it's not us (or even if it is us, if the server says 'another user joined')
                    if (msg.type === 'user_join') {
                        isRemote = true;
                    } else if (msg.type === 'room_users') {
                        // If users count > 1
                        if (msg.payload && (Array.isArray(msg.payload) ? msg.payload.length > 1 : msg.payload.count > 1)) {
                            isRemote = true;
                        }
                    } else if (msg.payload && msg.payload.user && msg.payload.user.name !== window.USER_NAME) {
                        isRemote = true;
                    }
                    // For stroke/cursor, payload might not have user inside directly sometimes, but let's assume it does or we check safe events
                    else if (msg.type === 'chat' && msg.payload.user && msg.payload.user.name !== window.USER_NAME) {
                        isRemote = true;
                    }

                    if (isRemote) {
                        if (overlay) overlay.style.display = 'none';
                    }
                }
            });

            // Initial check for teacher to hide overlay immediately
            if (window.IS_TEACHER) {
                const overlay = document.getElementById('pleaseWaitOverlay');
                if (overlay) overlay.style.display = 'none';
            }
        });
    </script>
</head>

<body class="bg-gray-50 overflow-hidden max-w-svw max-h-svh">
    <!-- Main Container -->
    <div class="h-screen w-screen flex flex-col max-w-svw max-h-svh">
        <!-- Main Content Grid -->
        <!-- Main Content Grid -->
        <div class="flex-1 grid grid-cols-1 grid-rows-[65%_35%] lg:grid-cols-[75%_25%] lg:grid-rows-1 h-full">
            <!-- Left Panel -->
            <div id="leftPanel" class="bg-white border-r border-gray-200 flex flex-col relative overflow-hidden min-h-0">
                <!-- Initially holds Whiteboard -->
                <div id="whiteboardContainer" class="w-full h-full flex flex-col relative">
                    <?php include 'board.php'; ?>
                </div>
            </div>

            <!-- Right Panel -->
            <div id="rightPanel" class="flex flex-col h-full bg-white overflow-hidden min-h-0">
                <div id="videoContainer" class="w-full h-full flex flex-row lg:flex-col">
                    <!-- Top: Video Section (Target for Swap) -->
                    <div id="rightVideoSection" class="border-r border-gray-200 lg:border-r-0 lg:border-b flex-none relative w-1/2 h-full lg:w-full lg:h-[40%]">
                        <!-- Wrapper for Video content to be moved -->
                        <div id="videoWrapper" class="w-full h-full relative">
                            <?php include 'video.php'; ?>
                        </div>
                    </div>

                    <!-- Bottom: Chat Section (FIXED) -->
                    <div class="flex-1 flex flex-col min-h-0 overflow-hidden w-1/2 lg:w-full h-full lg:h-auto">
                        <?php include 'chat.php'; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Please Wait Overlay -->
    <div id="pleaseWaitOverlay" class="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center">
        <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Please Wait...</h2>
            <p class="text-gray-600">While Teacher is coming</p>
        </div>
    </div>
</body>

</html>