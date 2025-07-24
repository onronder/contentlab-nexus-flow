import React, { memo, useMemo, useCallback } from 'react';
import { Calendar, Users, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Project } from '@/types/projects';

interface ProjectListViewProps {
  projects: Project[];
  selectedProjects: string[];
  onProjectSelect: (projectId: string, selected: boolean) => void;
  onProjectClick: (project: Project) => void;
}

// Memoized table row component
const ProjectRow = memo(({ 
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
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "paused": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "planning": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "archived": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  }, [project.status]);

  const priorityColor = useMemo(() => {
    switch (project.priority) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
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

  const handleRowClick = useCallback(() => {
    onClick();
  }, [onClick]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 ${
        isSelected ? 'bg-muted' : ''
      }`}
      onClick={handleRowClick}
    >
      <TableCell onClick={handleCheckboxClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleSelectChange}
        />
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-sm">
              {projectInitial}
            </span>
          </div>
          <div>
            <div className="font-medium line-clamp-1">{project.name}</div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {project.description || 'No description'}
            </div>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {projectTypeLabel}
        </Badge>
      </TableCell>
      
      <TableCell>
        <Badge className={statusColor}>
          {project.status}
        </Badge>
      </TableCell>
      
      <TableCell>
        <Badge className={priorityColor}>
          {project.priority}
        </Badge>
      </TableCell>
      
      <TableCell>
        <span className="text-sm">{project.industry}</span>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="text-sm">{project.teamMemberCount}</span>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formattedDate}
        </div>
      </TableCell>
      
      <TableCell>
        {project.targetEndDate ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formattedDueDate}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      
      <TableCell onClick={handleDropdownClick}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRowClick}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>Edit Project</DropdownMenuItem>
            <DropdownMenuItem>Archive</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

ProjectRow.displayName = 'ProjectRow';

// Header checkbox component
const HeaderCheckbox = memo(({ 
  projects, 
  selectedProjects, 
  onProjectSelect 
}: {
  projects: Project[];
  selectedProjects: string[];
  onProjectSelect: (projectId: string, selected: boolean) => void;
}) => {
  const isAllSelected = useMemo(() => 
    selectedProjects.length === projects.length && projects.length > 0,
    [selectedProjects.length, projects.length]
  );

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      projects.forEach(project => {
        if (!selectedProjects.includes(project.id)) {
          onProjectSelect(project.id, true);
        }
      });
    } else {
      selectedProjects.forEach(id => onProjectSelect(id, false));
    }
  }, [projects, selectedProjects, onProjectSelect]);

  return (
    <Checkbox
      checked={isAllSelected}
      onCheckedChange={handleSelectAll}
    />
  );
});

HeaderCheckbox.displayName = 'HeaderCheckbox';

// Main component with memoization
export const ProjectListViewOptimized = memo(({
  projects,
  selectedProjects,
  onProjectSelect,
  onProjectClick
}: ProjectListViewProps) => {
  // Memoized selected projects set for O(1) lookup
  const selectedProjectsSet = useMemo(() => 
    new Set(selectedProjects), 
    [selectedProjects]
  );

  // Memoized event handlers
  const handleProjectSelect = useCallback((projectId: string) => 
    (selected: boolean) => onProjectSelect(projectId, selected),
    [onProjectSelect]
  );

  const handleProjectClick = useCallback((project: Project) => 
    () => onProjectClick(project),
    [onProjectClick]
  );

  // Memoized table rows
  const tableRows = useMemo(() => 
    projects.map((project) => (
      <ProjectRow
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <HeaderCheckbox
                projects={projects}
                selectedProjects={selectedProjects}
                onProjectSelect={onProjectSelect}
              />
            </TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableRows}
        </TableBody>
      </Table>
    </div>
  );
});

ProjectListViewOptimized.displayName = 'ProjectListViewOptimized';