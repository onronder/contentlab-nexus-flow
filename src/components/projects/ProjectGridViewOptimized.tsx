import React, { memo, useMemo, useCallback } from 'react';
import { Calendar, Users, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project } from '@/types/projects';

interface ProjectGridViewProps {
  projects: Project[];
  selectedProjects: string[];
  onProjectSelect: (projectId: string, selected: boolean) => void;
  onProjectClick: (project: Project) => void;
}

// Memoized individual project card to prevent unnecessary re-renders
const ProjectCard = memo(({ 
  project, 
  isSelected, 
  onSelect, 
  onClick 
}: {
  project: Project;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
}) => {
  // Memoized style calculations
  const statusColor = useMemo(() => {
    switch (project.status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "paused": return "bg-yellow-500";
      case "planning": return "bg-purple-500";
      case "archived": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  }, [project.status]);

  const priorityColor = useMemo(() => {
    switch (project.priority) {
      case "critical": return "border-red-500 bg-red-50 dark:bg-red-950/20";
      case "high": return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
      case "medium": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
      case "low": return "border-green-500 bg-green-50 dark:bg-green-950/20";
      default: return "border-gray-500 bg-gray-50 dark:bg-gray-950/20";
    }
  }, [project.priority]);

  const formattedDate = useMemo(() => {
    return project.updatedAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [project.updatedAt]);

  const formattedDueDate = useMemo(() => {
    return project.targetEndDate?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [project.targetEndDate]);

  const projectTypeLabel = useMemo(() => {
    switch (project.projectType) {
      case 'competitive_analysis': return 'Competitive Analysis';
      case 'market_research': return 'Market Research';
      case 'brand_monitoring': return 'Brand Monitoring';
      case 'content_strategy': return 'Content Strategy';
      case 'seo_analysis': return 'SEO Analysis';
      default: return project.projectType;
    }
  }, [project.projectType]);

  const projectInitial = useMemo(() => 
    project.name.charAt(0).toUpperCase(), 
    [project.name]
  );

  // Memoized event handlers
  const handleSelectChange = useCallback((checked: boolean) => {
    onSelect(checked);
  }, [onSelect]);

  const handleCardClick = useCallback(() => {
    onClick();
  }, [onClick]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Card 
      className={`interactive-lift cursor-pointer border-2 transition-all duration-200 ${priorityColor} ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleSelectChange}
              onClick={handleCheckboxClick}
              className="mt-1"
            />
            
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={handleCardClick}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-lg">
                    {projectInitial}
                  </span>
                </div>
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${statusColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold line-clamp-1">{project.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {projectTypeLabel}
                  </Badge>
                  <Badge variant={project.priority === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                    {project.priority}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={handleDropdownClick}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCardClick}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Edit Project</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent onClick={handleCardClick}>
        <CardDescription className="text-sm mb-4 line-clamp-2">
          {project.description || 'No description provided'}
        </CardDescription>
        
        {/* Industry and Market */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">{project.industry}</Badge>
            {project.targetMarket && (
              <Badge variant="outline" className="text-xs">{project.targetMarket}</Badge>
            )}
          </div>
        </div>

        {/* Analytics */}
        <div className="flex items-center justify-between mb-4 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-muted-foreground">
              <Users className="h-3 w-3 mr-1" />
              <span>{project.teamMemberCount}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <span className="text-xs">Competitors: {project.competitorCount}</span>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Updated {formattedDate}
          </div>
          {project.targetEndDate && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Due {formattedDueDate}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ProjectCard.displayName = 'ProjectCard';

// Main component with memoization
export const ProjectGridViewOptimized = memo(({
  projects,
  selectedProjects,
  onProjectSelect,
  onProjectClick
}: ProjectGridViewProps) => {
  // Memoized selected projects set for O(1) lookup
  const selectedProjectsSet = useMemo(() => 
    new Set(selectedProjects), 
    [selectedProjects]
  );

  // Memoized event handlers to prevent unnecessary re-renders
  const handleProjectSelect = useCallback((projectId: string) => 
    (selected: boolean) => onProjectSelect(projectId, selected),
    [onProjectSelect]
  );

  const handleProjectClick = useCallback((project: Project) => 
    () => onProjectClick(project),
    [onProjectClick]
  );

  // Memoized project cards
  const projectCards = useMemo(() => 
    projects.map((project) => (
      <ProjectCard
        key={project.id}
        project={project}
        isSelected={selectedProjectsSet.has(project.id)}
        onSelect={handleProjectSelect(project.id)}
        onClick={handleProjectClick(project)}
      />
    )),
    [projects, selectedProjectsSet, handleProjectSelect, handleProjectClick]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projectCards}
    </div>
  );
});

ProjectGridViewOptimized.displayName = 'ProjectGridViewOptimized';