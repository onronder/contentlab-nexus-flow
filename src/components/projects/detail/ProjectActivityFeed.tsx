import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  MessageSquare, 
  UserPlus, 
  Settings, 
  FileText, 
  BarChart3, 
  Filter,
  Send,
  Loader2
} from 'lucide-react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  type: 'project_updated' | 'member_added' | 'analysis_completed' | 'comment_added' | 'settings_changed';
  description: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ProjectActivityFeedProps {
  projectId: string;
}

export function ProjectActivityFeed({ projectId }: ProjectActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Mock activity data - in real implementation, this would come from Supabase
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'project_updated',
      description: 'Updated project status to Active',
      userId: user?.id,
      userName: user?.email?.split('@')[0] || 'You',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'analysis_completed',
      description: 'Completed competitive analysis for 3 competitors',
      userId: 'user2',
      userName: 'Sarah Chen',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b400?w=100',
      timestamp: subDays(new Date(), 1),
    },
    {
      id: '3',
      type: 'member_added',
      description: 'Added John Smith as a team member',
      userId: 'user3',
      userName: 'Mike Johnson',
      timestamp: subDays(new Date(), 2),
    },
    {
      id: '4',
      type: 'comment_added',
      description: 'Left a comment on the project',
      userId: 'user4',
      userName: 'Emily Davis',
      userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      timestamp: subDays(new Date(), 3),
    },
    {
      id: '5',
      type: 'settings_changed',
      description: 'Updated notification settings',
      userId: user?.id,
      userName: user?.email?.split('@')[0] || 'You',
      timestamp: subDays(new Date(), 4),
    },
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setActivities(mockActivities);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
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
          // TODO: Add new activity to the list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'project_updated': return <Settings className="h-4 w-4" />;
      case 'member_added': return <UserPlus className="h-4 w-4" />;
      case 'analysis_completed': return <BarChart3 className="h-4 w-4" />;
      case 'comment_added': return <MessageSquare className="h-4 w-4" />;
      case 'settings_changed': return <Settings className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'project_updated': return 'text-blue-600 bg-blue-100';
      case 'member_added': return 'text-green-600 bg-green-100';
      case 'analysis_completed': return 'text-purple-600 bg-purple-100';
      case 'comment_added': return 'text-orange-600 bg-orange-100';
      case 'settings_changed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
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
    return activity.type === filter;
  });

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setIsAddingComment(true);
    try {
      // TODO: Add comment to database
      const newCommentItem: ActivityItem = {
        id: Date.now().toString(),
        type: 'comment_added',
        description: `Commented: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
        userId: user.id,
        userName: user.email?.split('@')[0] || 'You',
        timestamp: new Date(),
        metadata: { comment: newComment }
      };

      setActivities([newCommentItem, ...activities]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Activity Feed</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="project_updated">Project Updates</SelectItem>
                  <SelectItem value="member_added">Team Changes</SelectItem>
                  <SelectItem value="analysis_completed">Analysis</SelectItem>
                  <SelectItem value="comment_added">Comments</SelectItem>
                  <SelectItem value="settings_changed">Settings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Comment Section */}
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="flex gap-3">
              <Avatar>
                <AvatarFallback>{getInitials(user?.email?.split('@')[0] || 'You')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Add a comment to the project..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    size="sm"
                  >
                    {isAddingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Activity List */}
          <div className="space-y-4">
            {filteredActivities.length > 0 ? (
              filteredActivities.map((activity) => (
                <div key={activity.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          <span className="text-foreground">{activity.userName}</span>
                          <span className="text-muted-foreground ml-1">{activity.description}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {/* Extended content for comments */}
                    {activity.type === 'comment_added' && activity.metadata?.comment && (
                      <div className="mt-3 p-3 bg-background border rounded text-sm">
                        {activity.metadata.comment}
                      </div>
                    )}
                  </div>
                  
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activity.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(activity.userName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'Project activity will appear here as team members collaborate'
                    : `No ${filter.replace('_', ' ')} activity found`
                  }
                </p>
              </div>
            )}
          </div>

          {/* Load More Button */}
          {filteredActivities.length > 0 && (
            <div className="flex justify-center mt-6">
              <Button variant="outline">
                Load More Activity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Live Collaboration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Real-time updates enabled</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You'll see live updates as team members make changes to the project
          </p>
        </CardContent>
      </Card>
    </div>
  );
}