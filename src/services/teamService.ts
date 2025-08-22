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
    console.log('TeamService: Creating team with integration:', teamData);
    
    try {
      this.validateTeamData(teamData);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        throw new TeamValidationError('User must be authenticated to create teams', 'AUTH_REQUIRED');
      }

      console.log('TeamService: Calling RPC function with data:', {
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
        console.error('TeamService: RPC function error:', error);
        throw new TeamValidationError(`Failed to create team: ${error.message}`, 'CREATION_FAILED');
      }

      // Type assertion for RPC response
      const rpcResult = data as any;
      
      if (!rpcResult?.success) {
        console.error('TeamService: RPC function returned error:', rpcResult);
        throw new TeamValidationError(rpcResult?.message || 'Failed to create team', 'CREATION_FAILED');
      }

      console.log('TeamService: Team created successfully with RPC:', rpcResult);
      
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
      console.error('TeamService: Error in createTeamWithIntegration:', error);
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
        console.error('Error fetching team:', error);
        throw new TeamValidationError(`Failed to fetch team: ${error.message}`, 'FETCH_FAILED');
      }

      return {
        ...data,
        settings: data.settings as Record<string, any>
      };
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
        console.error('Error updating team:', error);
        throw new TeamValidationError(`Failed to update team: ${error.message}`, 'UPDATE_FAILED');
      }

      return {
        ...data,
        settings: data.settings as Record<string, any>
      };
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
      const { error } = await supabase
        .from('teams')
        .update({ is_active: false })
        .eq('id', teamId);

      if (error) {
        console.error('Error deleting team:', error);
        throw new TeamValidationError(`Failed to delete team: ${error.message}`, 'DELETE_FAILED');
      }
    } catch (error) {
      console.error('TeamService.deleteTeam error:', error);
      throw error;
    }
  }

  /**
   * Gets all teams for a specific user (simplified for new RLS structure)
   */
  static async getTeamsByUser(userId: string, options?: TeamQueryOptions): Promise<Team[]> {
    console.log('TeamService: Fetching teams for user:', userId, 'with options:', options);

    try {
      // Use the fixed safe function to get user teams without recursion
      const { data: userTeams, error: userTeamsError } = await supabase
        .rpc('get_user_teams_safe', { p_user_id: userId });

      if (userTeamsError) {
        console.error('TeamService: Error fetching user teams:', userTeamsError);
        throw new TeamValidationError('Failed to fetch user teams', 'FETCH_ERROR');
      }

      if (!userTeams || userTeams.length === 0) {
        console.log('TeamService: No teams found for user');
        return [];
      }

      // Get team IDs from the function result
      const teamIds = userTeams.map((t: any) => t.team_id);
      console.log('TeamService: Found team IDs:', teamIds);

      // Now fetch the full team data using the IDs
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('TeamService: Error fetching team details:', error);
        return [];
      }

      console.log('TeamService: Successfully fetched teams:', teams || []);
      return (teams || []).map(team => ({
        ...team,
        settings: team.settings as Record<string, any>
      })) as Team[];

    } catch (error) {
      console.error('TeamService: Error in getTeamsByUser:', error);
      return [];
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
        console.error('Error fetching team stats:', error);
        throw new TeamValidationError(`Failed to fetch team stats: ${error.message}`, 'FETCH_FAILED');
      }

      return data;
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
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching team activity:', error);
        throw new TeamValidationError(`Failed to fetch team activity: ${error.message}`, 'FETCH_FAILED');
      }

      return data || [];
    } catch (error) {
      console.error('TeamService.getTeamActivity error:', error);
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
        console.error('Error adding team member:', error);
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
      console.error('TeamService.addTeamMember error:', error);
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
        console.error('Error removing team member:', error);
        throw new TeamValidationError(`Failed to remove team member: ${error.message}`, 'REMOVE_MEMBER_FAILED');
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
        console.error('Error updating member role:', error);
        throw new TeamValidationError(`Failed to update member role: ${error.message}`, 'UPDATE_ROLE_FAILED');
      }
    } catch (error) {
      console.error('TeamService.updateMemberRole error:', error);
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
        console.error('Error fetching team members:', error);
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
      console.error('TeamService.getTeamMembers error:', error);
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
    console.log('TeamService: Generating unique slug for:', name);
    
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
        console.error('TeamService: Error checking slug with RPC:', error);
        // Fallback to random slug
        return `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      }

      if (isUnique) {
        return baseSlug;
      }

      // If not unique, append random string
      return `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      
    } catch (error) {
      console.error('TeamService: Error in generateUniqueSlug:', error);
      // Fallback to random slug
      return `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
    }
  }

  /**
   * Checks if a slug is unique using the RLS-safe function
   */
  private static async isSlugUnique(slug: string, excludeTeamId?: string): Promise<boolean> {
    console.log('TeamService: Checking slug uniqueness for:', slug);
    
    try {
      const { data: isUnique, error } = await supabase.rpc('is_slug_unique_safe', {
        p_slug: slug,
        p_exclude_team_id: excludeTeamId || null
      });

      if (error) {
        console.error('Error checking slug uniqueness with RPC:', error);
        throw error;
      }

      console.log(`TeamService: Slug "${slug}" uniqueness check result:`, isUnique);
      return isUnique;
      
    } catch (error) {
      console.error('TeamService: Error in isSlugUnique:', error);
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
        console.error('Error counting team members:', countError);
        return;
      }

      const { error: updateError } = await supabase
        .from('teams')
        .update({ current_member_count: count || 0 })
        .eq('id', teamId);

      if (updateError) {
        console.error('Error updating team member count:', updateError);
      }
    } catch (error) {
      console.error('TeamService.updateTeamMemberCount error:', error);
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
        console.error('Error fetching user team roles:', error);
        throw new TeamValidationError(`Failed to fetch user team roles: ${error.message}`, 'FETCH_FAILED');
      }

      return data || [];
    } catch (error) {
      console.error('TeamService.getUserTeamRoles error:', error);
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
        console.error('Error fetching team permissions:', error);
        return [];
      }

      // Extract permission slugs
      const permissions = data?.role?.role_permissions?.map(
        (rp: any) => rp.permission.slug
      ) || [];

      return permissions;
    } catch (error) {
      console.error('TeamService.getTeamPermissions error:', error);
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
        console.error('Error fetching user roles:', error);
        throw new TeamValidationError(`Failed to fetch user roles: ${error.message}`, 'FETCH_FAILED');
      }

      return data || [];
    } catch (error) {
      console.error('TeamService.getUserRoles error:', error);
      return [];
    }
  }
}

export default TeamService;
