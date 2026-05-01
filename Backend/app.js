import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from "path";
import { fileURLToPath } from "url";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

// Create an HTTP server
const server = http.createServer(app);
// Create a Socket.IO server and attach it to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  }
}

);
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

    if (!rooms[room]) {
      rooms[room] = [];
    }
    rooms[room].push(username);

    // send updated user list to room
    io.to(room).emit("roomUsers", rooms[room]);


    //send message to everyone except the new user
    socket.to(room).emit("message", ` NEW USER ${username} JOINED ${room}`);
  })


  //send message to everyone ,, broadcast inside selested room only
  socket.on("chatMessage", ({ room, message }) => {
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


server.listen(3000, () => {
  console.log("Server running on port 3000");
});

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// })
