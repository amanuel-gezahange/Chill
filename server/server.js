import { WebSocketServer } from "ws";
import http from "http";

const port = process.env.PORT || 3001;
const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map();
let nextClientId = 1;

function joinRoom(ws, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  rooms.get(roomId).add(ws);
  ws.roomId = roomId;
  console.log(`client ${ws.clientId} joined room ${roomId}`);
}

function leaveRoom(ws) {
  const roomId = ws.roomId;
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
  }

  console.log(`client ${ws.clientId} left room ${roomId}`);
  ws.roomId = null;
}

function broadcastToRoom(sender, roomId, data) {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const client of room) {
    if (client !== sender && client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  }
}

wss.on("connection", (ws) => {
  ws.clientId = nextClientId++;
  console.log(`client ${ws.clientId} connected`);

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "join_room") {
        if (ws.roomId !== data.roomId) {
          leaveRoom(ws);
          joinRoom(ws, data.roomId);
        }
        return;
      }

      if (data.type === "leave_room") {
        leaveRoom(ws);
        return;
      }

      if (data.roomId) {
        console.log(`client ${ws.clientId} sent ${data.type}`);
        broadcastToRoom(ws, data.roomId, data);
      }
    } catch (err) {
      console.error("bad message", err);
    }
  });

  ws.on("close", () => {
    leaveRoom(ws);
    console.log(`client ${ws.clientId} disconnected`);
  });
});

server.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
});
