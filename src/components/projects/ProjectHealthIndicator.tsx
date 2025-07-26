import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Project } from '@/types/projects';
import { getProjectHealthStatus, calculateProjectPerformanceScore } from '@/utils/projectUtils';

interface ProjectHealthIndicatorProps {
  project: Project;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProjectHealthIndicator({ 
  project, 
  showScore = false,
  size = 'md' 
}: ProjectHealthIndicatorProps) {
  const healthStatus = getProjectHealthStatus(project);
  const performanceScore = calculateProjectPerformanceScore(project);

  const getHealthConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return {
          icon: CheckCircle,
          color: 'bg-success/10 text-success border-success/20',
          label: 'Excellent',
          description: 'Project is performing excellently'
        };
      case 'good':
        return {
          icon: CheckCircle,
          color: 'bg-success/10 text-success border-success/20',
          label: 'Good',
          description: 'Project is performing well'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'bg-warning/10 text-warning border-warning/20',
          label: 'At Risk',
          description: 'Project needs attention'
        };
      case 'critical':
        return {
          icon: XCircle,
          color: 'bg-destructive/10 text-destructive border-destructive/20',
          label: 'Critical',
          description: 'Project requires immediate action'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'bg-muted/10 text-muted-foreground border-muted/20',
          label: 'Unknown',
          description: 'Health status cannot be determined'
        };
    }
  };

  const config = getHealthConfig(healthStatus);
  const IconComponent = config.icon;
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.color} ${textSize} flex items-center gap-1`}
          >
            <IconComponent className={iconSize} />
            {config.label}
            {showScore && <span className="ml-1">({performanceScore}%)</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="font-medium">{config.description}</div>
            <div className="text-muted-foreground">Performance Score: {performanceScore}%</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}