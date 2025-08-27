import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { devLog, devWarn, logError } from '@/utils/productionUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
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
      devLog('Cleared invalid session data from localStorage');
    } catch (error) {
      logError(error as Error, 'AuthContext.clearInvalidSession');
    }
  };

  // Session validation function
  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        logError(error, 'AuthContext.validateSession');
        // Clear invalid tokens on validation error
        if (error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token')) {
          clearInvalidSession();
        }
        return false;
      }
      
      if (session) {
        devLog('Session validated successfully, expires at:', session.expires_at);
        return true;
      }
      
      devWarn('No active session found during validation');
      return false;
    } catch (error) {
      logError(error as Error, 'AuthContext.validateSession');
      clearInvalidSession();
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Setup auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        console.log('Auth state changed:', event, !!session);
        
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

    const getInitialSession = async () => {
      try {
        // First validate and refresh session if needed
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (error) {
            console.error('Error getting session:', error);
            // Clear invalid session data on specific errors
            if (error.message?.includes('refresh_token_not_found') || 
                error.message?.includes('Invalid Refresh Token')) {
              clearInvalidSession();
            }
          } else if (session) {
            setSession(session);
            setUser(session.user);
          } else {
            // No session found
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);
        if (isMounted) {
          clearInvalidSession();
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      isMounted = false;
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