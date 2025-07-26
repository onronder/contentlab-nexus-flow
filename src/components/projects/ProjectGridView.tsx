import React from 'react';
import { Calendar, Users, MoreVertical, Clock, CheckSquare, Square, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AccessibleCard } from '@/components/ui/accessible-card';
import { AccessibleButton } from '@/components/ui/accessible-button';
import { Project } from '@/types/projects';
import { useFocusManagement } from '@/hooks/useFocusManagement';
import { ProjectHealthIndicator } from './ProjectHealthIndicator';
import { ProjectProgressBar } from './ProjectProgressBar';

interface ProjectGridViewProps {
  projects: Project[];
  selectedProjects: string[];
  onProjectSelect: (projectId: string, selected: boolean) => void;
  onProjectClick: (project: Project) => void;
}

export function ProjectGridView({
  projects,
  selectedProjects,
  onProjectSelect,
  onProjectClick
}: ProjectGridViewProps) {
  const { handleArrowNavigation, getButtonProps, getLinkProps } = useFocusManagement();
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "paused": return "bg-yellow-500";
      case "planning": return "bg-purple-500";
      case "archived": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "high": return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "medium": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "low": return "border-green-500 bg-green-50 dark:bg-green-950/20";
      default: return "border-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'competitive_analysis': return 'Competitive Analysis';
      case 'market_research': return 'Market Research';
      case 'brand_monitoring': return 'Brand Monitoring';
      case 'content_strategy': return 'Content Strategy';
      case 'seo_analysis': return 'SEO Analysis';
      default: return type;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, container: HTMLElement) => {
    handleArrowNavigation(event, container, 'horizontal');
  };

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      role="grid"
      aria-label={`${projects.length} projects in grid view`}
      onKeyDown={(e) => handleKeyDown(e, e.currentTarget)}
    >
      {projects.map((project) => {
        const isSelected = selectedProjects.includes(project.id);
        
        return (
          <AccessibleCard
            key={project.id} 
            id={`project-${project.id}`}
            interactive={true}
            selected={isSelected}
            label={`${project.name} - ${getProjectTypeLabel(project.projectType)} project`}
            description={`${project.description || 'No description'}. Status: ${project.status}. Priority: ${project.priority}. Team members: ${project.teamMemberCount}. Competitors: ${project.competitorCount}.`}
            onClick={() => onProjectClick(project)}
            className={`interactive-lift border-2 transition-all duration-200 ${getPriorityColor(project.priority)}`}
            role="gridcell"
            tabIndex={0}
          >
            <header className="pb-3 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      onProjectSelect(project.id, checked as boolean)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                    aria-label={`Select ${project.name} project`}
                    aria-describedby={`project-${project.id}-description`}
                  />
                  
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => onProjectClick(project)}
                    role="button"
                    tabIndex={-1}
                    aria-label={`View details for ${project.name}`}
                  >
                    <div className="relative">
                      <div 
                        className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <span className="text-primary font-semibold text-lg">
                          {project.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div 
                        className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(project.status)}`} 
                        aria-label={`Project status: ${project.status}`}
                        role="img"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold line-clamp-1">{project.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {getProjectTypeLabel(project.projectType)}
                        </Badge>
                        <Badge variant={project.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <AccessibleButton 
                      variant="ghost" 
                      size="sm"
                      description={`More actions for ${project.name} project`}
                      {...getButtonProps(`Open menu for ${project.name}`, 'Access additional project actions')}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">More actions</span>
                    </AccessibleButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg">
                    <DropdownMenuItem 
                      onClick={() => onProjectClick(project)}
                      className="focus:bg-muted focus:text-foreground"
                    >
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-muted focus:text-foreground">
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuItem className="focus:bg-muted focus:text-foreground">
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>
            
            <div 
              className="p-6 pt-0"
              onClick={() => onProjectClick(project)}
            >
              <p 
                id={`project-${project.id}-description`}
                className="text-sm mb-4 line-clamp-2 text-muted-foreground"
              >
                {project.description || 'No description provided'}
              </p>
              
              {/* Industry and Market */}
              <div className="mb-4" aria-label="Project categorization">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs" aria-label={`Industry: ${project.industry}`}>
                    {project.industry}
                  </Badge>
                  {project.targetMarket && (
                    <Badge variant="outline" className="text-xs" aria-label={`Target market: ${project.targetMarket}`}>
                      {project.targetMarket}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <ProjectProgressBar project={project} showLabel size="sm" />
              </div>

              {/* Health and Objectives */}
              <div className="flex items-center justify-between mb-4">
                <ProjectHealthIndicator project={project} size="sm" />
                {project.primaryObjectives && project.primaryObjectives.length > 0 && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Target className="h-3 w-3 mr-1" />
                    {project.primaryObjectives.length} objectives
                  </div>
                )}
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between mb-4 text-sm" aria-label="Project metrics">
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span aria-label={`${project.teamMemberCount} team members`}>
                      {project.teamMemberCount}
                    </span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="text-xs" aria-label={`${project.competitorCount} competitors being tracked`}>
                      {project.competitorCount} competitors
                    </span>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-xs text-muted-foreground" aria-label="Project timeline">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                  <time dateTime={project.updatedAt.toISOString()}>
                    Updated {formatDate(project.updatedAt)}
                  </time>
                </div>
                {project.targetEndDate && (
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" aria-hidden="true" />
                    <time dateTime={project.targetEndDate.toISOString()}>
                      Due {formatDate(project.targetEndDate)}
                    </time>
                  </div>
                )}
              </div>
            </div>
          </AccessibleCard>
        );
      })}
    </div>
  );
}