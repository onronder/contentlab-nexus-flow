import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUserId } from './useCurrentUserId';

export interface AppPreferences {
  currentTeamId: string | null;
  recentTeams: string[];
  teamSwitchBehavior: 'remember' | 'ask' | 'default';
  crossDeviceSync: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
  theme_preferences: {
    mode: 'light' | 'dark' | 'system';
    color: string;
  };
  privacy_settings: {
    profile_visibility: 'public' | 'team' | 'private';
    activity_visibility: 'public' | 'team' | 'private';
  };
  feature_flags: Record<string, any>;
  app_preferences: AppPreferences;
  created_at: string;
  updated_at: string;
}

const fetchUserSettings = async (userId: string): Promise<UserSettings | null> => {
  if (!userId) {
    return null; // Return null instead of throwing for missing userId
  }

  try {
    // Use the secure function to get or create settings
    const { data, error } = await supabase.rpc('get_or_create_user_settings', {
      p_user_id: userId
    });

    if (error) {
      // Only log actual errors, not missing data scenarios
      if (error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching user settings:', error);
      }
      return null; // Return null for any error
    }

    // Type cast the JSONB fields to proper TypeScript types
    const settings: UserSettings = {
      id: data.id,
      user_id: data.user_id,
      notification_preferences: (data.notification_preferences as any) || {
        email: true,
        push: false,
        in_app: true
      },
      theme_preferences: (data.theme_preferences as any) || {
        mode: 'system',
        color: 'default'
      },
      privacy_settings: (data.privacy_settings as any) || {
        profile_visibility: 'team',
        activity_visibility: 'team'
      },
      feature_flags: (data.feature_flags as any) || {},
      app_preferences: (data.app_preferences as any) || {
        currentTeamId: null,
        recentTeams: [],
        teamSwitchBehavior: 'remember',
        crossDeviceSync: true
      },
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return settings;
  } catch (error) {
    console.error('Network error fetching user settings:', error);
    throw error;
  }
};

const updateUserSettings = async (userId: string, settings: Partial<UserSettings>): Promise<UserSettings> => {
  if (!userId) {
    throw new Error('User ID is required to update settings');
  }

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        notification_preferences: settings.notification_preferences,
        theme_preferences: settings.theme_preferences,
        privacy_settings: settings.privacy_settings,
        feature_flags: settings.feature_flags,
        app_preferences: settings.app_preferences as any,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      throw new Error(`Failed to update user settings: ${error.message}`);
    }

    // Type cast the JSONB fields to proper TypeScript types
    const updatedSettings: UserSettings = {
      id: data.id,
      user_id: data.user_id,
      notification_preferences: (data.notification_preferences as any) || {
        email: true,
        push: false,
        in_app: true
      },
      theme_preferences: (data.theme_preferences as any) || {
        mode: 'system',
        color: 'default'
      },
      privacy_settings: (data.privacy_settings as any) || {
        profile_visibility: 'team',
        activity_visibility: 'team'
      },
      feature_flags: (data.feature_flags as any) || {},
      app_preferences: (data.app_preferences as any) || {
        currentTeamId: null,
        recentTeams: [],
        teamSwitchBehavior: 'remember',
        crossDeviceSync: true
      },
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return updatedSettings;
  } catch (error) {
    console.error('Network error updating user settings:', error);
    throw error;
  }
};

export const useUserSettings = () => {
  const userId = useCurrentUserId();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['user-settings', userId],
    queryFn: () => fetchUserSettings(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error?.message?.includes('User ID is required')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

export const useUpdateUserSettings = () => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settings: Partial<UserSettings>) => updateUserSettings(userId!, settings),
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(['user-settings', userId], data);
      
      toast({
        title: "Settings Updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Error updating user settings:', error);
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error?.message?.includes('User ID is required')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};