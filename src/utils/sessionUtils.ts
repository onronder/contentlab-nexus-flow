import { supabase } from '@/integrations/supabase/client';

/**
 * Validates the current session and refreshes it if needed
 * @returns Promise<string> - The validated user ID
 * @throws Error if session is invalid or refresh fails
 */
export async function validateAndRefreshSession(): Promise<string> {
  // Check current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new Error(`Session validation failed: ${sessionError.message}`);
  }
  
  if (!session?.user?.id) {
    throw new Error('No valid session found. Please log in again.');
  }
  
  // Check if session is close to expiring (within 5 minutes)
  const expiresAt = session.expires_at;
  if (expiresAt && (expiresAt * 1000 - Date.now()) < 300000) {
    try {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError.message);
        // Continue with current session if refresh fails but session is still valid
        if (session.expires_at && (session.expires_at * 1000 > Date.now())) {
          return session.user.id;
        }
        throw new Error('Session expired and refresh failed. Please log in again.');
      }
      
      if (refreshedSession?.user?.id) {
        return refreshedSession.user.id;
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      // If refresh fails but current session is still valid, use it
      if (session.expires_at && (session.expires_at * 1000 > Date.now())) {
        return session.user.id;
      }
      throw new Error('Session refresh failed. Please log in again.');
    }
  }
  
  return session.user.id;
}

/**
 * Checks if the current session is valid and not expired
 * @returns Promise<boolean>
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user?.id) {
      return false;
    }
    
    // Check if session is expired
    if (session.expires_at && (session.expires_at * 1000 <= Date.now())) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Forces a session refresh
 * @returns Promise<boolean> - true if refresh was successful
 */
export async function forceSessionRefresh(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session?.user?.id) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Force session refresh error:', error);
    return false;
  }
}