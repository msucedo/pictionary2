import React, { useState, useEffect, useRef } from 'react';
import { Room, Player, TurnTransition as TurnTransitionType } from '../types/room';
import { ChatMessage } from '../types/chat';
import { roomService } from '../services/roomService';
import DrawingCanvas, { DrawingCanvasRef } from './DrawingCanvas';
import Chat from './Chat';
import TurnTransition from './TurnTransition';
import GameResults from './GameResults';

interface GameRoomProps {
  room: Room;
  currentPlayer: Player;
  onLeaveGame: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({
  room: initialRoom,
  currentPlayer,
  onLeaveGame
}) => {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentWord, setCurrentWord] = useState(initialRoom.currentWord || 'CASA');
  const [transition, setTransition] = useState<TurnTransitionType | null>(null);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  // Simulate room updates and load messages
  useEffect(() => {
    // Load initial messages
    const initialMessages = roomService.getRoomMessages(room.id);
    setMessages(initialMessages);

    const roomUpdateInterval = setInterval(() => {
      const updatedRoom = roomService.getRoom(room.id);
      if (updatedRoom) {
        // Check for turn transitions
        if (updatedRoom.status === 'turn_transition' && room.status !== 'turn_transition') {
          const transitionData = roomService.getTurnTransition(room.id);
          if (transitionData) {
            setTransition(transitionData);
          }
        }

        // Check if it's a new turn - clear canvas
        if (updatedRoom.currentDrawerId !== room.currentDrawerId && updatedRoom.status === 'playing') {
          canvasRef.current?.clearCanvas();
        }

        setRoom(updatedRoom);

        // Update current word when it changes
        if (updatedRoom.currentWord && updatedRoom.currentWord !== currentWord) {
          setCurrentWord(updatedRoom.currentWord);
        }
      }

      // Update messages
      const updatedMessages = roomService.getRoomMessages(room.id);
      setMessages(updatedMessages);
    }, 1000);

    // Simulate dummy messages every 5-15 seconds
    const dummyMessageInterval = setInterval(() => {
      if (Math.random() < 0.7) { // 70% chance of adding a message
        roomService.addDummyMessage(room.id);
      }
    }, Math.random() * 10000 + 5000); // Random between 5-15 seconds

    return () => {
      clearInterval(roomUpdateInterval);
      clearInterval(dummyMessageInterval);
    };
  }, [room.id]);

  const handleLeaveGame = () => {
    roomService.leaveRoom(room.id, currentPlayer.id);
    onLeaveGame();
  };

  const handleSendMessage = (message: string) => {
    roomService.addMessage(room.id, currentPlayer.id, message);
  };

  const handleSkipTurn = () => {
    if (window.confirm('¿Estás seguro de que quieres pasar tu turno?')) {
      roomService.skipTurn(room.id, currentPlayer.id);
    }
  };

  const handleTransitionComplete = () => {
    setTransition(null);
  };

  const handlePlayAgain = () => {
    // Reset room for new game (simplified)
    onLeaveGame();
  };

  const handleBackToMenu = () => {
    onLeaveGame();
  };

  const handleDrawingUpdate = (imageData: string) => {
    // In a real implementation, this would send the drawing data to other players
    // For now, we'll just log it
    console.log('Drawing updated:', imageData.substring(0, 50) + '...');
  };

  const isDrawing = currentPlayer.id === room.currentDrawerId;

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show game results if game is finished
  if (room.status === 'finished' && room.gameResults) {
    return (
      <GameResults
        results={room.gameResults}
        currentPlayer={currentPlayer}
        onPlayAgain={handlePlayAgain}
        onBackToMenu={handleBackToMenu}
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Turn Transition Overlay */}
      {transition && (
        <TurnTransition
          transition={transition}
          onTransitionComplete={handleTransitionComplete}
        />
      )}
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-gray-800">{room.name}</h3>
              <p className="text-sm text-gray-600">Ronda {room.currentRound}/{room.maxRounds}</p>
            </div>
            <button
              onClick={handleLeaveGame}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Current Turn Info */}
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          {isDrawing ? (
            <div className="text-center">
              <p className="text-sm text-blue-600 font-medium">¡Es tu turno!</p>
              <p className="text-lg font-bold text-blue-800">Dibuja: {currentWord}</p>
              <p className="text-xs text-blue-600 mt-1">Los otros jugadores deben adivinar</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600">Turno de:</p>
              <p className="text-lg font-bold text-gray-800">
                {room.players.find(p => p.id === room.currentDrawerId)?.name || 'Jugador'}
              </p>
              <p className="text-xs text-gray-600 mt-1">¡Adivina qué está dibujando!</p>
              <div className="mt-2 text-xs text-gray-500">
                Palabra: {currentWord?.split('').map((_, i) => '_ ').join('')}
              </div>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="font-semibold text-gray-800 mb-3">Jugadores</h4>
          <div className="space-y-2">
            {room.players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.id === currentPlayer.id
                      ? 'bg-blue-100 border border-blue-300'
                      : player.id === room.currentDrawerId
                      ? 'bg-green-100 border border-green-300'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {player.name}
                        {player.id === currentPlayer.id && ' (Tú)'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {player.id === room.currentDrawerId ? '🎨 Dibujando' : '👁️ Adivinando'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{player.score}</div>
                    <div className="text-xs text-gray-600">pts</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="border-t border-gray-200 h-80">
          <Chat
            messages={messages}
            currentPlayerId={currentPlayer.id}
            currentPlayerName={currentPlayer.name}
            isDrawing={isDrawing}
            onSendMessage={handleSendMessage}
            className="h-full"
          />
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col">
        {/* Game Canvas */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-4xl">
            <DrawingCanvas
              ref={canvasRef}
              canDraw={isDrawing}
              onDrawingUpdate={handleDrawingUpdate}
              width={800}
              height={500}
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Game Controls */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Tiempo restante:</span>
                <span className={`ml-2 font-mono text-lg font-bold ${
                  (room.timeLeft || 0) <= 10 ? 'text-red-600 animate-pulse' :
                  (room.timeLeft || 0) <= 30 ? 'text-orange-600' : 'text-blue-600'
                }`}>
                  {formatTime(room.timeLeft || 0)}
                </span>
              </div>
              {room.status === 'playing' && (
                <div className="text-xs text-gray-500">
                  Ronda {room.currentRound}/{room.maxRounds}
                </div>
              )}
            </div>

            {isDrawing && room.status === 'playing' && (
              <div className="flex space-x-2">
                <button
                  onClick={handleSkipTurn}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
                >
                  ⏭️ Pasar Turno
                </button>
              </div>
            )}

            {room.status === 'turn_transition' && (
              <div className="text-sm text-blue-600 font-medium">
                🔄 Preparando siguiente turno...
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {room.status === 'playing' && room.timeLeft !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    (room.timeLeft / room.turnDuration) > 0.5 ? 'bg-green-500' :
                    (room.timeLeft / room.turnDuration) > 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.max(0, (room.timeLeft / room.turnDuration) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;