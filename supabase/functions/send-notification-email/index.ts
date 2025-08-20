import { Resend } from "npm:resend@2.0.0";
import { withSecurity, SecurityLogger, validateInput } from "../_shared/security.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  name: string;
  subject: string;
  message: string;
  actionUrl?: string;
}

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { to, name, subject, message, actionUrl }: NotificationEmailRequest = await req.json();

    // Validate input
    const emailValidation = validateInput.email(to);
    if (!emailValidation.isValid) {
      return new Response(JSON.stringify({ error: emailValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const nameValidation = validateInput.text(name, 100);
    if (!nameValidation.isValid) {
      return new Response(JSON.stringify({ error: nameValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const subjectValidation = validateInput.text(subject, 200);
    if (!subjectValidation.isValid) {
      return new Response(JSON.stringify({ error: subjectValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const messageValidation = validateInput.text(message, 5000);
    if (!messageValidation.isValid) {
      return new Response(JSON.stringify({ error: messageValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Sending notification email', { to, subject });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f8f9fa;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 40px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 40px;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #2d3748;
            }
            .message {
              font-size: 16px;
              margin-bottom: 30px;
              color: #4a5568;
              line-height: 1.8;
            }
            .action-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              padding: 12px 30px;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .footer {
              background-color: #f7fafc;
              padding: 30px 40px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer p {
              margin: 0;
              font-size: 14px;
              color: #718096;
            }
            .footer a {
              color: #667eea;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ContentLab Nexus</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Hi ${name},
              </div>
              <div class="message">
                ${message}
              </div>
              ${actionUrl ? `
                <div style="text-align: center;">
                  <a href="${actionUrl}" class="action-button">
                    View Details
                  </a>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>
                You received this notification because you're part of a team on ContentLab Nexus.
                <br>
                <a href="#">Manage your notification preferences</a>
              </p>
              <p style="margin-top: 10px;">
                © 2024 ContentLab Nexus. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "ContentLab Nexus <notifications@resend.dev>",
      to: [to],
      subject: subject,
      html: emailHtml,
    });

    logger.info("Email sent successfully", { to, emailId: emailResponse.id });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    logger.error("Failed to send notification email", error, { to, subject });
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
        },
      }
    );
  }
};

export default withSecurity(handler, {
  requireAuth: true,
  rateLimitRequests: 10, // Strict limit for email sending
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});