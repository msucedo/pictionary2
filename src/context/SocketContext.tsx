import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socketService';

interface SocketContextType {
  socketService: typeof socketService;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    // Connect once when provider mounts
    const connectSocket = async () => {
      if (!socketService.isConnected()) {
        try {
          await socketService.connect();
          setIsConnected(true);
          console.log('🔌 Socket connected via Context');
        } catch (error) {
          console.error('❌ Failed to connect socket:', error);
          setIsConnected(false);
        }
      } else {
        setIsConnected(true);
      }
    };

    connectSocket();

    // Cleanup on unmount
    return () => {
      console.log('🔌 Socket Context cleanup');
      // Don't disconnect here as we want to keep connection across components
    };
  }, []);

  const value = {
    socketService,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};