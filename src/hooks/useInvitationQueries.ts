import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { InvitationService, InvitationError } from '@/services/invitationService';
import {
  TeamInvitation,
  InvitationCreateInput,
  InvitationQueryOptions,
  InvitationStatusCheck
} from '@/types/invitations';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Invitation Queries
// ============================================================================

export function useTeamInvitations(teamId: string, options?: InvitationQueryOptions) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['team-invitations', teamId, options],
    queryFn: () => InvitationService.getTeamInvitations(teamId, options),
    enabled: !!user && !!teamId,
    staleTime: 30000, // 30 seconds
    retry: 3
  });
}

export function useInvitationByToken(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () => InvitationService.getInvitationByToken(token),
    enabled: !!token,
    staleTime: 60000, // 1 minute
    retry: 2
  });
}

export function usePendingInvitations(email?: string) {
  return useQuery({
    queryKey: ['pending-invitations', email],
    queryFn: () => email ? InvitationService.getPendingInvitations(email) : Promise.resolve([]),
    enabled: !!email,
    staleTime: 30000,
    retry: 2
  });
}

export function useInvitationStatus(token: string) {
  return useQuery({
    queryKey: ['invitation-status', token],
    queryFn: () => InvitationService.getInvitationStatus(token),
    enabled: !!token,
    staleTime: 30000,
    retry: 2
  });
}

// ============================================================================
// Advanced Queries
// ============================================================================

export function useInvitationsByStatus(teamId: string, status?: string) {
  const options: InvitationQueryOptions = {
    filters: status ? { status: status as any } : undefined
  };
  
  return useTeamInvitations(teamId, options);
}

export function useInvitationMetrics(teamId: string) {
  const { data: invitations = [] } = useTeamInvitations(teamId);
  
  return useQuery({
    queryKey: ['invitation-metrics', teamId, invitations.length],
    queryFn: () => {
      const totalSent = invitations.length;
      const totalAccepted = invitations.filter(inv => inv.status === 'accepted').length;
      const totalDeclined = invitations.filter(inv => inv.status === 'declined').length;
      const totalExpired = invitations.filter(inv => inv.status === 'expired').length;
      const totalCancelled = invitations.filter(inv => inv.status === 'cancelled').length;
      const acceptanceRate = totalSent > 0 ? (totalAccepted / totalSent) * 100 : 0;
      
      // Calculate average response time for accepted invitations
      const acceptedInvitations = invitations.filter(inv => inv.status === 'accepted' && inv.accepted_at);
      const averageResponseTime = acceptedInvitations.length > 0 
        ? acceptedInvitations.reduce((acc, inv) => {
            const created = new Date(inv.created_at);
            const accepted = new Date(inv.accepted_at!);
            return acc + (accepted.getTime() - created.getTime());
          }, 0) / acceptedInvitations.length / (1000 * 60 * 60) // Convert to hours
        : 0;
      
      return {
        totalSent,
        totalAccepted,
        totalDeclined,
        totalExpired,
        totalCancelled,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        recentInvitations: invitations.slice(0, 5)
      };
    },
    enabled: invitations.length >= 0,
    staleTime: 60000
  });
}