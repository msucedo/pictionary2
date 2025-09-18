import { io, Socket } from 'socket.io-client';
import {
  Room,
  Player,
  ChatMessage,
  DrawingEvent,
  GameSettings,
  ServerToClientEvents,
  ClientToServerEvents
} from '../types/room';

export interface DrawingEventData {
  type: 'start' | 'draw' | 'end' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  imageData?: string;
  timestamp: Date;
}

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
  private connectionPromise: Promise<void> | null = null;
  private isInitialized = false;
  private reconnectHandlers: (() => void)[] = [];

  // Connection Management - Singleton pattern
  connect(): Promise<void> {
    // If already connected, resolve immediately
    if (this.socket && this.socket.connected) {
      console.log('🔗 Already connected, reusing socket:', this.socket.id);
      return Promise.resolve();
    }

    // If we already have a connection promise, return it
    if (this.connectionPromise) {
      console.log('🔗 Connection in progress, waiting...');
      return this.connectionPromise;
    }

    console.log('🔗 Creating new connection...');
    this.connectionPromise = new Promise((resolve, reject) => {

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        retries: 3,
        autoConnect: true,
        forceNew: false // Important: reuse existing connection
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server:', this.socket?.id);
        this.isInitialized = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        this.connectionPromise = null; // Reset on error
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('📡 Disconnected from server:', reason);
        this.isInitialized = false;
        this.connectionPromise = null; // Reset promise so it can reconnect
      });

      // Listen for reconnection events
      (this.socket.io as any).on('reconnect', () => {
        console.log('🔄 Reconnected to server:', this.socket?.id);
        this.isInitialized = true;
        // Trigger custom reconnect handlers
        this.reconnectHandlers.forEach(handler => handler());
      });
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  // Reconnection handlers
  onReconnect(handler: () => void): void {
    this.reconnectHandlers.push(handler);
  }

  offReconnect(handler: () => void): void {
    this.reconnectHandlers = this.reconnectHandlers.filter(h => h !== handler);
  }

  // Room Events
  createRoom(playerName: string, roomName: string, settings?: Partial<GameSettings>): void {
    console.log('🏠 EMITTING room:create with socket:', this.socket?.id);
    console.log('🔍 CreateRoom - SocketService instance:', this);
    this.socket?.emit('room:create', playerName, roomName, settings);
    console.log('✅ Successfully emitted room:create event');
  }

  joinRoom(roomCode: string, playerName: string): void {
    this.socket?.emit('room:join', roomCode, playerName);
  }

  rejoinRoom(roomId: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not available'));
        return;
      }

      console.log('🔄 Attempting to rejoin room:', { roomId, playerId });

      // Listen for success/error responses
      const onSuccess = (room: Room, player: Player) => {
        console.log('✅ Successfully rejoined room');
        this.socket?.off('room:joined', onSuccess);
        this.socket?.off('room:not_found', onError);
        this.socket?.off('error', onError);
        resolve();
      };

      const onError = (error?: string) => {
        console.log('❌ Failed to rejoin room:', error);
        this.socket?.off('room:joined', onSuccess);
        this.socket?.off('room:not_found', onError);
        this.socket?.off('error', onError);
        reject(new Error(error || 'Failed to rejoin room'));
      };

      this.socket.on('room:joined', onSuccess);
      this.socket.on('room:not_found', onError);
      this.socket.on('error', onError);

      // Emit rejoin event
      this.socket.emit('room:rejoin', roomId, playerId);

      // Timeout after 5 seconds
      setTimeout(() => {
        onError('Rejoin timeout');
      }, 5000);
    });
  }

  leaveRoom(): void {
    this.socket?.emit('room:leave');
  }

  // Game Events
  startGame(): void {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    this.socket.emit('gameStart');
  }

  skipTurn(): void {
    this.socket?.emit('game:skip_turn');
  }

  // Drawing Events
  startDrawing(x: number, y: number, color: string, size: number): void {
    this.socket?.emit('drawing:start', x, y, color, size);
  }

  draw(x: number, y: number): void {
    this.socket?.emit('drawing:draw', x, y);
  }

  endDrawing(): void {
    this.socket?.emit('drawing:end');
  }

  clearDrawing(): void {
    this.socket?.emit('drawing:clear');
  }

  // Chat Events
  sendMessage(message: string): void {
    this.socket?.emit('chat:send', message);
  }

  // Event Listeners
  onRoomUpdated(callback: (room: Room) => void): void {
    this.socket?.on('room:updated', callback);
  }

  onRoomJoined(callback: (room: Room, player: Player) => void): void {
    this.socket?.on('room:joined', callback);
  }

  onRoomLeft(callback: (playerId: string) => void): void {
    this.socket?.on('room:left', callback);
  }

  onRoomNotFound(callback: () => void): void {
    this.socket?.on('room:not_found', callback);
  }

  onRoomFull(callback: () => void): void {
    this.socket?.on('room:full', callback);
  }

  onGameStarted(callback: (room: Room) => void): void {
    this.socket?.on('game:started', callback);
  }

  onDrawingUpdate(callback: (drawingEvent: DrawingEvent) => void): void {
    this.socket?.on('drawing:update', callback);
  }

  onDrawingClear(callback: () => void): void {
    this.socket?.on('drawing:clear', callback);
  }

  onChatMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.on('chat:message', callback);
  }

  onError(callback: (message: string) => void): void {
    this.socket?.on('error', callback);
  }

  // Remove Event Listeners
  offRoomUpdated(callback?: (room: Room) => void): void {
    this.socket?.off('room:updated', callback);
  }

  offRoomJoined(callback?: (room: Room, player: Player) => void): void {
    this.socket?.off('room:joined', callback);
  }

  offRoomLeft(callback?: (playerId: string) => void): void {
    this.socket?.off('room:left', callback);
  }

  offRoomNotFound(callback?: () => void): void {
    this.socket?.off('room:not_found', callback);
  }

  offRoomFull(callback?: () => void): void {
    this.socket?.off('room:full', callback);
  }

  offGameStarted(callback?: (room: Room) => void): void {
    this.socket?.off('game:started', callback);
  }

  offDrawingUpdate(callback?: (drawingEvent: DrawingEvent) => void): void {
    this.socket?.off('drawing:update', callback);
  }

  offDrawingClear(callback?: () => void): void {
    this.socket?.off('drawing:clear', callback);
  }

  offChatMessage(callback?: (message: ChatMessage) => void): void {
    this.socket?.off('chat:message', callback);
  }

  offError(callback?: (message: string) => void): void {
    this.socket?.off('error', callback);
  }

  // Cleanup all listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

// Create singleton instance
export const socketService = new SocketService();
export default socketService;