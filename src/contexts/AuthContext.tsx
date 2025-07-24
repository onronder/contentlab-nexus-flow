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

  // Session timeout state - increased duration for better UX
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const SESSION_TIMEOUT_DURATION = 4 * 60 * 60 * 1000; // 4 hours

  // Failed login attempts tracking
  const [failedAttempts, setFailedAttempts] = useState<Map<string, { count: number; lastAttempt: number }>>(new Map());

  // Enhanced password validation
  const validatePassword = useCallback((password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
    if (/(.)\1{2,}/.test(password)) errors.push('Password cannot contain more than 2 consecutive identical characters');
    
    // Check against common passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password contains common words and is not secure');
    }
    
    return { isValid: errors.length === 0, errors };
  }, []);

  // Check for account lockout
  const isAccountLocked = useCallback((email: string): boolean => {
    const attempts = failedAttempts.get(email);
    if (!attempts) return false;
    
    const now = Date.now();
    const lockoutDuration = 15 * 60 * 1000; // 15 minutes lockout
    
    return attempts.count >= 5 && (now - attempts.lastAttempt) < lockoutDuration;
  }, [failedAttempts]);

  // Record failed login attempt
  const recordFailedAttempt = useCallback((email: string) => {
    const now = Date.now();
    const current = failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
    
    // Reset count if last attempt was more than 1 hour ago
    if (now - current.lastAttempt > 60 * 60 * 1000) {
      current.count = 0;
    }
    
    current.count += 1;
    current.lastAttempt = now;
    
    setFailedAttempts(new Map(failedAttempts.set(email, current)));
  }, [failedAttempts]);

  // Clear failed attempts on successful login
  const clearFailedAttempts = useCallback((email: string) => {
    const newMap = new Map(failedAttempts);
    newMap.delete(email);
    setFailedAttempts(newMap);
  }, [failedAttempts]);

  // Setup session timeout
  const setupSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
    
    const timeout = setTimeout(async () => {
      // Clear session timeout first to avoid recursion
      setSessionTimeout(null);
      
      // Sign out manually to avoid circular dependency
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Session timeout signout error:', error);
        }
      } catch (error) {
        console.error('Session timeout signout error:', error);
      }
    }, SESSION_TIMEOUT_DURATION);
    
    setSessionTimeout(timeout);
  }, [sessionTimeout, SESSION_TIMEOUT_DURATION]);

  // Reset session timeout on activity
  const resetSessionTimeout = useCallback(() => {
    if (authState.isAuthenticated) {
      setupSessionTimeout();
    }
  }, [authState.isAuthenticated, setupSessionTimeout]);

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

  // Update authentication state - simplified to prevent blocking
  const updateAuthState = useCallback(async (user: User | null, session: Session | null) => {
    console.log('updateAuthState called:', { user: user?.id, session: !!session });
    
    if (user && session) {
      // Set authenticated state immediately, fetch profile in background
      setAuthState({
        user: { ...user, profile: undefined },
        session,
        profile: null,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
      
      // Fetch profile in background without blocking authentication
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

      // Enhanced password validation
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

  // Sign in existing user
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check for account lockout
      if (isAccountLocked(email)) {
        const errorMessage = 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.';
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed attempt
        recordFailedAttempt(email);
        
        const errorMessage = mapAuthError(error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        return { error: errorMessage };
      }

      // Clear failed attempts on successful login
      clearFailedAttempts(email);
      
      // Setup session timeout
      setupSessionTimeout();

      return { error: null };
    } catch (error) {
      recordFailedAttempt(email);
      const errorMessage = mapAuthError(error as Error);
      setAuthState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { error: errorMessage };
    }
  }, [mapAuthError, isAccountLocked, recordFailedAttempt, clearFailedAttempts, setupSessionTimeout]);

  // Sign out user
  const signOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Clear session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

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
  }, [mapAuthError, sessionTimeout]);

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

  // Initialize authentication and set up listeners - simplified
  useEffect(() => {
    console.log('AuthProvider: Initializing authentication');
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, { session: !!session });
      
      // Handle different auth events
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        updateAuthState(session?.user || null, session || null);
        if (session) {
          setupSessionTimeout();
        }
      } else if (event === 'SIGNED_OUT') {
        updateAuthState(null, null);
        if (sessionTimeout) {
          clearTimeout(sessionTimeout);
          setSessionTimeout(null);
        }
      }
    });

    // Then check for existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setAuthState(prev => ({ ...prev, isLoading: false, error: mapAuthError(error) }));
          return;
        }
        
        console.log('Initial session check:', { session: !!session });
        updateAuthState(session?.user || null, session || null);
        
        if (session) {
          setupSessionTimeout();
        }
      } catch (error) {
        console.error('Session check error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false, error: 'Failed to check authentication' }));
      }
    };
    
    // Small delay to ensure listener is ready
    setTimeout(checkSession, 100);

    // Cleanup
    return () => {
      console.log('AuthProvider: Cleaning up');
      subscription.unsubscribe();
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
    };
  }, []);

  // Set up activity listeners for session timeout reset
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const handleActivity = () => resetSessionTimeout();
    
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [authState.isAuthenticated, resetSessionTimeout]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
    validatePassword,
  }), [
    authState,
    signUp,
    signIn,
    signOut,
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