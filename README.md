# ChessSmash Pro
# ♟️ ChessSmash Pro

A real-time, multiplayer chess experience powered by Node.js, Express, Socket.IO, and Chess.js — designed for fast, smooth, modern gameplay.
Play instantly with live move syncing, spectators, chat, role auto-assignment, and a clean UI.

🚀 Features
🎮 Real-Time Multiplayer Chess

Moves are synced instantly between players using Socket.IO

Full rule validation using Chess.js

Turn-based enforcement ensures players cannot move out of turn

👥 Intelligent Player Matching

Automatic role assignment (White / Black / Spectator)

Random first-player assignment when first player joins

Reassignment when a player disconnects

🔁 Game Lifecycle Management

Game starts only when both players are ready

Automatic game reset if a player leaves mid-game

Game state synced using FEN notation

💬 Built-in Real-Time Chat

Live chat using websockets

Player name displayed with each message

👀 Spectator Support

Unlimited spectators can watch matches

Get live board state updates

Cannot move pieces

🧩 Clean Modular Backend

Includes:

Move handler

Lobby system

Player state tracking

Proper disconnect handling
