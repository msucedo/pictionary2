import React, { useState, useEffect } from 'react';
import { Room, Player } from '../types/room';
import { socketService } from '../services/socketService';
import { useGame } from '../contexts/GameContext';

interface RoomLobbyProps {
  room: Room;
  currentPlayer: Player;
  onStartGame: (room: Room) => void;
  onLeaveRoom: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({
  room: initialRoom,
  currentPlayer,
  onStartGame,
  onLeaveRoom
}) => {
  const { setRoom: setGameRoom } = useGame();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [showSettings, setShowSettings] = useState(false);

  // Listen for game start events via WebSocket
  useEffect(() => {
    let gameStarted = false; // Prevent double execution

    const handleGameStarted = (updatedRoom: Room) => {
      console.log('🎯 Game started event received!', updatedRoom);
      setRoom(updatedRoom);
      setGameRoom(updatedRoom); // Update global context
      if (!gameStarted) {
        gameStarted = true;
        onStartGame(updatedRoom);
      }
    };

    const handleRoomUpdated = (updatedRoom: Room) => {
      console.log('📡 Room updated:', updatedRoom.status);
      setRoom(updatedRoom);
      setGameRoom(updatedRoom); // Update global context
      // Only start game if we haven't already started and status is playing
      if (updatedRoom.status === 'playing' && !gameStarted) {
        gameStarted = true;
        onStartGame(updatedRoom);
      }
    };

    socketService.onGameStarted(handleGameStarted);
    socketService.onRoomUpdated(handleRoomUpdated);

    return () => {
      socketService.offGameStarted(handleGameStarted);
      socketService.offRoomUpdated(handleRoomUpdated);
    };
  }, [room.id, onStartGame, setGameRoom]);

  const handleStartGame = () => {
    try {
      console.log('🎮 Starting game with WebSocket...', {
        socketConnected: socketService.isConnected(),
        roomId: room.id,
        isHost: currentPlayer.isHost,
        socketId: socketService.getSocketId(),
        socketService: socketService
      });

      if (!socketService.isConnected()) {
        alert('Socket no conectado. Intenta recargar la página.');
        return;
      }

      console.log('🔍 RoomLobby: About to call socketService.startGame()');
      socketService.startGame();
      console.log('🔍 RoomLobby: Called socketService.startGame()');
    } catch (err) {
      console.error('❌ Error starting game:', err);
      alert(err instanceof Error ? err.message : 'Error al iniciar el juego');
    }
  };

  const handleLeaveRoom = () => {
    socketService.leaveRoom();
    onLeaveRoom();
  };

  const isHost = currentPlayer.isHost;
  const canStartGame = room.players.length >= 2;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 to-pink-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{room.name}</h2>
            <p className="text-gray-600">Sala: <span className="font-mono text-lg">{room.code}</span></p>
          </div>
          <div className="flex space-x-2">
            {isHost && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                title="Configuración"
              >
                ⚙️
              </button>
            )}
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Room Settings (Host only) */}
        {showSettings && isHost && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Configuración de la Sala</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Jugadores máximos:</span>
                <span className="ml-2 font-medium">{room.maxPlayers}</span>
              </div>
              <div>
                <span className="text-gray-600">Rondas:</span>
                <span className="ml-2 font-medium">{room.maxRounds}</span>
              </div>
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Jugadores ({room.players.length}/{room.maxPlayers})
          </h3>
          <div className="grid gap-3">
            {room.players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  player.id === currentPlayer.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    player.isHost ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">
                      {player.name}
                      {player.id === currentPlayer.id && ' (Tú)'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {player.isHost ? '👑 Host' : '👤 Jugador'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-800">{player.score}</div>
                  <div className="text-xs text-gray-600">puntos</div>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
              >
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500">?</span>
                </div>
                <div className="ml-3 text-gray-500">Esperando jugador...</div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Start Section */}
        <div className="border-t pt-6">
          {isHost ? (
            <div className="text-center">
              {canStartGame ? (
                <button
                  onClick={handleStartGame}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                >
                  🚀 Iniciar Juego
                </button>
              ) : (
                <div className="text-center">
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg cursor-not-allowed text-lg"
                  >
                    Se necesitan al menos 2 jugadores
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    Comparte el código <span className="font-mono font-bold">{room.code}</span> con tus amigos
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg">
                <p className="font-medium">Esperando que el host inicie el juego...</p>
                <p className="text-sm mt-1">El host puede iniciar cuando haya al menos 2 jugadores</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">📖 Cómo jugar:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Los jugadores se turnan para dibujar una palabra</li>
            <li>• El resto debe adivinar qué se está dibujando</li>
            <li>• Ganas puntos por adivinar correctamente</li>
            <li>• El jugador con más puntos al final gana</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;