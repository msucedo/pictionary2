import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { socketService } from '../services/socketService';

interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔌 SocketProvider initializing...');

    // Initialize connection immediately when provider mounts
    const initConnection = async () => {
      try {
        await socketService.connect();
        setIsConnected(socketService.isConnected());
        setSocketId(socketService.getSocketId());
        console.log('🔌 SocketProvider connected successfully');
      } catch (error) {
        console.error('🔌 SocketProvider connection failed:', error);
      }
    };

    initConnection();

    // Set up connection status listeners
    const updateConnectionStatus = () => {
      setIsConnected(socketService.isConnected());
      setSocketId(socketService.getSocketId());
    };

    // Listen for connection changes
    const checkConnection = setInterval(updateConnectionStatus, 1000);

    return () => {
      console.log('🔌 SocketProvider cleanup');
      clearInterval(checkConnection);
      // DON'T disconnect here - keep connection alive for the entire app lifecycle
    };
  }, []);

  const connect = async () => {
    try {
      await socketService.connect();
      setIsConnected(socketService.isConnected());
      setSocketId(socketService.getSocketId());
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  };

  const disconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
    setSocketId(null);
  };

  const value: SocketContextType = {
    isConnected,
    socketId,
    connect,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketProvider;