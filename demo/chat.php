<!-- Chat Container -->
<div class="flex flex-col h-full bg-white relative">
    <!-- Chat Header -->
    <div class="bg-gray-50 border-b border-gray-200 px-4 py-[9.2px] flex justify-between items-center gap-2">
        <h2 class="font-semibold">Welcome Shivam</h2>
        <h3 class="text-sm font-semibold text-gray-700 flex-1 whitespace-nowrap">(<span
                class="text-xs text-gray-500 font-medium" id=""><span id="'userCount">1</span> users</span>)</h3>
        <button id="toggleChatBtn"
            class="bg-yellow-600/50 rounded-[5px] text-gray-50 text-sm py-1 px-2 hover:bg-yellow-500 transition-colors duration-300">
            <svg id="chat_start" style="display: none;" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24">
                <g>
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path
                        d="M6.455 19L2 22.5V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.455zm-.692-2H20V5H4v13.385L5.763 17zm5.53-4.879l4.243-4.242 1.414 1.414-5.657 5.657-3.89-3.89 1.415-1.414 2.475 2.475z" />
                </g>
            </svg>
            <svg id="chat_stop" class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <g>
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path
                        d="M6.455 19L2 22.5V4a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.455zM4 18.385L5.763 17H20V5H4v13.385zM13.414 11l2.475 2.475-1.414 1.414L12 12.414 9.525 14.89l-1.414-1.414L10.586 11 8.11 8.525l1.414-1.414L12 9.586l2.475-2.475 1.414 1.414L13.414 11z" />
                </g>
            </svg>
        </button>
        <button id="clearChatBtn"
            class="bg-red-600/50 rounded-[5px] text-gray-50 text-[16px] py-1 px-2 hover:bg-red-500 transition-colors duration-300"><i
                class="fa fa-trash-o" aria-hidden="true"></i></button>
    </div>

    <!-- Messages Container -->
    <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <!-- Messages will be added here dynamically -->
    </div>

    <!-- Typing Indicator -->
    <div id="typingIndicator" class="px-4 py-1 text-xs text-gray-500 italic hidden h-6">
        Someone is typing...
    </div>

    <!-- Input Area -->
    <div class="border-t border-gray-200 p-4 bg-white flex-none">
        <div class="flex gap-2 relative">
            <!-- Frequent Messages Popup -->
            <div id="frequentMessagesPopup"
                class="absolute bottom-full right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg w-fit max-w-2/3 pr-1 z-50 hidden"
                style="animation: slideUp 0.2s ease-out;">
                <ul id="frequentMessageList" class="py-2">
                    <!-- Messages will be inserted here by JavaScript -->
                </ul>
            </div>
            <div class="flex-1 rounded-[5px] relative h-[40px]">
                <input type="text" id="chatInput" placeholder="Input Message"
                    class="text-base pl-2 pr-6 py-2 md:text-sm border border-gray-300 h-full rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full">
                <div id="toggleBtn"
                    class="absolute right-2 top-1/2 h-full transform -translate-y-1/2 cursor-pointer flex items-center justify-center gap-1 transition-all">
                    <i id="dropIcon" style="transform: scaleY(1); font-size: 12px;"
                        class="fa fa-chevron-up text-gray-400 hover:text-gray-600"></i>
                </div>
            </div>
            <button id="sendBtn"
                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-[5px] font-medium transition-colors">
                Send
            </button>
        </div>
    </div>
</div>

