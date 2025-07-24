import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts';

interface UseAuthOperationsReturn {
  isSubmitting: boolean;
  operationError: string | null;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signOutUser: () => Promise<boolean>;
  signOutFromAllDevices: () => Promise<boolean>;
  resetUserPassword: (email: string) => Promise<boolean>;
  updateUserProfile: (updates: any) => Promise<boolean>;
  clearOperationError: () => void;
}

/**
 * Custom hook for authentication operations with loading states
 * Provides simplified interface for authentication operations with error handling
 */
export const useAuthOperations = (): UseAuthOperationsReturn => {
  const { signUp, signIn, signOut, signOutFromAllDevices, resetPassword, updateProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const clearOperationError = useCallback(() => {
    setOperationError(null);
  }, []);

  const signUpWithEmail = useCallback(async (
    email: string, 
    password: string, 
    fullName?: string
  ): Promise<boolean> => {
    setIsSubmitting(true);
    setOperationError(null);

    try {
      const { error } = await signUp(email, password, fullName);
      
      if (error) {
        setOperationError(error);
        return false;
      }

      return true;
    } catch (error) {
      setOperationError('An unexpected error occurred during sign up');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [signUp]);

  const signInWithEmail = useCallback(async (
    email: string, 
    password: string
  ): Promise<boolean> => {
    setIsSubmitting(true);
    setOperationError(null);

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setOperationError(error);
        return false;
      }

      return true;
    } catch (error) {
      setOperationError('An unexpected error occurred during sign in');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [signIn]);

  const signOutUser = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);
    setOperationError(null);

    try {
      const { error } = await signOut();
      
      if (error) {
        setOperationError(error);
        return false;
      }

      // Force page refresh after successful logout to ensure clean state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);

      return true;
    } catch (error) {
      setOperationError('An unexpected error occurred during sign out');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [signOut]);

  const signOutFromAllDevicesOp = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);
    setOperationError(null);

    try {
      const { error } = await signOutFromAllDevices();
      
      if (error) {
        setOperationError(error);
        return false;
      }

      // Force page refresh after successful logout to ensure clean state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);

      return true;
    } catch (error) {
      setOperationError('An unexpected error occurred during sign out');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [signOutFromAllDevices]);

  const resetUserPassword = useCallback(async (email: string): Promise<boolean> => {
    setIsSubmitting(true);
    setOperationError(null);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setOperationError(error);
        return false;
      }

      return true;
    } catch (error) {
      setOperationError('An unexpected error occurred during password reset');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [resetPassword]);

  const updateUserProfile = useCallback(async (updates: any): Promise<boolean> => {
    setIsSubmitting(true);
    setOperationError(null);

    try {
      const { error } = await updateProfile(updates);
      
      if (error) {
        setOperationError(error);
        return false;
      }

      return true;
    } catch (error) {
      setOperationError('An unexpected error occurred during profile update');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [updateProfile]);

  return {
    isSubmitting,
    operationError,
    signUpWithEmail,
    signInWithEmail,
    signOutUser,
    signOutFromAllDevices: signOutFromAllDevicesOp,
    resetUserPassword,
    updateUserProfile,
    clearOperationError,
  };
};