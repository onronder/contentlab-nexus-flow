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

      // Use the safe function to get team IDs, then fetch team details
      const { data: teamIds, error: teamIdsError } = await supabase.rpc('get_user_team_ids_safe', {
        p_user_id: user.id
      });

      if (teamIdsError) throw teamIdsError;
      if (!teamIds || teamIds.length === 0) return [];

      // Extract team IDs from the response
      const teamIdList = teamIds.map((row: any) => row.team_id);

      // Fetch team details for accessible teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, slug, description, owner_id, created_at, updated_at')
        .in('id', teamIdList)
        .eq('is_active', true);

      if (teamsError) throw teamsError;

      return (teams || []).map(team => ({
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