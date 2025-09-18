import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, Player } from '../types/room';
import { socketService } from '../services/socketService';

interface GameContextType {
  room: Room | null;
  currentPlayer: Player | null;
  setRoom: (room: Room | null) => void;
  setCurrentPlayer: (player: Player | null) => void;
  persistedRoomId: string | null;
  persistedPlayerId: string | null;
  clearGameState: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [persistedRoomId, setPersistedRoomId] = useState<string | null>(
    localStorage.getItem('pictionary_room_id')
  );
  const [persistedPlayerId, setPersistedPlayerId] = useState<string | null>(
    localStorage.getItem('pictionary_player_id')
  );

  // Persist room and player when they change
  useEffect(() => {
    if (room) {
      localStorage.setItem('pictionary_room_id', room.id);
      setPersistedRoomId(room.id);
    }
  }, [room]);

  useEffect(() => {
    if (currentPlayer) {
      localStorage.setItem('pictionary_player_id', currentPlayer.id);
      setPersistedPlayerId(currentPlayer.id);
    }
  }, [currentPlayer]);

  // Auto-reconnect on socket reconnection
  useEffect(() => {
    const handleReconnect = async () => {
      console.log('🔄 Socket reconnected, attempting to rejoin room...');
      if (persistedRoomId && persistedPlayerId) {
        try {
          await socketService.rejoinRoom(persistedRoomId, persistedPlayerId);
        } catch (error) {
          console.error('❌ Failed to rejoin room:', error);
          clearGameState();
        }
      }
    };

    socketService.onReconnect(handleReconnect);

    return () => {
      socketService.offReconnect(handleReconnect);
    };
  }, [persistedRoomId, persistedPlayerId]);

  const clearGameState = () => {
    setRoom(null);
    setCurrentPlayer(null);
    setPersistedRoomId(null);
    setPersistedPlayerId(null);
    localStorage.removeItem('pictionary_room_id');
    localStorage.removeItem('pictionary_player_id');
  };

  return (
    <GameContext.Provider value={{
      room,
      currentPlayer,
      setRoom,
      setCurrentPlayer,
      persistedRoomId,
      persistedPlayerId,
      clearGameState
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};