import React from 'react';
import RoomManager from './components/RoomManager';
import { SocketProvider } from './context/SocketProvider';
import { GameProvider } from './contexts/GameContext';

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <div className="App">
          <RoomManager />
        </div>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
