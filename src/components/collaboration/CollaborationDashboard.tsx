import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity,
  Users,
  MessageSquare,
  FileText,
  Clock,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Settings
} from 'lucide-react';
import { useCollaboration } from './CollaborationProvider';
import { supabase } from '@/integrations/supabase/client';

interface CollaborationMetrics {
  totalSessions: number;
  activeUsers: number;
  messageCount: number;
  fileShares: number;
  averageSessionDuration: number;
  collaborationScore: number;
  performanceMetrics: {
    latency: number;
    throughput: number;
    errorRate: number;
  };
}

interface TeamActivity {
  userId: string;
  userName: string;
  activity: string;
  timestamp: string;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'share';
}

export const CollaborationDashboard: React.FC<{ teamId: string; className?: string }> = ({
  teamId,
  className = ''
}) => {
  const { state, actions } = useCollaboration();
  const [metrics, setMetrics] = useState<CollaborationMetrics>({
    totalSessions: 0,
    activeUsers: 0,
    messageCount: 0,
    fileShares: 0,
    averageSessionDuration: 0,
    collaborationScore: 0,
    performanceMetrics: {
      latency: 0,
      throughput: 0,
      errorRate: 0
    }
  });
  const [recentActivity, setRecentActivity] = useState<TeamActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch collaboration metrics using real service
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        // Use real collaboration service instead of mock data
        const { realTimeCollaborationService } = await import('@/services/realTimeCollaborationService');
        const realMetrics = await realTimeCollaborationService.getCollaborationMetrics(teamId);
        
        setMetrics(realMetrics);

        // Fetch recent activity from real database
        const { data: activities, error: activityError } = await supabase
          .from('activity_logs')
          .select(`
            *,
            profiles:user_id(id, full_name, email)
          `)
          .eq('team_id', teamId)
          .in('activity_type', ['team_management', 'content_activity', 'system_event'])
          .order('created_at', { ascending: false })
          .limit(20);

        if (activityError) {
          console.warn('Error fetching activities:', activityError);
          // Fallback to project activities if activity_logs is not available
          const { data: projectActivities } = await supabase
            .from('project_activities')
            .select(`
              *,
              profiles:user_id(id, full_name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (projectActivities) {
            const formattedActivity: TeamActivity[] = projectActivities.map(activity => ({
              userId: activity.user_id || '',
              userName: (activity.profiles && typeof activity.profiles === 'object' && !Array.isArray(activity.profiles) && 'full_name' in activity.profiles) 
                ? (activity.profiles as any).full_name || 'Team Member' 
                : 'Team Member',
              activity: activity.activity_description || activity.activity_type,
              timestamp: activity.created_at,
              type: getActivityType(activity.activity_type)
            }));
            setRecentActivity(formattedActivity);
          }
        } else {
          // Format real activity data
          const formattedActivity: TeamActivity[] = activities?.map(activity => ({
            userId: activity.user_id || '',
            userName: (activity.profiles && typeof activity.profiles === 'object' && !Array.isArray(activity.profiles) && 'full_name' in activity.profiles) 
              ? (activity.profiles as any).full_name || 'Team Member' 
              : 'Team Member',
            activity: activity.description || activity.action,
            timestamp: activity.created_at,
            type: getActivityType(activity.action)
          })) || [];
          setRecentActivity(formattedActivity);
        }

      } catch (error) {
        console.error('Error fetching collaboration metrics:', error);
        // Set default metrics on error
        setMetrics({
          totalSessions: 0,
          activeUsers: state.participants.length,
          messageCount: 0,
          fileShares: 0,
          averageSessionDuration: 0,
          collaborationScore: 0,
          performanceMetrics: {
            latency: state.performance.messageLatency,
            throughput: state.performance.operationThroughput,
            errorRate: state.performance.conflictRate
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [teamId, state.participants.length, state.performance]);

  const getActivityType = (action: string): TeamActivity['type'] => {
    if (action.includes('join')) return 'join';
    if (action.includes('leave')) return 'leave';
    if (action.includes('edit') || action.includes('update')) return 'edit';
    if (action.includes('comment')) return 'comment';
    if (action.includes('share')) return 'share';
    return 'edit';
  };

  const getActivityIcon = (type: TeamActivity['type']) => {
    switch (type) {
      case 'join': return <Users className="h-4 w-4 text-green-500" />;
      case 'leave': return <Users className="h-4 w-4 text-red-500" />;
      case 'edit': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'comment': return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'share': return <FileText className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPerformanceStatus = (value: number, type: 'latency' | 'throughput' | 'errorRate') => {
    switch (type) {
      case 'latency':
        if (value < 100) return 'excellent';
        if (value < 200) return 'good';
        if (value < 500) return 'fair';
        return 'poor';
      case 'throughput':
        if (value > 50) return 'excellent';
        if (value > 20) return 'good';
        if (value > 10) return 'fair';
        return 'poor';
      case 'errorRate':
        if (value < 1) return 'excellent';
        if (value < 5) return 'good';
        if (value < 10) return 'fair';
        return 'poor';
      default:
        return 'fair';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Collaboration Dashboard</h2>
        <div className="flex items-center gap-2">
          <Badge variant={state.isConnected ? 'default' : 'destructive'}>
            {state.isConnected ? 'Real-time Active' : 'Offline'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={actions.optimizePerformance}
          >
            <Zap className="h-4 w-4 mr-2" />
            Optimize
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{metrics.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{metrics.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Duration</p>
                <p className="text-2xl font-bold">{metrics.averageSessionDuration}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collaboration Score</p>
                <p className="text-2xl font-bold">{metrics.collaborationScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Team Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                    {getActivityIcon(activity.type)}
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {activity.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.userName}</p>
                      <p className="text-sm text-muted-foreground">{activity.activity}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No recent activity to display
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{metrics.performanceMetrics.latency}ms</span>
                  <Badge className={getStatusColor(getPerformanceStatus(metrics.performanceMetrics.latency, 'latency'))}>
                    {getPerformanceStatus(metrics.performanceMetrics.latency, 'latency')}
                  </Badge>
                </div>
                <Progress value={Math.min(100, (500 - metrics.performanceMetrics.latency) / 5)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Throughput</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{metrics.performanceMetrics.throughput}/s</span>
                  <Badge className={getStatusColor(getPerformanceStatus(metrics.performanceMetrics.throughput, 'throughput'))}>
                    {getPerformanceStatus(metrics.performanceMetrics.throughput, 'throughput')}
                  </Badge>
                </div>
                <Progress value={Math.min(100, metrics.performanceMetrics.throughput * 2)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{metrics.performanceMetrics.errorRate}%</span>
                  <Badge className={getStatusColor(getPerformanceStatus(metrics.performanceMetrics.errorRate, 'errorRate'))}>
                    {getPerformanceStatus(metrics.performanceMetrics.errorRate, 'errorRate')}
                  </Badge>
                </div>
                <Progress value={Math.max(0, 100 - metrics.performanceMetrics.errorRate * 10)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {state.participants.map((participant) => (
                  <div key={participant.user_id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar>
                      <AvatarFallback>
                        {(participant.profiles?.full_name || participant.user_id).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">
                        {participant.profiles?.full_name || participant.profiles?.email || 'Anonymous'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {participant.current_location || 'Unknown location'}
                      </p>
                    </div>
                    <Badge 
                      variant={participant.status === 'online' ? 'default' : 'secondary'}
                    >
                      {participant.status}
                    </Badge>
                  </div>
                ))}
                {state.participants.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No active participants
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collaboration Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto Save</p>
                    <p className="text-sm text-muted-foreground">Automatically save changes</p>
                  </div>
                  <Button
                    variant={state.settings.autoSave ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => actions.updateSettings({ autoSave: !state.settings.autoSave })}
                  >
                    {state.settings.autoSave ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cursor Tracking</p>
                    <p className="text-sm text-muted-foreground">Show other users' cursors</p>
                  </div>
                  <Button
                    variant={state.settings.cursorTracking ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => actions.updateSettings({ cursorTracking: !state.settings.cursorTracking })}
                  >
                    {state.settings.cursorTracking ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Typing Indicators</p>
                    <p className="text-sm text-muted-foreground">Show when others are typing</p>
                  </div>
                  <Button
                    variant={state.settings.typingIndicators ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => actions.updateSettings({ typingIndicators: !state.settings.typingIndicators })}
                  >
                    {state.settings.typingIndicators ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Conflict Resolution</p>
                    <p className="text-sm text-muted-foreground">How to handle editing conflicts</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const options = ['manual', 'automatic', 'latest_wins'];
                      const current = state.settings.conflictResolution;
                      const nextIndex = (options.indexOf(current) + 1) % options.length;
                      actions.updateSettings({ conflictResolution: options[nextIndex] as any });
                    }}
                  >
                    {state.settings.conflictResolution}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};