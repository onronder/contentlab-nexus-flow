import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from './useCurrentUserId';
import { useToast } from './use-toast';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    weekly: boolean;
    mentions: boolean;
  };
  preferences: {
    timezone: string;
    language: string;
    theme: string;
  };
}

const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

const fetchUserSettings = async (userId: string): Promise<UserSettings> => {
  // For now, return default settings as we don't have a settings table yet
  // This can be extended to use a user_settings table
  return {
    notifications: {
      email: true,
      push: false,
      weekly: true,
      mentions: true
    },
    preferences: {
      timezone: 'UTC',
      language: 'en',
      theme: 'system'
    }
  };
};

const updateUserProfile = async (userId: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      bio: updates.bio,
      phone: updates.phone,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const useUserProfile = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useUserSettings = () => {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['user-settings', userId],
    queryFn: () => fetchUserSettings(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useUpdateUserProfile = () => {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (updates: Partial<UserProfile>) => updateUserProfile(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });
};