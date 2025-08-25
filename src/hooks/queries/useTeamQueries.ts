import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export function useTeamQueries() {
  return useQuery({
    queryKey: ['user-teams'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the new safe function to get team IDs, then fetch team details
      const { data: teamIds, error: teamIdsError } = await supabase.rpc('get_user_team_ids_safe', {
        p_user_id: user.id
      });

      if (teamIdsError) throw teamIdsError;
      if (!teamIds || teamIds.length === 0) return [];

      // Get teams the user owns (these will be accessible via RLS)
      const { data: ownedTeams, error: ownedTeamsError } = await supabase
        .from('teams')
        .select('id, name, slug, description, owner_id, created_at, updated_at')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (ownedTeamsError) throw ownedTeamsError;

      // For now, return owned teams. Member teams require different handling due to RLS
      // In a full implementation, you'd need to either:
      // 1. Use a service function that bypasses RLS for authorized requests
      // 2. Store basic team info in a separate accessible table
      // 3. Use a different approach for team member visibility

      return (ownedTeams || []).map(team => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        owner_id: team.owner_id,
        created_at: team.created_at,
        updated_at: team.updated_at
      })) as Team[];
    },
  });
}