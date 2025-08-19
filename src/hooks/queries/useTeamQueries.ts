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

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams!inner(
            id,
            name,
            slug,
            description,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('status', 'active');

      if (error) throw error;

      return data?.map(item => item.teams as Team) || [];
    },
  });
}