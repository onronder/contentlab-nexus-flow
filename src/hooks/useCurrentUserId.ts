import { useUser } from '@supabase/auth-helpers-react';

export function useCurrentUserId() {
  const user = useUser();
  return user?.id || null;
}