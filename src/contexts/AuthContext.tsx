import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to clear invalid session data
  const clearInvalidSession = () => {
    try {
      // Clear Supabase session data from localStorage
      localStorage.removeItem('sb-ijvhqqdfthchtittyvnt-auth-token');
      localStorage.removeItem('supabase.auth.token');
      // Clear any other auth-related localStorage items
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

  // Session validation function
  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session validation error:', error);
        // Clear invalid tokens on validation error
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          clearInvalidSession();
        }
        return false;
      }
      
      if (session) {
        console.log('Session validated successfully, expires at:', session.expires_at);
        return true;
      }
      
      console.warn('No active session found during validation');
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      clearInvalidSession();
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Setup auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session);
        console.log('JWT token present:', !!session?.access_token);
        
        // Handle refresh token errors by clearing session
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing stored session');
          clearInvalidSession();
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
          // If it's a refresh token error, clear the invalid session
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token')) {
            console.warn('Invalid refresh token detected, clearing session');
            clearInvalidSession();
          }
        } else {
          console.log('Initial session loaded:', !!session);
          console.log('JWT token present:', !!session?.access_token);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);
        // Clear session on any authentication error
        clearInvalidSession();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    validateSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export individual hooks for compatibility
export const useUser = () => {
  const { user } = useAuth();
  return user;
};

export const useSession = () => {
  const { session } = useAuth();
  return session;
};

export const useSupabaseClient = () => {
  return supabase;
};