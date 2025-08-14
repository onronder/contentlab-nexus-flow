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

      const { data, error } = await (supabase as any)
        .from('teams')
        .insert({
          name: teamData.name,
          slug: slug,
          description: teamData.description || '',
          parent_team_id: teamData.parent_team_id || null,
          owner_id: currentUser.user.id,
          team_type: teamData.team_type || 'project_team',
          settings: teamData.settings || {},
          member_limit: teamData.member_limit || 50
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating team:', error);
        throw new Error(`Failed to create team: ${error.message}`);
      }

      return {
        ...data,
        settings: data.settings as Record<string, any>
      };
    } catch (error) {
      console.error('TeamService.createTeam error:', error);
      throw error;
    }
  }

  /**
   * Creates a team with full backend integration (production-grade)
   */
  static async createTeamWithIntegration(teamData: TeamCreateInput & { auto_setup?: boolean }): Promise<Team> {
    try {
      this.validateTeamData(teamData);
      
      // Generate unique slug if not provided
      const slug = teamData.slug || await this.generateUniqueSlug(teamData.name);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new Error('User must be authenticated to create teams');
      }

      // Get owner role
      const { data: ownerRole, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('slug', 'owner')
        .eq('is_active', true)
        .single();

      if (roleError || !ownerRole) {
        throw new Error('Owner role not found in system');
      }

      // Create team with transaction-like approach
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamData.name,
          slug: slug,
          description: teamData.description || '',
          parent_team_id: teamData.parent_team_id || null,
          owner_id: currentUser.user.id,
          team_type: teamData.team_type || 'organization',
          settings: {
            ...teamData.settings,
            auto_invite: true,
            public_join: false,
            default_permissions: ['view', 'edit'],
            created_with_wizard: true
          },
          member_limit: teamData.member_limit || 50,
          current_member_count: 1 // Owner counts as first member
        })
        .select()
        .single();

      if (teamError) {
        console.error('Error creating team:', teamError);
        throw new Error(`Failed to create team: ${teamError.message}`);
      }

      // Add owner as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          user_id: currentUser.user.id,
          team_id: newTeam.id,
          role_id: ownerRole.id,
          status: 'active',
          is_active: true,
          joined_at: new Date().toISOString(),
          invited_by: currentUser.user.id
        });

      if (memberError) {
        console.error('Error adding owner as team member:', memberError);
        // Don't fail the whole operation for this
      }

      // Log team creation activity
      try {
        await supabase.rpc('log_team_activity', {
          p_team_id: newTeam.id,
          p_user_id: currentUser.user.id,
          p_activity_type: 'team_management',
          p_action: 'team_created',
          p_description: `Team "${newTeam.name}" was created`,
          p_metadata: {
            team_type: newTeam.team_type,
            member_limit: newTeam.member_limit,
            auto_setup: teamData.auto_setup || false
          }
        });
      } catch (activityError) {
        console.warn('Failed to log team creation activity:', activityError);
      }

      return {
        ...newTeam,
        settings: newTeam.settings as Record<string, any>
      };
    } catch (error) {
      console.error('TeamService.createTeamWithIntegration error:', error);
      throw error;
    }
  }

  /**
   * Gets a team by ID
   */
  static async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Team not found
        }
        console.error('Error fetching team:', error);
        throw new Error(`Failed to fetch team: ${error.message}`);
      }

      return data;
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

      const { data, error } = await (supabase as any)
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (error) {
        console.error('Error updating team:', error);
        throw new Error(`Failed to update team: ${error.message}`);
      }

      return data;
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
      const { error } = await (supabase as any)
        .from('teams')
        .update({ is_active: false })
        .eq('id', teamId);

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
   * Gets all teams for a specific user using simplified approach with proper error handling
   */
  static async getTeamsByUser(userId: string, options?: TeamQueryOptions): Promise<Team[]> {
    try {
      // Simplified query - get teams where user is owner or member
      const { data: teams, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members!inner(
            id,
            user_id,
            role_id,
            status,
            is_active,
            joined_at,
            role:user_roles(id, name, slug, hierarchy_level)
          )
        `)
        .eq('team_members.user_id', userId)
        .eq('team_members.is_active', true)
        .eq('team_members.status', 'active')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching teams:', error);
        
        // Fallback to simpler query if the complex one fails
        const { data: fallbackTeams, error: fallbackError } = await supabase
          .from('teams')
          .select('*')
          .eq('owner_id', userId)
          .eq('is_active', true);
          
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          return [];
        }
        
        return (fallbackTeams || []).map(team => ({
          ...team,
          settings: team.settings as Record<string, any>
        })) as Team[];
      }

      return (teams || []).map(team => ({
        ...team,
        settings: team.settings as Record<string, any>
      })) as Team[];

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
      // Get the role ID from slug
      const { data: role, error: roleError } = await (supabase as any)
        .from('user_roles')
        .select('id')
        .eq('slug', memberData.role_slug)
        .eq('is_active', true)
        .single();

      if (roleError || !role) {
        throw new Error(`Invalid role: ${memberData.role_slug}`);
      }

      const { data, error } = await (supabase as any)
        .from('team_members')
        .insert({
          user_id: memberData.user_id,
          team_id: memberData.team_id,
          role_id: role.id,
          invited_by: memberData.invited_by,
          metadata: memberData.metadata || {},
          status: 'active',
          joined_at: new Date().toISOString()
        })
        .select('*, role:user_roles(*), team:teams(*)')
        .single();

      if (error) {
        console.error('Error adding team member:', error);
        throw new Error(`Failed to add team member: ${error.message}`);
      }

      return data;
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
      const { error } = await (supabase as any)
        .from('team_members')
        .update({ 
          status: 'left',
          is_active: false 
        })
        .eq('team_id', teamId)
        .eq('user_id', userId);

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
      // Get the role ID from slug
      const { data: role, error: roleError } = await (supabase as any)
        .from('user_roles')
        .select('id')
        .eq('slug', roleSlug)
        .eq('is_active', true)
        .single();

      if (roleError || !role) {
        throw new Error(`Invalid role: ${roleSlug}`);
      }

      const { error } = await (supabase as any)
        .from('team_members')
        .update({ role_id: role.id })
        .eq('team_id', teamId)
        .eq('user_id', userId);

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
      let query = (supabase as any)
        .from('team_members')
        .select(`
          *,
          role:user_roles(*),
          team:teams(*),
          user:profiles(id, email, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('team_id', teamId);

      // Apply filters
      if (options?.filters) {
        if (options.filters.status) {
          query = query.eq('status', options.filters.status);
        }
        if (options.filters.is_active !== undefined) {
          query = query.eq('is_active', options.filters.is_active);
        }
        if (options.filters.role_slug) {
          query = query.eq('role.slug', options.filters.role_slug);
        }
      }

      // Apply sorting
      if (options?.sort) {
        query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
      } else {
        query = query.order('joined_at', { ascending: false });
      }

      // Apply pagination
      const page = options?.page || 1;
      const limit = options?.limit || 10;
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching team members:', error);
        throw new Error(`Failed to fetch team members: ${error.message}`);
      }

      return {
        members: data || [],
        total: count || 0,
        page,
        limit
      };
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
      let query = (supabase as any)
        .from('teams')
        .select('id')
        .eq('slug', slug);

      if (excludeTeamId) {
        query = query.neq('id', excludeTeamId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking slug uniqueness:', error);
        return false;
      }

      return (data || []).length === 0;
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
      // Count active team members
      const { count, error: countError } = await (supabase as any)
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('status', 'active');

      if (countError) {
        console.error('Error counting team members:', countError);
        throw new Error(`Failed to count team members: ${countError.message}`);
      }

      // Update the team's member count
      const { error } = await (supabase as any)
        .from('teams')
        .update({ current_member_count: count || 0 })
        .eq('id', teamId);

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
   * Gets user roles within teams
   */
  static async getUserTeamRoles(userId: string): Promise<any[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .select('*, role:user_roles(*), team:teams(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching user team roles:', error);
        throw new Error(`Failed to fetch user team roles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('TeamService.getUserTeamRoles error:', error);
      throw error;
    }
  }

  /**
   * Gets team permissions for a user
   */
  static async getTeamPermissions(teamId: string, userId: string): Promise<string[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .select('role:user_roles(permissions:role_permissions(permission:permissions(*)))')
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return []; // User not a team member
        }
        console.error('Error fetching team permissions:', error);
        throw new Error(`Failed to fetch team permissions: ${error.message}`);
      }

      // Extract permission slugs
      const permissions = data?.role?.permissions?.map((rp: any) => rp.permission.slug) || [];
      return permissions;
    } catch (error) {
      console.error('TeamService.getTeamPermissions error:', error);
      throw error;
    }
  }

  /**
   * Gets team statistics
   */
  static async getTeamStats(teamId: string): Promise<any> {
    try {
      const { data: team, error: teamError } = await (supabase as any)
        .from('teams')
        .select('*, current_member_count')
        .eq('id', teamId)
        .single();

      if (teamError) {
        throw new Error(`Failed to fetch team: ${teamError.message}`);
      }

      // Get activity count for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: activityCount } = await (supabase as any)
        .from('team_activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .gte('created_at', thirtyDaysAgo);

      return {
        member_count: team.current_member_count || 0,
        activity_count_30d: activityCount || 0,
        created_at: team.created_at,
        team_type: team.team_type
      };
    } catch (error) {
      console.error('TeamService.getTeamStats error:', error);
      throw error;
    }
  }

  /**
   * Gets team activity logs
   */
  static async getTeamActivity(teamId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('team_activity_logs')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching team activity:', error);
        throw new Error(`Failed to fetch team activity: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('TeamService.getTeamActivity error:', error);
      throw error;
    }
  }

  /**
   * Gets all available user roles
   */
  static async getUserRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select('*')
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: false });

      if (error) {
        console.error('Error fetching user roles:', error);
        throw new Error(`Failed to fetch user roles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('TeamService.getUserRoles error:', error);
      throw error;
    }
  }
}