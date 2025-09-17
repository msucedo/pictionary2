import React, { useState } from 'react';
import { Room, Player, GameSettings, DEFAULT_GAME_SETTINGS } from '../types/room';
import { socketService } from '../services/socketService';

interface CreateRoomProps {
  onRoomCreated: (room: Room, player: Player) => void;
  onBack: () => void;
}

const CreateRoom: React.FC<CreateRoomProps> = ({ onRoomCreated, onBack }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!playerName.trim()) {
      setError('Por favor ingresa tu nombre');
      return;
    }

    if (!roomName.trim()) {
      setError('Por favor ingresa el nombre de la sala');
      return;
    }

    setIsCreating(true);

    try {
      socketService.onRoomJoined((room: any, player: any) => {
        onRoomCreated(room, player);
      });

      socketService.createRoom(playerName.trim(), roomName.trim(), settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la sala');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-500 to-blue-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Volver
          </button>
          <h2 className="text-3xl font-bold text-gray-800">Crear Sala</h2>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-6">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresa tu nombre"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la sala
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ingresa el nombre de la sala"
              maxLength={30}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Máximo jugadores
              </label>
              <select
                value={settings.maxPlayers}
                onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={4}>4 jugadores</option>
                <option value={6}>6 jugadores</option>
                <option value={8}>8 jugadores</option>
                <option value={10}>10 jugadores</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rondas
              </label>
              <select
                value={settings.maxRounds}
                onChange={(e) => setSettings({ ...settings, maxRounds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={3}>3 rondas</option>
                <option value={5}>5 rondas</option>
                <option value={7}>7 rondas</option>
                <option value={10}>10 rondas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempo por turno: {settings.drawTime} segundos
            </label>
            <input
              type="range"
              min="30"
              max="180"
              step="15"
              value={settings.drawTime}
              onChange={(e) => setSettings({ ...settings, drawTime: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30s</span>
              <span>180s</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 ${
              isCreating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isCreating ? 'Creando sala...' : '🚀 Crear Sala'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;