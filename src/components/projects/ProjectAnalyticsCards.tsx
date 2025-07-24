import React from 'react';
import { Users, Folder, CheckCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types/projects';

interface ProjectAnalyticsCardsProps {
  projects: Project[];
  isLoading?: boolean;
}

export function ProjectAnalyticsCards({ projects, isLoading }: ProjectAnalyticsCardsProps) {
  const analytics = React.useMemo(() => {
    if (!projects.length) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        teamMembers: 0,
        avgProgress: 0,
        overdue: 0
      };
    }

    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const teamMembers = projects.reduce((sum, p) => sum + (p.teamMemberCount || 0), 0);
    
    // Calculate overdue projects
    const now = new Date();
    const overdue = projects.filter(p => 
      p.targetEndDate && 
      new Date(p.targetEndDate) < now && 
      p.status !== 'completed'
    ).length;

    // Calculate average progress (mock calculation based on status)
    const progressSum = projects.reduce((sum, p) => {
      switch (p.status) {
        case 'planning': return sum + 10;
        case 'active': return sum + 50;
        case 'paused': return sum + 30;
        case 'completed': return sum + 100;
        case 'archived': return sum + 100;
        default: return sum;
      }
    }, 0);
    const avgProgress = projects.length > 0 ? Math.round(progressSum / projects.length) : 0;

    return {
      total,
      active,
      completed,
      teamMembers,
      avgProgress,
      overdue
    };
  }, [projects]);

  const cards = [
    {
      title: 'Total Projects',
      value: analytics.total,
      icon: Folder,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      change: null
    },
    {
      title: 'Active Projects',
      value: analytics.active,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      change: null
    },
    {
      title: 'Completed',
      value: analytics.completed,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      change: null
    },
    {
      title: 'Team Members',
      value: analytics.teamMembers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      change: null
    },
    {
      title: 'Avg Progress',
      value: `${analytics.avgProgress}%`,
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
      change: null
    },
    {
      title: 'Overdue',
      value: analytics.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      change: null,
      alert: analytics.overdue > 0
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {cards.map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-muted rounded-lg"></div>
                <div className="ml-4 space-y-2">
                  <div className="h-4 w-20 bg-muted rounded"></div>
                  <div className="h-6 w-12 bg-muted rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="hover-scale transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold">{card.value}</p>
                    {card.alert && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Alert
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}