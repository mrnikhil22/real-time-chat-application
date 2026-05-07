const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const Message = require("./models/Message");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// MongoDB
mongoose.connect("mongodb+srv://Nikhil:Nikhil123@cluster0.dnuiud5.mongodb.net/chatappdb")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

let users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ JOIN ROOM
  socket.on("joinRoom", ({ username, room }) => {
    socket.join(room);
    users[socket.id] = { username, room };

    console.log("JOIN:", username, room);

    // Send users list
    const roomUsers = Object.values(users)
      .filter(u => u.room === room)
      .map(u => u.username);

    io.to(room).emit("roomUsers", roomUsers);

    // Notify everyone
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

  // ✅ NEW: LEAVE ROOM (IMPORTANT FIX)
  socket.on("leaveRoom", () => {
    const user = users[socket.id];

    if (user) {
      socket.leave(user.room);

      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.username} left`,
      });

      delete users[socket.id];

      const roomUsers = Object.values(users)
        .filter(u => u.room === user.room)
        .map(u => u.username);

      io.to(user.room).emit("roomUsers", roomUsers);
    }
  });

  // ✅ DISCONNECT (browser close)
  socket.on("disconnect", () => {
    const user = users[socket.id];

    if (user) {
      io.to(user.room).emit("message", {
        user: "System",
        text: `${user.username} left`,
      });

      delete users[socket.id];

      const roomUsers = Object.values(users)
        .filter(u => u.room === user.room)
        .map(u => u.username);

      io.to(user.room).emit("roomUsers", roomUsers);
    }
  });

});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});