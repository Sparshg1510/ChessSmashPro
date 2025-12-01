const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socketio(server);

const chess = new Chess(); // single game instance
let players = {
  white: null, // { id, name }
  black: null, // { id, name }
};
let currentPlayer = "w";
let gameStarted = false;

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Smash" });
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

/* ---------------------- helpers ---------------------- */
const lobbySnapshot = () => ({
  white: players.white ? players.white.name : null,
  black: players.black ? players.black.name : null,
});

const bothPlayersReady = () => players.white && players.black;

const assignFirstRoleRandom = () => (Math.random() > 0.5 ? "white" : "black");

const clearRoleBySocket = (socketId) => {
  if (players.white && players.white.id === socketId) players.white = null;
  if (players.black && players.black.id === socketId) players.black = null;
};

const socketById = (id) => (id ? io.sockets.sockets.get(id) : null);

/* -------------------- socket backend -------------------- */
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  // 1) Client must send name first. Role is assigned only after name arrives.
  socket.on("setName", (name) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) {
      socket.emit("nameRejected", "Name cannot be empty.");
      return;
    }

    socket.data.name = trimmed;

    // Decide role:
    // - If no players yet => random assign to first
    // - If one role open => assign the remaining
    // - Else => spectator
    let role;
    if (!players.white && !players.black) {
      role = assignFirstRoleRandom(); // "white" or "black"
      players[role] = { id: socket.id, name: trimmed };
    } else if (!players.white || !players.black) {
      role = players.white ? "black" : "white";
      players[role] = { id: socket.id, name: trimmed };
    } else {
      role = "spectator";
      // spectators don't occupy slots
    }

    // Tell this client their role using your existing event name scheme
    // (client already listens for "playerRole" with "w"/"b"/"spectatorRole")
    if (role === "white") socket.emit("playerRole", "w");
    else if (role === "black") socket.emit("playerRole", "b");
    else socket.emit("spectatorRole");

    // Confirm their own name back (useful to lock input on client)
    socket.emit("nameConfirmed", trimmed);

    // Update lobby for everyone: who is white/black (names or null)
    io.emit("lobbyUpdate", lobbySnapshot());

    // If only one side filled, tell that player to wait for opponent
    if (!bothPlayersReady()) {
      socket.emit("waitingForOpponent");
      // Also, if the *other* player is already in, let them know their opponent name
      if (role === "white" && players.black) {
        const blackSock = socketById(players.black.id);
        if (blackSock) {
          blackSock.emit("opponentJoined", { name: trimmed, color: "w" });
        }
      } else if (role === "black" && players.white) {
        const whiteSock = socketById(players.white.id);
        if (whiteSock) {
          whiteSock.emit("opponentJoined", { name: trimmed, color: "b" });
        }
      }
      return;
    }

    // If both players are ready => start the game ONCE
    if (!gameStarted && bothPlayersReady()) {
      gameStarted = true;

      // Tell each player the opponent's name and their board orientation
      const wSock = socketById(players.white.id);
      const bSock = socketById(players.black.id);

      if (wSock) {
        wSock.emit("opponentJoined", { name: players.black.name, color: "b" });
        wSock.emit("gameStart", { orientation: "white" });
      }
      if (bSock) {
        bSock.emit("opponentJoined", { name: players.white.name, color: "w" });
        bSock.emit("gameStart", { orientation: "black" });
      }

      // Broadcast initial board state (white perspective FEN)
      io.emit("boardState", chess.fen());
    }
  });

  // 2) Handle moves only when game has started and by the correct side
  socket.on("move", (move) => {
    try {
      if (!gameStarted) return;

      // Enforce turn by role
      const isWhiteTurn = chess.turn() === "w";
      const whiteId = players.white?.id;
      const blackId = players.black?.id;

      if (isWhiteTurn && socket.id !== whiteId) return;
      if (!isWhiteTurn && socket.id !== blackId) return;

      const result = chess.move(move);
      if (!result) {
        console.log("Invalid move:", move);
        socket.emit("invalidMove", move);
        return;
      }

      currentPlayer = chess.turn();
      io.emit("move", result);
      io.emit("boardState", chess.fen());
    } catch (err) {
      console.log("Error:", err);
      socket.emit("error", "Error occurred while processing move.");
    }
  });

  // 3) Handle disconnects: free roles, reset game if needed, notify others
  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id);

    const wasWhite = players.white && players.white.id === socket.id;
    const wasBlack = players.black && players.black.id === socket.id;

    // Clear role
    clearRoleBySocket(socket.id);

    // If a seated player left and game had started, reset the game
    if ((wasWhite || wasBlack) && gameStarted) {
      gameStarted = false;
      chess.reset(); // back to starting position
      io.emit("gameReset");
    }

    // Inform remaining clients
    io.emit("lobbyUpdate", lobbySnapshot());

    // Tell opponent (if any) that the player left => go back to waiting state
    if (wasWhite && players.black) {
      const bSock = socketById(players.black.id);
      if (bSock) bSock.emit("waitingForOpponent");
    }
    if (wasBlack && players.white) {
      const wSock = socketById(players.white.id);
      if (wSock) wSock.emit("waitingForOpponent");
    }
  });
  // 4) Handle chat messages
    socket.on("chat:send", ({ text }) => {
      const msg = String(text || "").trim();
      if (!msg) return;

      const from = socket.data?.name || "Player";
      io.emit("chat:new", { text: msg, from });
    });
});
