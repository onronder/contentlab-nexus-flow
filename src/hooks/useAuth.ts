import { useUser, useSession, useSupabaseClient } from '@/contexts';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useAuth() {
  const user = useUser();
  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();

  // Fetch user profile
  const { data: profile, refetch: refreshProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const signIn = async (email: string, password: string) => {
    console.log('useAuth.signIn called with email:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Supabase signInWithPassword result:', { error });

    if (error) {
      console.error('Login error in useAuth:', error);
      toast.error(error.message);
      return { error: error.message };
    }

    console.log('Login successful in useAuth');
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
  navigate('/login');
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
    profile,
    isAuthenticated: !!user,
    isLoading: user === undefined,
    loading: user === undefined, // Add loading for compatibility
    error: null, // Add error state for compatibility
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  };
}