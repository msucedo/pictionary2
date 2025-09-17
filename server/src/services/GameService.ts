import { Room, Player, ChatMessage, GameSettings, DEFAULT_GAME_SETTINGS, GAME_WORDS, SCORING, TurnResult, GuessResult } from '../types/game';
import { v4 as uuidv4 } from 'uuid';

export class GameService {
  private rooms: Map<string, Room> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // socketId -> roomId
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private roomMessages: Map<string, ChatMessage[]> = new Map();

  // Room Management
  createRoom(hostName: string, roomName: string, hostSocketId: string, settings: Partial<GameSettings> = {}): Room {
    const roomId = uuidv4();
    const roomCode = this.generateRoomCode();
    const hostPlayer: Player = {
      id: uuidv4(),
      name: hostName,
      score: 0,
      isHost: true,
      socketId: hostSocketId,
      isConnected: true,
      joinedAt: new Date()
    };

    const gameSettings = { ...DEFAULT_GAME_SETTINGS, ...settings };

    const room: Room = {
      id: roomId,
      name: roomName,
      code: roomCode,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      maxPlayers: gameSettings.maxPlayers,
      status: 'waiting',
      currentRound: 0,
      maxRounds: gameSettings.maxRounds,
      turnDuration: gameSettings.turnDuration,
      createdAt: new Date(),
      words: [...GAME_WORDS],
      usedWords: []
    };

    this.rooms.set(roomId, room);
    this.playerRoomMap.set(hostSocketId, roomId);
    this.roomMessages.set(roomId, []);

    // Add system message
    this.addSystemMessage(roomId, `${hostName} creó la sala`);

    return room;
  }

  joinRoom(roomCode: string, playerName: string, socketId: string): { success: boolean; room?: Room; player?: Player; error?: string } {
    const room = Array.from(this.rooms.values()).find(r => r.code === roomCode);

    if (!room) {
      return { success: false, error: 'Sala no encontrada' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Sala llena' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'La partida ya comenzó' };
    }

    // Check if player name already exists
    if (room.players.some(p => p.name === playerName)) {
      return { success: false, error: 'Ya existe un jugador con ese nombre' };
    }

    const newPlayer: Player = {
      id: uuidv4(),
      name: playerName,
      score: 0,
      isHost: false,
      socketId,
      isConnected: true,
      joinedAt: new Date()
    };

    room.players.push(newPlayer);
    this.playerRoomMap.set(socketId, room.id);

    // Add system message
    this.addSystemMessage(room.id, `${playerName} se unió a la sala`);

    return { success: true, room, player: newPlayer };
  }

  leaveRoom(socketId: string): { roomId?: string; playerId?: string; playerName?: string; wasHost?: boolean } {
    const roomId = this.playerRoomMap.get(socketId);
    if (!roomId) return {};

    const room = this.rooms.get(roomId);
    if (!room) return {};

    const playerIndex = room.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) return {};

    const player = room.players[playerIndex];
    if (!player) return {};

    const wasHost = player.isHost;

    // Remove player from room
    room.players.splice(playerIndex, 1);
    this.playerRoomMap.delete(socketId);

    // Add system message
    this.addSystemMessage(roomId, `${player.name} dejó la sala`);

    // If room is empty, clean up
    if (room.players.length === 0) {
      this.cleanupRoom(roomId);
      return { roomId, playerId: player.id, playerName: player.name, wasHost };
    }

    // If host left, assign new host
    if (wasHost && room.players.length > 0) {
      const newHost = room.players[0];
      if (newHost) {
        newHost.isHost = true;
        room.hostId = newHost.id;
        this.addSystemMessage(roomId, `${newHost.name} es ahora el anfitrión`);
      }
    }

    // If player was drawing, skip turn
    if (room.currentDrawerId === player.id && room.status === 'playing') {
      this.endTurn(roomId, 'player_left');
    }

    return { roomId, playerId: player.id, playerName: player.name, wasHost };
  }

  // Game Logic
  startGame(roomId: string, hostSocketId: string): { success: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Sala no encontrada' };

    const host = room.players.find(p => p.socketId === hostSocketId);
    if (!host?.isHost) return { success: false, error: 'Solo el anfitrión puede iniciar el juego' };

    if (room.players.length < 2) return { success: false, error: 'Se necesitan al menos 2 jugadores' };

    room.status = 'playing';
    room.currentRound = 1;
    room.gameStartTime = new Date();

    // Reset scores
    room.players.forEach(p => p.score = 0);

    // Start first turn
    this.startTurn(roomId);

    return { success: true };
  }

