import { useCallback } from 'react';
import { useTeamPreferenceHelpers } from './useAppPreferences';

export function useTeamPersistence() {
  const { preferences, updateCurrentTeam, isUpdating } = useTeamPreferenceHelpers();

  const updateLastTeam = useCallback(async (teamId: string) => {
    // Always update localStorage first for immediate response
    localStorage.setItem('currentTeamId', teamId);
    
    try {
      // Update app preferences with team history tracking
      await updateCurrentTeam(teamId);
    } catch (error) {
      console.warn('Failed to update team preferences:', error);
      // localStorage is still updated for fallback
    }
  }, [updateCurrentTeam]);

  const getLastTeam = useCallback(async () => {
    // If preferences are available and cross-device sync is enabled, use server data
    if (preferences?.crossDeviceSync && preferences.currentTeamId) {
      // Update localStorage to match server
      localStorage.setItem('currentTeamId', preferences.currentTeamId);
      return preferences.currentTeamId;
    }
    
    // Fallback to localStorage for immediate response
    const localTeamId = localStorage.getItem('currentTeamId');
    
    // If we have local data but no server preferences, sync to server
    if (localTeamId && !preferences?.currentTeamId) {
      updateCurrentTeam(localTeamId).catch(console.warn);
    }
    
    return localTeamId;
  }, [preferences, updateCurrentTeam]);

  const clearLastTeam = useCallback(async () => {
    // Clear localStorage immediately
    localStorage.removeItem('currentTeamId');
    
    try {
      // Clear server preferences
      await updateCurrentTeam(null);
    } catch (error) {
      console.warn('Failed to clear team preferences:', error);
      // localStorage is still cleared for immediate effect
    }
  }, [updateCurrentTeam]);

  return {
    updateLastTeam,
    getLastTeam,
    clearLastTeam,
    preferences,
    isUpdating
  };
}