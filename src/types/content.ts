// ==================== CONTENT TYPE DEFINITIONS ====================

export interface ContentItem {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description?: string;
  content_type: ContentType;
  status: ContentStatus;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  thumbnail_path?: string;
  metadata: Record<string, any>;
  content_hash?: string;
  workflow_status: WorkflowStatus;
  category_id?: string;
  scheduled_publish_at?: string;
  published_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_comments?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  content_analytics?: ContentAnalytics[];
  content_tags?: ContentTag[];
  content_categories?: ContentCategory;
  profiles?: UserProfile;
  content_versions?: ContentVersion[];
  content_collaborators?: ContentCollaborator[];
}

export interface ContentAnalytics {
  id: string;
  content_id: string;
  analytics_date: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  downloads: number;
  impressions: number;
  reach: number;
  click_through_rate: number;
  conversion_rate: number;
  engagement_rate: number;
  performance_score: number;
  created_at: string;
  updated_at: string;
}

export interface ContentTag {
  id: string;
  content_id: string;
  tag: string;
  created_at: string;
}

export interface ContentCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentVersion {
  id: string;
  content_id: string;
  version_number: number;
  title: string;
  description?: string;
  file_path?: string;
  file_size?: number;
  changes_summary?: string;
  created_by: string;
  created_at: string;
}

export interface ContentCollaborator {
  id: string;
  content_id: string;
  user_id: string;
  role: CollaboratorRole;
  permissions: Record<string, any>;
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  profiles?: UserProfile;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

// ==================== ENUMS AND TYPES ====================

export type ContentType = 'document' | 'image' | 'video' | 'social' | 'blog_post' | 'presentation' | 'infographic' | 'podcast' | 'ebook' | 'whitepaper';

export type ContentStatus = 'draft' | 'published' | 'archived' | 'under_review' | 'scheduled' | 'rejected';

export type WorkflowStatus = 'created' | 'in_progress' | 'review_requested' | 'approved' | 'changes_requested' | 'published';

export type CollaboratorRole = 'viewer' | 'editor' | 'admin';

export type EngagementType = 'view' | 'like' | 'share' | 'comment' | 'download' | 'click';

// ==================== INPUT TYPES ====================

export interface ContentCreateInput {
  project_id: string;
  title: string;
  description?: string;
  content_type: ContentType;
  status?: ContentStatus;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  thumbnail_path?: string;
  metadata?: Record<string, any>;
  category_id?: string;
  scheduled_publish_at?: string;
  tags?: string[];
}

export interface ContentUpdateInput {
  title?: string;
  description?: string;
  content_type?: ContentType;
  status?: ContentStatus;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  thumbnail_path?: string;
  metadata?: Record<string, any>;
  category_id?: string;
  scheduled_publish_at?: string;
  published_at?: string;
  workflow_status?: WorkflowStatus;
  review_comments?: string;
}

export interface ContentFilters {
  content_type?: ContentType;
  status?: ContentStatus;
  workflow_status?: WorkflowStatus;
  category_id?: string;
  user_id?: string;
  project_id?: string;
  tags?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'views' | 'engagement_rate';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AnalyticsUpdateInput {
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  downloads?: number;
  impressions?: number;
  reach?: number;
  click_through_rate?: number;
  conversion_rate?: number;
}

// ==================== ERROR TYPES ====================

export class ContentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ContentError';
  }
}

export class ContentValidationError extends ContentError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ContentValidationError';
  }
}

export class ContentNotFoundError extends ContentError {
  constructor(contentId: string) {
    super(`Content with ID ${contentId} not found`, 'NOT_FOUND', 404);
    this.name = 'ContentNotFoundError';
  }
}

export class ContentPermissionError extends ContentError {
  constructor(action: string) {
    super(`Permission denied for action: ${action}`, 'PERMISSION_DENIED', 403);
    this.name = 'ContentPermissionError';
  }
}

// ==================== CONSTANTS ====================

export const CONTENT_TYPES: Array<{value: ContentType, label: string, icon: string, color: string}> = [
  { value: 'document', label: 'Document', icon: 'FileText', color: 'blue' },
  { value: 'image', label: 'Image', icon: 'Image', color: 'green' },
  { value: 'video', label: 'Video', icon: 'Video', color: 'red' },
  { value: 'social', label: 'Social Media', icon: 'Share2', color: 'purple' },
  { value: 'blog_post', label: 'Blog Post', icon: 'BookOpen', color: 'orange' },
  { value: 'presentation', label: 'Presentation', icon: 'Presentation', color: 'yellow' },
  { value: 'infographic', label: 'Infographic', icon: 'BarChart3', color: 'teal' },
  { value: 'podcast', label: 'Podcast', icon: 'Mic', color: 'indigo' },
  { value: 'ebook', label: 'E-book', icon: 'Book', color: 'pink' },
  { value: 'whitepaper', label: 'Whitepaper', icon: 'FileType', color: 'gray' }
];

export const CONTENT_STATUSES: Array<{value: ContentStatus, label: string, color: string}> = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'under_review', label: 'Under Review', color: 'yellow' },
  { value: 'published', label: 'Published', color: 'green' },
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'archived', label: 'Archived', color: 'purple' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

export const WORKFLOW_STATUSES: Array<{value: WorkflowStatus, label: string, color: string}> = [
  { value: 'created', label: 'Created', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'review_requested', label: 'Review Requested', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'changes_requested', label: 'Changes Requested', color: 'orange' },
  { value: 'published', label: 'Published', color: 'green' }
];

// ==================== UTILITY FUNCTIONS ====================

export function getContentTypeIcon(type: ContentType): string {
  return CONTENT_TYPES.find(t => t.value === type)?.icon || 'FileText';
}

export function getContentTypeColor(type: ContentType): string {
  return CONTENT_TYPES.find(t => t.value === type)?.color || 'gray';
}

export function getStatusColor(status: ContentStatus): string {
  return CONTENT_STATUSES.find(s => s.value === status)?.color || 'gray';
}

export function getWorkflowStatusColor(status: WorkflowStatus): string {
  return WORKFLOW_STATUSES.find(s => s.value === status)?.color || 'gray';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function calculateEngagementRate(analytics: ContentAnalytics): number {
  if (analytics.views === 0) return 0;
  return ((analytics.likes + analytics.shares + analytics.comments) / analytics.views) * 100;
}