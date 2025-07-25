// This file is automatically generated. Do not edit it directly.
import { createClient, Session } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ijvhqqdfthchtittyvnt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmhxcWRmdGhjaHRpdHR5dm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTE4OTMsImV4cCI6MjA2ODc2Nzg5M30.wxyInat54wVrwFQvbk61Hf7beu84TnhrBg0Bkpmo6fA";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: {
      'x-client-info': 'lovable-app'
    }
  }
});

/**
 * Ensures the current session is properly set on the Supabase client
 * Returns true if session is valid and set, false otherwise
 */
export const ensureAuthenticatedSession = async (session: any): Promise<boolean> => {
  if (!session?.access_token) {
    console.error('No valid session provided');
    return false;
  }

  try {
    // Set the session on the existing client
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
    
    console.log('Session set successfully on client');
    return true;
  } catch (error) {
    console.error('Failed to set session on client:', error);
    return false;
  }
};

// Utility function to set session token on the main client (kept for compatibility)
export const setSupabaseSession = async (session: any) => {
  if (!session?.access_token) {
    console.warn('No session token provided');
    return supabase;
  }

  try {
    console.log('Setting session on Supabase client...');
    
    // Set the session on the existing client instance
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
    
    if (error) {
      console.error('Error setting session on client:', error);
      throw error;
    }
    
    console.log('Session set successfully, user:', data.user?.id);
    
    return supabase;
  } catch (error) {
    console.error('Failed to set session:', error);
    throw error;
  }
};

// Function to clear invalid session data from localStorage
const clearInvalidSessionData = () => {
  try {
    localStorage.removeItem('sb-ijvhqqdfthchtittyvnt-auth-token');
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cleared invalid session data from localStorage');
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
};

// Validate session and refresh if needed
export const validateAndRefreshSession = async (): Promise<Session | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session validation error:', error);
      // Clear invalid tokens on specific errors
      if (error.message?.includes('refresh_token_not_found') || 
          error.message?.includes('Invalid Refresh Token')) {
        console.warn('Invalid refresh token detected, clearing session data');
        clearInvalidSessionData();
      }
      return null;
    }

    if (!session) {
      console.warn('No active session found');
      return null;
    }

    // Check if session is expired or about to expire (within 5 minutes)
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      console.log('Session expired or expiring soon, refreshing...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        // Clear invalid tokens on refresh failure
        if (refreshError.message?.includes('refresh_token_not_found') || 
            refreshError.message?.includes('Invalid Refresh Token')) {
          clearInvalidSessionData();
        }
        return null;
      }

      return refreshData.session;
    }

    return session;
  } catch (error) {
    console.error('Session validation failed:', error);
    clearInvalidSessionData();
    return null;
  }
};