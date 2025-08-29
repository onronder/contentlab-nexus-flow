import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/consoleReplacement';
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
  
  constructor(message: string, code: string = 'VALIDATION_ERROR', field?: string) {
    super(message);
    this.name = 'TeamValidationError';
    this.code = code;
    this.field = field;
  }
}

export class TeamService {
  // Team Management Methods
  
  /**
   * Creates a new team using the RPC function (production-grade)
   */
  static async createTeam(teamData: TeamCreateInput): Promise<Team> {
    return this.createTeamWithIntegration(teamData);
  }

  /**
   * Creates a team with full backend integration using RPC function
   */
  static async createTeamWithIntegration(teamData: TeamCreateInput & { auto_setup?: boolean }): Promise<Team> {
    logger.team('Creating team with integration', teamData);
    
    try {
      this.validateTeamData(teamData);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new TeamValidationError('User must be authenticated to create teams', 'AUTH_REQUIRED');
      }

      logger.team('Calling RPC function with data', {
        name: teamData.name,
        type: teamData.team_type || 'organization',
        user: currentUser.user.id
      });

      // Use the integrated RPC function that handles everything
      const { data, error } = await supabase.rpc('create_team_with_member_integration', {
        p_team_name: teamData.name,
        p_team_description: teamData.description || '',
        p_team_type: teamData.team_type || 'organization',
        p_member_limit: teamData.member_limit || 50,
        p_settings: {
          ...teamData.settings,
          auto_invite: true,
          public_join: false,
          default_permissions: ['view', 'edit'],
          created_with_wizard: true,
          auto_setup: teamData.auto_setup || true
        }
      });

      if (error) {
        logger.error('RPC function error', 'TeamService', { error });
        throw new TeamValidationError(`Failed to create team: ${error.message}`, 'CREATION_FAILED');
      }

      // Type assertion for RPC response
      const rpcResult = data as any;
      
      if (!rpcResult?.success) {
        logger.error('RPC function returned error', 'TeamService', { rpcResult });
        throw new TeamValidationError(rpcResult?.message || 'Failed to create team', 'CREATION_FAILED');
      }

      logger.team('Team created successfully with RPC', rpcResult);
      
      // Extract the team data from the response and ensure it has the correct structure
      const teamResult = {
        id: rpcResult.id,
        name: rpcResult.name,
        slug: rpcResult.slug,
        description: rpcResult.description,
        team_type: rpcResult.team_type,
        owner_id: rpcResult.owner_id,
        settings: rpcResult.settings,
        member_limit: rpcResult.member_limit,
        current_member_count: rpcResult.current_member_count,
        is_active: rpcResult.is_active,
        created_at: rpcResult.created_at,
        updated_at: rpcResult.updated_at
      } as Team;
      
      return teamResult;
      
    } catch (error) {
      logger.error('Error in createTeamWithIntegration', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Gets a team by ID
   */
  static async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Team not found
        }
        logger.error('Error fetching team', 'TeamService', { error });
        throw new TeamValidationError(`Failed to fetch team: ${error.message}`, 'FETCH_FAILED');
      }

