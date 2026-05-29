const socket = io({ autoConnect: false });

let currentUser = null;
let currentRoom = "";

function showSection(name) {
    document.getElementById("auth-section").hidden = (name !== "auth");
    document.getElementById("main-section").hidden = (name !== "main");
}

function showError(id, text) {
    document.getElementById(id).textContent = text || "";
}

//on page reload
async function checkSession() {
    try {
        const r = await fetch("/me");
        if (r.ok) {
            const data = await r.json();
            onLoggedIn(data.username);
            return;
        }
    } catch {}
    showSection("auth");
}

async function doLogin() {
    showError("loginError", "");
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
        return showError("loginError", "email and password required");
    }

    const r = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) return showError("loginError", data.error || "login failed");

    onLoggedIn(data.username);
}

async function doRegister() {
    showError("registerError", "");
    const email = document.getElementById("regEmail").value.trim();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    if (!email || !username || !password) {
        return showError("registerError", "all fields required");
    }

    const r = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
    });
    const data = await r.json();
    if (!r.ok) return showError("registerError", data.error || "register failed");

    onLoggedIn(data.username);
}

async function doLogout() {
    await fetch("/logout", { method: "POST" });

    currentUser = null;
    currentRoom = "";
    if (socket.connected) socket.disconnect();

    document.getElementById("chat").innerHTML = "";
    document.getElementById("users").innerHTML = "";

    showSection("auth");
}

function onLoggedIn(username) {
    currentUser = username;
    document.getElementById("currentUser").textContent = username;
    showSection("main");

    if (!socket.connected) socket.connect();
}

// --- Room + chat actions ---

function joinRoom() {
    const room = document.getElementById("roomInput").value.trim();
    if (!room) return alert("Enter a room name");

    currentRoom = room;
    // server uses socket.user.username from the JWT — no username field needed
    socket.emit("joinRoom", { room });

    document.getElementById("messageInput").focus();
}

function sendMessage() {
    const input = document.getElementById("messageInput");
    const message = input.value.trim();

    if (!currentRoom) return alert("Join a room first");
    if (!message) return alert("Type something");

    socket.emit("chatMessage", { room: currentRoom, message });
    input.value = "";
}

// Typing listener — attached once at module load, guarded by currentRoom
document.getElementById("messageInput").addEventListener("input", (e) => {
    if (currentRoom && e.target.value.trim() !== "") {
        socket.emit("typing");
    }
});

// --- Socket events ---

socket.on("connect", () => {
    console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
    console.log("Connection failed:", err.message);
    if (err.message === "unauthorized") {
        // cookie expired or invalid — drop back to login
        doLogout();
    }
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});

socket.on("roomUsers", (users) => {
    const usersList = document.getElementById("users");
    usersList.innerHTML = "";

    users.forEach((user) => {
        const li = document.createElement("li");
        if (user === currentUser) {
            li.textContent = `${user} (You)`;
            li.style.fontWeight = "bold";
            li.style.color = "green";
        } else {
            li.textContent = user;
        }
        usersList.appendChild(li);
    });
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
    chat.scrollTop = chat.scrollHeight;
});

socket.on("typing", (user) => {
    const typing = document.getElementById("typing");
    typing.textContent = `${user} is typing...`;
    setTimeout(() => {
        typing.textContent = "";
    }, 1000);
});

// --- Kick off ---

checkSession();
