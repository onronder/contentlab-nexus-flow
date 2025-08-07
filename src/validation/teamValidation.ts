import { z } from 'zod';
import type { TeamCreateInput, TeamUpdateInput, TeamMemberInput, TeamMemberUpdateInput } from '@/types/team';

// Team validation schemas
export const teamCreateSchema = z.object({
  name: z.string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Team name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  slug: z.string()
    .optional()
    .refine((val) => !val || /^[a-z0-9\-]+$/.test(val), 'Slug can only contain lowercase letters, numbers, and hyphens'),
  
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  
  parent_team_id: z.string().uuid().optional(),
  
  team_type: z.enum(['organization', 'department', 'project_team', 'working_group']).optional(),
  
  settings: z.record(z.any()).optional(),
  
  member_limit: z.number()
    .int()
    .min(1, 'Member limit must be at least 1')
    .max(1000, 'Member limit cannot exceed 1000')
    .optional()
});

export const teamUpdateSchema = teamCreateSchema.partial();

export const teamMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  team_id: z.string().uuid('Invalid team ID'),
  role_slug: z.string().min(1, 'Role is required'),
  invited_by: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

export const teamMemberUpdateSchema = z.object({
  role_slug: z.string().min(1, 'Role is required').optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'left']).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
});

// Email validation for invitations
export const invitationEmailSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters'),
  
  team_id: z.string().uuid('Invalid team ID'),
  role_slug: z.string().min(1, 'Role is required'),
  message: z.string().max(1000, 'Message must not exceed 1000 characters').optional()
});

// Bulk operations validation
export const bulkMemberOperationSchema = z.object({
  operation: z.enum(['invite', 'remove', 'update_role', 'activate', 'deactivate']),
  team_id: z.string().uuid('Invalid team ID'),
  targets: z.array(z.union([
    z.string().email('Invalid email'), // for invitations
    z.string().uuid('Invalid user ID')  // for existing members
  ])).min(1, 'At least one target is required').max(50, 'Cannot process more than 50 members at once'),
  role_slug: z.string().optional(),
  message: z.string().max(1000).optional()
});

// Team settings validation
export const teamSettingsSchema = z.object({
  auto_invite: z.boolean().optional(),
  public_join: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  max_projects: z.number().int().min(0).max(1000).optional(),
  default_member_role: z.string().optional(),
  notification_settings: z.object({
    member_joined: z.boolean().optional(),
    member_left: z.boolean().optional(),
    role_changed: z.boolean().optional(),
    project_created: z.boolean().optional()
  }).optional(),
  collaboration_settings: z.object({
    allow_file_sharing: z.boolean().optional(),
    allow_external_collaborators: z.boolean().optional(),
    require_2fa: z.boolean().optional()
  }).optional()
});

// Data consistency validation
export class TeamDataValidator {
  // Validate team hierarchy (prevent circular references)
  static validateTeamHierarchy(teamId: string, parentTeamId?: string, allTeams: any[] = []): boolean {
    if (!parentTeamId) return true;
    
    // Check if parent exists
    const parentTeam = allTeams.find(t => t.id === parentTeamId);
    if (!parentTeam) return false;
    
    // Check for circular reference
    let currentParent = parentTeam;
    const visited = new Set([teamId]);
    
    while (currentParent?.parent_team_id) {
      if (visited.has(currentParent.parent_team_id)) {
        return false; // Circular reference detected
      }
      visited.add(currentParent.parent_team_id);
      currentParent = allTeams.find(t => t.id === currentParent.parent_team_id);
    }
    
    return true;
  }

  // Validate member limit compliance
  static validateMemberLimit(currentCount: number, limit: number, newMembersCount: number = 0): boolean {
    if (limit <= 0) return true; // No limit
    return (currentCount + newMembersCount) <= limit;
  }

  // Validate role hierarchy for team operations
  static validateRoleHierarchy(
    currentUserRoleLevel: number,
    targetUserRoleLevel: number,
    operation: 'invite' | 'remove' | 'update_role'
  ): boolean {
    switch (operation) {
      case 'invite':
        // Can invite users with equal or lower role level
        return currentUserRoleLevel >= targetUserRoleLevel;
      
      case 'remove':
        // Can remove users with lower role level (not equal to prevent self-removal abuse)
        return currentUserRoleLevel > targetUserRoleLevel;
      
      case 'update_role':
        // Can update to roles with equal or lower level than current user
        return currentUserRoleLevel >= targetUserRoleLevel;
      
      default:
        return false;
    }
  }

  // Validate team operation permissions
  static validateTeamOperation(
    operation: string,
    userRole: string,
    isTeamOwner: boolean
  ): boolean {
    const permissions = {
      create_team: ['admin', 'super_admin'],
      delete_team: ['owner'], // Only team owner
      update_team: ['owner', 'admin'],
      manage_members: ['owner', 'admin', 'manager'],
      invite_members: ['owner', 'admin', 'manager', 'contributor'],
      remove_members: ['owner', 'admin', 'manager'],
      update_roles: ['owner', 'admin'],
      view_team: ['owner', 'admin', 'manager', 'contributor', 'member', 'viewer']
    };

    if (isTeamOwner && ['delete_team', 'update_team'].includes(operation)) {
      return true;
    }

    const requiredRoles = permissions[operation as keyof typeof permissions];
    return requiredRoles ? requiredRoles.includes(userRole) : false;
  }
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// Validation utilities
export const validateTeamData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      return { success: false, errors };
    }
    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Validation failed', code: 'UNKNOWN_ERROR' }]
    };
  }
};

// Export validation functions
export const validateTeamCreate = (data: unknown) => 
  validateTeamData(teamCreateSchema, data);

export const validateTeamUpdate = (data: unknown) => 
  validateTeamData(teamUpdateSchema, data);

export const validateTeamMember = (data: unknown) => 
  validateTeamData(teamMemberSchema, data);

export const validateTeamMemberUpdate = (data: unknown) => 
  validateTeamData(teamMemberUpdateSchema, data);

export const validateInvitationEmail = (data: unknown) => 
  validateTeamData(invitationEmailSchema, data);

export const validateBulkMemberOperation = (data: unknown) => 
  validateTeamData(bulkMemberOperationSchema, data);

export const validateTeamSettings = (data: unknown) => 
  validateTeamData(teamSettingsSchema, data);