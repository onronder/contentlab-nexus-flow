import { supabase } from '@/integrations/supabase/client';
import { 
  Project, 
  ProjectCreationInput, 
  ProjectUpdateInput,
  ProjectTeamMember,
  ProjectCompetitor,
  ProjectAnalytics,
  PermissionSet 
} from '@/types/projects';

// Custom interface for project analytics with extended fields
interface ProjectAnalyticsData {
  projectId: string;
  competitorCount: number;
  analysisCount: number;
  teamMemberCount: number;
  progressPercentage: number;
  lastActivityDate: Date;
  totalBudget: number;
  spentBudget: number;
  estimatedCompletion?: Date;
  keyMetrics: Record<string, any>;
}

export async function createProject(userId: string, projectData: ProjectCreationInput): Promise<Project> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        industry: projectData.industry,
        project_type: projectData.projectType,
        target_market: projectData.targetMarket,
        primary_objectives: projectData.primaryObjectives,
        success_metrics: projectData.successMetrics,
        is_public: projectData.isPublic,
        allow_team_access: projectData.allowTeamAccess,
        auto_analysis_enabled: projectData.autoAnalysisEnabled,
        notification_settings: projectData.notificationSettings as any,
        custom_fields: projectData.customFields as any,
        tags: projectData.tags,
        start_date: projectData.startDate?.toISOString(),
        target_end_date: projectData.targetEndDate?.toISOString(),
        // created_by will be automatically set by database default (auth.uid())
        status: 'planning',
        priority: 'medium'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // Add creator as project owner
    await supabase
      .from('project_team_members')
      .insert({
        project_id: data.id,
        user_id: userId,
        role: 'owner',
        invitation_status: 'active',
        permissions: {
          manageProject: true,
          manageTeam: true,
          manageCompetitors: true,
          runAnalysis: true,
          viewAnalytics: true,
          exportData: true,
          manageSettings: true
        }
      });

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      industry: data.industry,
      projectType: data.project_type as ProjectCreationInput['projectType'],
      targetMarket: data.target_market || '',
      primaryObjectives: Array.isArray(data.primary_objectives) ? 
        data.primary_objectives.filter((obj): obj is string => typeof obj === 'string') : [],
      successMetrics: Array.isArray(data.success_metrics) ? 
        data.success_metrics.filter((metric): metric is string => typeof metric === 'string') : [],
      status: data.status as Project['status'],
      priority: data.priority as Project['priority'],
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      targetEndDate: data.target_end_date ? new Date(data.target_end_date) : undefined,
      actualEndDate: data.actual_end_date ? new Date(data.actual_end_date) : undefined,
      isPublic: data.is_public,
      allowTeamAccess: data.allow_team_access,
      autoAnalysisEnabled: data.auto_analysis_enabled,
      notificationSettings: typeof data.notification_settings === 'object' && data.notification_settings ? 
        (data.notification_settings as unknown as Project['notificationSettings']) : 
        { email: true, inApp: true, frequency: 'daily' },
      customFields: typeof data.custom_fields === 'object' && data.custom_fields ? 
        data.custom_fields as Record<string, any> : {},
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdBy: data.created_by,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      competitorCount: 0,
      analysisCount: 0,
      teamMemberCount: 1
    };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function fetchUserProjects(userId: string): Promise<Project[]> {
  try {
    // Query 1: Projects created by the user
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .order('updated_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned projects:', ownedError);
      throw new Error(`Failed to fetch projects: ${ownedError.message}`);
    }

    // Query 2: Projects where user is a team member
    const { data: memberProjects, error: memberError } = await supabase
      .from('projects')
      .select(`
        *,
        project_team_members!inner(user_id, role, invitation_status)
      `)
      .eq('project_team_members.user_id', userId)
      .eq('project_team_members.invitation_status', 'active')
      .order('updated_at', { ascending: false });

    if (memberError) {
      console.error('Error fetching member projects:', memberError);
      throw new Error(`Failed to fetch projects: ${memberError.message}`);
    }

    // Merge and deduplicate results
    const projectMap = new Map<string, any>();

    // Add owned projects
    (ownedProjects || []).forEach(project => {
      projectMap.set(project.id, {
        ...project,
        project_team_members: [],
      });
    });

    // Add member projects (may overwrite if user is both owner and member)
    (memberProjects || []).forEach(project => {
      const existingProject = projectMap.get(project.id);
      projectMap.set(project.id, {
        ...project,
        project_team_members: existingProject?.project_team_members || project.project_team_members || [],
      });
    });

    // Convert to array and sort by updated_at
    const projects = Array.from(projectMap.values())
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description || '',
      industry: project.industry,
      projectType: project.project_type as ProjectCreationInput['projectType'],
      targetMarket: project.target_market || '',
      primaryObjectives: Array.isArray(project.primary_objectives) ? 
        project.primary_objectives.filter((obj): obj is string => typeof obj === 'string') : [],
      successMetrics: Array.isArray(project.success_metrics) ? 
        project.success_metrics.filter((metric): metric is string => typeof metric === 'string') : [],
      status: project.status as Project['status'],
      priority: project.priority as Project['priority'],
      startDate: project.start_date ? new Date(project.start_date) : undefined,
      targetEndDate: project.target_end_date ? new Date(project.target_end_date) : undefined,
      actualEndDate: project.actual_end_date ? new Date(project.actual_end_date) : undefined,
      isPublic: project.is_public,
      allowTeamAccess: project.allow_team_access,
      autoAnalysisEnabled: project.auto_analysis_enabled,
      notificationSettings: typeof project.notification_settings === 'object' && project.notification_settings ? 
        (project.notification_settings as unknown as Project['notificationSettings']) : 
        { email: true, inApp: true, frequency: 'daily' },
      customFields: typeof project.custom_fields === 'object' && project.custom_fields ? 
        project.custom_fields as Record<string, any> : {},
      tags: Array.isArray(project.tags) ? project.tags : [],
      createdBy: project.created_by,
      organizationId: project.organization_id,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
      competitorCount: 0,
      analysisCount: 0,
      teamMemberCount: project.project_team_members?.length || 0
    }));
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

