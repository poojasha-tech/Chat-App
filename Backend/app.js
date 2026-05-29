import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from 'cookie-parser';
import { db } from './db.js';
import { hashPassword, verifyPassword, signToken, verifyToken, cookieOptions } from './auth.js';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));


// --- auth routes ---

function isValidEmail(s)    { return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
function isValidUsername(s) { return typeof s === 'string' && /^[a-zA-Z0-9_-]{3,20}$/.test(s); }
function isValidPassword(s) { return typeof s === 'string' && s.length >= 8; }

// TODO: rate-limit /login and /register too — the socket bucket (step 5) doesn't cover HTTP

app.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!isValidEmail(email))       return res.status(400).json({ error: 'invalid email' });
  if (!isValidUsername(username)) return res.status(400).json({ error: 'username must be 3-20 chars: letters, digits, _ or -' });
  if (!isValidPassword(password)) return res.status(400).json({ error: 'password must be at least 8 characters' });

  const passwordHash = await hashPassword(password);

  try {
    const result = db.prepare(
      'INSERT INTO users (email, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
    ).run(email.toLowerCase(), username, passwordHash, Date.now());

    const token = signToken({ id: Number(result.lastInsertRowid), username });
    res.cookie('auth', token, cookieOptions());
    res.json({ username });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      // generic message — don't reveal which field collided (account enumeration)
      return res.status(409).json({ error: 'email or username already taken' });
    }
    throw err;
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = db.prepare(
    'SELECT id, username, password_hash FROM users WHERE email = ?'
  ).get(String(email).toLowerCase());

  // same error for "no such user" and "wrong password" — no enumeration
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = signToken({ id: user.id, username: user.username });
  res.cookie('auth', token, cookieOptions());
  res.json({ username: user.username });
});

app.post('/logout', (req, res) => {
  res.clearCookie('auth', cookieOptions());
  res.json({ ok: true });
});

app.get('/me', (req, res) => {
  const payload = verifyToken(req.cookies.auth);
  if (!payload) return res.status(401).json({ error: 'not authenticated' });
  res.json({ username: payload.username });
});


// Create an HTTP server
const server = http.createServer(app);
// Create a Socket.IO server and attach it to the HTTP server
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//   }
// });
// CORS dropped: frontend is served from the same origin as the socket server,
// so the browser never makes a cross-origin Socket.IO handshake.
const io = new Server(server);
app.get("/", (req, res) => {
  //res.send("Hello from Express + Socket.IO");
  res.sendFile(path.join(__dirname, "../public/index.html"));
});


// Socket logic
const rooms = {};
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join room
  socket.on("joinRoom", ({ room, username }) => {
    socket.username = username;
    socket.room = room;
    socket.join(room);

    // send last 50 messages to this socket only (oldest-first for chronological render)
    const history = db.prepare(
      'SELECT username, body FROM messages WHERE room = ? ORDER BY created_at DESC LIMIT 50'
    ).all(room).reverse();
    socket.emit("history", history.map(r => `(${r.username}) : ${r.body}`));

    if (!rooms[room]) {
      rooms[room] = [];
    }
    rooms[room].push(username);

    // send updated user list to room
    io.to(room).emit("roomUsers", rooms[room]);


    //send message to everyone except the new user
    socket.to(room).emit("message", ` NEW USER ${username} JOINED ${room}`);
  })


  socket.on("typing", () => {
    socket.to(socket.room).emit("typing", socket.username);
  });

  //send message to everyone ,, broadcast inside selested room only
  socket.on("chatMessage", ({ room, message }) => {
    db.prepare(
      'INSERT INTO messages (room, username, body, created_at) VALUES (?, ?, ?, ?)'
    ).run(room, socket.username, message, Date.now());

    io.to(room).emit("message", `(${socket.username}) : ${message}`);
  });


  socket.on("disconnect", () => {
    const { username, room } = socket;
    if (room && rooms[room]) {
      // remove user
      rooms[room] = rooms[room].filter(u => u !== username);

      // update list to everyone 
      io.to(room).emit("roomUsers", rooms[room]);

      // notify others
      socket.to(room).emit("message", `${username} left`);
    }

  })
});


// server.listen(3000, () => {
//   console.log("Server running on port 3000");
// });
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// })
