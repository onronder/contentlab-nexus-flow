import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectionStatus } from './useConnectionStatus';
import { toast } from '@/hooks/use-toast';

export function useNetworkResilience() {
  const queryClient = useQueryClient();
  const { isOnline, reconnectAttempts } = useConnectionStatus();

  // Handle connection recovery
  const handleConnectionRecovery = useCallback(() => {
    if (isOnline) {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      if (reconnectAttempts > 0) {
        toast({
          title: "Connection Restored",
          description: "Data is being updated...",
        });
      }
    }
  }, [isOnline, reconnectAttempts, queryClient]);

  // Handle connection loss
  const handleConnectionLoss = useCallback(() => {
    if (!isOnline) {
      toast({
        variant: "destructive",
        title: "Connection Lost",
        description: "You're working offline. Some features may be limited.",
      });
    }
  }, [isOnline]);

  useEffect(() => {
    handleConnectionRecovery();
  }, [handleConnectionRecovery]);

  useEffect(() => {
    handleConnectionLoss();
  }, [handleConnectionLoss]);

  return {
    isOnline,
    retryQueries: () => queryClient.invalidateQueries()
  };
}