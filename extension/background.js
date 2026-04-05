console.log("[bg] background loaded");
let socket = null;
let currentRoomId = null;

function connectSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket("ws://localhost:3001");

  socket.onopen = () => {
    console.log("[bg] socket connected");
    if (currentRoomId) {
      socket.send(JSON.stringify({
        type: "join_room",
        roomId: currentRoomId
      }));
    }
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log("[bg] message from server", data);

    const tabs = await chrome.tabs.query({
      url: "https://www.netflix.com/watch/*"
    });

    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: "REMOTE_EVENT",
        payload: data
      });
    }
  };

  socket.onclose = () => {
    console.log("[bg] socket closed");
  };

  socket.onerror = (err) => {
    console.error("[bg] socket error", err);
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "JOIN_ROOM") {
    currentRoomId = message.roomId;
    connectSocket();

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "join_room",
        roomId: currentRoomId
      }));
    }
  }

  if (message.type === "LEAVE_ROOM") {
    if (socket && socket.readyState === WebSocket.OPEN && currentRoomId) {
      socket.send(JSON.stringify({
        type: "leave_room",
        roomId: currentRoomId
      }));
    }
    currentRoomId = null;
  }

  if (message.type === "LOCAL_PLAYER_EVENT") {
    if (socket && socket.readyState === WebSocket.OPEN && currentRoomId) {
      socket.send(JSON.stringify({
        ...message.payload,
        roomId: currentRoomId
      }));
    }
  }
});