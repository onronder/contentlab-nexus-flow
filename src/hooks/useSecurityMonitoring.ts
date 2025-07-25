import { useEffect, useCallback } from 'react';
import { useUser } from '@/contexts';
import { useSessionManager } from './useSessionManager';

/**
 * Hook for monitoring security events and suspicious activities
 */
export const useSecurityMonitoring = () => {
  const user = useUser();
  const isAuthenticated = !!user;
  const { logSecurityEvent } = useSessionManager();

  // Monitor for potential security threats
  const monitorSecurityEvents = useCallback(() => {
    if (!isAuthenticated || !user) return;

    // Monitor for rapid navigation (potential bot behavior)
    let navigationCount = 0;
    const resetNavigationCount = () => { navigationCount = 0; };
    
    const handleNavigation = () => {
      navigationCount++;
      if (navigationCount > 10) {
        logSecurityEvent('rapid_navigation', {
          navigation_count: navigationCount,
          user_agent: navigator.userAgent
        }, 'warning');
        navigationCount = 0;
      }
    };

    // Monitor for suspicious device changes
    const monitorDeviceFingerprint = () => {
      const fingerprint = {
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };

      const stored = localStorage.getItem('device_fingerprint');
      if (stored) {
        const storedFingerprint = JSON.parse(stored);
        const changes = Object.keys(fingerprint).filter(
          key => fingerprint[key as keyof typeof fingerprint] !== storedFingerprint[key]
        );

        if (changes.length > 2) {
          logSecurityEvent('device_fingerprint_change', {
            changed_properties: changes,
            new_fingerprint: fingerprint,
            old_fingerprint: storedFingerprint
          }, 'warning');
        }
      }
      
      localStorage.setItem('device_fingerprint', JSON.stringify(fingerprint));
    };

    // Monitor for unusual time patterns
    const monitorTimePatterns = () => {
      const hour = new Date().getHours();
      const lastActiveHours = JSON.parse(localStorage.getItem('active_hours') || '[]');
      
      if (!lastActiveHours.includes(hour)) {
        if (hour < 6 || hour > 22) {
          logSecurityEvent('unusual_access_time', {
            access_hour: hour,
            typical_hours: lastActiveHours
          }, 'info');
        }
        
        lastActiveHours.push(hour);
        if (lastActiveHours.length > 24) lastActiveHours.shift();
        localStorage.setItem('active_hours', JSON.stringify(lastActiveHours));
      }
    };

    // Monitor for console access (developer tools)
    const monitorConsoleAccess = () => {
      let devtools = { open: false, orientation: null };
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > 200 || 
            window.outerWidth - window.innerWidth > 200) {
          if (!devtools.open) {
            devtools.open = true;
            logSecurityEvent('developer_tools_opened', {
              window_dimensions: {
                outer: { width: window.outerWidth, height: window.outerHeight },
                inner: { width: window.innerWidth, height: window.innerHeight }
              }
            }, 'info');
          }
        } else {
          devtools.open = false;
        }
      }, 1000);
    };

    // Set up event listeners
    window.addEventListener('beforeunload', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    
    // Initial checks
    monitorDeviceFingerprint();
    monitorTimePatterns();
    monitorConsoleAccess();

    // Periodic checks
    const deviceInterval = setInterval(monitorDeviceFingerprint, 5 * 60 * 1000); // Every 5 minutes
    const timeInterval = setInterval(monitorTimePatterns, 60 * 60 * 1000); // Every hour
    const navigationInterval = setInterval(resetNavigationCount, 60 * 1000); // Reset every minute

    return () => {
      window.removeEventListener('beforeunload', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
      clearInterval(deviceInterval);
      clearInterval(timeInterval);
      clearInterval(navigationInterval);
    };
  }, [isAuthenticated, user, logSecurityEvent]);

  // Monitor for clipboard access (potential data theft)
  const monitorClipboardAccess = useCallback(() => {
    if (!isAuthenticated) return;

    const originalWriteText = navigator.clipboard?.writeText;
    const originalReadText = navigator.clipboard?.readText;

    if (navigator.clipboard && originalWriteText) {
      navigator.clipboard.writeText = function(text: string) {
        logSecurityEvent('clipboard_write', {
          text_length: text.length,
          contains_sensitive: /password|secret|key|token/i.test(text)
        }, text.length > 1000 ? 'warning' : 'info');
        
        return originalWriteText.call(this, text);
      };
    }

    if (navigator.clipboard && originalReadText) {
      navigator.clipboard.readText = function() {
        logSecurityEvent('clipboard_read', {
          timestamp: Date.now()
        }, 'info');
        
        return originalReadText.call(this);
      };
    }

    return () => {
      if (navigator.clipboard && originalWriteText) {
        navigator.clipboard.writeText = originalWriteText;
      }
      if (navigator.clipboard && originalReadText) {
        navigator.clipboard.readText = originalReadText;
      }
    };
  }, [isAuthenticated, logSecurityEvent]);

  useEffect(() => {
    const cleanupSecurity = monitorSecurityEvents();
    const cleanupClipboard = monitorClipboardAccess();

    return () => {
      cleanupSecurity?.();
      cleanupClipboard?.();
    };
  }, [monitorSecurityEvents, monitorClipboardAccess]);

  return {
    // Exposed functions for manual security logging
    logSecurityEvent,
  };
};