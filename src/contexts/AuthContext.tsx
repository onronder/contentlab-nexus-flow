import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, AuthState, UserProfile, AuthErrorType, AuthEvent } from './types';

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Core authentication state
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Helper function to map Supabase errors to user-friendly messages
  const mapAuthError = useCallback((error: AuthError | Error | null): string | null => {
    if (!error) return null;

    const message = error.message.toLowerCase();
    
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return AuthErrorType.INVALID_CREDENTIALS;
    }
    if (message.includes('user not found')) {
      return AuthErrorType.USER_NOT_FOUND;
    }
    if (message.includes('user already registered') || message.includes('email already exists')) {
      return AuthErrorType.EMAIL_ALREADY_EXISTS;
    }
    if (message.includes('password') && message.includes('weak')) {
      return AuthErrorType.WEAK_PASSWORD;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return AuthErrorType.NETWORK_ERROR;
    }
    if (message.includes('expired') || message.includes('token')) {
      return AuthErrorType.SESSION_EXPIRED;
    }
    
    return error.message || AuthErrorType.UNKNOWN_ERROR;
  }, []);

  // Fetch user profile from the database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Profile fetch error:', error);
      return null;
    }
  }, []);

  // Update authentication state
  const updateAuthState = useCallback(async (user: User | null, session: Session | null) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    if (user && session) {
      try {
        // Inline profile fetching to avoid dependency loop
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        }

        setAuthState({
          user: { ...user, profile: profile || undefined },
          session,
          profile: profile || null,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } catch (error) {
        console.error('Profile fetch error:', error);
        setAuthState({
          user: { ...user, profile: undefined },
          session,
          profile: null,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      }
    } else {
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, []);

  // Sign up new user
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: fullName ? { full_name: fullName } : undefined,
        },
      });

      if (error) {
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [mapAuthError]);

  // Sign in existing user
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [mapAuthError]);

  // Sign out user
  const signOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase.auth.signOut();

      if (error) {
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [mapAuthError]);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));

      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, error: errorMessage }));
        return { error: errorMessage };
      }

      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [mapAuthError]);

  // Update user profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      if (!authState.user) {
        return { error: 'User not authenticated' };
      }

      setAuthState(prev => ({ ...prev, error: null }));

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id);

      if (error) {
        const errorMessage = AuthErrorType.PROFILE_UPDATE_FAILED;
        setAuthState(prev => ({ ...prev, error: errorMessage }));
        return { error: errorMessage };
      }

      // Refresh profile data
      await refreshProfile();
      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [authState.user, mapAuthError]);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    try {
      if (!authState.user) {
        return { error: 'User not authenticated' };
      }

      const profile = await fetchProfile(authState.user.id);
      
      setAuthState(prev => ({
        ...prev,
        profile,
        user: prev.user ? { ...prev.user, profile: profile || undefined } : null,
      }));

      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      return { error: errorMessage };
    }
  }, [authState.user, fetchProfile, mapAuthError]);

  // Initialize authentication and set up listeners
  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              await updateAuthState(session.user, session);
            }
            break;
          case 'SIGNED_OUT':
            await updateAuthState(null, null);
            break;
          default:
            break;
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session retrieval error:', error);
          if (mounted) {
            setAuthState(prev => ({ 
              ...prev, 
              isLoading: false, 
              error: mapAuthError(error) 
            }));
          }
          return;
        }

        if (mounted) {
          await updateAuthState(session?.user || null, session);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setAuthState(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: mapAuthError(error as Error) 
          }));
        }
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  }), [
    authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use authentication context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export context for advanced usage
export { AuthContext };