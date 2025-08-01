import { supabase } from '@/integrations/supabase/client';
import {
  TeamInvitation,
  InvitationCreateInput,
  InvitationResponse,
  InvitationStatusCheck,
  InvitationQueryOptions
} from '@/types/invitations';

// Custom error for invitation operations
export class InvitationError extends Error {
  constructor(
    public code: string,
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'InvitationError';
  }
}

export class InvitationService {
  // ============================================================================
  // Invitation Management
  // ============================================================================

  static async sendInvitation(invitationData: InvitationCreateInput): Promise<InvitationResponse> {
    try {
      // Validate invitation data
      this.validateInvitationData(invitationData);

      // Check if user is already a team member
      const isAlreadyMember = await this.checkExistingMembership(invitationData.team_id, invitationData.email);
      if (isAlreadyMember) {
        throw new InvitationError(
          'ALREADY_MEMBER',
          'User is already a member of this team',
          'email',
          invitationData.email
        );
      }

      // Check for existing pending invitation
      const existingInvitation = await this.getExistingInvitation(invitationData.team_id, invitationData.email);
      if (existingInvitation) {
        throw new InvitationError(
          'INVITATION_EXISTS',
          'An invitation for this email already exists',
          'email',
          invitationData.email
        );
      }

      // Generate secure token
      const invitation_token = this.generateSecureToken();
      
      // Calculate expiration date (default 7 days)
      const expiresInDays = invitationData.expires_in_days || 7;
      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expiresInDays);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User must be authenticated to send invitations');
      }

      // Create invitation using direct SQL to bypass type issues
      const { data: invitation, error } = await supabase
        .rpc('create_team_invitation', {
          p_team_id: invitationData.team_id,
          p_email: invitationData.email.toLowerCase().trim(),
          p_role_id: invitationData.role_id,
          p_invited_by: user.id,
          p_invitation_token: invitation_token,
          p_expires_at: expires_at.toISOString(),
          p_message: invitationData.message || '',
          p_metadata: invitationData.metadata || {}
        });

      if (error) {
        console.error('Error creating invitation:', error);
        throw new Error(`Failed to create invitation: ${error.message}`);
      }

      return {
        invitation: invitation as TeamInvitation,
        success: true,
        message: 'Invitation sent successfully'
      };

    } catch (error) {
      console.error('Error in sendInvitation:', error);
      if (error instanceof InvitationError) {
        throw error;
      }
      throw new Error(`Failed to send invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async acceptInvitation(token: string, userId: string): Promise<InvitationResponse> {
    try {
      const { data: result, error } = await supabase
        .rpc('accept_team_invitation', {
          p_token: token,
          p_user_id: userId
        });

      if (error) {
        throw new Error(`Failed to accept invitation: ${error.message}`);
      }

      return {
        invitation: result as TeamInvitation,
        success: true,
        message: 'Invitation accepted successfully'
      };

    } catch (error) {
      console.error('Error in acceptInvitation:', error);
      throw new Error(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async declineInvitation(token: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('decline_team_invitation', {
          p_token: token
        });

      if (error) {
        throw new Error(`Failed to decline invitation: ${error.message}`);
      }

    } catch (error) {
      console.error('Error in declineInvitation:', error);
      throw new Error(`Failed to decline invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async cancelInvitation(invitationId: string, cancelledBy: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('cancel_team_invitation', {
          p_invitation_id: invitationId,
          p_cancelled_by: cancelledBy
        });

      if (error) {
        throw new Error(`Failed to cancel invitation: ${error.message}`);
      }

    } catch (error) {
      console.error('Error in cancelInvitation:', error);
      throw new Error(`Failed to cancel invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async resendInvitation(invitationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('resend_team_invitation', {
          p_invitation_id: invitationId
        });

      if (error) {
        throw new Error(`Failed to resend invitation: ${error.message}`);
      }

    } catch (error) {
      console.error('Error in resendInvitation:', error);
      throw new Error(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Invitation Queries
  // ============================================================================

  static async getTeamInvitations(teamId: string, options?: InvitationQueryOptions): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_team_invitations', {
          p_team_id: teamId,
          p_options: options || {}
        });

      if (error) {
        throw new Error(`Failed to fetch team invitations: ${error.message}`);
      }

      return (data || []) as TeamInvitation[];

    } catch (error) {
      console.error('Error in getTeamInvitations:', error);
      return [];
    }
  }

  static async getInvitationByToken(token: string): Promise<TeamInvitation | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', {
          p_token: token
        });

      if (error) {
        console.error('Error fetching invitation:', error);
        return null;
      }

      return data as TeamInvitation | null;

    } catch (error) {
      console.error('Error in getInvitationByToken:', error);
      return null;
    }
  }

  static async getPendingInvitations(email: string): Promise<TeamInvitation[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_pending_invitations', {
          p_email: email.toLowerCase().trim()
        });

      if (error) {
        throw new Error(`Failed to fetch pending invitations: ${error.message}`);
      }

      return (data || []) as TeamInvitation[];

    } catch (error) {
      console.error('Error in getPendingInvitations:', error);
      return [];
    }
  }

  static async getInvitationStatus(token: string): Promise<InvitationStatusCheck> {
    try {
      const { data, error } = await supabase
        .rpc('get_invitation_status', {
          p_token: token
        });

      if (error) {
        console.error('Error checking invitation status:', error);
        return { valid: false, expired: false, alreadyMember: false };
      }

      return data as InvitationStatusCheck;

    } catch (error) {
      console.error('Error in getInvitationStatus:', error);
      return { valid: false, expired: false, alreadyMember: false };
    }
  }

  // ============================================================================
  // Validation & Security
  // ============================================================================

  static validateInvitationData(data: InvitationCreateInput): void {
    if (!data.team_id) {
      throw new InvitationError('MISSING_TEAM_ID', 'Team ID is required', 'team_id');
    }

    if (!data.email) {
      throw new InvitationError('MISSING_EMAIL', 'Email is required', 'email');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new InvitationError('INVALID_EMAIL', 'Invalid email format', 'email', data.email);
    }

    if (!data.role_id) {
      throw new InvitationError('MISSING_ROLE_ID', 'Role ID is required', 'role_id');
    }

    // Message length validation
    if (data.message && data.message.length > 500) {
      throw new InvitationError('MESSAGE_TOO_LONG', 'Message cannot exceed 500 characters', 'message', data.message);
    }

    // Expiration validation
    if (data.expires_in_days && (data.expires_in_days < 1 || data.expires_in_days > 30)) {
      throw new InvitationError('INVALID_EXPIRATION', 'Expiration must be between 1 and 30 days', 'expires_in_days', data.expires_in_days);
    }
  }

  static generateSecureToken(): string {
    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private static async checkExistingMembership(teamId: string, email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_team_membership', {
          p_team_id: teamId,
          p_email: email.toLowerCase().trim()
        });

      if (error) {
        console.error('Error checking membership:', error);
        return false;
      }

      return !!data;
    } catch {
      return false;
    }
  }

  private static async getExistingInvitation(teamId: string, email: string): Promise<TeamInvitation | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_existing_invitation', {
          p_team_id: teamId,
          p_email: email.toLowerCase().trim()
        });

      if (error) {
        return null;
      }

      return data as TeamInvitation | null;
    } catch {
      return null;
    }
  }

  static async cleanupExpiredInvitations(): Promise<void> {
    try {
      await supabase.rpc('cleanup_expired_invitations');
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
    }
  }
}