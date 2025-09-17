import React from 'react';
import RoomManager from './components/RoomManager';
import { SocketProvider } from './context/SocketProvider';

function App() {
  return (
    <SocketProvider>
      <div className="App">
        <RoomManager />
      </div>
    </SocketProvider>
  );
}

export default App;
