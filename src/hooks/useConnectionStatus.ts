import { useState, useEffect } from 'react';

interface ConnectionState {
  isOnline: boolean;
  lastOnline: Date | null;
  reconnectAttempts: number;
}

export function useConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: navigator.onLine,
    lastOnline: navigator.onLine ? new Date() : null,
    reconnectAttempts: 0
  });

  useEffect(() => {
    const handleOnline = () => {
      setConnectionState(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
        reconnectAttempts: 0
      }));
    };

    const handleOffline = () => {
      setConnectionState(prev => ({
        ...prev,
        isOnline: false
      }));
    };

    // Add network status listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connection check
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to verify connection
        await fetch('/favicon.ico', { 
          mode: 'no-cors',
          cache: 'no-cache'
        });
        
        if (!connectionState.isOnline) {
          handleOnline();
        }
      } catch {
        if (connectionState.isOnline) {
          handleOffline();
        }
      }
    };

    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [connectionState.isOnline]);

  return connectionState;
}