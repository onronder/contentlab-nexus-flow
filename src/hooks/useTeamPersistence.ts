import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useTeamPersistence() {
  const updateLastTeam = useCallback(async (teamId: string) => {
    // Always update localStorage first (primary storage)
    localStorage.setItem('currentTeamId', teamId);
    
    // Try to sync with server (non-blocking)
    try {
      const { error } = await supabase.rpc('update_user_last_team', {
        p_team_id: teamId
      });
      
      if (error) {
        console.warn('Server sync failed for team preference:', error.message);
        // Don't throw or block - localStorage is sufficient
      }
    } catch (error) {
      console.warn('Server sync unavailable for team preference:', error);
      // Don't throw or block - localStorage is sufficient
    }
  }, []);

  const getLastTeam = useCallback(async () => {
    // Try localStorage first (faster and more reliable)
    const localTeamId = localStorage.getItem('currentTeamId');
    
    // Try to get from server for cross-device sync (non-blocking)
    try {
      const { data, error } = await supabase.rpc('get_user_last_team');
      
      if (!error && data) {
        // If server has a different team, prefer server value but update localStorage
        if (data !== localTeamId) {
          localStorage.setItem('currentTeamId', data);
          return data;
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
      await supabase.rpc('update_user_last_team', {
        p_team_id: null
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