  private startTurn(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Get next drawer
    const currentDrawerIndex = room.currentDrawerId
      ? room.players.findIndex(p => p.id === room.currentDrawerId)
      : -1;

    const nextDrawerIndex = (currentDrawerIndex + 1) % room.players.length;
    const nextDrawer = room.players[nextDrawerIndex];

    if (!nextDrawer) {
      console.error('No next drawer found');
      return;
    }

    // If we completed a round
    if (nextDrawerIndex === 0 && room.currentDrawerId) {
      room.currentRound++;

      // Check if game should end
      if (room.currentRound > room.maxRounds) {
        this.endGame(roomId);
        return;
      }
    }

    // Set current drawer and word
    room.currentDrawerId = nextDrawer.id;
    const randomWord = this.getRandomWord(room);
    if (randomWord) {
      room.currentWord = randomWord;
    }
    room.timeLeft = room.turnDuration;
    room.turnStartTime = new Date();
    room.status = 'playing';

    // Clear drawing
    delete room.drawingData;

    // Add system message
    this.addSystemMessage(roomId, `Turno de ${nextDrawer.name} - ${room.currentWord || 'palabra'}`);

    // Start timer
    this.startTurnTimer(roomId);
  }

  private startTurnTimer(roomId: string): void {
    // Clear existing timer
    const existingTimer = this.roomTimers.get(roomId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      const room = this.rooms.get(roomId);
      if (!room || room.status !== 'playing') {
        clearInterval(timer);
        this.roomTimers.delete(roomId);
        return;
      }

      if (room.timeLeft && room.timeLeft > 0) {
        room.timeLeft--;
      } else {
        this.endTurn(roomId, 'time_up');
      }
    }, 1000);

