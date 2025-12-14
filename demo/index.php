<?php
// include 'admin.tutorarc.com/config7.php';

$websiteurl = "http://localhost:8080";
$pagename = "Global One-to-One Online Tutoring Platform";
$metatitle = "One-to-One Online Tutoring | Expert Tutors for US, UK & India Students";
$metadescription = "TutorArc offers personalized one-to-one online tutoring for students across the US, UK, and India. Learn from certified tutors in Math, Science, English, Coding, and more — tailored to your school curriculum and learning goals.";
$metakeywords = "TutorArc, demo, one-to-one tutoring, online tutoring platform, private tutors, US UK India tutoring, personalized learning, online education, live tutoring, academic support, homework help, test prep";
// $metapic =  $websiteurl . "/images/logo.png";
$roomId = 'default-room';
if (isset($_GET['id']) && !empty($_GET['id'])) {
    $roomId = $_GET['id'];
} elseif (isset($_SERVER['PATH_INFO']) && !empty($_SERVER['PATH_INFO'])) {
    $roomId = trim($_SERVER['PATH_INFO'], '/');
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script>
        // Global variables accessible from all components
        window.ROOM_ID = "<?php echo htmlspecialchars($roomId); ?>";
        window.WS_URL = "http://localhost:4001"; // Centralized WebSocket URL
        // window.WS_URL = "https://board-smart-tarc.tutorarc.com"; // Centralized WebSocket URL
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
    <script src="ws.js"></script>
    <style>
        .popup-enter {
            animation: slideUp 0.2s ease-out;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>

<body class="bg-gray-50 overflow-hidden max-w-svw max-h-svh">
    <!-- Main Container -->
    <div class="h-screen w-screen flex flex-col max-w-svw max-h-svh">
        <!-- Main Content Grid -->
        <div class="flex-1 grid grid-cols-1 grid-rows-[65%_35%] xl:grid-cols-[1fr_360px]
         xl:grid-rows-1 h-full">
            <!-- Left Panel -->
            <div id="leftPanel"
                class="bg-white border-r max-w-[1400px] border-gray-200 flex flex-col relative overflow-hidden min-h-0">
                <!-- Initially holds Whiteboard -->
                <div id="whiteboardContainer" class="w-full h-full flex flex-col bg-gray-50 relative">
                    <?php include 'board.php'; ?>
                </div>
            </div>

            <!-- Right Panel -->
            <div id="rightPanel" class="flex flex-col h-full bg-white overflow-hidden min-h-0">
                <div id="videoContainer" class="w-full h-full flex flex-row lg:flex-col">
                    <!-- Top: Video Section (Target for Swap) -->
                    <!-- <div id="rightVideoSection"
                        class="border-r border-gray-200 lg:border-r-0 lg:border-b flex-none relative w-1/2 h-full lg:w-full lg:h-[40%]"> -->
                    <!-- Wrapper for Video content to be moved -->
                    <!-- <div id="videoWrapper" class="w-full h-full relative"> -->
                    <?php // include 'video.php'; 
                    ?>
                    <!-- </div>
                    </div> -->

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