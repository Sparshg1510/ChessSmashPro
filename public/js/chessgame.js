const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let orientation = "white";
let moveHistory = [];

/* ---------------------- Rendering ---------------------- */
const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  const rows = orientation === "black" ? [...board].reverse() : board;

  rows.forEach((row, rowIndex) => {
    const actualRow = orientation === "black" ? 7 - rowIndex : rowIndex;
    const cols = orientation === "black" ? [...row].reverse() : row;

    cols.forEach((square, colIndex) => {
      const actualCol = orientation === "black" ? 7 - colIndex : colIndex;
      const squareDiv = document.createElement("div");

      squareDiv.classList.add(
        "square",
        (actualRow + actualCol) % 2 === 0 ? "light" : "dark"
      );
      squareDiv.dataset.row = actualRow;
      squareDiv.dataset.col = actualCol;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceElement.innerHTML = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: actualRow, col: actualCol };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareDiv.appendChild(pieceElement);
      }

      squareDiv.addEventListener("dragover", (e) => e.preventDefault());

      squareDiv.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareDiv.dataset.row),
            col: parseInt(squareDiv.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareDiv);
    });
  });
};

const getPieceUnicode = (square) => {
  const unicodePiece = {
    k: "♔",
    q: "♕",
    r: "♖",
    b: "♗",
    n: "♘",
    p: "♙",
    K: "♚",
    Q: "♛",
    R: "♜",
    B: "♝",
    N: "♞",
    P: "♟",
  };
  return unicodePiece[square.type] || "";
};

