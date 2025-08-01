import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { InvitationService, InvitationError } from '@/services/invitationService';
import { InvitationCreateInput, BulkInvitationInput } from '@/types/invitations';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Invitation Mutations
// ============================================================================

export function useSendInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (invitationData: InvitationCreateInput) => 
      InvitationService.sendInvitation(invitationData),
    onSuccess: (data, variables) => {
      // Invalidate team invitations cache
      queryClient.invalidateQueries({ queryKey: ['team-invitations', variables.team_id] });
      
      // Show success message
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${variables.email} successfully`,
      });
    },
    onError: (error: Error) => {
      console.error('Error sending invitation:', error);
      
      if (error instanceof InvitationError) {
        toast({
          title: "Invitation Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Invitation Failed",
          description: "Failed to send invitation. Please try again.",
          variant: "destructive",
        });
      }
    }
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ token }: { token: string }) => {
      if (!user) throw new Error('User must be authenticated');
      return InvitationService.acceptInvitation(token, user.id);
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['invitation', variables.token] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      
      // Show success message
      toast({
        title: "Invitation Accepted",
        description: "You have successfully joined the team!",
      });
    },
    onError: (error: Error) => {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Accept Failed",
        description: error.message || "Failed to accept invitation. Please try again.",
        variant: "destructive",
      });
    }
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ token }: { token: string }) => 
      InvitationService.declineInvitation(token),
    onSuccess: (_, variables) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['invitation', variables.token] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      
      // Show success message
      toast({
        title: "Invitation Declined",
        description: "You have declined the team invitation.",
      });
    },
    onError: (error: Error) => {
      console.error('Error declining invitation:', error);
      toast({
        title: "Decline Failed",
        description: error.message || "Failed to decline invitation. Please try again.",
        variant: "destructive",
      });
    }
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: ({ invitationId }: { invitationId: string }) => {
      if (!user) throw new Error('User must be authenticated');
      return InvitationService.cancelInvitation(invitationId, user.id);
    },
    onSuccess: (_, variables) => {
      // Invalidate team invitations cache
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      
      // Show success message
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Error cancelling invitation:', error);
      toast({
        title: "Cancel Failed",
        description: error.message || "Failed to cancel invitation. Please try again.",
        variant: "destructive",
      });
    }
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ invitationId }: { invitationId: string }) => 
      InvitationService.resendInvitation(invitationId),
    onSuccess: () => {
      // Invalidate team invitations cache
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] });
      
      // Show success message
      toast({
        title: "Invitation Resent",
        description: "The invitation has been resent successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Error resending invitation:', error);
      toast({
        title: "Resend Failed",
        description: error.message || "Failed to resend invitation. Please try again.",
        variant: "destructive",
      });
    }
  });
}

// ============================================================================
// Bulk Operations
// ============================================================================

export function useBulkInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (bulkData: BulkInvitationInput) => {
      const results = [];
      const errors = [];
      
      for (const email of bulkData.emails) {
        try {
          const invitationData: InvitationCreateInput = {
            team_id: bulkData.team_id,
            email,
            role_id: bulkData.role_id,
            message: bulkData.message,
            expires_in_days: bulkData.expires_in_days
          };
          
          const result = await InvitationService.sendInvitation(invitationData);
          results.push(result.invitation);
        } catch (error) {
          errors.push({ email, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      return {
        successful: results,
        failed: errors,
        total: bulkData.emails.length,
        successCount: results.length,
        failureCount: errors.length
      };
    },
    onSuccess: (data, variables) => {
      // Invalidate team invitations cache
      queryClient.invalidateQueries({ queryKey: ['team-invitations', variables.team_id] });
      
      // Show results
      if (data.failureCount === 0) {
        toast({
          title: "Bulk Invitations Sent",
          description: `All ${data.successCount} invitations sent successfully`,
        });
      } else {
        toast({
          title: "Bulk Invitations Completed",
          description: `${data.successCount} successful, ${data.failureCount} failed`,
          variant: data.successCount > 0 ? "default" : "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Error with bulk invitations:', error);
      toast({
        title: "Bulk Invitation Failed",
        description: error.message || "Failed to send bulk invitations. Please try again.",
        variant: "destructive",
      });
    }
  });
}