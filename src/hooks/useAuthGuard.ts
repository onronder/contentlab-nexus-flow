import { useUser } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface UseAuthGuardOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { requireAuth = true, redirectTo = '/login' } = options;
  const user = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (requireAuth && !user) {
      navigate(redirectTo);
    }
  }, [user, requireAuth, redirectTo, navigate]);

  return {
    shouldRender: requireAuth ? !!user : true,
    isAuthenticated: !!user,
  };
}