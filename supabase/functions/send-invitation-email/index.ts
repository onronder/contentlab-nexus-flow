import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { withSecurity, validateInput } from '../_shared/security.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  teamName: string;
  roleName: string;
  inviterName: string;
  message?: string;
  acceptUrl: string;
  declineUrl: string;
  expiresAt: string;
}

const generateInvitationTemplate = (data: InvitationEmailRequest): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${data.teamName}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .button { width: 100% !important; margin: 5px 0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">
                ContentLab Nexus
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">
                Team Invitation
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                You're invited to join ${data.teamName}
              </h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Hi there! <strong>${data.inviterName}</strong> has invited you to join <strong>${data.teamName}</strong> as a <strong>${data.roleName}</strong>.
              </p>
              
              ${data.message ? `
                <div style="background: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                  <p style="color: #374151; margin: 0 0 10px 0; font-weight: 600; font-size: 14px;">Personal Message:</p>
                  <p style="color: #4b5563; margin: 0; font-style: italic; font-size: 15px;">"${data.message}"</p>
                </div>
              ` : ''}
              
              <p style="color: #4b5563; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                Join your team and start collaborating on competitive analysis, content management, and strategic insights.
              </p>
              
              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 10px 0 0;">
                          <a href="${data.acceptUrl}" class="button" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
                            Accept Invitation
                          </a>
                        </td>
                        <td style="padding: 0 0 0 10px;">
                          <a href="${data.declineUrl}" class="button" style="background: #6b7280; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
                            Decline
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Expiration Info -->
              <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 25px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px; text-align: center;">
                  ⏰ This invitation expires on ${new Date(data.expiresAt).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <!-- Alternative Link -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">
                  Can't click the buttons? Copy and paste this link into your browser:<br>
                  <span style="word-break: break-all; color: #667eea;">${data.acceptUrl}</span>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                This email was sent by ContentLab Nexus. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = withSecurity(async (req, logger) => {
  logger.info('Processing invitation email request');

  try {
    const emailData: InvitationEmailRequest = await req.json();

    // Validate required inputs
    const emailValidation = validateInput.email(emailData.email);
    if (!emailValidation.isValid) {
      logger.warn('Invalid email provided', { email: emailData.email, error: emailValidation.error });
      return new Response(JSON.stringify({ 
        success: false, 
        error: emailValidation.error 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Validate team name and other inputs
    const teamNameValidation = validateInput.text(emailData.teamName, 100);
    if (!teamNameValidation.isValid) {
      logger.warn('Invalid team name provided', { teamName: emailData.teamName });
      return new Response(JSON.stringify({ 
        success: false, 
        error: teamNameValidation.error 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    logger.info("Sending invitation email", { to: emailData.email, team: emailData.teamName });

    const emailResponse = await resend.emails.send({
      from: "ContentLab Nexus <invitations@resend.dev>",
      to: [emailData.email],
      subject: `You're invited to join ${emailData.teamName}`,
      html: generateInvitationTemplate(emailData),
    });

    logger.info("Email sent successfully", { to: emailData.email, messageId: emailResponse.data?.id });

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    logger.error("Error sending invitation email", { error: error.message, email: emailData?.email });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
}, {
  requireAuth: true,
  rateLimit: { requests: 10, windowMs: 60000 }, // 10 emails per minute
  inputValidation: true
});

serve(handler);