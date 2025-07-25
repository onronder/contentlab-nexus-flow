import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks';

interface UseProfileImageReturn {
  isUploading: boolean;
  uploadError: string | null;
  uploadImage: (file: File) => Promise<string | null>;
  deleteImage: (imageUrl: string) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Custom hook for managing profile image uploads and deletions
 */
export const useProfileImage = (): UseProfileImageReturn => {
  const { user } = useAuth();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      setUploadError('User not authenticated');
      return null;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file (JPG, PNG, GIF)');
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB');
      }

      // Delete existing image first
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `${user.id}/${file.name}`);
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete);
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upsert: false 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return publicUrl;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload image';
      setUploadError(errorMessage);
      console.error('Image upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const deleteImage = useCallback(async (imageUrl: string): Promise<boolean> => {
    if (!user) {
      setUploadError('User not authenticated');
      return false;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Extract file path from URL if it's from Supabase storage
      if (imageUrl.includes('supabase.co/storage')) {
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${user.id}/${fileName}`;

        const { error } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (error) throw error;
      }

      return true;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete image';
      setUploadError(errorMessage);
      console.error('Image deletion error:', error);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  return {
    isUploading,
    uploadError,
    uploadImage,
    deleteImage,
    clearError
  };
};