import { useState, useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

export function useAuthOperations() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useSupabaseClient();

  const updateUserProfile = useCallback(async (profileData: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        toast.error('Failed to update profile');
        return { error: error.message };
      }

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error) {
      toast.error('Failed to update profile');
      return { error: 'Failed to update profile' };
    } finally {
      setIsSubmitting(false);
    }
  }, [supabase]);

  return {
    updateUserProfile,
    isSubmitting,
  };
}