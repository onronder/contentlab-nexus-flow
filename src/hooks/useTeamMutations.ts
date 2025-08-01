import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamService } from '@/services/teamService';
import { AuditService } from '@/services/auditService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type {
  TeamCreateInput,
  TeamUpdateInput,
  TeamMemberInput,
  Team,
  TeamMember
} from '@/types/team';

// ============================================================================
// TEAM MUTATIONS
// ============================================================================

export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (teamData: TeamCreateInput) => {
      const team = await TeamService.createTeam(teamData);
      
      // Log team creation
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: team.id,
        action: 'team_created',
        description: `Created team: ${team.name}`,
        metadata: { team_data: teamData }
      });
      
      return team;
    },
    onSuccess: (data) => {
      // Invalidate and refetch teams
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['userTeamRoles'] });
      
      toast({
        title: "Team created",
        description: `${data.name} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating team",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: TeamUpdateInput }) => {
      const team = await TeamService.updateTeam(teamId, updates);
      
      // Log team update
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: teamId,
        action: 'team_updated',
        description: `Updated team: ${team.name}`,
        metadata: { updates }
      });
      
      return team;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific team and teams list
      queryClient.invalidateQueries({ queryKey: ['team', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats', variables.teamId] });
      
      toast({
        title: "Team updated",
        description: `${data.name} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating team",
        description: error.message || "Failed to update team",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await TeamService.deleteTeam(teamId);
      
      // Log team deletion
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: teamId,
        action: 'team_deleted',
        description: `Deleted team`,
        metadata: { team_id: teamId }
      });
    },
    onSuccess: (_, teamId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['userTeamRoles'] });
      
      toast({
        title: "Team deleted",
        description: "Team has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting team",
        description: error.message || "Failed to delete team",
        variant: "destructive",
      });
    },
  });
}

// ============================================================================
// TEAM MEMBER MUTATIONS
// ============================================================================

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memberData: TeamMemberInput) => {
      const member = await TeamService.addTeamMember(memberData);
      
      // Log member invitation
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: memberData.team_id,
        action: 'member_invited',
        description: `Invited user to team`,
        metadata: { invited_user_id: memberData.user_id, role: memberData.role_slug }
      });
      
      return member;
    },
    onSuccess: (data, variables) => {
      // Invalidate team members and stats
      queryClient.invalidateQueries({ queryKey: ['teamMembers', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['teamStats', variables.team_id] });
      queryClient.invalidateQueries({ queryKey: ['userTeamRoles'] });
      
      toast({
        title: "Member invited",
        description: "Team member has been invited successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error inviting member",
        description: error.message || "Failed to invite team member",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teamId, userId, roleSlug }: { teamId: string; userId: string; roleSlug: string }) => {
      await TeamService.updateMemberRole(teamId, userId, roleSlug);
      
      // Log role update
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: teamId,
        action: 'member_role_updated',
        description: `Updated member role to ${roleSlug}`,
        metadata: { target_user_id: userId, new_role: roleSlug }
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate team members and permissions
      queryClient.invalidateQueries({ queryKey: ['teamMembers', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamPermissions', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['userTeamRoles', variables.userId] });
      
      toast({
        title: "Role updated",
        description: "Member role has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update member role",
        variant: "destructive",
      });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      await TeamService.removeTeamMember(teamId, userId);
      
      // Log member removal
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: teamId,
        action: 'member_removed',
        description: `Removed member from team`,
        metadata: { removed_user_id: userId }
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate team members and stats
      queryClient.invalidateQueries({ queryKey: ['teamMembers', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamStats', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['userTeamRoles', variables.userId] });
      
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing member",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export function useBulkMemberOperations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      teamId, 
      operations 
    }: { 
      teamId: string; 
      operations: Array<{
        action: 'invite' | 'remove' | 'update_role';
        userId: string;
        roleSlug?: string;
        memberData?: TeamMemberInput;
      }>;
    }) => {
      const results = await Promise.allSettled(
        operations.map(async (op) => {
          switch (op.action) {
            case 'invite':
              if (!op.memberData) throw new Error('Member data required for invite');
              return TeamService.addTeamMember(op.memberData);
            case 'remove':
              return TeamService.removeTeamMember(teamId, op.userId);
            case 'update_role':
              if (!op.roleSlug) throw new Error('Role slug required for update');
              return TeamService.updateMemberRole(teamId, op.userId, op.roleSlug);
            default:
              throw new Error(`Unknown operation: ${op.action}`);
          }
        })
      );

      // Log bulk operation
      await AuditService.logTeamActivity({
        user_id: user!.id,
        team_id: teamId,
        action: 'bulk_member_operation',
        description: `Performed bulk operations on ${operations.length} members`,
        metadata: { operations, results: results.map(r => r.status) }
      });

      return results;
    },
    onSuccess: (results, variables) => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Invalidate all team-related queries
      queryClient.invalidateQueries({ queryKey: ['teamMembers', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamStats', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamPermissions', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['userTeamRoles'] });

      toast({
        title: "Bulk operation completed",
        description: `${successful} operations succeeded${failed > 0 ? `, ${failed} failed` : ''}.`,
        variant: failed > 0 ? "destructive" : "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk operation failed",
        description: error.message || "Failed to complete bulk operations",
        variant: "destructive",
      });
    },
  });
}