      return {
        ...data,
        settings: data.settings as Record<string, any>
      };
    } catch (error) {
      logger.error('getTeamById error', 'TeamService', { error });
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
          throw new TeamValidationError('Team slug must be unique', 'SLUG_NOT_UNIQUE', 'slug');
        }
      }

      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating team', 'TeamService', { error });
        throw new TeamValidationError(`Failed to update team: ${error.message}`, 'UPDATE_FAILED');
      }

      return {
        ...data,
        settings: data.settings as Record<string, any>
      };
    } catch (error) {
      logger.error('updateTeam error', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Deletes a team (soft delete)
   */
  static async deleteTeam(teamId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', teamId);

      if (error) {
        logger.error('Error deleting team', 'TeamService', { error });
        throw new TeamValidationError(`Failed to delete team: ${error.message}`, 'DELETE_FAILED');
      }
    } catch (error) {
      logger.error('deleteTeam error', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Gets all teams for a specific user using security definer function to bypass RLS recursion
   */
  static async getTeamsByUser(userId: string, options?: TeamQueryOptions): Promise<Team[]> {
    logger.team('Fetching teams for user', { userId, options });

    try {
      // Use the security definer function to get all accessible teams without RLS issues
      const { data: teams, error: teamsError } = await supabase.rpc('get_accessible_teams', {
        p_user_id: userId
      });

      if (teamsError) {
        logger.error('Error fetching teams', 'TeamService', { error: teamsError });
        throw teamsError;
      }

      if (!teams || teams.length === 0) {
        logger.team('No teams found for user', { userId });
        return [];
      }

      let result = teams.map((team: any) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        description: team.description,
        owner_id: team.owner_id,
        created_at: team.created_at,
        updated_at: team.updated_at,
        team_type: team.team_type,
        is_active: team.is_active,
        current_member_count: team.current_member_count,
        member_limit: team.member_limit,
        settings: team.settings
      })) as Team[];

      // Apply filters if provided
      if (options?.filters?.search) {
        result = result.filter(team => 
          team.name.toLowerCase().includes(options.filters!.search!.toLowerCase())
        );
      }

      if (options?.filters?.team_type) {
        result = result.filter(team => team.team_type === options.filters!.team_type);
      }

      if (options?.filters?.is_active !== undefined) {
        result = result.filter(team => team.is_active === options.filters!.is_active);
      }

      if (options?.filters?.owner_id) {
        result = result.filter(team => team.owner_id === options.filters!.owner_id);
      }

      // Apply sorting if provided
      if (options?.sort) {
        const sortColumn = options.sort.field;
        const sortOrder = options.sort.direction || 'desc';
        
        result.sort((a, b) => {
          const aValue = a[sortColumn as keyof typeof a];
          const bValue = b[sortColumn as keyof typeof b];
          
          if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        });
      }

      // Apply pagination if provided
      if (options?.page && options?.limit) {
        const start = (options.page - 1) * options.limit;
        const end = start + options.limit;
        result = result.slice(start, end);
      } else if (options?.limit) {
        result = result.slice(0, options.limit);
      }

      logger.team('Successfully fetched teams', { count: result.length });
      return result;
    } catch (error: any) {
      logger.error('Error in getTeamsByUser', 'TeamService', { error });
      throw new TeamValidationError(`Failed to fetch teams: ${error.message}`, 'FETCH_ERROR');
    }
  }

  /**
   * Gets team statistics for a given team
   */
  static async getTeamStats(teamId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(count)
        `)
        .eq('id', teamId)
        .single();

      if (error) {
        logger.error('Error fetching team stats', 'TeamService', { error });
        throw new TeamValidationError(`Failed to fetch team stats: ${error.message}`, 'FETCH_FAILED');
      }

      return data;
    } catch (error) {
      logger.error('getTeamStats error', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Gets team activity logs
   */
  static async getTeamActivity(teamId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching team activity', 'TeamService', { error });
        throw new TeamValidationError(`Failed to fetch team activity: ${error.message}`, 'FETCH_FAILED');
      }

      return data || [];
    } catch (error) {
      logger.error('getTeamActivity error', 'TeamService', { error });
      return [];
    }
  }

  // Team Member Management Methods

  /**
   * Adds a new team member with role validation
   */
  static async addTeamMember(memberData: TeamMemberInput): Promise<TeamMember> {
    try {
      // Get the role ID from slug
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('slug', memberData.role_slug)
        .eq('is_active', true)
        .single();

      if (roleError || !role) {
        throw new TeamValidationError(`Invalid role: ${memberData.role_slug}`, 'INVALID_ROLE');
      }

      const { data, error } = await supabase
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
        logger.error('Error adding team member', 'TeamService', { error });
        throw new TeamValidationError(`Failed to add team member: ${error.message}`, 'ADD_MEMBER_FAILED');
      }

      return {
        ...data,
        metadata: data.metadata as Record<string, any>,
        team: {
          ...data.team,
          settings: data.team.settings as Record<string, any>
        }
      };
    } catch (error) {
      logger.error('addTeamMember error', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Removes a team member from the team
   */
  static async removeTeamMember(teamId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ 
          status: 'left',
          is_active: false 
        })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error removing team member', 'TeamService', { error });
        throw new TeamValidationError(`Failed to remove team member: ${error.message}`, 'REMOVE_MEMBER_FAILED');
      }
    } catch (error) {
      logger.error('removeTeamMember error', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Updates a team member's role
   */
  static async updateMemberRole(teamId: string, userId: string, roleSlug: string): Promise<void> {
    try {
      // Get the role ID from slug
      const { data: role, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('slug', roleSlug)
        .eq('is_active', true)
        .single();

      if (roleError || !role) {
        throw new TeamValidationError(`Invalid role: ${roleSlug}`, 'INVALID_ROLE');
      }

      const { error } = await supabase
        .from('team_members')
        .update({ role_id: role.id })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) {
        logger.error('Error updating member role', 'TeamService', { error });
        throw new TeamValidationError(`Failed to update member role: ${error.message}`, 'UPDATE_ROLE_FAILED');
      }
    } catch (error) {
      logger.error('updateMemberRole error', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Gets team members with pagination and filtering
   */
  static async getTeamMembers(teamId: string, options?: TeamMemberQueryOptions): Promise<TeamMembersResponse> {
    try {
      let query = supabase
        .from('team_members')
        .select(`
          *,
          role:user_roles(*),
          user:profiles(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true);

      // Apply pagination
      const offset = ((options?.page || 1) - 1) * (options?.limit || 20);
      query = query.range(offset, offset + (options?.limit || 20) - 1);

      // Apply sorting
      query = query.order('joined_at', { ascending: false });

      const { data: members, error, count } = await query;

      if (error) {
        logger.error('Error fetching team members', 'TeamService', { error });
        throw new TeamValidationError(`Failed to fetch team members: ${error.message}`, 'FETCH_FAILED');
      }

      // Transform the data to match expected types
      const transformedMembers = (members || []).map(member => ({
        ...member,
        metadata: member.metadata as Record<string, any>
      }));

      return {
        members: transformedMembers,
        total: count || 0,
        page: options?.page || 1,
        limit: options?.limit || 20
      };
    } catch (error) {
      logger.error('getTeamMembers error', 'TeamService', { error });
      throw error;
    }
  }

  // Helper Methods

  /**
   * Validates team data before creation/update
   */
  private static validateTeamData(teamData: TeamCreateInput | TeamUpdateInput): void {
    if ('name' in teamData && (!teamData.name || teamData.name.trim().length === 0)) {
      throw new TeamValidationError('Team name is required', 'VALIDATION_ERROR', 'name');
    }

    if ('name' in teamData && teamData.name && teamData.name.length > 100) {
      throw new TeamValidationError('Team name must be 100 characters or less', 'VALIDATION_ERROR', 'name');
    }

    if (teamData.description && teamData.description.length > 500) {
      throw new TeamValidationError('Team description must be 500 characters or less', 'VALIDATION_ERROR', 'description');
    }

    if ('member_limit' in teamData && teamData.member_limit && (teamData.member_limit < 1 || teamData.member_limit > 1000)) {
      throw new TeamValidationError('Member limit must be between 1 and 1000', 'VALIDATION_ERROR', 'member_limit');
    }
  }

  /**
   * Generates a unique slug for a team name (now handled by RPC function)
   */
  private static async generateUniqueSlug(name: string): Promise<string> {
    logger.team('Generating unique slug for', { name });
    
    // This method is now deprecated since slug generation is handled by the RPC function
    // But keeping it for backward compatibility
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Use RPC function for slug checking to avoid RLS issues
    try {
      const { data: isUnique, error } = await supabase.rpc('is_slug_unique_safe', {
        p_slug: baseSlug
      });

      if (error) {
        logger.error('Error checking slug with RPC', 'TeamService', { error });
        // Fallback to random slug
        return `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      }

      if (isUnique) {
        return baseSlug;
      }

      // If not unique, append random string
      return `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      
    } catch (error) {
      logger.error('Error in generateUniqueSlug', 'TeamService', { error });
      // Fallback to random slug
      return `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }
  }

  /**
   * Checks if a slug is unique using the RLS-safe function
   */
  private static async isSlugUnique(slug: string, excludeTeamId?: string): Promise<boolean> {
    logger.team('Checking slug uniqueness for', { slug });
    
    try {
      const { data: isUnique, error } = await supabase.rpc('is_slug_unique_safe', {
        p_slug: slug,
        p_exclude_team_id: excludeTeamId || null
      });

      if (error) {
        logger.error('Error checking slug uniqueness with RPC', 'TeamService', { error });
        throw error;
      }

      logger.team('Slug uniqueness check result', { slug, isUnique });
      return isUnique;
      
    } catch (error) {
      logger.error('Error in isSlugUnique', 'TeamService', { error });
      throw error;
    }
  }

  /**
   * Updates the team member count for a given team
   */
  private static async updateTeamMemberCount(teamId: string): Promise<void> {
    try {
      const { count, error: countError } = await supabase
        .from('team_members')
        .select('id', { count: 'exact' })
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('status', 'active');

      if (countError) {
        logger.error('Error counting team members', 'TeamService', { error: countError });
        return;
      }

      const { error: updateError } = await supabase
        .from('teams')
        .update({ current_member_count: count || 0 })
        .eq('id', teamId);

      if (updateError) {
        logger.error('Error updating team member count', 'TeamService', { error: updateError });
      }
    } catch (error) {
      logger.error('updateTeamMemberCount error', 'TeamService', { error });
    }
  }

  /**
   * Gets user roles across teams
   */
  static async getUserTeamRoles(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          team:teams(id, name, slug),
          role:user_roles(id, name, slug, hierarchy_level)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        logger.error('Error fetching user team roles', 'TeamService', { error });
        throw new TeamValidationError(`Failed to fetch user team roles: ${error.message}`, 'FETCH_FAILED');
      }

      return data || [];
    } catch (error) {
      logger.error('getUserTeamRoles error', 'TeamService', { error });
      return [];
    }
  }

  /**
   * Gets team permissions for a user
   */
  static async getTeamPermissions(teamId: string, userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          role:user_roles(
            role_permissions(
              permission:permissions(slug)
            )
          )
        `)
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) {
        logger.error('Error fetching team permissions', 'TeamService', { error });
        return [];
      }

      // Extract permission slugs
      const permissions = data?.role?.role_permissions?.map(
        (rp: any) => rp.permission.slug
      ) || [];

      return permissions;
    } catch (error) {
      logger.error('getTeamPermissions error', 'TeamService', { error });
      return [];
    }
  }

  /**
   * Gets all available user roles
   */
  static async getUserRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: false });

      if (error) {
        logger.error('Error fetching user roles', 'TeamService', { error });
        throw new TeamValidationError(`Failed to fetch user roles: ${error.message}`, 'FETCH_FAILED');
      }

      return data || [];
    } catch (error) {
      logger.error('getUserRoles error', 'TeamService', { error });
      return [];
    }
  }
}

export default TeamService;
