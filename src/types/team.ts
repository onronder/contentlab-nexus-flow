// Team Management Types for ContentLab Nexus

// Enums
export type TeamType = 'organization' | 'department' | 'project_team' | 'working_group';
export type RoleType = 'system' | 'organizational' | 'project' | 'custom';
export type MemberStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'left';
export type ProjectRole = 'owner' | 'admin' | 'manager' | 'contributor' | 'member' | 'viewer';

// Base interfaces
export interface UserRole {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role_type: RoleType;
  is_system_role: boolean;
  is_active: boolean;
  hierarchy_level: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_team_id?: string;
  owner_id: string;
  team_type: TeamType;
  settings: Record<string, any>;
  is_active: boolean;
  member_limit: number;
  current_member_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  parent_team?: Team;
  owner?: any; // Profile type would be imported
  child_teams?: Team[];
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role_id: string;
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
  status: MemberStatus;
  is_active: boolean;
  last_activity_at: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  team?: Team;
  user?: any; // Profile type would be imported
  role?: UserRole;
  invited_by_user?: any; // Profile type would be imported
}

export interface ProjectMemberExtended {
  id: string;
  project_id: string;
  user_id: string;
  team_member_id?: string;
  project_role: ProjectRole;
  permissions: Record<string, any>;
  assigned_by?: string;
  assigned_at: string;
  is_active: boolean;
  last_access_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  project?: any; // Project type would be imported
  user?: any; // Profile type would be imported
  team_member?: TeamMember;
  assigned_by_user?: any; // Profile type would be imported
}

// Input types for creation and updates
export interface TeamCreateInput {
  name: string;
  slug?: string;
  description?: string;
  parent_team_id?: string;
  team_type?: TeamType;
  settings?: Record<string, any>;
  member_limit?: number;
}

export interface TeamUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  parent_team_id?: string;
  team_type?: TeamType;
  settings?: Record<string, any>;
  is_active?: boolean;
  member_limit?: number;
}

export interface TeamMemberInput {
  user_id: string;
  team_id: string;
  role_slug: string;
  invited_by?: string;
  metadata?: Record<string, any>;
}

export interface TeamMemberUpdateInput {
  role_slug?: string;
  status?: MemberStatus;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface ProjectMemberInput {
  project_id: string;
  user_id: string;
  team_member_id?: string;
  project_role: ProjectRole;
  permissions?: Record<string, any>;
  assigned_by?: string;
}

// API Response types
export interface TeamMembersResponse {
  members: TeamMember[];
  total: number;
  page: number;
  limit: number;
}

export interface TeamsResponse {
  teams: Team[];
  total: number;
  page: number;
  limit: number;
}

// Utility types
export interface TeamPermissions {
  can_view: boolean;
  can_edit: boolean;
  can_manage_members: boolean;
  can_delete: boolean;
  can_create_projects: boolean;
  can_manage_settings: boolean;
}

export interface TeamStats {
  total_members: number;
  active_members: number;
  pending_invitations: number;
  total_projects: number;
  recent_activity: number;
}

export interface TeamActivity {
  id: string;
  team_id: string;
  user_id: string;
  action: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Error types
export interface TeamError {
  code: string;
  message: string;
  field?: string;
}

export interface TeamValidationError extends TeamError {
  field: string;
  value?: any;
}

// Query filter types
export interface TeamFilters {
  team_type?: TeamType;
  is_active?: boolean;
  owner_id?: string;
  parent_team_id?: string;
  search?: string;
}

export interface TeamMemberFilters {
  team_id?: string;
  status?: MemberStatus;
  role_slug?: string;
  is_active?: boolean;
  search?: string;
}

// Sort options
export interface TeamSortOptions {
  field: 'name' | 'created_at' | 'updated_at' | 'member_count';
  direction: 'asc' | 'desc';
}

export interface TeamMemberSortOptions {
  field: 'joined_at' | 'last_activity_at' | 'name' | 'role';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Combined query options
export interface TeamQueryOptions extends PaginationOptions {
  filters?: TeamFilters;
  sort?: TeamSortOptions;
}

export interface TeamMemberQueryOptions extends PaginationOptions {
  filters?: TeamMemberFilters;
  sort?: TeamMemberSortOptions;
}