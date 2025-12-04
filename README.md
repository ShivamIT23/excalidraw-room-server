# Collaborative Whiteboard Application

A real-time collaborative whiteboard application built with HTML5 Canvas, JavaScript, and WebSocket technology. Multiple users can draw, erase, and share their work in real-time across different browser tabs or devices.

## 🎨 Features

- **Real-time Collaboration**: Multiple users can draw simultaneously in the same room
- **Drawing Tools**: 
  - Pen tool with customizable colors and sizes
  - Eraser tool for removing strokes
- **Canvas Controls**:
  - Undo/Redo functionality
  - Clear canvas
  - Export drawings as PNG or JSON
  - Import drawings from JSON files
- **Room-based System**: Users can join different rooms using room IDs
- **High-DPI Support**: Optimized for retina and high-resolution displays
- **Touch Support**: Works on both desktop and mobile devices

## 📁 Project Structure

```
excalidraw-room-server/
├── server/
│   ├── server.js          # WebSocket server for real-time communication
│   ├── package.json       # Server dependencies
│   └── node_modules/      # Node.js dependencies
├── whiteboard.html        # Main HTML interface
├── script.js             # Client-side JavaScript logic
├── index.php             # PHP entry point (serves whiteboard.html)
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v14 or higher)
- **PHP** (v7.0 or higher) - for serving the HTML file
- **pnpm** or **npm** - for package management

### Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd /Users/shivamgupta/Code/excalidraw-room-server
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   pnpm install
   # or
   npm install
   ```

### Running the Application

You need to run both the WebSocket server and the PHP server:

1. **Start the WebSocket Server** (in the `server` directory):
   ```bash
   cd server
   node server.js
   ```
   The WebSocket server will start on port `4000`.

2. **Start the PHP Server** (in the project root):
   ```bash
   php -S localhost:8082
   ```
   The web interface will be available at `http://localhost:8082`.

3. **Open the Application**:
   - Navigate to `http://localhost:8082` in your browser
   - Click "Connect" and enter the WebSocket server URL (default: `ws://localhost:4000`)
   - Enter a room ID (e.g., `room1`)
   - Start drawing!

## 🎯 How to Use

### Basic Drawing

1. **Connect to a Room**:
   - Enter your name (or use the auto-generated one)
   - Enter a room ID (users in the same room can see each other's drawings)
   - Click "Connect" button

2. **Drawing Tools**:
   - **Tool**: Select between Pen and Eraser
   - **Color**: Choose your drawing color (only for Pen tool)
   - **Size**: Adjust the brush/eraser size (1-40 pixels)

3. **Canvas Actions**:
   - **Undo**: Remove the last stroke you drew
   - **Redo**: Restore the last undone stroke
   - **Clear**: Erase the entire canvas (affects all users in the room)

4. **Export/Import**:
   - **Export PNG**: Download the current canvas as an image
   - **Export JSON**: Save all strokes as a JSON file
   - **Import JSON**: Load a previously saved JSON file

### Collaborative Features

- **Multiple Users**: Open multiple browser tabs or share the room ID with others
- **Real-time Sync**: All drawing actions are synchronized instantly
- **Persistent State**: New users joining a room will see the current canvas state

## 🔧 Technical Details

### Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │ ◄─────────────────────────► │             │
│ (Browser)   │                             │  WebSocket  │
└─────────────┘                             │   Server    │
                                            │  (Node.js)  │
┌─────────────┐         WebSocket          │             │
│   Client 2  │ ◄─────────────────────────► │   Port      │
│ (Browser)   │                             │   4000      │
└─────────────┘                             └─────────────┘
```

### Data Flow

1. **User draws on canvas** → Stroke data created
2. **Stroke sent via WebSocket** → Server receives stroke
3. **Server broadcasts to room** → All other clients receive stroke
4. **Clients render stroke** → Canvas updated in real-time

### Message Types

The application uses JSON messages with the following structure:

```javascript
{
  type: "stroke" | "clear" | "snapshot" | "join",
  roomId: "room1",
  payload: {
    // Type-specific data
  }
}
```

- **join**: User joins a room
- **stroke**: New drawing stroke added
- **clear**: Canvas cleared
- **snapshot**: Full canvas state (for new users or imports)

### Stroke Data Structure

Each stroke contains:

```javascript
{
  id: "s_1234567890_abc123",  // Unique identifier
  tool: "pen" | "eraser",      // Tool type
  color: "#000000",            // Hex color (for pen)
  size: 3,                     // Brush/eraser size
  points: [                    // Array of coordinates
    { x: 100, y: 150 },
    { x: 101, y: 151 },
    // ...
  ],
  user: {                      // User information
    name: "user-123"
  }
}
```

## 🛠️ Configuration

### Server Configuration

Edit `server/server.js` to change:
- **Port**: Default is `4000` (line 142)
- **Ping interval**: Default is `30000ms` (line 117)

### Client Configuration

Edit `script.js` to change:
- **Default WebSocket URL**: Default is `ws://localhost:4000` (line 267)
- **Canvas resize debounce**: Default is `120ms` (line 335)

## 📝 API Endpoints

The server also provides REST API endpoints:

### Save Snapshot
```
POST /save/:roomId
Body: { strokes: [...] }
```
Saves the current canvas state for a room.

### Load Snapshot
```
GET /load/:roomId
```
Retrieves the saved canvas state for a room.

## 🐛 Troubleshooting

### Connection Issues

- **"Not connected" status**: 
  - Ensure the WebSocket server is running on port 4000
  - Check that the WebSocket URL is correct (`ws://localhost:4000`)
  - Verify no firewall is blocking the connection

### Drawing Not Syncing

- **Strokes not appearing for other users**:
  - Ensure all users are in the same room ID
  - Check browser console for WebSocket errors
  - Verify the server is running and accessible

### Canvas Display Issues

- **Canvas appears blank or small**:
  - The canvas automatically resizes to fit the container
  - Try refreshing the page
  - Check browser console for JavaScript errors

## 🔒 Security Notes

⚠️ **This is a development/demo application**. For production use, consider:

- Adding authentication and authorization
- Implementing rate limiting
- Validating and sanitizing all user input
- Using WSS (WebSocket Secure) for encrypted connections
- Adding CSRF protection
- Implementing proper error handling and logging

## 📄 License

MIT License - Feel free to use this project for learning and development purposes.

## 🤝 Contributing

This is a learning project. Feel free to fork and modify as needed!

## 📞 Support

For issues or questions, check the browser console and server logs for error messages.

---

**Happy Drawing! 🎨**
