import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  MessageCircle, 
  UserPlus, 
  FileText, 
  Target, 
  Settings,
  Clock,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  action: string;
  description: string;
  created_at: string;
  metadata: Record<string, any>;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface TeamActivityFeedProps {
  teamId: string;
  className?: string;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'communication':
      return MessageCircle;
    case 'team_management':
      return UserPlus;
    case 'content':
      return FileText;
    case 'project':
      return Target;
    case 'system':
      return Settings;
    default:
      return Activity;
  }
};

const getActivityColor = (activityType: string) => {
  switch (activityType) {
    case 'communication':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'team_management':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'content':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'project':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'system':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = now.getTime() - time.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return time.toLocaleDateString();
};

export function TeamActivityFeed({ teamId, className }: TeamActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const userId = useCurrentUserId();

  const loadActivities = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles(id, full_name, email, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('activity_type', filter as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities((data || []).map(item => ({
        id: item.id,
        user_id: item.user_id || '',
        activity_type: item.activity_type,
        action: item.action,
        description: item.description || '',
        created_at: item.created_at || new Date().toISOString(),
        metadata: typeof item.metadata === 'object' ? item.metadata as Record<string, any> : {},
        user: item.user ? {
          id: (item.user as any)?.id || '',
          full_name: (item.user as any)?.full_name,
          email: (item.user as any)?.email,
          avatar_url: (item.user as any)?.avatar_url
        } : undefined
      })));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!teamId) return;

    loadActivities();

    // Set up real-time subscription for activity updates
    const channel = supabase
      .channel(`team-activity:${teamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `team_id=eq.${teamId}`
      }, () => {
        loadActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, filter]);

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'communication', label: 'Communication' },
    { value: 'team_management', label: 'Team Management' },
    { value: 'content', label: 'Content' },
    { value: 'project', label: 'Projects' },
    { value: 'system', label: 'System' }
  ];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading activity feed...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const IconComponent = getActivityIcon(activity.activity_type);
                const colorClass = getActivityColor(activity.activity_type);
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-full ${colorClass}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={activity.user?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {activity.user?.full_name?.charAt(0) || 
                             activity.user?.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {activity.user?.full_name || activity.user?.email || 'Unknown User'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {activity.activity_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(activity.created_at)}
                        {activity.metadata?.channel_id && (
                          <>
                            <span>•</span>
                            <span>#{activity.metadata.channel_name || 'Channel'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">No Activity Yet</h3>
              <p className="text-sm text-muted-foreground">
                Team activity will appear here as members interact with the workspace.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}