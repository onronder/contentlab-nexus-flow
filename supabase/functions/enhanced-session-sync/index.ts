import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionData {
  user_id: string;
  session_id: string;
  device_info: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
    user_agent: string;
  };
  session_state: {
    current_team_id?: string;
    recent_teams: string[];
    preferences: Record<string, any>;
    workspace_state: Record<string, any>;
  };
  location_info?: {
    ip_address: string;
    country?: string;
    city?: string;
  };
  last_activity: string;
  sync_version: number;
}

interface SyncConflict {
  field: string;
  local_value: any;
  remote_value: any;
  local_timestamp: string;
  remote_timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { action, session_data, device_id } = await req.json();

    switch (action) {
      case 'sync_session':
        return await syncSession(supabase, user.id, session_data);
      
      case 'get_session':
        return await getSession(supabase, user.id, device_id);
      
      case 'resolve_conflicts':
        return await resolveConflicts(supabase, user.id, session_data.conflicts);
      
      case 'register_device':
        return await registerDevice(supabase, user.id, session_data);
      
      case 'get_devices':
        return await getUserDevices(supabase, user.id);
      
      case 'remove_device':
        return await removeDevice(supabase, user.id, device_id);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Session sync error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncSession(supabase: any, userId: string, sessionData: SessionData) {
  const timestamp = new Date().toISOString();
  
  try {
    // Get existing session data for conflict detection
    const { data: existingSession } = await supabase
      .from('user_sessions_enhanced')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionData.session_id)
      .single();
    
    let conflicts: SyncConflict[] = [];
    
    if (existingSession && existingSession.sync_version !== sessionData.sync_version) {
      // Detect conflicts
      conflicts = detectConflicts(existingSession.session_state, sessionData.session_state, 
                                existingSession.updated_at, timestamp);
    }
    
    if (conflicts.length > 0) {
      // Store conflicts for resolution
      await supabase
        .from('session_conflicts')
        .insert({
          user_id: userId,
          session_id: sessionData.session_id,
          conflicts: conflicts,
          status: 'pending',
          created_at: timestamp
        });
      
      return new Response(JSON.stringify({
        success: false,
        conflicts: conflicts,
        requires_resolution: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // No conflicts, proceed with sync
    const { error } = await supabase
      .from('user_sessions_enhanced')
      .upsert({
        user_id: userId,
        session_id: sessionData.session_id,
        device_info: sessionData.device_info,
        session_state: sessionData.session_state,
        location_info: sessionData.location_info,
        last_activity: timestamp,
        sync_version: (sessionData.sync_version || 0) + 1,
        updated_at: timestamp
      });
    
    if (error) throw error;
    
    // Log sync activity
    await logSyncActivity(supabase, userId, 'session_sync', {
      session_id: sessionData.session_id,
      device_type: sessionData.device_info.type,
      sync_version: sessionData.sync_version + 1
    });
    
    // Notify other devices about the sync
    await notifyDevicesOfSync(supabase, userId, sessionData.session_id);
    
    return new Response(JSON.stringify({
      success: true,
      sync_version: sessionData.sync_version + 1,
      timestamp: timestamp
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Sync session error:', error);
    throw error;
  }
}

async function getSession(supabase: any, userId: string, deviceId?: string) {
  try {
    let query = supabase
      .from('user_sessions_enhanced')
      .select('*')
      .eq('user_id', userId);
    
    if (deviceId) {
      query = query.eq('session_id', deviceId);
    }
    
    const { data: sessions, error } = await query
      .order('last_activity', { ascending: false });
    
    if (error) throw error;
    
    // Get any pending conflicts
    const { data: conflicts } = await supabase
      .from('session_conflicts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');
    
    return new Response(JSON.stringify({
      sessions: sessions || [],
      pending_conflicts: conflicts || [],
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
}

async function resolveConflicts(supabase: any, userId: string, resolutions: any[]) {
  try {
    for (const resolution of resolutions) {
      // Apply resolution to session data
      await supabase
        .from('user_sessions_enhanced')
        .update({
          session_state: resolution.resolved_state,
          sync_version: resolution.sync_version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('session_id', resolution.session_id);
      
      // Mark conflicts as resolved
      await supabase
        .from('session_conflicts')
        .update({
          status: 'resolved',
          resolution: resolution,
          resolved_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('session_id', resolution.session_id)
        .eq('status', 'pending');
    }
    
    await logSyncActivity(supabase, userId, 'conflicts_resolved', {
      resolved_count: resolutions.length
    });
    
    return new Response(JSON.stringify({
      success: true,
      resolved_conflicts: resolutions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Resolve conflicts error:', error);
    throw error;
  }
}

async function registerDevice(supabase: any, userId: string, deviceData: any) {
  try {
    const { error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: userId,
        device_id: deviceData.device_id,
        device_name: deviceData.device_name,
        device_type: deviceData.device_info.type,
        browser: deviceData.device_info.browser,
        os: deviceData.device_info.os,
        last_active: new Date().toISOString(),
        is_active: true
      });
    
    if (error) throw error;
    
    await logSyncActivity(supabase, userId, 'device_registered', {
      device_id: deviceData.device_id,
      device_type: deviceData.device_info.type
    });
    
    return new Response(JSON.stringify({
      success: true,
      device_registered: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Register device error:', error);
    throw error;
  }
}

async function getUserDevices(supabase: any, userId: string) {
  try {
    const { data: devices, error } = await supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_active', { ascending: false });
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      devices: devices || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Get devices error:', error);
    throw error;
  }
}

async function removeDevice(supabase: any, userId: string, deviceId: string) {
  try {
    // Mark device as inactive
    await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('device_id', deviceId);
    
    // Remove associated sessions
    await supabase
      .from('user_sessions_enhanced')
      .delete()
      .eq('user_id', userId)
      .eq('session_id', deviceId);
    
    await logSyncActivity(supabase, userId, 'device_removed', {
      device_id: deviceId
    });
    
    return new Response(JSON.stringify({
      success: true,
      device_removed: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Remove device error:', error);
    throw error;
  }
}

function detectConflicts(
  existingState: any, 
  newState: any, 
  existingTimestamp: string, 
  newTimestamp: string
): SyncConflict[] {
  const conflicts: SyncConflict[] = [];
  
  // Compare key fields for conflicts
  const fieldsToCheck = ['current_team_id', 'preferences', 'workspace_state'];
  
  for (const field of fieldsToCheck) {
    const existingValue = existingState[field];
    const newValue = newState[field];
    
    if (JSON.stringify(existingValue) !== JSON.stringify(newValue)) {
      conflicts.push({
        field,
        local_value: newValue,
        remote_value: existingValue,
        local_timestamp: newTimestamp,
        remote_timestamp: existingTimestamp
      });
    }
  }
  
  return conflicts;
}

async function logSyncActivity(supabase: any, userId: string, activityType: string, metadata: any) {
  try {
    await supabase
      .from('session_sync_logs')
      .insert({
        user_id: userId,
        activity_type: activityType,
        metadata: metadata,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log sync activity:', error);
  }
}

async function notifyDevicesOfSync(supabase: any, userId: string, excludeSessionId: string) {
  try {
    // In a real implementation, this would send real-time notifications
    // via WebSockets or push notifications to other devices
    await supabase
      .from('device_notifications')
      .insert({
        user_id: userId,
        notification_type: 'session_sync',
        message: 'Session data has been updated',
        exclude_session: excludeSessionId,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to notify devices:', error);
  }
}