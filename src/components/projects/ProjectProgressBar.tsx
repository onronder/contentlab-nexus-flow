import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Project } from '@/types/projects';
import { calculateProjectProgress, isProjectOverdue } from '@/utils/projectUtils';

interface ProjectProgressBarProps {
  project: Project;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProjectProgressBar({ 
  project, 
  showLabel = false,
  size = 'md' 
}: ProjectProgressBarProps) {
  const progress = calculateProjectProgress(project);
  const isOverdue = isProjectOverdue(project);
  
  const getProgressColor = () => {
    if (isOverdue) return 'bg-destructive';
    if (progress >= 80) return 'bg-success';
    if (progress >= 60) return 'bg-warning';
    return 'bg-primary';
  };

  const getProgressStatus = () => {
    if (isOverdue) return 'Overdue';
    if (progress >= 100) return 'Complete';
    if (progress >= 80) return 'Nearly Complete';
    if (progress >= 60) return 'On Track';
    if (progress >= 40) return 'In Progress';
    if (progress > 0) return 'Started';
    return 'Not Started';
  };

  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            {showLabel && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className={`text-xs font-medium ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                  {progress}%
                </span>
              </div>
            )}
            <div className={`relative w-full ${height} bg-muted rounded-full overflow-hidden`}>
              <div 
                className={`h-full transition-all duration-300 rounded-full ${getProgressColor()}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">{getProgressStatus()}</div>
            <div className="text-muted-foreground">
              {progress}% complete
              {isOverdue && <span className="text-destructive ml-1">(Overdue)</span>}
            </div>
            {project.startDate && project.targetEndDate && (
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(project.startDate).toLocaleDateString()} - {new Date(project.targetEndDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}