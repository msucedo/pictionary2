export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isDrawing?: boolean;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished' | 'turn_transition' | 'round_end';
  currentRound: number;
  maxRounds: number;
  currentDrawerId?: string;
  currentWord?: string;
  timeLeft?: number;
  turnStartTime?: Date;
  turnDuration: number; // in seconds
  gameStartTime?: Date;
  lastGuessTime?: Date;
  createdAt: Date;
  gameResults?: GameResults;
}

export interface GameSettings {
  maxPlayers: number;
  maxRounds: number;
  roundTime: number; // in seconds
  drawTime: number; // in seconds
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  guessTime: number; // seconds from turn start
  pointsEarned: number;
}

export interface TurnResult {
  drawerId: string;
  drawerName: string;
  word: string;
  correctGuesses: GuessResult[];
  timeElapsed: number;
  allGuessed: boolean;
}

export interface GameResults {
  finalScores: Player[];
  turnResults: TurnResult[];
  totalTime: number;
  winner?: Player;
}

export interface TurnTransition {
  nextDrawer: Player;
  nextWord: string;
  round: number;
  turnNumber: number;
  lastTurnResult?: TurnResult;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  maxPlayers: 8,
  maxRounds: 3,
  roundTime: 90,
  drawTime: 75,
};

// Scoring system
export const SCORING = {
  CORRECT_GUESS_BASE: 10,
  TIME_BONUS_MAX: 5, // Maximum bonus points for speed
  DRAWER_BONUS_PER_GUESS: 2, // Bonus for drawer when someone guesses correctly
  FIRST_GUESS_BONUS: 3, // Extra bonus for first correct guess
};

export interface DrawingEvent {
  type: 'start' | 'draw' | 'end' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  imageData?: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'guess' | 'system';
}

// Socket Events - SYNCHRONIZED WITH SERVER
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