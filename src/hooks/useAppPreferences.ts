import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from './useCurrentUserId';
import { AppPreferences } from './useUserSettings';

const defaultAppPreferences: AppPreferences = {
  currentTeamId: null,
  recentTeams: [],
  teamSwitchBehavior: 'remember',
  crossDeviceSync: true,
};

const fetchAppPreferences = async (): Promise<AppPreferences> => {
  try {
    const { data, error } = await supabase.rpc('get_user_app_preferences');
    
    if (error) {
      console.error('Error fetching app preferences:', error);
      return defaultAppPreferences;
    }
    
    // Safely parse the JSON data to AppPreferences
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const preferences = data as unknown as AppPreferences;
      return {
        currentTeamId: preferences.currentTeamId || null,
        recentTeams: Array.isArray(preferences.recentTeams) ? preferences.recentTeams : [],
        teamSwitchBehavior: preferences.teamSwitchBehavior || 'remember',
        crossDeviceSync: preferences.crossDeviceSync ?? true
      };
    }
    
    return defaultAppPreferences;
  } catch (error) {
    console.error('Network error fetching app preferences:', error);
    return defaultAppPreferences;
  }
};

const updateAppPreferences = async (preferences: Partial<AppPreferences>): Promise<void> => {
  try {
    const { error } = await supabase.rpc('update_user_app_preferences', {
      p_preferences: preferences
    });
    
    if (error) {
      console.error('Error updating app preferences:', error);
      throw new Error(`Failed to update app preferences: ${error.message}`);
    }
  } catch (error) {
    console.error('Network error updating app preferences:', error);
    throw error;
  }
};

export const useAppPreferences = () => {
  const userId = useCurrentUserId();
  
  return useQuery({
    queryKey: ['app-preferences', userId],
    queryFn: fetchAppPreferences,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
};

export const useUpdateAppPreferences = () => {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateAppPreferences,
    onMutate: async (newPreferences) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['app-preferences', userId] });
      
      const previousPreferences = queryClient.getQueryData(['app-preferences', userId]);
      
      queryClient.setQueryData(['app-preferences', userId], (old: AppPreferences) => ({
        ...old,
        ...newPreferences,
      }));
      
      return { previousPreferences };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(['app-preferences', userId], context.previousPreferences);
      }
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your app preferences have been saved successfully.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['app-preferences', userId] });
    },
  });
};

// Utility hook for team-specific preference operations
export const useTeamPreferenceHelpers = () => {
  const { data: preferences } = useAppPreferences();
  const updateMutation = useUpdateAppPreferences();
  
  const updateCurrentTeam = async (teamId: string | null) => {
    if (!preferences) return;
    
    let newRecentTeams = [...preferences.recentTeams];
    
    // Add current team to recent teams (if not null and not already first)
    if (teamId && teamId !== newRecentTeams[0]) {
      newRecentTeams = [teamId, ...newRecentTeams.filter(id => id !== teamId)].slice(0, 5);
    }
    
    await updateMutation.mutateAsync({
      currentTeamId: teamId,
      recentTeams: newRecentTeams,
    });
  };
  
  const clearTeamHistory = async () => {
    await updateMutation.mutateAsync({
      recentTeams: [],
    });
  };
  
  const updateSwitchBehavior = async (behavior: AppPreferences['teamSwitchBehavior']) => {
    await updateMutation.mutateAsync({
      teamSwitchBehavior: behavior,
    });
  };
  
  const toggleCrossDeviceSync = async () => {
    if (!preferences) return;
    
    await updateMutation.mutateAsync({
      crossDeviceSync: !preferences.crossDeviceSync,
    });
  };
  
  return {
    preferences,
    updateCurrentTeam,
    clearTeamHistory,
    updateSwitchBehavior,
    toggleCrossDeviceSync,
    isUpdating: updateMutation.isPending,
  };
};