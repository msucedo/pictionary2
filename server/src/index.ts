import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { GameService } from './services/GameService';
import { ServerToClientEvents, ClientToServerEvents, DrawingEvent } from './types/game';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize game service
const gameService = new GameService();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Debug: Log all events
  socket.onAny((eventName, ...args) => {
    console.log(`📨 Event received: ${eventName}`, { socketId: socket.id, args: args.length });
    if (eventName === 'gameStart') {
      console.log(`🔥🔥🔥 DETECTED gameStart event via onAny! 🔥🔥🔥`);
    }
  });

  // Room Management
  socket.on('room:create', (playerName, roomName, settings) => {
    try {
      const room = gameService.createRoom(playerName, roomName, socket.id, settings);
      socket.join(room.id);
      const hostPlayer = room.players.find(p => p.isHost);
      if (hostPlayer) {
        socket.emit('room:joined', room, hostPlayer);
        console.log(`Room created: ${room.code} by ${playerName}`);
      } else {
        throw new Error('Host player not found after room creation');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', 'Error creating room');
    }
  });

  socket.on('room:join', (roomCode, playerName) => {
    try {
      const result = gameService.joinRoom(roomCode, playerName, socket.id);

      if (result.success && result.room && result.player) {
        socket.join(result.room.id);
        socket.emit('room:joined', result.room, result.player);
        socket.to(result.room.id).emit('room:updated', result.room);

        // Send chat history to new player
        const messages = gameService.getRoomMessages(result.room.id);
        messages.forEach(message => {
          socket.emit('chat:message', message);
        });

        console.log(`${playerName} joined room ${roomCode}`);
      } else {
        switch (result.error) {
          case 'Sala no encontrada':
            socket.emit('room:not_found');
            break;
          case 'Sala llena':
            socket.emit('room:full');
            break;
          default:
            socket.emit('error', result.error || 'Error joining room');
        }
      }
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Error joining room');
    }
  });

  socket.on('room:leave', () => {
    handlePlayerDisconnect(socket.id);
  });

  // Game Management
  console.log(`🔧 Registering gameStart listener for socket: ${socket.id}`);

  socket.on('gameStart', () => {
    console.log(`🎯 GAME START EVENT RECEIVED from socket: ${socket.id}`);
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      if (!room) {
        console.log(`❌ Room not found for socket: ${socket.id}`);
        socket.emit('error', 'Room not found');
        return;
      }

      console.log(`🎮 Starting game in room ${room.code}... (Socket: ${socket.id})`);
      const result = gameService.startGame(room.id, socket.id);
      if (result.success) {
        // Get the updated room after game start
        const updatedRoom = gameService.getRoom(room.id);
        if (updatedRoom) {
          console.log(`✅ Game started successfully! Room status: ${updatedRoom.status}`);
          io.to(room.id).emit('game:started', updatedRoom);
          io.to(room.id).emit('room:updated', updatedRoom);
        }
        console.log(`Game started in room ${room.code}`);
      } else {
        console.log(`❌ Failed to start game: ${result.error}`);
        socket.emit('error', result.error || 'Error starting game');
      }
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', 'Error starting game');
    }
  });

  socket.on('game:skip_turn', () => {
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      const player = gameService.getPlayer(socket.id);

      if (!room || !player) {
        socket.emit('error', 'Room or player not found');
        return;
      }

      const success = gameService.skipTurn(room.id, player.id);
      if (success) {
        io.to(room.id).emit('room:updated', room);
        console.log(`${player.name} skipped their turn`);
      } else {
        socket.emit('error', 'Cannot skip turn');
      }
    } catch (error) {
      console.error('Error skipping turn:', error);
      socket.emit('error', 'Error skipping turn');
    }
  });

  // Drawing Events
  socket.on('drawing:start', (x, y, color, size) => {
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      const player = gameService.getPlayer(socket.id);

      if (!room || !player || room.currentDrawerId !== player.id) {
        return; // Only current drawer can draw
      }

      const drawingEvent: DrawingEvent = {
        type: 'start',
        x,
        y,
        color,
        size,
        timestamp: new Date()
      };

      socket.to(room.id).emit('drawing:update', drawingEvent);
    } catch (error) {
      console.error('Error handling drawing start:', error);
    }
  });

  socket.on('drawing:draw', (x, y) => {
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      const player = gameService.getPlayer(socket.id);

      if (!room || !player || room.currentDrawerId !== player.id) {
        return; // Only current drawer can draw
      }

      const drawingEvent: DrawingEvent = {
        type: 'draw',
        x,
        y,
        timestamp: new Date()
      };

      socket.to(room.id).emit('drawing:update', drawingEvent);
    } catch (error) {
      console.error('Error handling drawing draw:', error);
    }
  });

  socket.on('drawing:end', () => {
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      const player = gameService.getPlayer(socket.id);

      if (!room || !player || room.currentDrawerId !== player.id) {
        return;
      }

      const drawingEvent: DrawingEvent = {
        type: 'end',
        timestamp: new Date()
      };

      socket.to(room.id).emit('drawing:update', drawingEvent);
    } catch (error) {
      console.error('Error handling drawing end:', error);
    }
  });

  socket.on('drawing:clear', () => {
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      const player = gameService.getPlayer(socket.id);

      if (!room || !player || room.currentDrawerId !== player.id) {
        return;
      }

      gameService.clearDrawing(room.id);
      io.to(room.id).emit('drawing:clear');
    } catch (error) {
      console.error('Error handling drawing clear:', error);
    }
  });

  // Chat Events
  socket.on('chat:send', (message) => {
    try {
      const room = gameService.getRoomBySocketId(socket.id);
      const player = gameService.getPlayer(socket.id);

      if (!room || !player) {
        socket.emit('error', 'Room or player not found');
        return;
      }

      const chatMessage = gameService.addChatMessage(room.id, player.id, message);

      if (chatMessage) {
        if (chatMessage.type === 'correct_guess') {
          // Don't show the correct guess to others, show as system message
          socket.emit('chat:message', chatMessage);

          const systemMessage = gameService.addChatMessage(room.id, 'system', `${player.name} adivinó la palabra!`);
          if (systemMessage) {
            socket.to(room.id).emit('chat:message', systemMessage);
          }
        } else {
          // Regular chat message
          io.to(room.id).emit('chat:message', chatMessage);
        }

        // Update room state
        io.to(room.id).emit('room:updated', room);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      socket.emit('error', 'Error sending message');
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    handlePlayerDisconnect(socket.id);
  });

  // Helper function for player disconnect
  function handlePlayerDisconnect(socketId: string) {
    try {
      const result = gameService.leaveRoom(socketId);

      if (result.roomId) {
        const room = gameService.getRoom(result.roomId);

        if (room) {
          socket.to(result.roomId).emit('room:left', result.playerId || '');
          socket.to(result.roomId).emit('room:updated', room);

          // Send disconnect message
          const messages = gameService.getRoomMessages(result.roomId);
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.type === 'system') {
            socket.to(result.roomId).emit('chat:message', lastMessage);
          }
        }

        console.log(`${result.playerName} left room ${result.roomId}`);
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  }
});

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Pictionary server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});