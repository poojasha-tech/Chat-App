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
const io = new Server(server ,{
   cors: {
    origin: "http://localhost:3000",
  }
}
  
);

// Basic route
app.get("/", (req, res) => {
  //res.send("Hello from Express + Socket.IO");
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Socket logic
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // join room 
  socket.on("joinRoom", (room) => {
    socket.join(room);
    
    //send message to everyone except the new user
    socket.to(room).emit("message", `User ${socket.id} joined ${room}`);
  })


  //send message to everyone ,, broadcast inside specific room only
  socket.on("chatMessage", ({ room, message }) => {
    io.to(room).emit("message", `(${socket.id}) : ${message}`);

  });

  socket.on("disconnect", () => {
    console.log("user disconnected :", socket.id);

  })
});


server.listen(3000, () => {
  console.log("Server running on port 3000");
});

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// })
