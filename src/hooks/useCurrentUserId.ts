import { useUser } from '@/contexts';

export function useCurrentUserId() {
  const user = useUser();
  return user?.id || null;
}