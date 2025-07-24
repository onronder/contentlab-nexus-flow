import { useUser, useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function useAuth() {
  const user = useUser();
  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error: error.message };
    }

    toast.success('Successfully signed in!');
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
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
      toast.error(error.message);
      return { error: error.message };
    }

    toast.success('Check your email to confirm your account!');
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error('Error signing out');
      return { error: error.message };
    }

    toast.success('Successfully signed out!');
    navigate('/');
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast.error(error.message);
      return { error: error.message };
    }

    toast.success('Check your email for password reset instructions!');
    return { error: null };
  };

  return {
    user,
    session,
    isAuthenticated: !!user,
    isLoading: user === undefined,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}