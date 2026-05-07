const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const Message = require("./models/Message");

const app = express();

app.use(cors());

// ✅ Serve frontend files
app.use(express.static(path.join(__dirname, "../client")));

const server = http.createServer(app);

// ✅ Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ✅ Store users
let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ JOIN ROOM
  socket.on("joinRoom", ({ username, room }) => {

    if (!username || !room) return;

    socket.join(room);

    users[socket.id] = { username, room };

    console.log(`JOIN: ${username} joined ${room}`);

    // ✅ Room users
    const roomUsers = Object.values(users)
      .filter(user => user.room === room)
      .map(user => user.username);

    io.to(room).emit("roomUsers", roomUsers);

    // ✅ Join message
    io.to(room).emit("message", {
      user: "System",
      text: `${username} joined the chat`
    });
  });

  // ✅ SEND MESSAGE
  socket.on("sendMessage", async (msg) => {

    const user = users[socket.id];

    if (!user || !msg) return;

    try {
      // ✅ Save to MongoDB
      await Message.create({
        username: user.username,
        message: msg,
        room: user.room
      });

      // ✅ Send message to room
      io.to(user.room).emit("message", {
        user: user.username,
        text: msg
      });

    } catch (error) {
      console.log("Message Error:", error);
    }
  });

  // ✅ LEAVE ROOM
  socket.on("leaveRoom", () => {

    const user = users[socket.id];

    if (user) {

      socket.leave(user.room);

      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.username} left the chat`
      });

      delete users[socket.id];

      // ✅ Update users
      const roomUsers = Object.values(users)
        .filter(u => u.room === user.room)
        .map(u => u.username);

      io.to(user.room).emit("roomUsers", roomUsers);
    }
  });

  // ✅ DISCONNECT
  socket.on("disconnect", () => {

    const user = users[socket.id];

    if (user) {

      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.username} disconnected`
      });

      delete users[socket.id];

      // ✅ Update users
      const roomUsers = Object.values(users)
        .filter(u => u.room === user.room)
        .map(u => u.username);

      io.to(user.room).emit("roomUsers", roomUsers);
    }

    console.log("User disconnected:", socket.id);
  });
});

// ✅ Home Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ✅ Server Port
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});