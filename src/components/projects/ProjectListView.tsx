import React from 'react';
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

export function ProjectListView({
  projects,
  selectedProjects,
  onProjectSelect,
  onProjectClick
}: ProjectListViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "paused": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "planning": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "archived": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
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

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedProjects.length === projects.length && projects.length > 0}
                onCheckedChange={(checked) => {
                  if (checked) {
                    projects.forEach(project => {
                      if (!selectedProjects.includes(project.id)) {
                        onProjectSelect(project.id, true);
                      }
                    });
                  } else {
                    selectedProjects.forEach(id => onProjectSelect(id, false));
                  }
                }}
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
          {projects.map((project) => {
            const isSelected = selectedProjects.includes(project.id);
            
            return (
              <TableRow 
                key={project.id}
                className={`cursor-pointer hover:bg-muted/50 ${
                  isSelected ? 'bg-muted' : ''
                }`}
                onClick={() => onProjectClick(project)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      onProjectSelect(project.id, checked as boolean)
                    }
                  />
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">
                        {project.name.charAt(0).toUpperCase()}
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
                    {getProjectTypeLabel(project.projectType)}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge className={`${getStatusColor(project.status)}`}>
                    {project.status}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <Badge className={`${getPriorityColor(project.priority)}`}>
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
                    {formatDate(project.updatedAt)}
                  </div>
                </TableCell>
                
                <TableCell>
                  {project.targetEndDate ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.targetEndDate)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onProjectClick(project)}>
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
          })}
        </TableBody>
      </Table>
    </div>
  );
}