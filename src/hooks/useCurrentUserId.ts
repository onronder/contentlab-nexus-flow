import { useUser } from '@/contexts';

export function useCurrentUserId(): string | null {
  const user = useUser();
  
  // Ensure we return null if user is undefined or if id is missing
  if (!user || !user.id) {
    return null;
  }
  
  return user.id;
}