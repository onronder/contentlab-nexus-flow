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
  // Get user's teams (they might be a member of multiple teams)
  const { data: teamMembers, error: membersError } = await supabase
    .from('team_members')
    .select(`
      team_id,
      role_id,
      teams!inner(
        id,
        name,
        description,
        current_member_count
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('status', 'active');

  if (membersError) throw membersError;

  // For now, get the first team (this could be extended to handle multiple teams)
  const primaryTeam = teamMembers?.[0]?.teams;
  
  if (!primaryTeam) {
    return null; // User is not part of any team
  }

  // Get active users count
  const { data: activeMembers, error: activeMembersError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', primaryTeam.id)
    .eq('is_active', true)
    .eq('status', 'active');

  if (activeMembersError) throw activeMembersError;

  // Get pending invitations count
  const { data: pendingInvites, error: invitesError } = await supabase
    .from('team_invitations')
    .select('id')
    .eq('team_id', primaryTeam.id)
    .eq('status', 'pending');

  if (invitesError) throw invitesError;

  return {
    id: primaryTeam.id,
    name: primaryTeam.name,
    description: primaryTeam.description,
    memberCount: primaryTeam.current_member_count || 0,
    activeUsers: activeMembers?.length || 0,
    pendingInvitations: pendingInvites?.length || 0,
    permissions: {
      // Default permissions - this could be stored in a team_settings table
      allowMemberInvites: true,
      allowMemberCreateProjects: true,
      requireContentApproval: false
    }
  };
};

export const useTeamSettings = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['team-settings', userId],
    queryFn: () => fetchTeamSettings(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};