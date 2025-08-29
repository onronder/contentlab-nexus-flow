import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  Filter, 
  Search, 
  Calendar,
  User,
  FileText,
  Settings,
  Shield,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/consoleReplacement';

interface ActivityLog {
  id: string;
  team_id?: string;
  user_id?: string;
  project_id?: string;
  activity_type: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  target_user_id?: string;
  description?: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  severity: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
}

interface ActivityFilters {
  activityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: string;
  search?: string;
}

interface ActivityFeedProps {
  teamId: string;
  projectId?: string;
  showFilters?: boolean;
  limit?: number;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  teamId,
  projectId,
  showFilters = true,
  limit = 20,
  className = ''
}) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const fetchActivities = useCallback(async (pageNum = 1, currentFilters = filters) => {
    try {
      setLoading(pageNum === 1);
      
      // Use project_activities table for now since activity_logs might not be available yet
      let query = supabase
        .from('project_activities')
        .select(`
          *,
          profiles:user_id(id, full_name, email, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * limit, pageNum * limit - 1);

      if (teamId) {
        // For now, filter by project since we don't have team_id in project_activities
        query = query.eq('project_id', projectId || teamId);
      }

      if (currentFilters.activityType) {
        query = query.eq('activity_type', currentFilters.activityType);
      }

      if (currentFilters.userId) {
        query = query.eq('user_id', currentFilters.userId);
      }

      if (currentFilters.dateFrom) {
        query = query.gte('created_at', currentFilters.dateFrom);
      }

      if (currentFilters.dateTo) {
        query = query.lte('created_at', currentFilters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData: ActivityLog[] = (data || []).map(item => ({
        id: item.id,
        team_id: teamId,
        user_id: item.user_id,
        project_id: item.project_id,
        activity_type: item.activity_type || 'project_access',
        action: item.activity_type || 'unknown',
        description: item.activity_description,
        metadata: typeof item.metadata === 'object' && item.metadata !== null ? item.metadata as Record<string, any> : {},
        severity: 'info',
        created_at: item.created_at,
        profiles: item.profiles && typeof item.profiles === 'object' && item.profiles !== null && !Array.isArray(item.profiles) && !('error' in item.profiles) ? item.profiles : undefined
      }));

      if (pageNum === 1) {
        setActivities(formattedData);
      } else {
        setActivities(prev => [...prev, ...formattedData]);
      }

      setHasMore(formattedData.length === limit);
    } catch (error: any) {
      logger.collaboration('Error fetching activities', error);
      toast({
        title: 'Error loading activities',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [teamId, projectId, limit, toast, filters]);

  useEffect(() => {
    fetchActivities(1, filters);
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (!teamId) return;

    // Set up real-time subscription
    const channel = supabase
      .channel(`activity_feed:${teamId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_activities',
        filter: projectId ? `project_id=eq.${projectId}` : undefined
      }, (payload) => {
        logger.collaboration('New activity', payload);
        fetchActivities(1, filters);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, projectId, fetchActivities, filters]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, filters);
  };

  const getActivityIcon = (activityType: string, severity: string) => {
    switch (activityType) {
      case 'team_management':
        return <User className="w-4 h-4" />;
      case 'content_activity':
        return <FileText className="w-4 h-4" />;
      case 'security_event':
        return <Shield className="w-4 h-4" />;
      case 'system_event':
        return <Settings className="w-4 h-4" />;
      default:
        return severity === 'error' || severity === 'critical' 
          ? <AlertTriangle className="w-4 h-4" />
          : <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: (value && !value.startsWith('all-')) ? value : undefined
    }));
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
          <Badge variant="secondary" className="ml-2">
            {activities.length}
          </Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchActivities(1, filters)}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>

      {showFilters && (
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="max-w-xs"
              />
            </div>
            
            <Select value={filters.activityType || 'all-types'} onValueChange={(value) => handleFilterChange('activityType', value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All Types</SelectItem>
                <SelectItem value="team_management">Team Management</SelectItem>
                <SelectItem value="content_activity">Content Activity</SelectItem>
                <SelectItem value="project_access">Project Access</SelectItem>
                <SelectItem value="security_event">Security Events</SelectItem>
                <SelectItem value="system_event">System Events</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.severity || 'all-severities'} onValueChange={(value) => handleFilterChange('severity', value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-severities">All</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({})}
              className="whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      )}

      <CardContent>
        <ScrollArea className="h-96">
          {loading && activities.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
              <p className="text-sm text-muted-foreground">
                Team activities will appear here as they happen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={activity.profiles?.avatar_url} />
                    <AvatarFallback>
                      {getInitials(activity.profiles?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1">
                        {getActivityIcon(activity.activity_type, activity.severity)}
                        <span className="text-sm font-medium">
                          {activity.profiles?.full_name || 'Unknown User'}
                        </span>
                      </div>
                      <Badge variant={getSeverityColor(activity.severity)} className="text-xs">
                        {activity.activity_type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description || `Performed ${activity.action}`}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                      {activity.metadata?.entity_type && (
                        <span>
                          {activity.metadata.entity_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {hasMore && (
                <div className="text-center py-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Load More Activities
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};