import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withSecurity } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = withSecurity(async (req, logger) => {
  const url = new URL(req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { accountSid, authToken, from, to, body } = await req.json();

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    logger.info('Sending SMS alert', { 
      recipients: Array.isArray(to) ? to.length : 1,
      messageLength: body.length
    });

    // Send SMS to each recipient
    const recipients = Array.isArray(to) ? to : [to];
    const results = [];

    for (const phoneNumber of recipients) {
      try {
        // In production, this would use Twilio's API
        // For demo purposes, we'll simulate SMS sending
        
        // Real Twilio integration would look like:
        /*
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(accountSid + ':' + authToken)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: from,
            To: phoneNumber,
            Body: body
          })
        });

        const result = await response.json();
        */

        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const result = {
          sid: `sim_sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          to: phoneNumber,
          from: from,
          body: body,
          status: 'queued',
          date_sent: new Date().toISOString()
        };

        results.push(result);
        
        logger.info('SMS sent successfully', { 
          messageId: result.sid,
          recipient: phoneNumber
        });

      } catch (smsError) {
        logger.error('Failed to send SMS', { 
          error: smsError.message,
          recipient: phoneNumber
        });
        
        results.push({
          to: phoneNumber,
          error: smsError.message,
          success: false
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'SMS alerts processed',
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('SMS sending failed', { error: error.message });

    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to send SMS alerts',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, {
  requireAuth: false,
  rateLimitRequests: 50,
  rateLimitWindow: 60000
});

serve(handler);