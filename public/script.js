const socket = io("http://localhost:3000");

let currentRoom = "";

function joinRoom() {
    const room = document.getElementById("roomInput").value.trim();

    if (!room) return alert("Enter a room name");

    currentRoom = room;
    socket.emit("joinRoom", room);
    document.getElementById("messageInput").focus();
}

function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!currentRoom) return alert("Join a room first");
    if (!message) return alert("Type something");

    socket.emit("chatMessage", {
        room: currentRoom,
        message,
    });

    input.value = "";
}
socket.on("message", (msg) => {
    const chat = document.getElementById("chat");
    const div = document.createElement("div");
    div.textContent = msg;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

socket.on("connect", () => {
    console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
    console.log("Connection failed");
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});