import React, { useState } from 'react';
import { Room, Player } from '../types/room';
import { roomService } from '../services/roomService';

interface JoinRoomProps {
  onRoomJoined: (room: Room, player: Player) => void;
  onBack: () => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onRoomJoined, onBack }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (!roomCode.trim()) {
      setError('Por favor ingresa el código de la sala');
      return;
    }

    setIsJoining(true);

    try {
      const result = roomService.joinRoom(roomCode.trim().toUpperCase(), playerName.trim());

      if (result) {
        onRoomJoined(result.room, result.player);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al unirse a la sala');
    } finally {
      setIsJoining(false);
    }
  };

  const formatRoomCode = (code: string) => {
    // Remove non-alphanumeric characters and convert to uppercase
    const formatted = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return formatted.slice(0, 6); // Limit to 6 characters
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCode(formatted);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Volver
          </button>
          <h2 className="text-3xl font-bold text-gray-800">Unirse a Sala</h2>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tu nombre
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa tu nombre"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de la sala
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={handleRoomCodeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono tracking-widest"
              placeholder="ABCD12"
              maxLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Ingresa el código de 6 caracteres que te proporcionó el host
            </p>
          </div>

          <button
            type="submit"
            disabled={isJoining || !playerName.trim() || !roomCode.trim()}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
              isJoining || !playerName.trim() || !roomCode.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isJoining ? 'Uniéndose...' : '🚪 Unirse a la Sala'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">💡 Consejos:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• El código de sala no distingue mayúsculas de minúsculas</li>
            <li>• Asegúrate de que el nombre no esté ya en uso en la sala</li>
            <li>• Solo puedes unirte a salas que estén esperando jugadores</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;