import { User, Session } from '@supabase/supabase-js';
import { Tables } from '@/integrations/supabase/types';

// User profile type from database
export type UserProfile = Tables<'profiles'>;

// Extended user type with profile information
export interface AuthUser extends User {
  profile?: UserProfile;
}

// Authentication state interface
export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// Authentication methods interface
export interface AuthMethods {
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<{ error: string | null }>;
}

// Complete auth context interface
export interface AuthContextType extends AuthState, AuthMethods {}

// Authentication error types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'Invalid email or password',
  USER_NOT_FOUND = 'User not found',
  EMAIL_ALREADY_EXISTS = 'An account with this email already exists',
  WEAK_PASSWORD = 'Password is too weak',
  NETWORK_ERROR = 'Network error, please try again',
  SESSION_EXPIRED = 'Your session has expired, please sign in again',
  UNKNOWN_ERROR = 'An unexpected error occurred',
  PROFILE_UPDATE_FAILED = 'Failed to update profile'
}

// Authentication events
export enum AuthEvent {
  SIGNED_IN = 'SIGNED_IN',
  SIGNED_OUT = 'SIGNED_OUT',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  USER_UPDATED = 'USER_UPDATED',
  PASSWORD_RECOVERY = 'PASSWORD_RECOVERY'
}