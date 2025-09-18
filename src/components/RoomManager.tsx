import React, { useState, useEffect } from 'react';
import { Room, Player } from '../types/room';
import CreateRoom from './CreateRoom';
import JoinRoom from './JoinRoom';
import RoomLobby from './RoomLobby';
import GameRoom from './GameRoom';
import { useGame } from '../contexts/GameContext';

type ViewState = 'menu' | 'create' | 'join' | 'lobby' | 'game';

const RoomManager: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('menu');
  const { room, currentPlayer, setRoom, setCurrentPlayer, persistedRoomId, clearGameState } = useGame();

  // Auto-restore state from persistent storage
  useEffect(() => {
    if (persistedRoomId && room && currentPlayer) {
      if (room.status === 'playing') {
        setCurrentView('game');
      } else {
        setCurrentView('lobby');
      }
    } else if (!persistedRoomId) {
      setCurrentView('menu');
    }
  }, [persistedRoomId, room, currentPlayer]);

  const handleRoomCreated = (room: Room, player: Player) => {
    setRoom(room);
    setCurrentPlayer(player);
    setCurrentView('lobby');
  };

  const handleRoomJoined = (room: Room, player: Player) => {
    setRoom(room);
    setCurrentPlayer(player);
    setCurrentView('lobby');
  };

  const handleStartGame = (room: Room) => {
    setRoom(room);
    setCurrentView('game');
  };

  const handleLeaveRoom = () => {
    clearGameState();
    setCurrentView('menu');
  };

  const handleBackToMenu = () => {
    setCurrentView('menu');
  };

  const renderView = () => {
    switch (currentView) {
      case 'menu':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
                🎨 Pictionary
              </h1>
              <p className="text-center text-gray-600 mb-8">
                ¡Dibuja, adivina y diviértete!
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => setCurrentView('create')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <span>🏠</span>
                  <span>Crear Sala</span>
                </button>

                <button
                  onClick={() => setCurrentView('join')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <span>🚪</span>
                  <span>Unirse a Sala</span>
                </button>
              </div>

              <div className="mt-8 text-center text-sm text-gray-500">
                <p>Versión 1.0 - Modo Local</p>
              </div>
            </div>
          </div>
        );

      case 'create':
        return (
          <CreateRoom
            onRoomCreated={handleRoomCreated}
            onBack={handleBackToMenu}
          />
        );

      case 'join':
        return (
          <JoinRoom
            onRoomJoined={handleRoomJoined}
            onBack={handleBackToMenu}
          />
        );

      case 'lobby':
        return room && currentPlayer ? (
          <RoomLobby
            room={room}
            currentPlayer={currentPlayer}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : null;

      case 'game':
        return room && currentPlayer ? (
          <GameRoom
            room={room}
            currentPlayer={currentPlayer}
            onLeaveGame={handleLeaveRoom}
          />
        ) : null;

      default:
        return null;
    }
  };

  return <div className="min-h-screen">{renderView()}</div>;
};

export default RoomManager;