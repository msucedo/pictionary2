import { Room, Player, GameSettings, DEFAULT_GAME_SETTINGS, TurnResult, GuessResult, TurnTransition, SCORING } from '../types/room';
import { ChatMessage, DUMMY_MESSAGES, PICTIONARY_WORDS } from '../types/chat';

class RoomService {
  private rooms: Map<string, Room> = new Map();
  private players: Map<string, Player> = new Map();
  private roomMessages: Map<string, ChatMessage[]> = new Map();
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  private turnResults: Map<string, TurnResult[]> = new Map();

  // Generate a random room code
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate a unique room ID
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate a unique player ID
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate dummy players
  private generateDummyPlayers(excludeName: string): Player[] {
    const dummyNames = ['Ana', 'Carlos', 'Diana', 'Elena', 'Franco', 'Gabriel', 'Helena', 'Iván']
      .filter(name => name !== excludeName);

    const numDummyPlayers = Math.floor(Math.random() * 4) + 2; // 2-5 jugadores dummy
    const selectedNames = dummyNames.slice(0, numDummyPlayers);

    return selectedNames.map((name, index) => ({
      id: `dummy_player_${index + 1}`,
      name,
      score: Math.floor(Math.random() * 30), // Puntuación aleatoria
      isHost: false,
    }));
  }

  // Get random word
  private getRandomWord(): string {
    return PICTIONARY_WORDS[Math.floor(Math.random() * PICTIONARY_WORDS.length)];
  }

  // Create a new room
  createRoom(hostName: string, roomName: string, settings: GameSettings = DEFAULT_GAME_SETTINGS): { room: Room; hostPlayer: Player } {
    const roomId = this.generateRoomId();
    const roomCode = this.generateRoomCode();
    const hostId = this.generatePlayerId();

    const hostPlayer: Player = {
      id: hostId,
      name: hostName,
      score: 0,
      isHost: true,
    };

    // Add dummy players
    const dummyPlayers = this.generateDummyPlayers(hostName);
    const allPlayers = [hostPlayer, ...dummyPlayers];

    // Register all players
    allPlayers.forEach(player => {
      this.players.set(player.id, player);
    });

    const room: Room = {
      id: roomId,
      name: roomName,
      code: roomCode,
      hostId: hostId,
      players: allPlayers,
      maxPlayers: settings.maxPlayers,
      status: 'waiting',
      currentRound: 0,
      maxRounds: settings.maxRounds,
      currentWord: this.getRandomWord(),
      turnDuration: settings.drawTime,
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);

    // Initialize chat with dummy messages
    this.roomMessages.set(roomId, [...DUMMY_MESSAGES]);

    return { room, hostPlayer };
  }

  // Join an existing room
  joinRoom(roomCode: string, playerName: string): { room: Room; player: Player } | null {
    const room = Array.from(this.rooms.values()).find(r => r.code === roomCode);

    if (!room) {
      throw new Error('Sala no encontrada');
    }

    if (room.status !== 'waiting') {
      throw new Error('La sala ya está en juego');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('La sala está llena');
    }

    // Check if player name already exists in room
    if (room.players.some(p => p.name === playerName)) {
      throw new Error('Ya existe un jugador con ese nombre en la sala');
    }

    const playerId = this.generatePlayerId();
    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isHost: false,
    };

    room.players.push(player);
    this.players.set(playerId, player);
    this.rooms.set(room.id, room);