/**
 * Update an existing project with partial data
 */
export async function updateProject(projectId: string, updates: Partial<ProjectUpdateInput>): Promise<Project> {
  try {
    const updateData: any = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.industry) updateData.industry = updates.industry;
    if (updates.targetMarket !== undefined) updateData.target_market = updates.targetMarket;
    if (updates.primaryObjectives) updateData.primary_objectives = updates.primaryObjectives;
    if (updates.successMetrics) updateData.success_metrics = updates.successMetrics;
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate?.toISOString();
    if (updates.targetEndDate !== undefined) updateData.target_end_date = updates.targetEndDate?.toISOString();
    if (updates.actualEndDate !== undefined) updateData.actual_end_date = updates.actualEndDate?.toISOString();
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.allowTeamAccess !== undefined) updateData.allow_team_access = updates.allowTeamAccess;
    if (updates.autoAnalysisEnabled !== undefined) updateData.auto_analysis_enabled = updates.autoAnalysisEnabled;
    if (updates.notificationSettings) updateData.notification_settings = updates.notificationSettings;
    if (updates.customFields) updateData.custom_fields = updates.customFields;
    if (updates.tags) updateData.tags = updates.tags;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      industry: data.industry,
      projectType: data.project_type as ProjectCreationInput['projectType'],
      targetMarket: data.target_market || '',
      primaryObjectives: Array.isArray(data.primary_objectives) ? 
        data.primary_objectives.filter((obj): obj is string => typeof obj === 'string') : [],
      successMetrics: Array.isArray(data.success_metrics) ? 
        data.success_metrics.filter((metric): metric is string => typeof metric === 'string') : [],
      status: data.status as Project['status'],
      priority: data.priority as Project['priority'],
      startDate: data.start_date ? new Date(data.start_date) : undefined,
      targetEndDate: data.target_end_date ? new Date(data.target_end_date) : undefined,
      actualEndDate: data.actual_end_date ? new Date(data.actual_end_date) : undefined,
      isPublic: data.is_public,
      allowTeamAccess: data.allow_team_access,
      autoAnalysisEnabled: data.auto_analysis_enabled,
      notificationSettings: typeof data.notification_settings === 'object' && data.notification_settings ? 
        (data.notification_settings as unknown as Project['notificationSettings']) : 
        { email: true, inApp: true, frequency: 'daily' },
      customFields: typeof data.custom_fields === 'object' && data.custom_fields ? 
        data.custom_fields as Record<string, any> : {},
      tags: Array.isArray(data.tags) ? data.tags : [],
      createdBy: data.created_by,
      organizationId: data.organization_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      competitorCount: 0,
      analysisCount: 0,
      teamMemberCount: 0
    };
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

/**
 * Archive a project (soft delete)
 */
