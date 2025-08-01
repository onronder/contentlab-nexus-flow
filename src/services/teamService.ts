import { supabase } from "@/integrations/supabase/client";
import type {
  Team,
  TeamCreateInput,
  TeamUpdateInput,
  TeamMember,
  TeamMemberInput,
  TeamMembersResponse,
  UserRole,
  TeamQueryOptions,
  TeamMemberQueryOptions
} from "@/types/team";

// Custom error class for team validation errors
export class TeamValidationError extends Error {
  public code: string;
  public field?: string;
  
  constructor(errorData: { code: string; message: string; field?: string }) {
    super(errorData.message);
    this.name = 'TeamValidationError';
    this.code = errorData.code;
    this.field = errorData.field;
  }
}

export class TeamService {
  // Team Management Methods
  
  /**
   * Creates a new team with validation and unique slug generation
   */
  static async createTeam(teamData: TeamCreateInput): Promise<Team> {
    try {
      this.validateTeamData(teamData);
      
      // Generate unique slug if not provided
      const slug = teamData.slug || await this.generateUniqueSlug(teamData.name);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User must be authenticated to create teams');
      }

      // Use raw SQL for table operations since types aren't updated yet
      const { data, error } = await supabase.rpc('create_team_secure', {
        team_name: teamData.name,
        team_slug: slug,
        team_description: teamData.description || '',
        team_type_param: teamData.team_type || 'project_team',
        member_limit_param: teamData.member_limit || 50,
        settings_param: teamData.settings || {}
      });

      if (error) {
        console.error('Error creating team:', error);
        throw new Error(`Failed to create team: ${error.message}`);
      }

      return data as Team;
    } catch (error) {
      console.error('TeamService.createTeam error:', error);
      throw error;
    }
  }

  /**
   * Gets a team by ID
   */
  static async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const { data, error } = await supabase.rpc('get_team_by_id', {
        team_id: teamId
      });

      if (error) {
        console.error('Error fetching team:', error);
        throw new Error(`Failed to fetch team: ${error.message}`);
      }

      return data ? (data as Team) : null;
    } catch (error) {
      console.error('TeamService.getTeamById error:', error);
      throw error;
    }
  }

  /**
   * Updates a team with the provided data
   */
  static async updateTeam(teamId: string, updates: TeamUpdateInput): Promise<Team> {
    try {
      // If updating slug, ensure it's unique
      if (updates.slug) {
        const isUnique = await this.isSlugUnique(updates.slug, teamId);
        if (!isUnique) {
          throw new TeamValidationError({
            code: 'SLUG_NOT_UNIQUE',
            message: 'Team slug must be unique',
            field: 'slug'
          });
        }
      }

      const { data, error } = await supabase.rpc('update_team_secure', {
        team_id: teamId,
        updates: updates
      });

      if (error) {
        console.error('Error updating team:', error);
        throw new Error(`Failed to update team: ${error.message}`);
      }

      return data as Team;
    } catch (error) {
      console.error('TeamService.updateTeam error:', error);
      throw error;
    }
  }

  /**
   * Deletes a team (soft delete)
   */
  static async deleteTeam(teamId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('delete_team_secure', {
        team_id: teamId
      });

      if (error) {
        console.error('Error deleting team:', error);
        throw new Error(`Failed to delete team: ${error.message}`);
      }
    } catch (error) {
      console.error('TeamService.deleteTeam error:', error);
      throw error;
    }
  }

  /**
   * Gets all teams for a specific user
   */
  static async getTeamsByUser(userId: string, options?: TeamQueryOptions): Promise<Team[]> {
    try {
      const { data, error } = await supabase.rpc('get_teams_by_user', {
        user_id: userId,
        options: options || {}
      });

      if (error) {
        console.error('Error fetching user teams:', error);
        throw new Error(`Failed to fetch user teams: ${error.message}`);
      }

      return (data || []) as Team[];
    } catch (error) {
      console.error('TeamService.getTeamsByUser error:', error);
      throw error;
    }
  }

  // Team Member Management Methods

  /**
   * Adds a new team member with role validation
   */
  static async addTeamMember(memberData: TeamMemberInput): Promise<TeamMember> {
    try {
      const { data, error } = await supabase.rpc('add_team_member_secure', {
        member_data: memberData
      });

      if (error) {
        console.error('Error adding team member:', error);
        throw new Error(`Failed to add team member: ${error.message}`);
      }

      return data as TeamMember;
    } catch (error) {
      console.error('TeamService.addTeamMember error:', error);
      throw error;
    }
  }

  /**
   * Removes a team member from the team
   */
  static async removeTeamMember(teamId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('remove_team_member_secure', {
        team_id: teamId,
        user_id: userId
      });

      if (error) {
        console.error('Error removing team member:', error);
        throw new Error(`Failed to remove team member: ${error.message}`);
      }
    } catch (error) {
      console.error('TeamService.removeTeamMember error:', error);
      throw error;
    }
  }

  /**
   * Updates a team member's role
   */
  static async updateMemberRole(teamId: string, userId: string, roleSlug: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_member_role_secure', {
        team_id: teamId,
        user_id: userId,
        role_slug: roleSlug
      });

      if (error) {
        console.error('Error updating member role:', error);
        throw new Error(`Failed to update member role: ${error.message}`);
      }
    } catch (error) {
      console.error('TeamService.updateMemberRole error:', error);
      throw error;
    }
  }

  /**
   * Gets paginated team members with optional filtering
   */
  static async getTeamMembers(
    teamId: string, 
    options?: TeamMemberQueryOptions
  ): Promise<TeamMembersResponse> {
    try {
      const { data, error } = await supabase.rpc('get_team_members_paginated', {
        team_id: teamId,
        options: options || {}
      });

      if (error) {
        console.error('Error fetching team members:', error);
        throw new Error(`Failed to fetch team members: ${error.message}`);
      }

      return data as TeamMembersResponse;
    } catch (error) {
      console.error('TeamService.getTeamMembers error:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Validates team data before creation/update
   */
  static validateTeamData(teamData: TeamCreateInput | TeamUpdateInput): void {
    if ('name' in teamData && (!teamData.name || teamData.name.trim().length < 2)) {
      throw new TeamValidationError({
        code: 'INVALID_NAME',
        message: 'Team name must be at least 2 characters long',
        field: 'name'
      });
    }

    if ('slug' in teamData && teamData.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(teamData.slug)) {
        throw new TeamValidationError({
          code: 'INVALID_SLUG',
          message: 'Slug can only contain lowercase letters, numbers, and hyphens',
          field: 'slug'
        });
      }
    }

    if ('member_limit' in teamData && teamData.member_limit && teamData.member_limit < 1) {
      throw new TeamValidationError({
        code: 'INVALID_MEMBER_LIMIT',
        message: 'Member limit must be at least 1',
        field: 'member_limit'
      });
    }
  }

  /**
   * Generates a unique slug from team name
   */
  static async generateUniqueSlug(name: string): Promise<string> {
    try {
      let baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 50);

      if (!baseSlug) {
        baseSlug = 'team';
      }

      let counter = 0;
      let slug = baseSlug;

      while (!(await this.isSlugUnique(slug))) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }

      return slug;
    } catch (error) {
      console.error('TeamService.generateUniqueSlug error:', error);
      throw error;
    }
  }

  /**
   * Checks if a slug is unique (excluding specified team ID)
   */
  private static async isSlugUnique(slug: string, excludeTeamId?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_team_slug_unique', {
        slug: slug,
        exclude_team_id: excludeTeamId || null
      });

      if (error) {
        console.error('Error checking slug uniqueness:', error);
        return false;
      }

      return data as boolean;
    } catch (error) {
      console.error('TeamService.isSlugUnique error:', error);
      return false;
    }
  }

  /**
   * Updates team member count for a specific team
   */
  static async updateTeamMemberCount(teamId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_team_member_count_secure', {
        team_id: teamId
      });

      if (error) {
        console.error('Error updating member count:', error);
        throw new Error(`Failed to update member count: ${error.message}`);
      }
    } catch (error) {
      console.error('TeamService.updateTeamMemberCount error:', error);
      throw error;
    }
  }

  /**
   * Gets all available user roles
   */
  static async getUserRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_roles_active');

      if (error) {
        console.error('Error fetching user roles:', error);
        throw new Error(`Failed to fetch user roles: ${error.message}`);
      }

      return (data || []) as UserRole[];
    } catch (error) {
      console.error('TeamService.getUserRoles error:', error);
      throw error;
    }
  }
}