    this.roomTimers.set(roomId, timer);
  }

  private endTurn(roomId: string, reason: 'time_up' | 'all_guessed' | 'player_left' | 'skipped'): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear timer
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.roomTimers.delete(roomId);
    }

    // Calculate turn results
    const turnResult = this.calculateTurnResult(roomId, reason);

    // Add result message
    if (reason === 'time_up') {
      this.addSystemMessage(roomId, `¡Se acabó el tiempo! La palabra era: ${room.currentWord}`);
    } else if (reason === 'all_guessed') {
      this.addSystemMessage(roomId, `¡Todos adivinaron la palabra!`);
    }

    // Start next turn after a delay
    setTimeout(() => {
      this.startTurn(roomId);
    }, 3000);
  }

  private calculateTurnResult(roomId: string, reason: string): TurnResult {
    const room = this.rooms.get(roomId);
    if (!room || !room.currentDrawerId || !room.currentWord) {
      throw new Error('Invalid room state for turn result calculation');
    }

    const messages = this.roomMessages.get(roomId) || [];
    const turnStartTime = room.turnStartTime || new Date();
    const drawer = room.players.find(p => p.id === room.currentDrawerId);

    // Find correct guesses during this turn
    const correctGuesses: GuessResult[] = messages
      .filter(m =>
        m.type === 'correct_guess' &&
        m.timestamp >= turnStartTime
      )
      .map((m, index) => {
        const guessTime = Math.floor((m.timestamp.getTime() - turnStartTime.getTime()) / 1000);
        const timeBonus = Math.max(0, Math.floor((room.turnDuration - guessTime) / room.turnDuration * SCORING.TIME_BONUS_MAX));
        const firstGuessBonus = index === 0 ? SCORING.FIRST_GUESS_BONUS : 0;
        const pointsEarned = SCORING.CORRECT_GUESS_BASE + timeBonus + firstGuessBonus;

        // Award points to player
        const player = room.players.find(p => p.id === m.playerId);
        if (player) {
          player.score += pointsEarned;
        }

        return {
          playerId: m.playerId,
          playerName: m.playerName,
          guessTime,
          pointsEarned
        };
      });

    // Award points to drawer
    if (drawer && correctGuesses.length > 0) {
      const drawerBonus = correctGuesses.length * SCORING.DRAWER_BONUS_PER_GUESS;
      drawer.score += drawerBonus;
    }

    const timeElapsed = room.turnDuration - (room.timeLeft || 0);

    return {
      drawerId: room.currentDrawerId,
      drawerName: drawer?.name || 'Unknown',
      word: room.currentWord,
      correctGuesses,
      timeElapsed,
      allGuessed: reason === 'all_guessed'
    };
  }

  private endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = 'finished';

    // Sort players by score
    const finalScores = [...room.players].sort((a, b) => b.score - a.score);
    const winner = finalScores[0];

    // Add game end message
    if (winner) {
      this.addSystemMessage(roomId, `¡Juego terminado! Ganador: ${winner.name} con ${winner.score} puntos`);
    } else {
      this.addSystemMessage(roomId, '¡Juego terminado!');
    }

    // Clean up timer
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.roomTimers.delete(roomId);
    }
  }

  // Chat
  addChatMessage(roomId: string, playerId: string, message: string): ChatMessage | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return null;

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      playerId,
      playerName: player.name,
      message,
      timestamp: new Date(),
      type: 'chat'
    };

    // Check if it's a correct guess
    if (room.status === 'playing' && room.currentWord && room.currentDrawerId !== playerId) {
      const normalizedGuess = message.trim().toUpperCase();
      const normalizedWord = room.currentWord.toUpperCase();

      if (normalizedGuess === normalizedWord) {
        chatMessage.type = 'correct_guess';
        chatMessage.isCorrectGuess = true;

        // Check if all non-drawing players guessed correctly
        const nonDrawers = room.players.filter(p => p.id !== room.currentDrawerId);
        const messages = this.roomMessages.get(roomId) || [];
        const correctGuessers = new Set(
          messages
            .filter(m => m.type === 'correct_guess' && m.timestamp >= (room.turnStartTime || new Date()))
            .map(m => m.playerId)
        );
        correctGuessers.add(playerId);

        if (correctGuessers.size >= nonDrawers.length) {
          // All players guessed correctly
          setTimeout(() => this.endTurn(roomId, 'all_guessed'), 1000);
        }
      }
    }

    const messages = this.roomMessages.get(roomId) || [];
    messages.push(chatMessage);
    this.roomMessages.set(roomId, messages);

    return chatMessage;
  }

  private addSystemMessage(roomId: string, message: string): void {
    const systemMessage: ChatMessage = {
      id: uuidv4(),
      playerId: 'system',
      playerName: 'Sistema',
      message,
      timestamp: new Date(),
      type: 'system'
    };

    const messages = this.roomMessages.get(roomId) || [];
    messages.push(systemMessage);
    this.roomMessages.set(roomId, messages);
  }

  // Utils
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Ensure uniqueness
    const exists = Array.from(this.rooms.values()).some(room => room.code === result);
    return exists ? this.generateRoomCode() : result;
  }

  private getRandomWord(room: Room): string | undefined {
    if (room.words.length === 0) return undefined;

    const availableWords = room.words.filter(word => !room.usedWords.includes(word));

    if (availableWords.length === 0) {
      // Reset used words if all have been used
      room.usedWords = [];
      return room.words[Math.floor(Math.random() * room.words.length)];
    }

    const selectedWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    if (selectedWord) {
      room.usedWords.push(selectedWord);
      return selectedWord;
    }
    return undefined;
  }

  private cleanupRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.roomMessages.delete(roomId);

    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.roomTimers.delete(roomId);
    }
  }

  // Getters
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocketId(socketId: string): Room | undefined {
    const roomId = this.playerRoomMap.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getPlayer(socketId: string): Player | undefined {
    const room = this.getRoomBySocketId(socketId);
    return room?.players.find(p => p.socketId === socketId);
  }

  getRoomMessages(roomId: string): ChatMessage[] {
    return this.roomMessages.get(roomId) || [];
  }

  // Drawing
  updateDrawing(roomId: string, drawingData: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.drawingData = drawingData;
    }
  }

  clearDrawing(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      delete room.drawingData;
    }
  }

  // Skip turn
  skipTurn(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.currentDrawerId !== playerId) return false;

    this.endTurn(roomId, 'skipped');
    return true;
  }
}