/* ---------------------- Moves ---------------------- */
const handleMove = (sourceSquare, targetSquare) => {
  const move = {
    from: `${String.fromCharCode(97 + sourceSquare.col)}${
      8 - sourceSquare.row
    }`,
    to: `${String.fromCharCode(97 + targetSquare.col)}${8 - targetSquare.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};

/* ---------------------- Input (name) ---------------------- */
const inputTaken = () => {
  const nameInput = document.getElementById("playerNameInput");
  const profileCircle = document.querySelector(".profile-name");

  nameInput.classList.add("blink-ring");

  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      const playerName = nameInput.value.trim();
      if (playerName !== "") {
        socket.emit("setName", playerName);
        nameInput.disabled = true;

        // Hide input after submission
        nameInput.style.display = "none";
        nameInput.style.pointerEvents = "none";

        // 🔔 Stop blinking when invisible
        nameInput.classList.remove("blink-ring");

        // Update profile-name circle with capitalized first letter
        const firstLetter = playerName.charAt(0).toUpperCase();
        profileCircle.textContent = firstLetter;
      }
    }
  });

  socket.on("nameConfirmed", function (name) {
    document.getElementById("playerName").textContent = name;
    document.getElementById("playerNameStatus").textContent = name;
  });
};

/* ---------------------- Move history ---------------------- */
const updateMoveHistory = () => {
  const historyElement = document.getElementById("moveHistory");
  if (moveHistory.length === 0) {
    historyElement.textContent = "Game started...";
    return;
  }
  
  const lastMoves = moveHistory.slice(-10);
  historyElement.innerHTML = lastMoves
  .map((move, index) => {
    const moveNumber =
    Math.floor((moveHistory.length - lastMoves.length + index) / 2) + 1;
    const isWhiteMove =
        (moveHistory.length - lastMoves.length + index) % 2 === 0;

        if (isWhiteMove) {
          return `<div class="text-gray-300 mb-1">${moveNumber}. ${move.notation}</div>`;
        } else {
          return `<div class="text-gray-400 mb-1 ml-8">${move.notation}</div>`;
        }
      })
      .join("");
      
      historyElement.scrollTop = historyElement.scrollHeight;
    };
    
    /* ---------------------- Socket events ---------------------- */
    socket.on("playerRole", function (role) {
      playerRole = role;
      renderBoard();
    });
    
    socket.on("spectatorRole", function () {
      playerRole = null;
      renderBoard();
    });
    
    socket.on("boardState", function (fen) {
      chess.load(fen);
      renderBoard();
    });
    
    socket.on("move", function (move) {
      chess.move(move);
      moveHistory.push({ notation: move.san });
      renderBoard();
      updateMoveHistory();
    });
    
    socket.on("lobbyUpdate", function (lobby) {
      const opponentLabel = document.getElementById("opponentName");
      const opponentlabelStatus = document.getElementById("opponentNameStatus");
      
      if (playerRole === "w") {
        opponentLabel.textContent = lobby.black || "Waiting for Opponent...";
        opponentlabelStatus.textContent = lobby.black || "-";
      } else if (playerRole === "b") {
        opponentLabel.textContent = lobby.white || "Waiting for Opponent...";
        opponentlabelStatus.textContent = lobby.white || "-";
      }
    });
    
    socket.on("opponentJoined", function ({ name }) {
      document.getElementById("opponentName").textContent = name;
      document.getElementById("OpponentStatus").classList.remove("bg-gray-600");
      document.getElementById("OpponentStatus").classList.add("bg-green-600");
      
      // Update game status span for opponent
      document.getElementById("opponentNameStatus").textContent = name;
});

socket.on("waitingForOpponent", function () {
  document.getElementById("opponentName").textContent =
  "Waiting for Opponent...";
});

socket.on("gameStart", function ({ orientation: o }) {
  orientation = o;
  chess.reset();
  moveHistory = [];
  renderBoard();
  updateMoveHistory();
});

socket.on("gameReset", function () {
  chess.reset();
  moveHistory = [];
  renderBoard();
  updateMoveHistory();

  document.getElementById("opponentName").textContent =
    "Waiting for Opponent...";
    document.getElementById("opponentStatus").classList.remove("bg-green-600");
    document.getElementById("opponentStatus").classList.add("bg-gray-600");
    
    // Reset status names
    document.getElementById("opponentNameStatus").textContent = "-";
  });
  
  socket.on("invalidMove", function () {
    alert("Invalid move!");
  });
  
  /* ---------------------- Chat ---------------------- */
  chatHistory = () => {
    // --- Chat elements ---
    const messageInput = document.getElementById("sendMessage");
    const sendBtn = document.querySelector(".send-button");
    const chatFeed = document.getElementById("chat-messages");
    
    // Track opponent connection
    let isOpponentConnected = false;
    
    // Listen when opponent joins
    socket.on("opponentJoined", ({ name }) => {
      isOpponentConnected = true;
    });
    
    // Listen when opponent disconnects (optional)
    socket.on("opponentLeft", () => {
      isOpponentConnected = false;
    });
    
    // helper to escape HTML (avoid XSS)
    const escapeHtml = (s) => {
      const p = document.createElement("p");
      p.textContent = s;
    return p.innerHTML;
  };
  
  // append a message line under the rules
  function appendChatLine(senderName, text) {
    const line = document.createElement("div");
    line.className = "w-full leading-snug";
    line.innerHTML = `<span class="font-semibold">${escapeHtml(
      senderName
    )}:</span> ${escapeHtml(text)}`;
    chatFeed.appendChild(line);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
  
  // Stylish popup function
  function showPopup(message) {
    let popup = document.createElement("div");
    popup.className =
    "fixed bottom-5 left-12 transform -translate-x-1/2 text-white text-lg font-semibold px-6 py-3 rounded shadow-lg z-50 animate-bounce";
    
    popup.style.borderRadius = "12px";
    popup.style.background =
    "linear-gradient(to bottom right, #171921ff, #0f172a, #351b4bff)";
    popup.style.border = "1px solid rgba(255, 255, 255, 0.21)";
    
    const icon = document.createElement("i");
    icon.className = "fas fa-exclamation-triangle text-white-500";
    
    // Create text span
    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    
    // Append icon and text to popup
    popup.appendChild(icon);
    popup.appendChild(textSpan);

    document.body.appendChild(popup);
    
    // Remove after 2.5s
    setTimeout(() => {
      popup.remove();
    }, 2500);
  }
  
  // Updated send handler
  function sendChat() {
    const text = (messageInput.value || "").trim();
    if (!text) return;
    
    // Check opponent status
    if (!isOpponentConnected) {
      showPopup(" Opponent hasn't joined yet!");
      return;
    }
    
    // Send message
    socket.emit("chat:send", { text });
    messageInput.value = "";
  }
  
  // click + Enter (no Shift) to send
  if (sendBtn) sendBtn.addEventListener("click", sendChat);
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
  
  // receive new chat messages
  socket.on("chat:new", ({ text, from }) => {
    appendChatLine(from, text);
  });
};

/* ---------------------- Init ---------------------- */
inputTaken();
renderBoard();
updateMoveHistory();
chatHistory();