    return { room, player };
  }

  // Leave a room
  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;

    const player = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    this.players.delete(playerId);

    // If host leaves, make another player host or delete room
    if (player.isHost) {
      if (room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
      } else {
        this.rooms.delete(roomId);
        return null;
      }
    }

    this.rooms.set(roomId, room);
    return room;
  }

  // Get room by ID
  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  // Get room by code
  getRoomByCode(roomCode: string): Room | null {
    return Array.from(this.rooms.values()).find(r => r.code === roomCode) || null;
  }

  // Get player by ID
  getPlayer(playerId: string): Player | null {
    return this.players.get(playerId) || null;
  }

  // Start game
  startGame(roomId: string, hostId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.hostId !== hostId) return null;

    if (room.players.length < 2) {
      throw new Error('Se necesitan al menos 2 jugadores para comenzar');
    }

    // Initialize game state
    room.status = 'playing';
    room.currentRound = 1;
    room.gameStartTime = new Date();

    // Initialize turn results
    this.turnResults.set(roomId, []);

    // Start first turn
    this.startNextTurn(roomId);

    return room;
  }

  // Get all rooms (for debugging)
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Chat methods
  getRoomMessages(roomId: string): ChatMessage[] {
    return this.roomMessages.get(roomId) || [];
  }

  addMessage(roomId: string, playerId: string, message: string): ChatMessage | null {
    const room = this.rooms.get(roomId);
    const player = this.players.get(playerId);

    if (!room || !player) return null;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      playerName: player.name,
      message: message.trim(),
      timestamp: new Date(),
      type: this.isGuess(message, room.currentWord) ? 'guess' : 'chat',
    };

    // Check if it's a correct guess
    if (newMessage.type === 'guess' && room.currentWord &&
        message.toLowerCase().trim() === room.currentWord.toLowerCase() &&
        room.status === 'playing' && playerId !== room.currentDrawerId) {

      newMessage.type = 'correct_guess';
      newMessage.isCorrect = true;

      // Calculate guess time and check if it's first correct guess
      const guessTime = room.turnStartTime ?
        Math.floor((Date.now() - room.turnStartTime.getTime()) / 1000) : 0;

      const isFirstGuess = !room.lastGuessTime;
      if (isFirstGuess) {
        room.lastGuessTime = new Date();
        this.rooms.set(roomId, room);
      }

      // Award points with new scoring system
      const pointsEarned = this.awardPoints(roomId, playerId, guessTime, isFirstGuess);

      // Add system message
      const systemMessage: ChatMessage = {
        id: `sys_${Date.now()}`,
        playerId: 'system',
        playerName: 'Sistema',
        message: `¡${player.name} adivinó correctamente! +${pointsEarned} puntos`,
        timestamp: new Date(),
        type: 'system',
      };

      const messages = this.roomMessages.get(roomId) || [];
      messages.push(newMessage, systemMessage);
      this.roomMessages.set(roomId, messages);

      // Check if all non-drawing players have guessed correctly
      const nonDrawers = room.players.filter(p => p.id !== room.currentDrawerId);
      const correctGuessers = messages.filter(m =>
        m.type === 'correct_guess' &&
        m.timestamp > (room.turnStartTime || new Date())
      ).map(m => m.playerId);

      const uniqueCorrectGuessers = Array.from(new Set(correctGuessers));

      if (uniqueCorrectGuessers.length >= nonDrawers.length) {
        // All players guessed correctly, end turn
        setTimeout(() => this.endTurn(roomId, 'all_guessed'), 1000);
      }

      return newMessage;
    }

    const messages = this.roomMessages.get(roomId) || [];
    messages.push(newMessage);
    this.roomMessages.set(roomId, messages);

    return newMessage;
  }

  private isGuess(message: string, currentWord?: string): boolean {
    if (!currentWord) return false;

    // Simple heuristic: if message is short and doesn't contain spaces or punctuation
    const cleaned = message.trim().toLowerCase();
    return cleaned.length <= 15 && !/[.!?¿¡]/.test(cleaned) && !cleaned.includes(' ');
  }

  // Turn management methods
  startNextTurn(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Clear any existing timer
    this.clearTimer(roomId);

    // Determine next drawer
    const nextDrawer = this.getNextDrawer(room);
    if (!nextDrawer) return false;

    // Update room state
    room.currentDrawerId = nextDrawer.id;
    room.currentWord = this.getRandomWord();
    room.turnStartTime = new Date();
    room.timeLeft = room.turnDuration;
    room.lastGuessTime = undefined;

    // Update player drawing status
    room.players.forEach(p => p.isDrawing = p.id === nextDrawer.id);

    this.rooms.set(roomId, room);

    // Start turn timer
    this.startTurnTimer(roomId);

    // Add system message
    this.addSystemMessage(roomId, `Turno de ${nextDrawer.name}. ¡A dibujar!`);

    return true;
  }

  private getNextDrawer(room: Room): Player | null {
    if (room.players.length === 0) return null;

    // If no current drawer, start with first player
    if (!room.currentDrawerId) {
      return room.players[0];
    }

    // Find current drawer index
    const currentIndex = room.players.findIndex(p => p.id === room.currentDrawerId);
    if (currentIndex === -1) return room.players[0];

    // Get next player (circular)
    const nextIndex = (currentIndex + 1) % room.players.length;

    // If we've completed a round, increment round number
    if (nextIndex === 0) {
      room.currentRound++;
    }

    return room.players[nextIndex];
  }

  private startTurnTimer(roomId: string): void {
    const timer = setInterval(() => {
      const room = this.rooms.get(roomId);
      if (!room || room.status !== 'playing') {
        this.clearTimer(roomId);
        return;
      }

      // Update time left
      const elapsed = Math.floor((Date.now() - (room.turnStartTime?.getTime() || 0)) / 1000);
      room.timeLeft = Math.max(0, room.turnDuration - elapsed);

      this.rooms.set(roomId, room);

      // Check if time is up
      if (room.timeLeft <= 0) {
        this.endTurn(roomId, 'timeout');
      }
    }, 1000);

    this.roomTimers.set(roomId, timer);
  }

  private clearTimer(roomId: string): void {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.roomTimers.delete(roomId);
    }
  }

  endTurn(roomId: string, reason: 'timeout' | 'all_guessed' | 'skip'): TurnResult | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    this.clearTimer(roomId);

    // Calculate turn result
    const turnResult = this.calculateTurnResult(room, reason);
    if (turnResult) {
      const results = this.turnResults.get(roomId) || [];
      results.push(turnResult);
      this.turnResults.set(roomId, results);
    }

    // Check if game should end
    if (this.shouldEndGame(room)) {
      this.endGame(roomId);
    } else {
      // Short transition before next turn
      room.status = 'turn_transition';
      this.rooms.set(roomId, room);

      setTimeout(() => {
        const updatedRoom = this.rooms.get(roomId);
        if (updatedRoom && updatedRoom.status === 'turn_transition') {
          updatedRoom.status = 'playing';
          this.startNextTurn(roomId);
        }
      }, 3000); // 3 second transition
    }

    return turnResult;
  }

  private calculateTurnResult(room: Room, reason: string): TurnResult | null {
    if (!room.currentDrawerId || !room.currentWord || !room.turnStartTime) return null;

    const drawer = room.players.find(p => p.id === room.currentDrawerId);
    if (!drawer) return null;

    const timeElapsed = Math.floor((Date.now() - room.turnStartTime.getTime()) / 1000);

    // Get correct guesses from messages (this is simplified - in real implementation
    // you'd track guesses more precisely)
    const correctGuesses: GuessResult[] = [];

    return {
      drawerId: drawer.id,
      drawerName: drawer.name,
      word: room.currentWord,
      correctGuesses,
      timeElapsed,
      allGuessed: reason === 'all_guessed'
    };
  }

  private shouldEndGame(room: Room): boolean {
    const totalTurns = room.players.length * room.maxRounds;
    const completedTurns = this.turnResults.get(room.id)?.length || 0;
    return completedTurns >= totalTurns;
  }

  private endGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.clearTimer(roomId);
    room.status = 'finished';

    // Calculate final results
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    room.gameResults = {
      finalScores: sortedPlayers,
      turnResults: this.turnResults.get(roomId) || [],
      totalTime: room.gameStartTime ? Math.floor((Date.now() - room.gameStartTime.getTime()) / 1000) : 0,
      winner: sortedPlayers[0]
    };

    this.rooms.set(roomId, room);
    this.addSystemMessage(roomId, `¡Juego terminado! Ganador: ${sortedPlayers[0]?.name || 'Nadie'}`);
  }

  private addSystemMessage(roomId: string, message: string): void {
    const systemMessage: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  // Enhanced scoring when someone guesses correctly
  awardPoints(roomId: string, playerId: string, guessTime: number, isFirstGuess: boolean): number {
    const room = this.rooms.get(roomId);
    const player = this.players.get(playerId);

    if (!room || !player) return 0;

    // Calculate points based on speed
    const timeBonus = Math.floor(SCORING.TIME_BONUS_MAX * (1 - guessTime / room.turnDuration));
    let points = SCORING.CORRECT_GUESS_BASE + Math.max(0, timeBonus);

    if (isFirstGuess) {
      points += SCORING.FIRST_GUESS_BONUS;
    }

    // Award points to guesser
    player.score += points;
    this.players.set(playerId, player);

    // Award bonus to drawer
    const drawer = this.players.get(room.currentDrawerId || '');
    if (drawer) {
      drawer.score += SCORING.DRAWER_BONUS_PER_GUESS;
      this.players.set(drawer.id, drawer);
    }

    // Update room players
    room.players = room.players.map(p =>
      p.id === playerId ? player :
      p.id === drawer?.id ? drawer : p
    );
    this.rooms.set(roomId, room);

    return points;
  }

  // Skip turn (for drawer)
  skipTurn(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.currentDrawerId !== playerId) return false;

    this.endTurn(roomId, 'skip');
    this.addSystemMessage(roomId, 'El dibujante pasó su turno.');
    return true;
  }

  // Get turn transition data
  getTurnTransition(roomId: string): TurnTransition | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const nextDrawer = this.getNextDrawer(room);
    if (!nextDrawer) return null;

    const turnResults = this.turnResults.get(roomId) || [];
    const lastResult = turnResults[turnResults.length - 1];

    return {
      nextDrawer,
      nextWord: this.getRandomWord(),
      round: room.currentRound,
      turnNumber: turnResults.length + 1,
      lastTurnResult: lastResult
    };
  }

  // Simulate dummy messages being added periodically
  addDummyMessage(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const dummyPlayers = room.players.filter(p => p.id.startsWith('dummy_'));
    if (dummyPlayers.length === 0) return;

    const randomPlayer = dummyPlayers[Math.floor(Math.random() * dummyPlayers.length)];

    const messageTypes = [
      { type: 'chat', messages: ['¡Bien hecho!', '¿Qué será?', 'Muy difícil', '¡Vamos!', 'Interesante...'] },
      { type: 'guess', messages: ['perro', 'gato', 'casa', 'coche', 'árbol', 'flor', 'montaña'] }
    ];

    const selectedType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    const randomMessage = selectedType.messages[Math.floor(Math.random() * selectedType.messages.length)];

    this.addMessage(roomId, randomPlayer.id, randomMessage);
  }
}

// Export singleton instance
export const roomService = new RoomService();