<script>
    // Chat Logic
    (() => {
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        const clearChatBtn = document.getElementById('clearChatBtn'); // New button
        const typingIndicator = document.getElementById('typingIndicator');

        const roomId = window.ROOM_ID || 'tutoring-room-1';
        const userName = window.USER_NAME || 'User-guest';

        let typingTimeout = null;
        let isTyping = false;

        // Initial setup for teacher controls
        const toggleChatBtn = document.getElementById('toggleChatBtn'); // New button

        // State
        let isChatEnabled = true;

        // Initial setup for teacher controls
        if (window.IS_TEACHER) {
            if (clearChatBtn) clearChatBtn.style.display = 'block';
            if (toggleChatBtn) {
                toggleChatBtn.style.display = 'block';
                toggleChatBtn.addEventListener('click', () => {
                    // Toggle logic
                    const newState = !isChatEnabled;
                    sendWS({
                        type: 'chat_toggle',
                        roomId,
                        payload: {
                            enabled: newState
                        }
                    });
                });
            }
        } else {
            if (clearChatBtn) clearChatBtn.style.display = 'none';
            if (toggleChatBtn) toggleChatBtn.style.display = 'none';
            // toggleChatBtn is hidden by default class
        }

        if (clearChatBtn && window.IS_TEACHER) {
            clearChatBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear the entire chat history?')) {
                    sendWS({
                        type: 'chat_clear',
                        roomId,
                        payload: {}
                    });
                }
            });
        }

        function updateChatState(enabled) {
            isChatEnabled = enabled;

            const startBtn = document.getElementById('chat_start');
            const stopBtn = document.getElementById('chat_stop');

            if (toggleChatBtn) {
                if (enabled) {
                    startBtn.style.display = 'none'
                    stopBtn.style.display = 'block'
                } else {
                    stopBtn.style.display = 'none'
                    startBtn.style.display = 'block'
                }
            }

            // Update Toggle Button Text (for teacher)
            // if (toggleChatBtn) {
            //     toggleChatBtn.textContent = enabled ? 'Stop' : 'Start';
            //     toggleChatBtn.className = enabled ?
            //         "bg-yellow-600/50 rounded-[5px] text-gray-50 text-sm py-1 px-2 hover:bg-yellow-500 transition-colors duration-300" :
            //         "bg-green-600/50 rounded-[5px] text-gray-50 text-sm py-1 px-2 hover:bg-green-500 transition-colors duration-300";
            // }

            // Update Input State (for everyone)
            if (enabled) {
                chatInput.disabled = false;
                sendBtn.disabled = false;
                chatInput.placeholder = "Input Message";
                sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                chatInput.disabled = true;
                sendBtn.disabled = true;
                chatInput.placeholder = "Chat disabled by teacher";
                sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        // Add message to chat
        function addMessage(messageObj, isOwn = false) {
            const messageDiv = document.createElement('div');
            // Use the message ID provided or fall back to a timestamp-based ID (though ID is preferred)
            const msgId = messageObj.id || ('msg_' + Date.now() + Math.random().toString(36).substr(2, 5));
            messageDiv.id = msgId;

            messageDiv.className = `flex ${isOwn ? 'justify-end' : 'justify-start'} group`; // added 'group' for hover effects if needed

            const bubble = document.createElement('div');
            bubble.className = `max-w-[85%] rounded-[5px] px-4 py-2 relative flex gap-2 items-center justify-between ${isOwn
                ? 'bg-green-100 text-gray-800'
                : 'bg-gray-100 text-gray-800'
                }`;

            const nameDisplay = document.createElement('div');
            nameDisplay.className = 'text-xs font-bold text-gray-900';
            nameDisplay.textContent = isOwn ? 'Me' + ' : ' : (messageObj.user?.name || 'Unknown');
            const timestamp = document.createElement('div');
            timestamp.className = 'text-[9px] text-gray-500 absolute bottom-1 right-1.5';
            timestamp.textContent = new Date(messageObj.timestamp).toLocaleTimeString();


            const textDisplay = document.createElement('div');
            textDisplay.className = `text-sm break-words relative pr-${timestamp.textContent.length + 1}`;
            textDisplay.textContent = messageObj.message; // Server sends text in 'message' field

            bubble.appendChild(nameDisplay);
            bubble.appendChild(timestamp)
            bubble.appendChild(textDisplay);

            // Teacher delete button
            if (window.IS_TEACHER) {
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '&times;';
                deleteBtn.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity';
                deleteBtn.title = 'Delete Message';
                deleteBtn.onclick = function () {
                    // Send delete event
                    sendWS({
                        type: 'chat_delete',
                        roomId,
                        payload: {
                            id: msgId
                        }
                    });
                    // Optimistic removal (optional, but effectively handled by the event listener if broadcasted back)
                    // If the server doesn't echo back to sender, we might want to remove it here too.
                    // But usually we wait for confirmation or echo. 
                    // Let's assume echo or just remove it to be responsive.
                    // Actually, better to wait for the event so we don't delete if it fails, 
                    // BUT for a smooth UI, we often remove immediately.
                    // Given the server is just a relay, we will get the event back because we send to everyone (usually including sender?).
                    // If this socket logic relays to sender, we wait. If not, we remove.
                    // Let's rely on the incoming event handling to avoid duplication.
                };
                bubble.appendChild(deleteBtn);
            }

            messageDiv.appendChild(bubble);
            chatMessages.appendChild(messageDiv);

            // Auto-scroll to bottom
            scrollToBottom();
        }

        function scrollToBottom() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Send message
        function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;

            // Generate ID
            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

            // Optimistically add our own message
            const localMsg = {
                id: msgId,
                user: {
                    name: userName
                },
                message: text,
                timestamp: Date.now()
            };
            addMessage(localMsg, true);

            // Send string content as 'message' to match server expectation
            sendWS({
                type: 'chat',
                roomId,
                payload: {
                    id: msgId,
                    message: text,
                    timestamp: Date.now(),
                    user: {
                        name: userName
                    } // Send user details explicitly just in case server doesn't attach them fully or we want consistency
                }
            });

            chatInput.value = '';
            handleTyping(false); // Stop typing indicator immediately
        }

        // Handle typing events
        function handleTyping(typing) {
            if (isTyping !== typing) {
                isTyping = typing;
                sendWS({
                    type: 'typing',
                    roomId,
                    payload: {
                        isTyping: typing
                    }
                });
            }
        }

        // Use shared WebSocket manager
        function sendWS(obj) {
            window.WSManager.send(obj);
        }

        // Register message handlers with shared WebSocket (only once)
        if (!window._chatHandlersRegistered) {
            window._chatHandlersRegistered = true;

            window.WSManager.on('message', (msg) => {
                switch (msg.type) {
                    case 'chat_state':
                        updateChatState(msg.payload.enabled);
                        break;

                    case 'chat':
                        if (msg.payload) {
                            // Server broadcasts the message object
                            const messageObj = msg.payload;
                            // Only add if it's not from us (we added ours optimistically)
                            // We check ID if present, else check name
                            // If we added it optimistically, we already have it in DOM. 
                            // But wait, my optimistic add puts it in DOM. The incoming message will have the same ID.
                            // If checking name is not enough (e.g. echo), we should check existence of ID in DOM.
                            const existing = messageObj.id ? document.getElementById(messageObj.id) : null;
                            if (!existing && messageObj.user?.name !== userName) {
                                addMessage(messageObj, false);
                            }
                        }
                        break;

                    case 'chat_delete':
                        if (msg.payload && msg.payload.id) {
                            const el = document.getElementById(msg.payload.id);
                            if (el) el.remove();
                        }
                        break;

                    case 'chat_clear':
                        console.log("chat deleted")
                        chatMessages.innerHTML = '';
                        break;

                    case 'chat_history':
                        if (Array.isArray(msg.payload)) {
                            chatMessages.innerHTML = ''; // Clear existing
                            msg.payload.forEach(item => {
                                const isOwn = item.user?.name === userName;
                                addMessage(item, isOwn);
                            });
                        }
                        break;

                    case 'typing':
                        if (msg.payload && msg.payload.user?.name !== userName) {
                            if (msg.payload.isTyping) {
                                typingIndicator.textContent = `${msg.payload.user.name} is typing...`;
                                typingIndicator.classList.remove('hidden');
                            } else {
                                typingIndicator.classList.add('hidden');
                            }
                        }
                        break;

                    case 'error':
                        alert(msg.message);
                        break;
                }
            });
        }

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            } else {
                // Typing detection
                handleTyping(true);
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => handleTyping(false), 2000);
            }
        });
        // Frequent Messages Dropdown Logic
        const frequentMessages = ["Welcome to class", "Hi.", "I am teacher", "Please wait...", "Are you there? I am talking to you.", "Good work!"];
        const frequentMessagesPopup = document.getElementById('frequentMessagesPopup');
        const toggleBtn = document.getElementById('toggleBtn');
        const frequentMessageList = document.getElementById('frequentMessageList');
        const dropIcon = document.getElementById('dropIcon');

        // Populate the popup with frequent messages
        if (frequentMessageList) {
            frequentMessages.forEach((msg) => {
                const li = document.createElement("li");
                const button = document.createElement("button");
                button.textContent = msg;
                button.className = "w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-sm text-gray-900";
                button.onclick = () => handleFrequentMessageClick(msg);
                li.appendChild(button);
                frequentMessageList.appendChild(li);
            });
        }

        // Toggle popup visibility
        if (toggleBtn) {
            toggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                frequentMessagesPopup.classList.toggle("hidden");
                if (!frequentMessagesPopup.classList.contains("hidden")) {
                    dropIcon.style.transform = 'scaleY(-1)';
                } else {
                    dropIcon.style.transform = 'scaleY(1)';
                }
            });
        }

        // Handle message click - fill input and close popup
        function handleFrequentMessageClick(msg) {
            chatInput.value = msg;
            frequentMessagesPopup.classList.add("hidden");
            dropIcon.style.transform = 'scaleY(1)';
            chatInput.focus();
        }

        // Close popup when clicking outside
        document.addEventListener("mousedown", (event) => {
            if (
                frequentMessagesPopup &&
                !frequentMessagesPopup.contains(event.target) &&
                toggleBtn &&
                !toggleBtn.contains(event.target)
            ) {
                frequentMessagesPopup.classList.add("hidden");
                dropIcon.style.transform = 'scaleY(1)';
            }
        });

    })();
</script>