import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@supabase/auth-helpers-react';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/integrations/supabase/client';
import { ProjectTeamMember, TeamRole, PermissionSet } from '@/types/projects';
import { toast } from 'sonner';

// Team member invitation interface
interface InviteTeamMemberInput {
  projectId: string;
  email: string;
  role: TeamRole;
  permissions?: PermissionSet;
  message?: string;
}

// Team member update interface
interface UpdateTeamMemberInput {
  memberId: string;
  role?: TeamRole;
  permissions?: PermissionSet;
  accessLevel?: string;
  allowedSections?: string[];
}

/**
 * Hook to invite a new team member
 */
export function useInviteTeamMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, email, role, permissions, message }: InviteTeamMemberInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      // First, check if user exists in profiles
      const { data: existingUser, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error('Failed to check user existence');
      }

      // Default permissions based on role
      const defaultPermissions: PermissionSet = {
        manageProject: role === 'admin' || role === 'owner',
        manageTeam: role === 'admin' || role === 'owner',
        manageCompetitors: role !== 'viewer',
        runAnalysis: role !== 'viewer',
        viewAnalytics: true,
        exportData: role !== 'viewer',
        manageSettings: role === 'admin' || role === 'owner',
      };

      const finalPermissions = { ...defaultPermissions, ...permissions };

      if (existingUser) {
        // User exists, add directly to team
        const { data, error } = await supabase
          .from('project_team_members')
          .insert({
            project_id: projectId,
            user_id: existingUser.id,
            role,
            permissions: finalPermissions,
            invitation_status: 'active',
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
          })
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('User is already a member of this project');
          }
          throw new Error(`Failed to add team member: ${error.message}`);
        }

        return {
          ...data,
          user: {
            id: existingUser.id,
            name: existingUser.full_name || 'Unknown User',
            email: existingUser.email || '',
            avatar: (data as any).profiles?.avatar_url,
          },
        };
      } else {
        // User doesn't exist, create invitation
        throw new Error('User not found in system. Please ensure the user has an account before inviting them.');
      }
    },
    onSuccess: (data, variables) => {
      toast.success(`${data.user.name} has been added to the project`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.teamMembers(variables.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.analytics(variables.projectId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to invite team member');
      console.error('Invite team member error:', error);
    },
  });
}

/**
 * Hook to update team member role or permissions
 */
export function useUpdateTeamMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role, permissions, accessLevel, allowedSections }: UpdateTeamMemberInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const updates: any = {};
      if (role) updates.role = role;
      if (permissions) updates.permissions = permissions;
      if (accessLevel) updates.access_level = accessLevel;
      if (allowedSections) updates.allowed_sections = allowedSections;

      const { data, error } = await supabase
        .from('project_team_members')
        .update(updates)
        .eq('id', memberId)
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update team member: ${error.message}`);
      }

      return {
        ...data,
        user: {
          id: data.user_id,
          name: (data as any).profiles?.full_name || 'Unknown User',
          email: (data as any).profiles?.email || '',
          avatar: (data as any).profiles?.avatar_url,
        },
      };
    },
    onSuccess: (data) => {
      toast.success(`Team member role updated successfully`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.teamMembers(data.project_id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update team member');
      console.error('Update team member error:', error);
    },
  });
}

/**
 * Hook to remove team member from project
 */
export function useRemoveTeamMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, projectId }: { memberId: string; projectId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        throw new Error(`Failed to remove team member: ${error.message}`);
      }

      return { memberId, projectId };
    },
    onSuccess: (data) => {
      toast.success('Team member removed successfully');
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.teamMembers(data.projectId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.analytics(data.projectId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove team member');
      console.error('Remove team member error:', error);
    },
  });
}

/**
 * Hook to search for users in the system
 */
export function useSearchUsers() {
  return useMutation({
    mutationFn: async (query: string) => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) {
        throw new Error(`Failed to search users: ${error.message}`);
      }

      return data.map(user => ({
        id: user.id,
        name: user.full_name || 'Unknown User',
        email: user.email || '',
        avatar: user.avatar_url,
      }));
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to search users');
      console.error('Search users error:', error);
    },
  });
}

/**
 * Hook to get current user's permissions for a project
 */
export function useUserProjectPermissions(projectId: string | null) {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.id || !projectId) throw new Error('Missing required parameters');

      // Check if user is project owner
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('created_by')
        .eq('id', projectId)
        .single();

      if (projectError) {
        throw new Error('Failed to check project ownership');
      }

      if (project.created_by === user.id) {
        // User is owner, return full permissions
        return {
          isOwner: true,
          role: 'owner' as TeamRole,
          permissions: {
            manageProject: true,
            manageTeam: true,
            manageCompetitors: true,
            runAnalysis: true,
            viewAnalytics: true,
            exportData: true,
            manageSettings: true,
          } as PermissionSet,
        };
      }

      // Check team member permissions
      const { data: member, error: memberError } = await supabase
        .from('project_team_members')
        .select('role, permissions, access_level, allowed_sections')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .eq('invitation_status', 'active')
        .single();

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          // User is not a team member
          return {
            isOwner: false,
            role: null,
            permissions: {},
          };
        }
        throw new Error('Failed to check team member permissions');
      }

      return {
        isOwner: false,
        role: member.role as TeamRole,
        permissions: (member.permissions || {}) as PermissionSet,
        accessLevel: member.access_level,
        allowedSections: member.allowed_sections || [],
      };
    },
  });
}