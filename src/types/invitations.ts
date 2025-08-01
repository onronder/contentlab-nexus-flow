// Team Invitation Types for ContentLab Nexus

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

// Core interfaces
export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role_id: string;
  invited_by: string;
  invitation_token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  declined_at?: string;
  message?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  team?: any;
  role?: any;
  invited_by_user?: any;
  accepted_by_user?: any;
}

// Input types for creation and updates
export interface InvitationCreateInput {
  team_id: string;
  email: string;
  role_id: string;
  message?: string;
  expires_in_days?: number;
  metadata?: Record<string, any>;
}

export interface InvitationUpdateInput {
  status?: InvitationStatus;
  message?: string;
  metadata?: Record<string, any>;
}

export interface BulkInvitationInput {
  team_id: string;
  emails: string[];
  role_id: string;
  message?: string;
  expires_in_days?: number;
}

// Response types
export interface InvitationResponse {
  invitation: TeamInvitation;
  success: boolean;
  message: string;
}

export interface BulkInvitationResponse {
  successful: TeamInvitation[];
  failed: Array<{
    email: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

export interface InvitationStatusCheck {
  valid: boolean;
  expired: boolean;
  alreadyMember: boolean;
  invitation?: TeamInvitation;
}

// Email template data
export interface EmailInvitationData {
  invitation: TeamInvitation;
  teamName: string;
  roleName: string;
  inviterName: string;
  acceptUrl: string;
  declineUrl: string;
}

// Invitation analytics
export interface InvitationMetrics {
  totalSent: number;
  totalAccepted: number;
  totalDeclined: number;
  totalExpired: number;
  totalCancelled: number;
  acceptanceRate: number;
  averageResponseTime: number;
  recentInvitations: TeamInvitation[];
}

// Query filter types
export interface InvitationFilters {
  team_id?: string;
  status?: InvitationStatus;
  email?: string;
  invited_by?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

// Sort options
export interface InvitationSortOptions {
  field: 'created_at' | 'expires_at' | 'email' | 'status';
  direction: 'asc' | 'desc';
}

// Pagination
export interface InvitationQueryOptions {
  page?: number;
  limit?: number;
  filters?: InvitationFilters;
  sort?: InvitationSortOptions;
}

// Error types
export interface InvitationError {
  code: string;
  message: string;
  field?: string;
}

export interface InvitationValidationError extends InvitationError {
  field: string;
  value?: any;
}

// Rate limiting
export interface InvitationRateLimit {
  maxPerHour: number;
  maxPerDay: number;
  currentHourly: number;
  currentDaily: number;
  resetTime: string;
}

// Onboarding data
export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  steps: OnboardingStep[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional: boolean;
  action?: {
    type: 'link' | 'modal' | 'tour';
    target: string;
    label: string;
  };
}