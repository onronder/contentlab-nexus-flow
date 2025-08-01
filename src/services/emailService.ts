import { supabase } from '@/integrations/supabase/client';
import { EmailInvitationData } from '@/types/invitations';

export class EmailService {
  // ============================================================================
  // Email Templates and Sending
  // ============================================================================

  static async sendInvitationEmail(data: EmailInvitationData): Promise<void> {
    try {
      const emailPayload = {
        email: data.invitation.email,
        teamName: data.teamName,
        roleName: data.roleName,
        inviterName: data.inviterName,
        message: data.invitation.message,
        acceptUrl: data.acceptUrl,
        declineUrl: data.declineUrl,
        expiresAt: data.invitation.expires_at
      };

      const { data: response, error } = await supabase.functions.invoke('send-invitation-email', {
        body: emailPayload
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Email service error: ${error.message}`);
      }

      if (!response?.success) {
        throw new Error('Failed to send email');
      }

      console.log('Invitation email sent successfully:', response.messageId);

    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw new Error(`Failed to send invitation email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendReminderEmail(invitationId: string): Promise<void> {
    try {
      // Mock implementation
      console.log('Mock reminder email sent for invitation:', invitationId);
    } catch (error) {
      console.error('Error sending reminder email:', error);
      throw new Error(`Failed to send reminder email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendWelcomeEmail(teamMemberId: string): Promise<void> {
    try {
      // Mock implementation
      console.log('Mock welcome email sent for team member:', teamMemberId);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async sendAcceptanceConfirmation(invitationId: string): Promise<void> {
    try {
      // Mock implementation
      console.log('Mock acceptance confirmation sent for invitation:', invitationId);
    } catch (error) {
      console.error('Error sending acceptance confirmation:', error);
      throw new Error(`Failed to send acceptance confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // Email Template Helpers
  // ============================================================================

  private static generateInvitationTemplate(data: EmailInvitationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">You're invited to join ${data.teamName}</h1>
            
            <p>Hi there!</p>
            
            <p>${data.inviterName} has invited you to join <strong>${data.teamName}</strong> as a <strong>${data.roleName}</strong>.</p>
            
            ${data.invitation.message ? `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Personal message:</strong></p>
                <p style="font-style: italic;">"${data.invitation.message}"</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.acceptUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px;">
                Accept Invitation
              </a>
              <a href="${data.declineUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 0 10px;">
                Decline
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              This invitation will expire on ${new Date(data.invitation.expires_at).toLocaleDateString()}.
              If you can't click the buttons above, copy and paste this link into your browser:
              <br>
              ${data.acceptUrl}
            </p>
          </div>
        </body>
      </html>
    `;
  }
}