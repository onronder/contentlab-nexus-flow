import { supabase } from '@/integrations/supabase/client';
import { Project, ProjectCreationInput, ProjectUpdateInput } from '@/types/projects';

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
        created_by: userId,
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
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_team_members!inner(user_id, role, invitation_status)
      `)
      .or(`created_by.eq.${userId},project_team_members.user_id.eq.${userId}`)
      .eq('project_team_members.invitation_status', 'active')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return (data || []).map(project => ({
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