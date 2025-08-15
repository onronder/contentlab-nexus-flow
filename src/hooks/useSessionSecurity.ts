import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface SessionSecurityConfig {
  timeoutMinutes?: number;
  warningMinutes?: number;
  checkIntervalSeconds?: number;
}

/**
 * Enhanced session security hook with timeout enforcement
 */
export const useSessionSecurity = (config: SessionSecurityConfig = {}) => {
  const {
    timeoutMinutes = 30,
    warningMinutes = 5,
    checkIntervalSeconds = 60
  } = config;

  const { user, logout } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const timeoutIdRef = useRef<NodeJS.Timeout>();

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Check session validity
  const checkSession = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    // Show warning before timeout
    if (timeSinceActivity >= warningMs && !warningShownRef.current) {
      warningShownRef.current = true;
      toast({
        title: 'Session Warning',
        description: `Your session will expire in ${warningMinutes} minutes due to inactivity.`,
        variant: 'destructive',
      });
    }

    // Logout if session expired
    if (timeSinceActivity >= timeoutMs) {
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity.',
        variant: 'destructive',
      });
      logout();
    }
  }, [user, timeoutMinutes, warningMinutes, logout]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Set up periodic session check
    const intervalId = setInterval(checkSession, checkIntervalSeconds * 1000);

    return () => {
      // Clean up event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      clearInterval(intervalId);
    };
  }, [user, updateActivity, checkSession, checkIntervalSeconds]);

  // Force logout function
  const forceLogout = useCallback(() => {
    toast({
      title: 'Security Logout',
      description: 'Session terminated for security reasons.',
      variant: 'destructive',
    });
    logout();
  }, [logout]);

  // Extend session function
  const extendSession = useCallback(() => {
    updateActivity();
    toast({
      title: 'Session Extended',
      description: 'Your session has been extended.',
    });
  }, [updateActivity]);

  return {
    forceLogout,
    extendSession,
    timeRemaining: Math.max(0, (timeoutMinutes * 60 * 1000) - (Date.now() - lastActivityRef.current))
  };
};