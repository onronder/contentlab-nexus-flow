import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

export function useTeamPersistence() {
  const retryAttempts = useRef<{ [key: string]: number }>({});
  const circuitBreaker = useRef<CircuitBreakerState>({
    failures: 0,
    lastFailureTime: 0,
    state: 'closed'
  });
  
  const maxRetries = 2; // Reduced from 3
  const retryDelay = 1000;
  const circuitBreakerTimeout = 30000; // 30 seconds
  const maxFailures = 3;

  const checkCircuitBreaker = useCallback(() => {
    const now = Date.now();
    const breaker = circuitBreaker.current;
    
    // Reset circuit breaker after timeout
    if (breaker.state === 'open' && now - breaker.lastFailureTime > circuitBreakerTimeout) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }
    
    return breaker.state !== 'open';
  }, [circuitBreakerTimeout]);

  const recordFailure = useCallback(() => {
    const breaker = circuitBreaker.current;
    breaker.failures += 1;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failures >= maxFailures) {
      breaker.state = 'open';
      console.warn('Circuit breaker opened - team persistence temporarily disabled');
    }
  }, [maxFailures]);

  const recordSuccess = useCallback(() => {
    circuitBreaker.current.failures = 0;
    circuitBreaker.current.state = 'closed';
  }, []);

  const updateLastTeam = useCallback(async (teamId: string) => {
    // Always update localStorage first (primary storage)
    try {
      localStorage.setItem('currentTeamId', teamId);
    } catch (error) {
      console.warn('Failed to update localStorage:', error);
      // Continue with server sync attempt
    }
    
    // Check circuit breaker before attempting server sync
    if (!checkCircuitBreaker()) {
      console.warn('Circuit breaker is open - skipping server sync');
      return;
    }
    
    // Try to sync with server (non-blocking with circuit breaker)
    const retryKey = `update_${teamId}`;
    const currentRetries = retryAttempts.current[retryKey] || 0;
    
    try {
      const { error } = await supabase.rpc('update_user_app_preferences', {
        p_preferences: { currentTeamId: teamId }
      });
      
      if (error) {
        recordFailure();
        console.warn('Server sync failed for team preference:', error.message);
        
        // Only retry if we haven't exceeded max retries and circuit is closed
        if (currentRetries < maxRetries && circuitBreaker.current.state === 'closed') {
          retryAttempts.current[retryKey] = currentRetries + 1;
          const delay = retryDelay * Math.pow(2, currentRetries);
          
          setTimeout(() => {
            updateLastTeam(teamId);
          }, delay);
        } else {
          delete retryAttempts.current[retryKey];
          if (currentRetries >= maxRetries) {
            console.warn(`Max retries exceeded for team preference sync: ${teamId}`);
          }
        }
      } else {
        // Success - reset everything
        recordSuccess();
        delete retryAttempts.current[retryKey];
      }
    } catch (error: any) {
      recordFailure();
      console.warn('Server sync unavailable for team preference:', error);
      delete retryAttempts.current[retryKey];
      
      // Don't show toast for auth errors to prevent cascade failures
      if (!error?.message?.includes('JWT') && !error?.message?.includes('auth')) {
        console.warn('Network or server error during team sync - working offline');
      }
    }
  }, [checkCircuitBreaker, recordFailure, recordSuccess, maxRetries, retryDelay]);

  const getLastTeam = useCallback(async () => {
    // Try localStorage first (faster and more reliable)
    const localTeamId = localStorage.getItem('currentTeamId');
    
    // Only try server sync if circuit breaker allows it
    if (!checkCircuitBreaker()) {
      console.warn('Circuit breaker is open - using local team preference only');
      return localTeamId;
    }
    
    // Try to get from server for cross-device sync (non-blocking)
    try {
      const { data, error } = await supabase.rpc('get_user_app_preferences');
      
      if (!error && data && typeof data === 'object' && !Array.isArray(data)) {
        const preferences = data as any;
        const serverTeamId = preferences.currentTeamId;
        
        // If server has a different team, prefer server value but update localStorage
        if (serverTeamId && serverTeamId !== localTeamId) {
          try {
            localStorage.setItem('currentTeamId', serverTeamId);
            recordSuccess(); // Server sync worked
            return serverTeamId;
          } catch (storageError) {
            console.warn('Failed to update localStorage with server team preference');
            return serverTeamId; // Return server value even if localStorage failed
          }
        }
        recordSuccess(); // Server sync worked
      } else if (error) {
        recordFailure();
        console.warn('Server sync failed for team preference:', error.message);
      }
    } catch (error: any) {
      recordFailure();
      console.warn('Server sync unavailable for team preference:', error);
      // Don't show error for auth issues to prevent cascade failures
    }
    
    return localTeamId;
  }, [checkCircuitBreaker, recordSuccess, recordFailure]);

  const clearLastTeam = useCallback(async () => {
    // Always clear localStorage first (primary storage)
    try {
      localStorage.removeItem('currentTeamId');
    } catch (error) {
      console.warn('Failed to clear localStorage team preference:', error);
    }
    
    // Only try server sync if circuit breaker allows it
    if (!checkCircuitBreaker()) {
      console.warn('Circuit breaker is open - skipping server clear');
      return;
    }
    
    // Try to sync with server (non-blocking)
    try {
      const { error } = await supabase.rpc('update_user_app_preferences', {
        p_preferences: { currentTeamId: null }
      });
      
      if (error) {
        recordFailure();
        console.warn('Server sync failed for clearing team preference:', error.message);
      } else {
        recordSuccess();
      }
    } catch (error: any) {
      recordFailure();
      console.warn('Server sync unavailable for clearing team preference:', error);
      // Don't throw or block - localStorage clear is sufficient
    }
  }, [checkCircuitBreaker, recordSuccess, recordFailure]);

  return {
    updateLastTeam,
    getLastTeam,
    clearLastTeam
  };
}