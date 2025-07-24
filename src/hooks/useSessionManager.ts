import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type UserSession = Tables<'user_sessions'>;
type SecurityEventRow = Tables<'security_events'>;

export interface SessionInfo extends Omit<UserSession, 'device_info' | 'location_info' | 'security_flags'> {
  device_info: {
    type?: string;
    os?: string;
    browser?: string;
  };
  location_info: {
    city?: string;
    country?: string;
    timezone?: string;
  };
  security_flags: {
    suspicious?: boolean;
    new_location?: boolean;
    concurrent_sessions?: number;
  };
}

export interface SecurityEvent extends Omit<SecurityEventRow, 'event_data' | 'severity'> {
  event_data: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

export const useSessionManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Parse user agent for device information
  const parseUserAgent = useCallback((userAgent: string) => {
    const deviceInfo = {
      type: 'Unknown',
      os: 'Unknown',
      browser: 'Unknown'
    };

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceInfo.type = 'Mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      deviceInfo.type = 'Tablet';
    } else {
      deviceInfo.type = 'Desktop';
    }

    // Detect OS
    if (/Windows/.test(userAgent)) deviceInfo.os = 'Windows';
    else if (/Mac OS/.test(userAgent)) deviceInfo.os = 'macOS';
    else if (/Linux/.test(userAgent)) deviceInfo.os = 'Linux';
    else if (/Android/.test(userAgent)) deviceInfo.os = 'Android';
    else if (/iPhone|iPad/.test(userAgent)) deviceInfo.os = 'iOS';

    // Detect browser
    if (/Chrome/.test(userAgent)) deviceInfo.browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) deviceInfo.browser = 'Firefox';
    else if (/Safari/.test(userAgent)) deviceInfo.browser = 'Safari';
    else if (/Edge/.test(userAgent)) deviceInfo.browser = 'Edge';

    return deviceInfo;
  }, []);

  // Create or update current session
  const createSession = useCallback(async () => {
    if (!user) return;

    try {
      const userAgent = navigator.userAgent;
      const deviceInfo = parseUserAgent(userAgent);
      
      // Get current session token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_token', session.access_token)
        .single();

      if (existingSession) {
        setCurrentSessionId(existingSession.id);
        return;
      }

      // Create new session record
      const { data: newSession, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: session.access_token,
          device_info: deviceInfo,
          user_agent: userAgent,
          is_current: true,
          expires_at: new Date(session.expires_at! * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSessionId(newSession.id);

      // Log security event
      await logSecurityEvent('session_created', {
        device_info: deviceInfo,
        session_id: newSession.id
      });

    } catch (error) {
      console.error('Error creating session:', error);
    }
  }, [user, parseUserAgent]);

  // Fetch user sessions
  const fetchSessions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      setSessions((data || []).map(session => ({
        ...session,
        device_info: session.device_info as any || {},
        location_info: session.location_info as any || {},
        security_flags: session.security_flags as any || {}
      })));
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load session information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Fetch security events
  const fetchSecurityEvents = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setSecurityEvents((data || []).map(event => ({
        ...event,
        event_data: event.event_data as any || {},
        severity: (event.severity as 'info' | 'warning' | 'critical') || 'info'
      })));
    } catch (error) {
      console.error('Error fetching security events:', error);
    }
  }, [user]);

  // Terminate a specific session
  const terminateSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Log security event
      await logSecurityEvent('session_terminated', {
        terminated_session_id: sessionId
      });

      toast({
        title: "Success",
        description: "Session terminated successfully"
      });

      // Refresh sessions list
      fetchSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        title: "Error",
        description: "Failed to terminate session",
        variant: "destructive"
      });
    }
  }, [user, toast, fetchSessions]);

  // Terminate all other sessions
  const terminateAllOtherSessions = useCallback(async () => {
    if (!user || !currentSessionId) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('id', currentSessionId);

      if (error) throw error;

      // Log security event
      await logSecurityEvent('all_sessions_terminated', {
        kept_session_id: currentSessionId
      });

      toast({
        title: "Success",
        description: "All other sessions terminated successfully"
      });

      // Refresh sessions list
      fetchSessions();
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast({
        title: "Error",
        description: "Failed to terminate sessions",
        variant: "destructive"
      });
    }
  }, [user, currentSessionId, toast, fetchSessions]);

  // Log security event with enhanced tracking
  const logSecurityEvent = useCallback(async (
    eventType: string, 
    eventData: Record<string, any> = {},
    severity: 'info' | 'warning' | 'critical' = 'info'
  ) => {
    if (!user) return;

    try {
      // Get additional security context
      const securityContext: Record<string, any> = {
        ...eventData,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        session_id: currentSessionId,
      };

      // Detect suspicious patterns
      if (eventType === 'login_failed') {
        securityContext.consecutive_failures = true;
        severity = 'warning';
      }
      
      if (eventType === 'session_created') {
        // Check for concurrent sessions
        const activeSessions = sessions.filter(s => s.id !== currentSessionId);
        if (activeSessions.length > 2) {
          securityContext.multiple_sessions = true;
          severity = 'warning';
        }
      }

      await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          event_data: securityContext,
          user_agent: navigator.userAgent,
          severity,
          session_id: currentSessionId
        });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }, [user, currentSessionId, sessions]);

  // Update session activity
  const updateSessionActivity = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('id', currentSessionId);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }, [currentSessionId]);

  // Set up session monitoring
  useEffect(() => {
    if (user) {
      createSession();
      fetchSessions();
      fetchSecurityEvents();
    }
  }, [user, createSession, fetchSessions, fetchSecurityEvents]);

  // Set up activity monitoring
  useEffect(() => {
    if (!currentSessionId) return;

    // Update activity every 5 minutes
    const activityInterval = setInterval(updateSessionActivity, 5 * 60 * 1000);

    // Update activity on user interaction
    const handleActivity = () => updateSessionActivity();
    
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [currentSessionId, updateSessionActivity]);

  return {
    sessions,
    securityEvents,
    isLoading,
    currentSessionId,
    terminateSession,
    terminateAllOtherSessions,
    logSecurityEvent,
    refreshSessions: fetchSessions,
    refreshSecurityEvents: fetchSecurityEvents
  };
};