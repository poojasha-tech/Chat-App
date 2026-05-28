// const socket = io("http://localhost:3000");
// Connect to whatever origin served this page so the same code works in
// localhost, staging, and production without recompiling the client.
const socket = io();
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
  usersList.innerHTML = "";

  users.forEach((user) => {
    const li = document.createElement("li");

    if (user === username) {
      li.textContent = `${user} (You)`;
      li.style.fontWeight = "bold";
      li.style.color = "green";
    } else {
      li.textContent = user;
    }

    usersList.appendChild(li);
  });
});

document.getElementById("messageInput").addEventListener("input", (e) => {
    if (currentRoom && e.target.value.trim() !== "") {
        socket.emit("typing");
    }
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

socket.on("typing", (user) => {
  const typing = document.getElementById("typing");

  typing.textContent = `${user} is typing...`;

  // remove after short delay
  setTimeout(() => {
    typing.textContent = "";
  }, 1000);
});

socket.on("history", (rows) => {
    const chat = document.getElementById("chat");
    chat.innerHTML = ""; // clear so re-joining doesn't stack old messages
    rows.forEach((msg) => {
        const div = document.createElement("div");
        div.textContent = msg;
        chat.appendChild(div);
    });
    chat.scrollTop = chat.scrollHeight;
});

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