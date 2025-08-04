import { useQuery } from '@tanstack/react-query';
import { fetchUserProjects } from '@/services/projectService';
import { useAuth } from '@/hooks/useAuth';
import { useTeamContext } from '@/contexts/TeamContext';
import { Project } from '@/types/projects';

/**
 * Team-aware project queries that automatically filter by current team context
 */

export function useTeamProjects() {
  const { user } = useAuth();
  const { currentTeam } = useTeamContext();

  return useQuery({
    queryKey: ['projects', 'team', user?.id, currentTeam?.id],
    queryFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return fetchUserProjects(user.id, currentTeam?.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useTeamProjectsStats() {
  const { data: projects = [], isLoading } = useTeamProjects();

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    planning: projects.filter(p => p.status === 'planning').length,
    paused: projects.filter(p => p.status === 'paused').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived: projects.filter(p => p.status === 'archived').length,
    cancelled: projects.filter(p => p.status === 'cancelled').length,
    highPriority: projects.filter(p => p.priority === 'high').length,
    mediumPriority: projects.filter(p => p.priority === 'medium').length,
    lowPriority: projects.filter(p => p.priority === 'low').length,
    criticalPriority: projects.filter(p => p.priority === 'critical').length,
  };

  return {
    stats,
    projects,
    isLoading,
  };
}

export function useTeamProjectById(projectId: string | undefined) {
  const { data: projects = [] } = useTeamProjects();

  const project = projects.find(p => p.id === projectId);

  return {
    project,
    isLoading: false, // Already loaded from useTeamProjects
    error: projectId && !project ? new Error('Project not found in team context') : null,
  };
}

export function useTeamProjectsByStatus(status: Project['status']) {
  const { data: projects = [], isLoading } = useTeamProjects();

  const filteredProjects = projects.filter(p => p.status === status);

  return {
    projects: filteredProjects,
    isLoading,
    count: filteredProjects.length,
  };
}

export function useTeamProjectsByPriority(priority: Project['priority']) {
  const { data: projects = [], isLoading } = useTeamProjects();

  const filteredProjects = projects.filter(p => p.priority === priority);

  return {
    projects: filteredProjects,
    isLoading,
    count: filteredProjects.length,
  };
}

export function useTeamProjectSearch(searchTerm: string) {
  const { data: projects = [], isLoading } = useTeamProjects();

  const filteredProjects = searchTerm
    ? projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : projects;

  return {
    projects: filteredProjects,
    isLoading,
    count: filteredProjects.length,
  };
}