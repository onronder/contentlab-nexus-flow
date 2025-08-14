import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';

export interface TeamSettingsData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  activeUsers: number;
  pendingInvitations: number;
  permissions: {
    allowMemberInvites: boolean;
    allowMemberCreateProjects: boolean;
    requireContentApproval: boolean;
  };
}

const fetchTeamSettings = async (userId: string): Promise<TeamSettingsData | null> => {
  if (!userId) {
    throw new Error('User ID is required to fetch team settings');
  }

  try {
    // Use the secure function to get team settings
    const { data, error } = await supabase.rpc('get_user_team_settings_safe', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching team settings:', error);
      throw new Error(`Failed to fetch team settings: ${error.message}`);
    }

    // If no team data, user is not part of any team
    if (!data || data.length === 0) {
      return null;
    }

    const teamData = data[0];
    
    return {
      id: teamData.team_id,
      name: teamData.team_name,
      description: teamData.team_description,
      memberCount: teamData.member_count || 0,
      activeUsers: teamData.active_users || 0,
      pendingInvitations: teamData.pending_invitations || 0,
      permissions: (typeof teamData.permissions === 'object' && teamData.permissions !== null) 
        ? teamData.permissions as any
        : {
          allowMemberInvites: true,
          allowMemberCreateProjects: true,
          requireContentApproval: false
        }
    };
  } catch (error) {
    console.error('Network error fetching team settings:', error);
    throw error;
  }
};

export const useTeamSettings = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['team-settings', userId],
    queryFn: () => fetchTeamSettings(userId!),
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