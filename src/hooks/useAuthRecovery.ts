import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, validateAndRefreshSession } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for handling authentication recovery and session validation
 */
export function useAuthRecovery() {
  const queryClient = useQueryClient();

  const clearAuthState = useCallback(() => {
    // Clear all cached queries
    queryClient.clear();
    
    // Clear localStorage auth data
    const projectId = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectId) {
      localStorage.removeItem(`sb-${projectId}-auth-token`);
    }
    localStorage.removeItem('supabase.auth.token');
    
    // Clear other auth-related storage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
  }, [queryClient]);

  const recoverSession = useCallback(async () => {
    try {
      const validSession = await validateAndRefreshSession();
      
      if (validSession) {
        // Session recovered successfully
        queryClient.invalidateQueries();
        toast({
          title: "Session Restored",
          description: "Your session has been refreshed successfully.",
        });
        return true;
      } else {
        // Session cannot be recovered
        clearAuthState();
        toast({
          variant: "destructive",
          title: "Session Expired",
          description: "Please sign in again to continue.",
        });
        return false;
      }
    } catch (error) {
      clearAuthState();
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "Please sign in again to continue.",
      });
      return false;
    }
  }, [queryClient, clearAuthState]);

  const handleAuthError = useCallback(async (error: any) => {
    // Check if error is auth-related
    if (
      error?.message?.includes('JWT') ||
      error?.message?.includes('token') ||
      error?.message?.includes('Unauthorized') ||
      error?.status === 401
    ) {
      return await recoverSession();
    }
    return false;
  }, [recoverSession]);

  return {
    clearAuthState,
    recoverSession,
    handleAuthError,
  };
}