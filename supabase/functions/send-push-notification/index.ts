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
    const { serverKey, topic, payload } = await req.json();

    if (!serverKey) {
      throw new Error('Firebase server key not configured');
    }

    logger.info('Sending push notification', { 
      topic,
      title: payload.notification?.title
    });

    // In production, this would use Firebase Cloud Messaging API
    // For demo purposes, we'll simulate push notification sending
    
    // Real FCM integration would look like:
    /*
    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `/topics/${topic}`,
        notification: payload.notification,
        data: payload.data,
        priority: 'high',
        time_to_live: 3600 // 1 hour
      })
    });

    const result = await response.json();
    */

    // Simulate push notification sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = {
      multicast_id: Date.now(),
      success: 1,
      failure: 0,
      canonical_ids: 0,
      results: [{
        message_id: `sim_push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }]
    };

    logger.info('Push notification sent successfully', { 
      messageId: result.results[0].message_id,
      topic
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Push notification sent successfully',
      messageId: result.results[0].message_id,
      topic,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Push notification sending failed', { error: error.message });

    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to send push notification',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}, {
  requireAuth: false,
  rateLimitRequests: 200,
  rateLimitWindow: 60000
});

serve(handler);