export async function archiveProject(projectId: string, userId: string): Promise<Project> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to archive project: ${error.message}`);
    }

    return updateProject(projectId, { status: 'archived' });
  } catch (error) {
    console.error('Error archiving project:', error);
    throw error;
  }
}

/**
 * Restore an archived project
 */
export async function restoreProject(projectId: string, userId: string): Promise<Project> {
  try {
    return updateProject(projectId, { status: 'active' });
  } catch (error) {
    console.error('Error restoring project:', error);
    throw error;
  }
}

/**
 * Delete a project permanently
 */
export async function deleteProject(projectId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

/**
 * Fetch project analytics data
 */
export async function fetchProjectAnalytics(projectId: string): Promise<ProjectAnalyticsData> {
  try {
    // Get competitor count
    const { count: competitorCount } = await supabase
      .from('project_competitors')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    // Get analysis count
    const { count: analysisCount } = await supabase
      .from('project_analytics')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId);

    // Get team member count
    const { count: teamMemberCount } = await supabase
      .from('project_team_members')
      .select('id', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('invitation_status', 'active');

    // Get project details for progress calculation
    const { data: project, error } = await supabase
      .from('projects')
      .select('status, start_date, target_end_date')
      .eq('id', projectId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch project details: ${error.message}`);
    }

    // Calculate progress percentage based on status and dates
    let progressPercentage = 0;
    if (project.status === 'completed') {
      progressPercentage = 100;
    } else if (project.status === 'active' && project.start_date && project.target_end_date) {
      const startDate = new Date(project.start_date);
      const targetDate = new Date(project.target_end_date);
      const currentDate = new Date();
      
      if (currentDate >= startDate && currentDate <= targetDate) {
        const totalDuration = targetDate.getTime() - startDate.getTime();
        const elapsed = currentDate.getTime() - startDate.getTime();
        progressPercentage = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
      }
    }

    return {
      projectId,
      competitorCount: competitorCount || 0,
      analysisCount: analysisCount || 0,
      teamMemberCount: teamMemberCount || 0,
      progressPercentage: Math.round(progressPercentage),
      lastActivityDate: new Date(),
      totalBudget: 0,
      spentBudget: 0,
      estimatedCompletion: project.target_end_date ? new Date(project.target_end_date) : undefined,
      keyMetrics: {}
    };
  } catch (error) {
    console.error('Error fetching project analytics:', error);
    throw error;
  }
}

/**
 * Fetch project team members with profile information
 */
export async function fetchProjectTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
  try {
    const { data, error } = await supabase
      .from('project_team_members')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .eq('invitation_status', 'active');

    if (error) {
      throw new Error(`Failed to fetch team members: ${error.message}`);
    }

    return (data || []).map(member => ({
      id: member.id,
      projectId: member.project_id,
      userId: member.user_id,
      role: member.role as ProjectTeamMember['role'],
      permissions: (typeof member.permissions === 'object' && member.permissions) ? 
        member.permissions as PermissionSet : {},
      accessLevel: member.access_level as ProjectTeamMember['accessLevel'],
      allowedSections: (member.allowed_sections || []) as ProjectTeamMember['allowedSections'],
      invitationStatus: member.invitation_status as ProjectTeamMember['invitationStatus'],
      invitedBy: member.invited_by,
      invitedAt: member.invited_at ? new Date(member.invited_at) : undefined,
      joinedAt: member.joined_at ? new Date(member.joined_at) : undefined,
      lastActivity: member.last_activity ? new Date(member.last_activity) : undefined,
      isTemporary: member.is_temporary || false,
      expirationDate: member.expiration_date ? new Date(member.expiration_date) : undefined,
      createdAt: new Date(member.created_at),
      updatedAt: new Date(member.updated_at),
      user: {
        id: member.user_id,
        name: (member as any).profiles?.full_name || 'Unknown User',
        email: (member as any).profiles?.email || '',
        avatar: (member as any).profiles?.avatar_url
      }
    }));
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
}

/**
 * Fetch project competitors
 */
export async function fetchProjectCompetitors(projectId: string): Promise<ProjectCompetitor[]> {
  try {
    const { data, error } = await supabase
      .from('project_competitors')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch competitors: ${error.message}`);
    }

    return (data || []).map(competitor => ({
      id: competitor.id,
      projectId: competitor.project_id,
      companyName: competitor.company_name,
      domain: competitor.domain,
      industry: competitor.industry,
      competitiveTier: competitor.competitive_tier as ProjectCompetitor['competitiveTier'],
      threatLevel: competitor.threat_level as ProjectCompetitor['threatLevel'],
      companySize: competitor.company_size,
      marketShareEstimate: competitor.market_share_estimate,
      valueProposition: competitor.value_proposition,
      monitoringEnabled: competitor.monitoring_enabled || false,
      analysisFrequency: competitor.analysis_frequency as ProjectCompetitor['analysisFrequency'],
      lastAnalysisDate: competitor.last_analysis_date ? new Date(competitor.last_analysis_date) : undefined,
      analysisCount: competitor.analysis_count || 0,
      dataQualityScore: competitor.data_quality_score,
      customAttributes: (typeof competitor.custom_attributes === 'object' && competitor.custom_attributes) ? 
        competitor.custom_attributes as Record<string, any> : {},
      tags: competitor.tags || [],
      addedBy: competitor.added_by,
      createdAt: new Date(competitor.created_at),
      updatedAt: new Date(competitor.updated_at)
    }));
  } catch (error) {
    console.error('Error fetching competitors:', error);
    throw error;
  }
}