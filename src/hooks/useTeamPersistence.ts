import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useTeamPersistence() {
  const retryAttempts = useRef<{ [key: string]: number }>({});
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second base delay

  const updateLastTeam = useCallback(async (teamId: string) => {
    // Always update localStorage first (primary storage)
    localStorage.setItem('currentTeamId', teamId);
    
    // Try to sync with server (non-blocking)
    const retryKey = `update_${teamId}`;
    const currentRetries = retryAttempts.current[retryKey] || 0;
    
    try {
      // Use the new app preferences RPC
      const { error } = await supabase.rpc('update_user_app_preferences', {
        p_preferences: { currentTeamId: teamId }
      });
      
      if (error) {
        console.warn('Server sync failed for team preference:', error.message);
        
        // If we haven't exceeded max retries, try again with exponential backoff
        if (currentRetries < maxRetries) {
          retryAttempts.current[retryKey] = currentRetries + 1;
          const delay = retryDelay * Math.pow(2, currentRetries);
          
          setTimeout(() => {
            updateLastTeam(teamId);
          }, delay);
        } else {
          // Reset retry count after max attempts
          delete retryAttempts.current[retryKey];
          console.warn(`Max retries exceeded for team preference sync: ${teamId}`);
        }
      } else {
        // Success - reset retry count
        delete retryAttempts.current[retryKey];
      }
    } catch (error) {
      console.warn('Server sync unavailable for team preference:', error);
      // Reset retry count on network errors
      delete retryAttempts.current[retryKey];
    }
  }, []);

  const getLastTeam = useCallback(async () => {
    // Try localStorage first (faster and more reliable)
    const localTeamId = localStorage.getItem('currentTeamId');
    
    // Try to get from server for cross-device sync (non-blocking)
    try {
      const { data, error } = await supabase.rpc('get_user_app_preferences');
      
      if (!error && data && typeof data === 'object' && !Array.isArray(data)) {
        const preferences = data as any;
        const serverTeamId = preferences.currentTeamId;
        
        // If server has a different team, prefer server value but update localStorage
        if (serverTeamId && serverTeamId !== localTeamId) {
          localStorage.setItem('currentTeamId', serverTeamId);
          return serverTeamId;
        }
      }
    } catch (error) {
      console.warn('Server sync unavailable for team preference:', error);
      // Fall through to local value
    }
    
    return localTeamId;
  }, []);

  const clearLastTeam = useCallback(async () => {
    // Always clear localStorage first (primary storage)
    localStorage.removeItem('currentTeamId');
    
    // Try to sync with server (non-blocking)
    try {
      await supabase.rpc('update_user_app_preferences', {
        p_preferences: { currentTeamId: null }
      });
    } catch (error) {
      console.warn('Server sync unavailable for clearing team preference:', error);
      // Don't throw or block - localStorage clear is sufficient
    }
  }, []);

  return {
    updateLastTeam,
    getLastTeam,
    clearLastTeam
  };
}