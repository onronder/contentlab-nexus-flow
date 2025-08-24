import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useTeamPersistence() {
  const updateLastTeam = useCallback(async (teamId: string) => {
    try {
      const { error } = await supabase.rpc('update_user_last_team', {
        p_team_id: teamId
      });
      
      if (error) {
        console.error('Failed to update last team:', error);
        // Fallback to localStorage
        localStorage.setItem('currentTeamId', teamId);
        return;
      }
      
      // Still update localStorage for offline sync
      localStorage.setItem('currentTeamId', teamId);
    } catch (error) {
      console.error('Error updating last team:', error);
      // Fallback to localStorage
      localStorage.setItem('currentTeamId', teamId);
    }
  }, []);

  const getLastTeam = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_last_team');
      
      if (error) {
        console.error('Failed to get last team:', error);
        // Fallback to localStorage
        return localStorage.getItem('currentTeamId');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting last team:', error);
      // Fallback to localStorage
      return localStorage.getItem('currentTeamId');
    }
  }, []);

  const clearLastTeam = useCallback(async () => {
    try {
      await supabase.rpc('update_user_last_team', {
        p_team_id: null
      });
    } catch (error) {
      console.error('Error clearing last team:', error);
    }
    
    localStorage.removeItem('currentTeamId');
  }, []);

  return {
    updateLastTeam,
    getLastTeam,
    clearLastTeam
  };
}