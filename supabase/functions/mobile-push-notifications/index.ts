import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { 
      userId, 
      title, 
      body, 
      data = {}, 
      targetDevices = ['mobile', 'tablet'], 
      priority = 'normal',
      notificationType = 'general'
    } = await req.json();

    console.log(`Push notification request: userId=${userId}, type=${notificationType}`);

    if (!userId || !title || !body) {
      throw new Error('userId, title, and body are required');
    }

    // Get current user (for authentication)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Get user's mobile sessions and device info
    const { data: mobileSessions, error: sessionsError } = await supabaseClient
      .from('mobile_sessions')
      .select('device_type, device_info, user_id')
      .eq('user_id', userId)
      .in('device_type', targetDevices)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching mobile sessions:', sessionsError);
    }

    const activeDevices = mobileSessions || [];
    console.log(`Found ${activeDevices.length} active devices for user ${userId}`);

    // Create notification record
    const notificationData = {
      user_id: userId,
      title,
      body,
      data: JSON.stringify(data),
      notification_type: notificationType,
      priority,
      status: 'sent',
      metadata: {
        targetDevices,
        deviceCount: activeDevices.length,
        timestamp: new Date().toISOString(),
        sentBy: user.id
      }
    };

    // Store notification in database
    const { data: notification, error: notifError } = await supabaseClient
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();

    if (notifError) {
      console.error('Error storing notification:', notifError);
      throw new Error('Failed to store notification');
    }

    // Simulate push notification delivery (In production, integrate with Firebase, APNs, etc.)
    const deliveryResults = [];
    
    for (const device of activeDevices) {
      const deviceToken = device.device_info?.pushToken || `mock_token_${device.user_id}`;
      
      // Mock push notification service call
      const deliveryResult = await simulatePushDelivery({
        deviceToken,
        deviceType: device.device_type,
        title,
        body,
        data,
        priority
      });

      deliveryResults.push({
        deviceType: device.device_type,
        deviceToken: deviceToken.substring(0, 10) + '...',
        status: deliveryResult.success ? 'delivered' : 'failed',
        error: deliveryResult.error || null
      });

      // Log mobile session activity
      await supabaseClient
        .from('mobile_sessions')
        .update({
          performance_metrics: {
            ...device.performance_metrics,
            lastNotification: new Date().toISOString(),
            notificationCount: (device.performance_metrics?.notificationCount || 0) + 1
          }
        })
        .eq('id', device.id);
    }

    // Update notification with delivery status
    const successCount = deliveryResults.filter(r => r.status === 'delivered').length;
    await supabaseClient
      .from('notifications')
      .update({
        metadata: {
          ...notification.metadata,
          deliveryResults,
          successCount,
          deliveryRate: activeDevices.length > 0 ? successCount / activeDevices.length : 0
        }
      })
      .eq('id', notification.id);

    console.log(`Notification sent: ${notification.id}, delivered to ${successCount}/${activeDevices.length} devices`);

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        deliveryResults,
        summary: {
          totalDevices: activeDevices.length,
          successfulDeliveries: successCount,
          deliveryRate: activeDevices.length > 0 ? (successCount / activeDevices.length * 100).toFixed(1) + '%' : '0%'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Simulate push notification delivery
async function simulatePushDelivery({ deviceToken, deviceType, title, body, data, priority }: any) {
  // In production, replace this with actual push service calls:
  // - Firebase Cloud Messaging for Android
  // - Apple Push Notification Service for iOS
  // - Web Push for PWAs

  console.log(`Simulating push to ${deviceType} device: ${deviceToken.substring(0, 10)}...`);

  // Simulate network delay and potential failures
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  // 95% success rate simulation
  const success = Math.random() > 0.05;

  if (success) {
    console.log(`✓ Push delivered successfully to ${deviceType}`);
    return { success: true };
  } else {
    const error = 'Device unreachable';
    console.log(`✗ Push delivery failed to ${deviceType}: ${error}`);
    return { success: false, error };
  }
}

// Example integration functions (for production use)
async function sendFirebaseNotification({ deviceToken, title, body, data }: any) {
  // Firebase Cloud Messaging integration
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  
  if (!fcmServerKey) {
    throw new Error('FCM server key not configured');
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmServerKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: deviceToken,
      notification: { title, body },
      data
    }),
  });

  return response.json();
}

async function sendAppleNotification({ deviceToken, title, body, data }: any) {
  // Apple Push Notification Service integration
  const apnsCert = Deno.env.get('APNS_CERTIFICATE');
  const apnsKey = Deno.env.get('APNS_KEY');
  
  if (!apnsCert || !apnsKey) {
    throw new Error('APNs credentials not configured');
  }

  // Implementation would use APNs HTTP/2 API
  // This is a simplified example
  console.log('Would send APNs notification:', { deviceToken, title, body, data });
  
  return { success: true };
}