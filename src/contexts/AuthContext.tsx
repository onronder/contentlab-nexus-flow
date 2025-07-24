// Cache bust fix for resetSessionTimeout error - v2024.01.24
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

  // Simplified state - remove complex session timeout and failed attempts tracking

  // Basic password validation - simplified
  const validatePassword = useCallback((password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    
    return { isValid: errors.length === 0, errors };
  }, []);

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

  // Update authentication state - simplified and synchronous only
  const updateAuthState = useCallback((user: User | null, session: Session | null) => {
    console.log('updateAuthState called:', { user: user?.id, session: !!session });
    
    if (user && session) {
      setAuthState({
        user: { ...user, profile: undefined },
        session,
        profile: null,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      
      // Fetch profile separately with setTimeout to avoid blocking
      setTimeout(() => {
        fetchProfile(user.id)
          .then(profile => {
            setAuthState(prev => ({
              ...prev,
              user: { ...user, profile: profile || undefined },
              profile: profile || null,
            }));
          })
          .catch(error => {
            console.error('Profile fetch error:', error);
          });
      }, 0);
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
  }, [fetchProfile]);

  // Sign up new user - simplified
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const errorMessage = passwordValidation.errors.join('. ');
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

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
  }, [mapAuthError, validatePassword]);

  // Sign in existing user - simplified
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

  // Sign out user - simplified
  const signOut = useCallback(async () => {
    try {
      console.log('AuthProvider: Signing out user');
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      // Force complete auth state reset
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      console.log('AuthProvider: Sign out completed successfully');
      return { error: null };
    } catch (error) {
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [mapAuthError]);

  // Sign out from all devices - simplified
  const signOutFromAllDevices = useCallback(async () => {
    try {
      console.log('AuthProvider: Signing out from all devices');
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // This signs out from all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      // Force complete cleanup same as regular signOut
      setAuthState({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });

      console.log('AuthProvider: Global sign out completed successfully');
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

  // Initialize authentication and set up listeners - simplified and fixed
  useEffect(() => {
    console.log('AuthProvider: Initializing authentication');
    
    let mounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, { 
        session: !!session, 
        accessToken: !!session?.access_token,
        userId: session?.user?.id 
      });
      
      if (!mounted) return;
      
      // Handle auth events and ensure proper session state
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token && session?.user) {
          console.log('Valid session found, updating auth state');
          updateAuthState(session.user, session);
        } else {
          console.log('Invalid session, clearing auth state');
          updateAuthState(null, null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing auth state');
        updateAuthState(null, null);
      }
    });

    // Then check for existing session
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setAuthState(prev => ({ ...prev, isLoading: false, error: mapAuthError(error) }));
          }
          return;
        }
        
        console.log('Initial session check:', { 
          session: !!session, 
          accessToken: !!session?.access_token,
          userId: session?.user?.id 
        });
        
        if (mounted) {
          if (session?.access_token && session?.user) {
            updateAuthState(session.user, session);
          } else {
            updateAuthState(null, null);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, isLoading: false, error: mapAuthError(error as Error) }));
        }
      }
    };

    checkInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [updateAuthState, mapAuthError]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...authState,
    signUp,
    signIn,
    signOut,
    signOutFromAllDevices,
    resetPassword,
    updateProfile,
    refreshProfile,
    validatePassword,
  }), [
    authState,
    signUp,
    signIn,
    signOut,
    signOutFromAllDevices,
    resetPassword,
    updateProfile,
    refreshProfile,
    validatePassword,
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