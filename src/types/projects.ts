// Project-related type definitions
export interface Project {
  id: string;
  name: string;
  description?: string;
  industry: string;
  projectType: ProjectType;
  targetMarket?: string;
  primaryObjectives: string[];
  successMetrics: string[];
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  isPublic: boolean;
  allowTeamAccess: boolean;
  autoAnalysisEnabled: boolean;
  notificationSettings: NotificationSettings;
  customFields: Record<string, any>;
  tags: string[];
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Computed fields
  competitorCount?: number;
  analysisCount?: number;
  teamMemberCount?: number;
  progressPercentage?: number;
  performanceScore?: number;
  lastActivityDate?: Date;
}

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: TeamRole;
  permissions: PermissionSet;
  accessLevel: AccessLevel;
  allowedSections: ProjectSection[];
  invitationStatus: InvitationStatus;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActivity?: Date;
  expirationDate?: Date;
  isTemporary: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // User information
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface ProjectCompetitor {
  id: string;
  projectId: string;
  companyName: string;
  domain: string;
  industry?: string;
  companySize?: string;
  competitiveTier: CompetitiveTier;
  threatLevel: ThreatLevel;
  marketShareEstimate?: number;
  valueProposition?: string;
  monitoringEnabled: boolean;
  analysisFrequency: AnalysisFrequency;
  lastAnalysisDate?: Date;
  analysisCount: number;
  dataQualityScore?: number;
  customAttributes: Record<string, any>;
  tags: string[];
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectAnalytics {
  id: string;
  projectId: string;
  metricName: string;
  metricValue?: number;
  metricUnit: MetricUnit;
  measurementDate: Date;
  dataSource?: string;
  calculationMethod?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  userId?: string;
  activityType: ActivityType;
  activityDescription: string;
  entityType?: string;
  entityId?: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Enums and constants
export type ProjectType = 'competitive_analysis' | 'market_research' | 'brand_monitoring' | 'content_strategy' | 'seo_analysis';
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type TeamRole = 'owner' | 'admin' | 'manager' | 'analyst' | 'member' | 'viewer';
export type AccessLevel = 'full' | 'limited' | 'read_only' | 'restricted';
export type ProjectSection = 'dashboard' | 'competitors' | 'analysis' | 'reports' | 'team' | 'settings';
export type InvitationStatus = 'pending' | 'active' | 'suspended' | 'expired' | 'revoked';
export type CompetitiveTier = 'direct' | 'indirect' | 'substitute' | 'emerging' | 'potential';
export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type AnalysisFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type MetricUnit = 'percentage' | 'currency' | 'number' | 'decimal' | 'count' | 'ratio';
export type ActivityType = 'project_created' | 'project_updated' | 'project_deleted' | 'member_added' | 'member_removed' | 'competitor_added' | 'competitor_removed' | 'analysis_started' | 'analysis_completed' | 'settings_changed';

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface PermissionSet {
  manageProject?: boolean;
  manageTeam?: boolean;
  manageCompetitors?: boolean;
  runAnalysis?: boolean;
  viewAnalytics?: boolean;
  exportData?: boolean;
  manageSettings?: boolean;
}

// Project creation and update interfaces
export interface ProjectCreationInput {
  name: string;
  description?: string;
  industry: string;
  projectType: ProjectType;
  targetMarket?: string;
  primaryObjectives: string[];
  successMetrics: string[];
  startDate?: Date;
  targetEndDate?: Date;
  isPublic: boolean;
  allowTeamAccess: boolean;
  autoAnalysisEnabled: boolean;
  notificationSettings: NotificationSettings;
  customFields: Record<string, any>;
  tags: string[];
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  industry?: string;
  targetMarket?: string;
  primaryObjectives?: string[];
  successMetrics?: string[];
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: Date;
  targetEndDate?: Date;
  actualEndDate?: Date;
  isPublic?: boolean;
  allowTeamAccess?: boolean;
  autoAnalysisEnabled?: boolean;
  notificationSettings?: NotificationSettings;
  customFields?: Record<string, any>;
  tags?: string[];
}

// Constants
export const PROJECT_TYPES: Array<{value: ProjectType, label: string, description: string}> = [
  {
    value: 'competitive_analysis',
    label: 'Competitive Analysis',
    description: 'Comprehensive analysis of competitors and market positioning'
  },
  {
    value: 'market_research',
    label: 'Market Research',
    description: 'In-depth market analysis and opportunity identification'
  },
  {
    value: 'brand_monitoring',
    label: 'Brand Monitoring',
    description: 'Continuous monitoring of brand mentions and reputation'
  },
  {
    value: 'content_strategy',
    label: 'Content Strategy',
    description: 'Content gap analysis and strategy development'
  },
  {
    value: 'seo_analysis',
    label: 'SEO Analysis',
    description: 'Search engine optimization and keyword analysis'
  }
];

export const PROJECT_STATUSES: Array<{value: ProjectStatus, label: string, color: string}> = [
  { value: 'planning', label: 'Planning', color: 'yellow' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'paused', label: 'Paused', color: 'gray' },
  { value: 'completed', label: 'Completed', color: 'blue' },
  { value: 'archived', label: 'Archived', color: 'purple' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

export const TEAM_ROLES: Array<{value: TeamRole, label: string, description: string}> = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full control over project and team management'
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Manage project settings and team members'
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Manage competitors and analysis workflows'
  },
  {
    value: 'analyst',
    label: 'Analyst',
    description: 'Run analysis and view detailed reports'
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Basic project access and collaboration'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to project information'
  }
];