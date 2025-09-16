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