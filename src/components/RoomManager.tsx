import React, { useState } from 'react';
import { Room, Player } from '../types/room';
import CreateRoom from './CreateRoom';
import JoinRoom from './JoinRoom';
import RoomLobby from './RoomLobby';
import GameRoom from './GameRoom';

type ViewState = 'menu' | 'create' | 'join' | 'lobby' | 'game';

const RoomManager: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('menu');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);

  const handleRoomCreated = (room: Room, player: Player) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
    setCurrentView('lobby');
  };

  const handleRoomJoined = (room: Room, player: Player) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
    setCurrentView('lobby');
  };

  const handleStartGame = (room: Room) => {
    setCurrentRoom(room);
    setCurrentView('game');
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPlayer(null);
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
        return currentRoom && currentPlayer ? (
          <RoomLobby
            room={currentRoom}
            currentPlayer={currentPlayer}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : null;

      case 'game':
        return currentRoom && currentPlayer ? (
          <GameRoom
            room={currentRoom}
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