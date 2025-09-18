export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  socketId: string;
  isConnected: boolean;
  joinedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished' | 'turn_transition';
  currentRound: number;
  maxRounds: number;
  currentDrawerId?: string;
  currentWord?: string;
  timeLeft?: number;
  turnStartTime?: Date;
  turnDuration: number;
  gameStartTime?: Date;
  createdAt: Date;
  drawingData?: string;
  words: string[];
  usedWords: string[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system' | 'correct_guess' | 'join' | 'leave';
  isCorrectGuess?: boolean;
}

export interface DrawingEvent {
  type: 'start' | 'draw' | 'end' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  imageData?: string;
  timestamp: Date;
}

export interface GameSettings {
  maxPlayers: number;
  maxRounds: number;
  turnDuration: number;
  categories: string[];
}

export interface TurnResult {
  drawerId: string;
  drawerName: string;
  word: string | undefined;
  correctGuesses: GuessResult[];
  timeElapsed: number;
  allGuessed: boolean;
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  guessTime: number;
  pointsEarned: number;
}

export interface GameResults {
  finalScores: Player[];
  turnResults: TurnResult[];
  totalTime: number;
  winner?: Player;
}

// Socket Events
export interface ServerToClientEvents {
  // Room events
  'room:updated': (room: Room) => void;
  'room:joined': (room: Room, player: Player) => void;
  'room:left': (playerId: string) => void;
  'room:not_found': () => void;
  'room:full': () => void;

  // Game events
  'game:started': (room: Room) => void;
  'game:turn_started': (drawerId: string, word: string) => void;
  'game:turn_ended': (result: TurnResult) => void;
  'game:finished': (results: GameResults) => void;
  'game:time_update': (timeLeft: number) => void;

  // Drawing events
  'drawing:update': (drawingEvent: DrawingEvent) => void;
  'drawing:clear': () => void;

  // Chat events
  'chat:message': (message: ChatMessage) => void;
  'chat:correct_guess': (message: ChatMessage, points: number) => void;

  // Error events
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  // Room events
  'room:create': (playerName: string, roomName: string, settings?: Partial<GameSettings>) => void;
  'room:join': (roomCode: string, playerName: string) => void;
  'room:rejoin': (roomId: string, playerId: string) => void;
  'room:leave': () => void;

  // Game events
  'gameStart': () => void;
  'game:skip_turn': () => void;

  // Drawing events
  'drawing:start': (x: number, y: number, color: string, size: number) => void;
  'drawing:draw': (x: number, y: number) => void;
  'drawing:end': () => void;
  'drawing:clear': () => void;

  // Chat events
  'chat:send': (message: string) => void;
}

// Constants
export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: 8,
  maxRounds: 3,
  turnDuration: 90,
  categories: ['general']
};

export const SCORING = {
  CORRECT_GUESS_BASE: 10,
  TIME_BONUS_MAX: 5,
  DRAWER_BONUS_PER_GUESS: 2,
  FIRST_GUESS_BONUS: 3,
};

export const GAME_WORDS = [
  'CASA', 'PERRO', 'GATO', 'COCHE', 'ÁRBOL', 'SOL', 'LUNA', 'ESTRELLA',
  'MONTAÑA', 'MAR', 'LIBRO', 'TELÉFONO', 'COMPUTADORA', 'TELEVISIÓN',
  'MESA', 'SILLA', 'VENTANA', 'PUERTA', 'FLOR', 'MARIPOSA', 'PÁJARO',
  'PEZ', 'ELEFANTE', 'LEÓN', 'RATÓN', 'QUESO', 'PIZZA', 'HAMBURGUESA',
  'HELADO', 'CAFÉ', 'AGUA', 'FUEGO', 'TIERRA', 'AIRE', 'CORAZÓN',
  'SONRISA', 'LÁGRIMA', 'REGALO', 'FIESTA', 'MÚSICA', 'BAILE', 'DEPORTE'
];