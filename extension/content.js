console.log("[content] script loaded");

let video = null;
let socket = null;
let roomId = null;
let suppressOutgoing = false;
let lastSentAt = 0;
let joinedRoomForSocket = false;
let listenersAttached = false;

function findVideo() {
  return document.querySelector("video");
}

function connectSocket() {
  if (!roomId) {
    console.log("[content] no roomId yet");
    return;
  }

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    console.log("[content] socket already open/connecting");
    return;
  }

  joinedRoomForSocket = false;
  socket = new WebSocket("ws://localhost:3001");

  socket.onopen = () => {
    console.log("[content] socket connected");

    if (!joinedRoomForSocket && roomId) {
      socket.send(
        JSON.stringify({
          type: "join_room",
          roomId,
        })
      );
      joinedRoomForSocket = true;
      console.log("[content] joined room", roomId);
    }
  };

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    console.log("[content] received remote event", payload);
    applyRemoteEvent(payload);
  };

  socket.onclose = () => {
    console.log("[content] socket closed");
    socket = null;
    joinedRoomForSocket = false;
  };

  socket.onerror = (err) => {
    console.error("[content] socket error", err);
  };
}

function sendPlayerEvent(eventType) {
  if (!video || suppressOutgoing) return;
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log("[content] socket not ready");
    return;
  }

  const now = Date.now();
  if (now - lastSentAt < 300) return;
  lastSentAt = now;

  const payload = {
    type: eventType,
    time: video.currentTime,
    roomId,
  };

  console.log("[content] sending", payload);
  socket.send(JSON.stringify(payload));
}

function attachListeners() {
  if (!video || listenersAttached) return;

  video.addEventListener("play", () => sendPlayerEvent("play"));
  video.addEventListener("pause", () => sendPlayerEvent("pause"));
  video.addEventListener("seeked", () => sendPlayerEvent("seek"));

  listenersAttached = true;
  console.log("[content] listeners attached");
}

function applyRemoteEvent(payload) {
  if (!video || !payload) return;

  if (!["play", "pause", "seek"].includes(payload.type)) return;

  suppressOutgoing = true;

  if (
    typeof payload.time === "number" &&
    Math.abs(video.currentTime - payload.time) > 1
  ) {
    video.currentTime = payload.time;
  }

  if (payload.type === "play") {
    video.play().catch((err) => console.warn("[content] play failed", err));
  }

  if (payload.type === "pause") {
    video.pause();
  }

  if (payload.type === "seek") {
    video.currentTime = payload.time;
  }

  setTimeout(() => {
    suppressOutgoing = false;
  }, 800);
}

function bootVideo() {
  const interval = setInterval(() => {
    const found = findVideo();
    if (found) {
      video = found;
      attachListeners();
      clearInterval(interval);
      console.log("[content] video found");
    }
  }, 1000);
}

function loadRoomAndConnect() {
  chrome.storage.local.get(["roomId"], (result) => {
    roomId = result.roomId;
    console.log("[content] loaded roomId", roomId);

    if (roomId) {
      connectSocket();
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.roomId) {
    const newRoomId = changes.roomId.newValue;
    const oldRoomId = changes.roomId.oldValue;

    if (newRoomId === oldRoomId) return;

    roomId = newRoomId;
    console.log("[content] room changed", roomId);

    if (socket) {
      socket.close();
      socket = null;
    }

    if (roomId) {
      connectSocket();
    }
  }
});

bootVideo();
loadRoomAndConnect();