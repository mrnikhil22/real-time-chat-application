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

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// ✅ MongoDB Connection (for Render Deployment)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Store users
let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ JOIN ROOM
  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    users[socket.id] = { username, room };

    console.log("JOIN:", username, room);

    // ✅ Send users list
    const roomUsers = Object.values(users)
      .filter(u => u.room === room)
      .map(u => u.username);

    io.to(room).emit("roomUsers", roomUsers);

    // ✅ Notify everyone
    io.to(room).emit("message", {
      user: "System",
      text: `${username} joined the chat`,
    });
  });

  // ✅ SEND MESSAGE
  socket.on("sendMessage", async (msg) => {
    const user = users[socket.id];

    if (user) {
      await Message.create({
        username: user.username,
        message: msg,
        room: user.room,
      });

      io.to(user.room).emit("message", {
        user: user.username,
        text: msg,
      });
    }
  });

  // ✅ LEAVE ROOM
  socket.on("leaveRoom", () => {
    const user = users[socket.id];

    if (user) {
      socket.leave(user.room);

      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.username} left`,
      });

      delete users[socket.id];

      // ✅ Update users list
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
        text: `${user.username} disconnected`,
      });

      delete users[socket.id];

      // ✅ Update users list
      const roomUsers = Object.values(users)
        .filter(u => u.room === user.room)
        .map(u => u.username);

      io.to(user.room).emit("roomUsers", roomUsers);
    }
  });
});

// ✅ Home Route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// ✅ PORT for Local + Render Deployment
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});