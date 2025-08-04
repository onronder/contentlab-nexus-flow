import React from 'react';
import { 
  Users, 
  FolderOpen, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Target,
  Calendar,
  Award
} from 'lucide-react';
import { 
  AnalyticsCard, 
  ProjectCountCard, 
  ActiveProjectsCard, 
  CompletionRateCard, 
  TeamMembersCard 
} from '@/components/analytics/AnalyticsCard';
import { 
  ProjectPieChart, 
  ProjectBarChart, 
  ProjectLineChart 
} from '@/components/analytics/AnalyticsCharts';
import { useProjectAnalytics } from '@/hooks/useProjectAnalytics';
import { Project } from '@/types/projects';

interface ProjectAnalyticsCardsProps {
  projects: Project[];
  isLoading: boolean;
  teamStats?: {
    total: number;
    active: number;
    planning: number;
    completed: number;
    paused: number;
    archived: number;
    cancelled: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    criticalPriority: number;
  };
}

export function ProjectAnalyticsCards({ projects, isLoading, teamStats }: ProjectAnalyticsCardsProps) {
  const {
    analytics,
    isLoading: analyticsLoading,
    isError,
    errorMessage,
    refreshAnalytics,
    hasData,
    isEmpty
  } = useProjectAnalytics();

  const loading = isLoading || analyticsLoading;

  // Handle empty state
  if (isEmpty && !loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <ProjectCountCard count={0} isLoading={false} />
        <ActiveProjectsCard count={0} isLoading={false} />
        <CompletionRateCard rate={0} isLoading={false} />
        <TeamMembersCard count={0} isLoading={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6" role="region" aria-label="Project Analytics Dashboard">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProjectCountCard
          count={analytics.totalProjects}
          isLoading={loading}
          error={isError ? errorMessage : undefined}
          onRetry={refreshAnalytics}
        />
        <ActiveProjectsCard
          count={analytics.activeProjects}
          isLoading={loading}
          error={isError ? errorMessage : undefined}
          onRetry={refreshAnalytics}
        />
        <AnalyticsCard
          title="Completed Projects"
          value={analytics.completedProjects}
          description="Successfully finished"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant={analytics.completedProjects > 0 ? 'success' : 'default'}
          isLoading={loading}
          error={isError ? errorMessage : undefined}
          onRetry={refreshAnalytics}
        />
        <TeamMembersCard
          count={analytics.teamMembers}
          isLoading={loading}
          error={isError ? errorMessage : undefined}
          onRetry={refreshAnalytics}
        />
      </div>

      {/* Charts */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectPieChart
            title="Projects by Status"
            description="Distribution of project statuses"
            data={analytics.projectsByStatus.map(item => ({
              name: item.status,
              value: item.count,
              percentage: item.percentage
            }))}
            isLoading={loading}
            error={isError ? errorMessage : undefined}
            onRetry={refreshAnalytics}
          />
          <ProjectBarChart
            title="Projects by Priority"
            description="Project distribution by priority"
            data={analytics.projectsByPriority.map(item => ({
              name: item.priority,
              value: item.count
            }))}
            isLoading={loading}
            error={isError ? errorMessage : undefined}
            onRetry={refreshAnalytics}
          />
        </div>
      )}
    </div>
  );
}