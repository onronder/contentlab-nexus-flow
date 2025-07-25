import { useEffect, useState } from 'react';
import { useUser } from '@/contexts';
import { ProjectTeamMember, PermissionSet } from '@/types/projects';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectPermissions extends PermissionSet {
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canManageSettings: boolean;
}

export function useProjectPermissions(projectId: string | null): {
  permissions: ProjectPermissions;
  loading: boolean;
  error: string | null;
  teamMember: ProjectTeamMember | null;
} {
  const user = useUser();
  const [permissions, setPermissions] = useState<ProjectPermissions>({
    isOwner: false,
    isAdmin: false,
    isManager: false,
    canView: false,
    canEdit: false,
    canDelete: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageSettings: false,
    manageProject: false,
    manageTeam: false,
    manageCompetitors: false,
    runAnalysis: false,
    viewAnalytics: false,
    exportData: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMember, setTeamMember] = useState<ProjectTeamMember | null>(null);

  useEffect(() => {
    if (!user || !projectId) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        // First check if user is project owner
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('created_by')
          .eq('id', projectId)
          .single();

        if (projectError) {
          throw new Error(`Failed to load project: ${projectError.message}`);
        }

        const isOwner = project.created_by === user.id;

        // Then check team membership
        const { data: teamMemberData, error: memberError } = await supabase
          .from('project_team_members')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .eq('invitation_status', 'active')
          .maybeSingle();

        if (memberError) {
          throw new Error(`Failed to load team member: ${memberError.message}`);
        }

        // Transform and set team member data
        const member = teamMemberData ? {
          id: teamMemberData.id,
          projectId: teamMemberData.project_id,
          userId: teamMemberData.user_id,
          role: teamMemberData.role,
          permissions: teamMemberData.permissions || {},
          accessLevel: teamMemberData.access_level,
          allowedSections: teamMemberData.allowed_sections,
          invitationStatus: teamMemberData.invitation_status,
          invitedBy: teamMemberData.invited_by,
          invitedAt: teamMemberData.invited_at ? new Date(teamMemberData.invited_at) : undefined,
          joinedAt: teamMemberData.joined_at ? new Date(teamMemberData.joined_at) : undefined,
          lastActivity: teamMemberData.last_activity ? new Date(teamMemberData.last_activity) : undefined,
          expirationDate: teamMemberData.expiration_date ? new Date(teamMemberData.expiration_date) : undefined,
          isTemporary: teamMemberData.is_temporary,
          createdAt: new Date(teamMemberData.created_at),
          updatedAt: new Date(teamMemberData.updated_at),
          user: {
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            avatar: user.user_metadata?.avatar_url
          }
        } as ProjectTeamMember : null;
        
        setTeamMember(member);

        const calculatedPermissions: ProjectPermissions = {
          isOwner,
          isAdmin: isOwner || member?.role === 'admin',
          isManager: isOwner || ['admin', 'manager'].includes(member?.role || ''),
          canView: isOwner || !!member,
          canEdit: isOwner || ['admin', 'manager'].includes(member?.role || ''),
          canDelete: isOwner,
          canInviteMembers: isOwner || ['admin', 'manager'].includes(member?.role || ''),
          canRemoveMembers: isOwner || member?.role === 'admin',
          canManageSettings: isOwner || member?.role === 'admin',
          
          // Specific permissions
          manageProject: isOwner || ['admin', 'manager'].includes(member?.role || ''),
          manageTeam: isOwner || ['admin', 'manager'].includes(member?.role || ''),
          manageCompetitors: isOwner || ['admin', 'manager', 'analyst'].includes(member?.role || ''),
          runAnalysis: isOwner || ['admin', 'manager', 'analyst'].includes(member?.role || ''),
          viewAnalytics: isOwner || !!member,
          exportData: isOwner || ['admin', 'manager', 'analyst'].includes(member?.role || ''),
          
          // Override with custom permissions if they exist
          ...(member?.permissions || {})
        };

        setPermissions(calculatedPermissions);
      } catch (err) {
        console.error('Error loading project permissions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user, projectId]);

  return { permissions, loading, error, teamMember };
}