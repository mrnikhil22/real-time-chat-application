const socket = io("http://localhost:5000");

let username = "";
let room = "";

// JOIN ROOM
function joinRoom() {
  username = document.getElementById("username").value;
  room = document.getElementById("room").value;

  if (!username || !room) {
    alert("Please enter username and room");
    return;
  }

  socket.emit("joinRoom", { username, room });
}

// SEND MESSAGE
function sendMessage() {
  const msg = document.getElementById("message").value;

  if (!msg) return;

  socket.emit("sendMessage", msg);
  document.getElementById("message").value = "";
}

// RECEIVE MESSAGE
socket.on("message", (data) => {
  const chatBox = document.getElementById("chat-box");

  // 🧹 Clear chat when someone leaves
  if (data.user === "System" && data.text.includes("left")) {
    chatBox.innerHTML = "";
    return;
  }

  const div = document.createElement("div");

  // 🎨 Style system messages
  if (data.user === "System") {
    div.style.textAlign = "center";
    div.style.color = "gray";
    div.textContent = data.text;
  } else {
    // 👤 Show "You" for your messages
    if (data.user === username) {
      div.style.background = "#d1ffd6";
      div.textContent = `You: ${data.text}`;
    } else {
      div.style.background = "#fff";
      div.textContent = `${data.user}: ${data.text}`;
    }
  }

  chatBox.appendChild(div);

  // Auto scroll
  chatBox.scrollTop = chatBox.scrollHeight;
});

// 👥 ONLINE USERS
socket.on("roomUsers", (users) => {
  const userList = document.getElementById("users");
  userList.innerHTML = "";

  users.forEach(user => {
    const li = document.createElement("li");
    li.textContent = user;
    userList.appendChild(li);
  });
});

// 🚪 LEAVE ROOM
function leaveRoom() {
  document.getElementById("chat-box").innerHTML = "";
  function leaveRoom() {
  socket.emit("leaveRoom");

  document.getElementById("chat-box").innerHTML = "";
  document.getElementById("users").innerHTML = "";
 }
}