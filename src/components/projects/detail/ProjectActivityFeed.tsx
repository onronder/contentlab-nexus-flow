import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  MessageSquare, 
  UserPlus, 
  Settings, 
  FileText, 
  BarChart3, 
  Filter,
  Send,
  Loader2,
  Bell,
  Eye,
  AlertCircle,
  CheckCircle2,
  Info,
  Users
} from 'lucide-react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { useUser } from '@/contexts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ActivityService } from '@/services/activityService';

interface ActivityItem {
  id: string;
  type: 'project_updated' | 'member_added' | 'analysis_completed' | 'comment_added' | 'settings_changed' | 'member_removed' | 'role_changed';
  description: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
}

interface ProjectActivityFeedProps {
  projectId: string;
}

export function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
  const user = useUser();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Fetch real activity data from the database
  const fetchActivitiesFromDB = async () => {
    try {
      const realActivities = await ActivityService.getProjectActivities(projectId, { limit: 20 });
      
      // Transform real activities to ActivityItem format
      const transformedActivities: ActivityItem[] = realActivities.map(activity => ({
        id: activity.id,
        type: mapActivityTypeToComponent(activity.activity_type),
        description: activity.description || activity.action,
        userId: activity.user_id,
        userName: activity.profiles?.full_name || activity.profiles?.email?.split('@')[0] || 'Unknown User',
        userAvatar: activity.profiles?.avatar_url,
        timestamp: new Date(activity.created_at),
        priority: mapSeverityToPriority(activity.severity),
        metadata: activity.metadata
      }));
      
      return transformedActivities;
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  };

  // Helper function to map activity types to component types
  const mapActivityTypeToComponent = (activityType: string): ActivityItem['type'] => {
    switch (activityType) {
      case 'team_management': return 'member_added';
      case 'content_activity': return 'comment_added';
      case 'project_access': return 'project_updated';
      case 'competitive_intel': return 'analysis_completed';
      case 'role_management': return 'role_changed';
      case 'system_event': return 'settings_changed';
      default: return 'project_updated';
    }
  };

  // Helper function to map severity to priority
  const mapSeverityToPriority = (severity: string): ActivityItem['priority'] => {
    switch (severity) {
      case 'critical':
      case 'error': return 'high';
      case 'warning': return 'medium';
      default: return 'low';
    }
  };

  useEffect(() => {
    const loadActivities = async () => {
      setIsLoading(true);
      try {
        const realActivities = await fetchActivitiesFromDB();
        setActivities(realActivities);
      } catch (error) {
        console.error('Error loading activities:', error);
        // Fallback to empty array instead of mock data
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
  }, [projectId]);

  // Set up real-time subscription for project activities
  useEffect(() => {
    const channel = supabase
      .channel(`project-${projectId}-activities`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_activities',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log('Activity real-time update:', payload);
          // Handle real-time updates
          if (payload.eventType === 'INSERT') {
            // Add new activity to the list
            const newActivity: ActivityItem = {
              id: payload.new.id,
              type: payload.new.activity_type,
              description: payload.new.activity_description,
              userId: payload.new.user_id,
              userName: 'Unknown User', // Would be resolved from user lookup
              timestamp: new Date(payload.new.created_at),
              priority: 'medium'
            };
            setActivities(prev => [newActivity, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const getActivityIcon = (type: string, priority: string) => {
    const iconClass = `h-4 w-4 ${priority === 'high' ? 'text-red-600' : priority === 'medium' ? 'text-blue-600' : 'text-gray-600'}`;
    
    switch (type) {
      case 'project_updated': return <Settings className={iconClass} />;
      case 'member_added': return <UserPlus className={iconClass} />;
      case 'member_removed': return <Users className={iconClass} />;
      case 'role_changed': return <Settings className={iconClass} />;
      case 'analysis_completed': return <BarChart3 className={iconClass} />;
      case 'comment_added': return <MessageSquare className={iconClass} />;
      case 'settings_changed': return <Settings className={iconClass} />;
      default: return <Activity className={iconClass} />;
    }
  };

  const getActivityColor = (type: string, priority: string) => {
    const baseColor = priority === 'high' ? 'red' : priority === 'medium' ? 'blue' : 'gray';
    return `text-${baseColor}-600 bg-${baseColor}-100 border-${baseColor}-200`;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'medium': return <Info className="h-3 w-3 text-blue-600" />;
      case 'low': return <CheckCircle2 className="h-3 w-3 text-gray-600" />;
      default: return null;
    }
  };

  const formatTimestamp = (date: Date) => {
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'priority-high') return activity.priority === 'high';
    if (filter === 'priority-medium') return activity.priority === 'medium';
    if (filter === 'priority-low') return activity.priority === 'low';
    return activity.type === filter;
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsAddingComment(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newCommentItem: ActivityItem = {
        id: Date.now().toString(),
        type: 'comment_added',
        description: `Commented: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
        userId: user.id,
        userName: user.email?.split('@')[0] || 'You',
        timestamp: new Date(),
        metadata: { comment: newComment },
        priority: 'low'
      };

      setActivities([newCommentItem, ...activities]);
      setNewComment('');
      
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const toggleCommentExpansion = (activityId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Loading activity feed...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile-Optimized Activity Feed Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Feed
              </CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Live
              </Badge>
            </div>
            
            {/* Mobile-Friendly Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="priority-high">High Priority</SelectItem>
                    <SelectItem value="priority-medium">Medium Priority</SelectItem>
                    <SelectItem value="priority-low">Low Priority</SelectItem>
                    <Separator className="my-1" />
                    <SelectItem value="project_updated">Project Updates</SelectItem>
                    <SelectItem value="member_added">Team Changes</SelectItem>
                    <SelectItem value="analysis_completed">Analysis</SelectItem>
                    <SelectItem value="comment_added">Comments</SelectItem>
                    <SelectItem value="settings_changed">Settings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Eye className="h-3 w-3" />
                {filteredActivities.length} items
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Mobile-Optimized Add Comment Section */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user?.email?.split('@')[0] || 'You')}</AvatarFallback>
                </Avatar>
                <Label htmlFor="new-comment" className="font-medium">Add a comment</Label>
              </div>
              <Textarea
                id="new-comment"
                placeholder="Share an update, ask a question, or leave feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
                aria-describedby="comment-help"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p id="comment-help" className="text-xs text-muted-foreground">
                  Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to submit
                </p>
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isAddingComment}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  {isAddingComment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Add Comment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile-Optimized Activity List */}
          <div className="space-y-3" role="feed" aria-label="Project activity feed">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <article
                  key={activity.id} 
                  className="flex gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors focus-within:ring-2 focus-within:ring-primary/20"
                  aria-labelledby={`activity-${activity.id}-title`}
                >
                  {/* Activity Icon with Priority Indicator */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${getActivityColor(activity.type, activity.priority)}`}>
                      {getActivityIcon(activity.type, activity.priority)}
                    </div>
                    {getPriorityIcon(activity.priority)}
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p id={`activity-${activity.id}-title`} className="font-medium text-sm">
                          <span className="text-foreground">{activity.userName}</span>
                          <span className="text-muted-foreground ml-1">{activity.description}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <time className="text-xs text-muted-foreground" dateTime={activity.timestamp.toISOString()}>
                            {formatTimestamp(activity.timestamp)}
                          </time>
                          <Badge variant="outline" className="text-xs">
                            {activity.type.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant={activity.priority === 'high' ? 'destructive' : activity.priority === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {activity.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={activity.userAvatar} alt={`${activity.userName}'s avatar`} />
                        <AvatarFallback className="text-xs">
                          {getInitials(activity.userName)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    {/* Extended content for comments and metadata */}
                    {activity.metadata && (
                      <div className="space-y-2">
                        {activity.type === 'comment_added' && activity.metadata.comment && (
                          <div className="space-y-2">
                            <div className="p-3 bg-background border rounded text-sm">
                              {expandedComments.has(activity.id) ? (
                                <div className="space-y-2">
                                  <p>{activity.metadata.comment}</p>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleCommentExpansion(activity.id)}
                                    className="text-xs h-6 p-0"
                                  >
                                    Show less
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="line-clamp-2">
                                    {activity.metadata.comment}
                                  </p>
                                  {activity.metadata.comment.length > 100 && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => toggleCommentExpansion(activity.id)}
                                      className="text-xs h-6 p-0"
                                    >
                                      Show more
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {activity.metadata.competitorCount && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BarChart3 className="h-3 w-3" />
                            <span>{activity.metadata.competitorCount} competitors analyzed</span>
                          </div>
                        )}
                        
                        {activity.metadata.newMemberRole && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserPlus className="h-3 w-3" />
                            <span>Role: {activity.metadata.newMemberRole}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Activity Found</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'Project activity will appear here as team members collaborate'
                    : `No ${filter.replace('_', ' ').replace('priority-', '')} activity found`
                  }
                </p>
                {filter !== 'all' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setFilter('all')}
                    className="mt-4"
                  >
                    Show All Activity
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Load More Button - Mobile Optimized */}
          {filteredActivities.length > 0 && filteredActivities.length >= 5 && (
            <div className="flex justify-center mt-6 pt-4 border-t">
              <Button variant="outline" className="w-full sm:w-auto">
                <Loader2 className="h-4 w-4 mr-2" />
                Load More Activity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Status Indicator - Mobile Optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Live Collaboration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Real-time updates enabled</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You'll see live updates as team members make changes to the project. 
            Notifications are delivered instantly across all devices.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Badge variant="outline" className="flex items-center gap-1 text-xs w-fit">
              <Activity className="h-3 w-3" />
              {activities.length} total activities
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-xs w-fit">
              <Users className="h-3 w-3" />
              Real-time collaboration
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}