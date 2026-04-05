const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const leaveBtn = document.getElementById("leaveBtn");
const statusEl = document.getElementById("status");

chrome.storage.local.get(["roomId"], ({ roomId }) => {
  if (roomId) {
    roomInput.value = roomId;
    statusEl.textContent = `Saved room: ${roomId}`;
  }
});

joinBtn.addEventListener("click", async () => {
  const roomId = roomInput.value.trim();
  if (!roomId) return;

  await chrome.storage.local.set({ roomId });

  chrome.runtime.sendMessage({
    type: "JOIN_ROOM",
    roomId
  });

  statusEl.textContent = `Joining room: ${roomId}`;
});

leaveBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(["roomId"]);

  chrome.runtime.sendMessage({
    type: "LEAVE_ROOM"
  });

  statusEl.textContent = "Disconnected";
});