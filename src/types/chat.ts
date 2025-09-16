export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'guess' | 'correct_guess' | 'system' | 'hint';
  isCorrect?: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  currentWord?: string;
  isGuessMode: boolean;
}

// Dummy chat messages for testing
export const DUMMY_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_1',
    playerId: 'player_2',
    playerName: 'Ana',
    message: '¡Hola a todos!',
    timestamp: new Date(Date.now() - 120000),
    type: 'chat'
  },
  {
    id: 'msg_2',
    playerId: 'system',
    playerName: 'Sistema',
    message: 'Ana está dibujando...',
    timestamp: new Date(Date.now() - 100000),
    type: 'system'
  },
  {
    id: 'msg_3',
    playerId: 'player_3',
    playerName: 'Carlos',
    message: 'casa',
    timestamp: new Date(Date.now() - 80000),
    type: 'guess'
  },
  {
    id: 'msg_4',
    playerId: 'player_4',
    playerName: 'Diana',
    message: 'edificio',
    timestamp: new Date(Date.now() - 70000),
    type: 'guess'
  },
  {
    id: 'msg_5',
    playerId: 'player_3',
    playerName: 'Carlos',
    message: 'hogar',
    timestamp: new Date(Date.now() - 60000),
    type: 'guess'
  },
  {
    id: 'msg_6',
    playerId: 'player_5',
    playerName: 'Elena',
    message: 'vivienda',
    timestamp: new Date(Date.now() - 50000),
    type: 'correct_guess',
    isCorrect: true
  },
  {
    id: 'msg_7',
    playerId: 'system',
    playerName: 'Sistema',
    message: '¡Elena adivinó correctamente! +10 puntos',
    timestamp: new Date(Date.now() - 45000),
    type: 'system'
  },
  {
    id: 'msg_8',
    playerId: 'player_4',
    playerName: 'Diana',
    message: '¡Bien hecho Elena!',
    timestamp: new Date(Date.now() - 30000),
    type: 'chat'
  },
  {
    id: 'msg_9',
    playerId: 'player_6',
    playerName: 'Franco',
    message: 'Muy rápida 👏',
    timestamp: new Date(Date.now() - 20000),
    type: 'chat'
  },
  {
    id: 'msg_10',
    playerId: 'system',
    playerName: 'Sistema',
    message: 'Turno de Carlos. Prepárate para dibujar...',
    timestamp: new Date(Date.now() - 10000),
    type: 'system'
  }
];

// Common words for Pictionary
export const PICTIONARY_WORDS = [
  'CASA', 'PERRO', 'ÁRBOL', 'COCHE', 'TELÉFONO', 'LIBRO', 'GATO', 'FLOR',
  'MONTAÑA', 'OCÉANO', 'AVIÓN', 'GUITARRA', 'PIZZA', 'RELOJ', 'MARIPOSA',
  'ESTRELLA', 'GLOBO', 'ZAPATO', 'PARAGUAS', 'BICICLETA', 'HELADO', 'CAFÉ',
  'LEÓN', 'NUBE', 'CORAZÓN', 'LLAVE', 'ESCALERA', 'TELEVISIÓN', 'BANANA',
  'SOMBRERO', 'PUENTE', 'FUEGO', 'VENTANA', 'BOTÓN', 'ESPEJO', 'CORONA'
];