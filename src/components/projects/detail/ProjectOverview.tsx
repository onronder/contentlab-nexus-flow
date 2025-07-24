import React from 'react';
import { Project, ProjectTeamMember } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Users, Target, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface ProjectOverviewProps {
  project: Project;
  analytics?: any;
  teamMembers?: ProjectTeamMember[];
}

export function ProjectOverview({ project, analytics, teamMembers }: ProjectOverviewProps) {
  const progressPercentage = analytics?.progressPercentage || project.progressPercentage || 0;
  const teamCount = teamMembers?.length || project.teamMemberCount || 0;
  const competitorCount = analytics?.competitorCount || project.competitorCount || 0;
  const analysisCount = analytics?.analysisCount || project.analysisCount || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {/* Project Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-2xl font-bold">{progressPercentage}%</div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progressPercentage < 25 ? 'Just getting started' :
               progressPercentage < 50 ? 'Making good progress' :
               progressPercentage < 75 ? 'More than halfway there' :
               progressPercentage < 100 ? 'Almost complete' : 'Completed!'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{teamCount}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {teamMembers?.slice(0, 3).map((member) => (
              <Badge key={member.id} variant="secondary" className="text-xs">
                {member.role}
              </Badge>
            ))}
            {teamCount > 3 && (
              <Badge variant="outline" className="text-xs">
                +{teamCount - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Competitors</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{competitorCount}</div>
          <p className="text-xs text-muted-foreground">
            {competitorCount === 0 ? 'No competitors added yet' :
             competitorCount === 1 ? '1 competitor being monitored' :
             `${competitorCount} competitors being monitored`}
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {project.startDate && (
              <div className="text-sm">
                <span className="text-muted-foreground">Started: </span>
                <span className="font-medium">{format(project.startDate, 'MMM d, yyyy')}</span>
              </div>
            )}
            {project.targetEndDate && (
              <div className="text-sm">
                <span className="text-muted-foreground">Target: </span>
                <span className="font-medium">{format(project.targetEndDate, 'MMM d, yyyy')}</span>
              </div>
            )}
            {!project.startDate && !project.targetEndDate && (
              <p className="text-xs text-muted-foreground">No timeline set</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Primary Objectives */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Primary Objectives</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {project.primaryObjectives.length > 0 ? (
            <div className="space-y-2">
              {project.primaryObjectives.slice(0, 3).map((objective, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm">{objective}</p>
                </div>
              ))}
              {project.primaryObjectives.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{project.primaryObjectives.length - 3} more objectives
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No objectives defined yet</p>
          )}
        </CardContent>
      </Card>

      {/* Success Metrics */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Metrics</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {project.successMetrics.length > 0 ? (
            <div className="space-y-2">
              {project.successMetrics.slice(0, 3).map((metric, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  <p className="text-sm">{metric}</p>
                </div>
              ))}
              {project.successMetrics.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{project.successMetrics.length - 3} more metrics
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No success metrics defined yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}