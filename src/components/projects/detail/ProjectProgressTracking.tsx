import React from 'react';
import { Project } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Clock, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

interface ProjectProgressTrackingProps {
  project: Project;
  analytics?: any;
}

export function ProjectProgressTracking({ project, analytics }: ProjectProgressTrackingProps) {
  const progressPercentage = analytics?.progressPercentage || project.progressPercentage || 0;
  const now = new Date();
  
  // Calculate timeline information
  const isStarted = project.startDate ? isBefore(project.startDate, now) : false;
  const isOverdue = project.targetEndDate ? isAfter(now, project.targetEndDate) : false;
  const daysRemaining = project.targetEndDate ? differenceInDays(project.targetEndDate, now) : null;
  const totalDays = project.startDate && project.targetEndDate ? 
    differenceInDays(project.targetEndDate, project.startDate) : null;
  const daysElapsed = project.startDate ? differenceInDays(now, project.startDate) : 0;

  // Mock milestones data
  const milestones = [
    {
      id: 1,
      name: 'Project Planning Complete',
      description: 'Complete initial project setup and planning phase',
      dueDate: project.startDate,
      completed: true,
      completedDate: project.startDate,
    },
    {
      id: 2,
      name: 'Competitor Research Phase',
      description: 'Identify and research key competitors in the market',
      dueDate: project.startDate ? new Date(project.startDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
      completed: progressPercentage > 25,
      completedDate: progressPercentage > 25 ? new Date() : undefined,
    },
    {
      id: 3,
      name: 'Analysis & Insights',
      description: 'Conduct detailed competitive analysis and generate insights',
      dueDate: project.startDate ? new Date(project.startDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
      completed: progressPercentage > 60,
      completedDate: progressPercentage > 60 ? new Date() : undefined,
    },
    {
      id: 4,
      name: 'Strategy Development',
      description: 'Develop actionable strategies based on analysis',
      dueDate: project.targetEndDate ? new Date(project.targetEndDate.getTime() - 7 * 24 * 60 * 60 * 1000) : null,
      completed: progressPercentage > 85,
      completedDate: progressPercentage > 85 ? new Date() : undefined,
    },
    {
      id: 5,
      name: 'Project Completion',
      description: 'Final review and project delivery',
      dueDate: project.targetEndDate,
      completed: progressPercentage === 100,
      completedDate: project.actualEndDate,
    },
  ];

  const completedMilestones = milestones.filter(m => m.completed).length;
  const totalMilestones = milestones.length;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressPercentage}%</div>
            <Progress value={progressPercentage} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedMilestones}/{totalMilestones}</div>
            <p className="text-xs text-muted-foreground">milestones completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {daysRemaining !== null ? (
                isOverdue ? (
                  <span className="text-destructive">Overdue</span>
                ) : (
                  `${daysRemaining}d`
                )
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {daysRemaining !== null && !isOverdue ? 'days remaining' : 'No deadline set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isOverdue ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : progressPercentage === 100 ? (
                <Badge variant="default">Complete</Badge>
              ) : progressPercentage > 75 ? (
                <Badge variant="default">On Track</Badge>
              ) : progressPercentage > 50 ? (
                <Badge variant="secondary">In Progress</Badge>
              ) : (
                <Badge variant="outline">Starting</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {project.startDate && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Project Start</p>
                  <p className="text-sm text-muted-foreground">
                    {format(project.startDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <Badge variant="default">Started</Badge>
              </div>
            )}

            {project.targetEndDate && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Target Completion</p>
                  <p className="text-sm text-muted-foreground">
                    {format(project.targetEndDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <Badge variant={isOverdue ? "destructive" : "outline"}>
                  {isOverdue ? "Overdue" : "Pending"}
                </Badge>
              </div>
            )}

            {project.actualEndDate && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Actual Completion</p>
                  <p className="text-sm text-muted-foreground">
                    {format(project.actualEndDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <Badge variant="default">Completed</Badge>
              </div>
            )}

            {totalDays && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Timeline Progress</span>
                  <span>{Math.max(0, Math.min(100, Math.round((daysElapsed / totalDays) * 100)))}%</span>
                </div>
                <Progress value={Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100))} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Project Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    milestone.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-muted-foreground bg-background'
                  }`}>
                    {milestone.completed && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className={`w-0.5 h-8 ${
                      milestone.completed ? 'bg-green-500' : 'bg-muted-foreground/30'
                    }`} />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`font-medium ${milestone.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {milestone.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {milestone.description}
                      </p>
                      {milestone.dueDate && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Due: {format(milestone.dueDate, 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={milestone.completed ? "default" : "outline"}>
                        {milestone.completed ? "Complete" : "Pending"}
                      </Badge>
                      {milestone.completedDate && (
                        <p className="text-xs text-muted-foreground">
                          Completed {format(milestone.completedDate, 'MMM d')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottlenecks & Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Potential Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isOverdue && (
              <div className="flex items-start gap-3 p-3 border border-destructive/20 bg-destructive/5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Project Overdue</p>
                  <p className="text-sm text-muted-foreground">
                    This project is past its target completion date. Consider revising the timeline or reallocating resources.
                  </p>
                </div>
              </div>
            )}

            {progressPercentage < 30 && daysRemaining !== null && daysRemaining < 14 && !isOverdue && (
              <div className="flex items-start gap-3 p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Progress Behind Schedule</p>
                  <p className="text-sm text-yellow-700">
                    Project progress appears to be behind schedule. Consider reviewing task priorities and resource allocation.
                  </p>
                </div>
              </div>
            )}

            {progressPercentage === 0 && daysElapsed > 7 && (
              <div className="flex items-start gap-3 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">No Progress Recorded</p>
                  <p className="text-sm text-blue-700">
                    The project was started but no progress has been recorded yet. Consider updating milestone completion status.
                  </p>
                </div>
              </div>
            )}

            {progressPercentage > 0 && progressPercentage < 100 && !isOverdue && daysRemaining !== null && daysRemaining > 0 && (
              <div className="flex items-start gap-3 p-3 border border-green-200 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">On Track</p>
                  <p className="text-sm text-green-700">
                    Project is progressing well and appears to be on schedule for completion.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}