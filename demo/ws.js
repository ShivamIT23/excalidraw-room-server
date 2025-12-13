
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
                                id: localStorage.getItem('user_id'),
                                name: window.USER_NAME,
                                isTeacher: window.IS_TEACHER
                            }
                        }
                    });
                    this.trigger('open');
                });

                // Listen to all relevant events and map to 'message' handler
                const events = ['stroke_chunk', 'stroke', 'stroke_end', 'clear', 'chat', 'chat_history', 'chat_state', 'chat_delete', 'chat_toggle', 'chat_clear', 'page_state', 'typing', 'snapshot', 'error', 'viewport_change', 'layout_change', 'background_change', 'user_join', 'room_users', 'cursor', 'object_modified'];

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