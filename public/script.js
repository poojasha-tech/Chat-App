const socket = io("http://localhost:3000");
let username = "";
let currentRoom = "";

function joinRoom() {
    username = document.getElementById("usernameInput").value.trim();
    const room = document.getElementById("roomInput").value.trim();
    if (!username) return alert("Enter a username");
    if (!room) return alert("Enter a room name");

    currentRoom = room;
    socket.emit("joinRoom", {
        room,
        username,
    });

    document.getElementById("messageInput").focus();
}

socket.on("roomUsers", (users) => {
  const usersList = document.getElementById("users");

  usersList.innerHTML = ""; // clear old list

  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    usersList.appendChild(li);
  });
});

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
    chat.scrollTop = chat.scrollHeight; // Auto-scroll to the latest message
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