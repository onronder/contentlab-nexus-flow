import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTeam, useTeamMembers, useTeamStats, useTeamActivity } from "@/hooks/useTeamQueries";
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Clock, 
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Award,
  MessageSquare
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

interface TeamAnalyticsProps {
  teamId: string;
}

export const TeamAnalytics = ({ teamId }: TeamAnalyticsProps) => {
  const { data: team, isLoading: teamLoading } = useTeam(teamId);
  const { data: members, isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: stats, isLoading: statsLoading } = useTeamStats(teamId);
  const { data: activities, isLoading: activitiesLoading } = useTeamActivity(teamId);

  const isLoading = teamLoading || membersLoading || statsLoading || activitiesLoading;

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
          <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No analytics available</h3>
            <p className="text-muted-foreground">Team data is not available.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate analytics data
  const totalMembers = members?.members?.length || 0;
  const activeMembers = members?.members?.filter(m => m.status === 'active')?.length || 0;
  const recentActivities = activities?.slice(0, 7) || [];
  const membershipGrowth = ((totalMembers - (stats?.total_members || 0)) / Math.max(stats?.total_members || 1, 1)) * 100;

  // Role distribution
  const roleDistribution = members?.members?.reduce((acc, member) => {
    const role = member.role?.name || 'Member';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Activity trends (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), i));
    return {
      date: format(date, 'MMM dd'),
      activities: recentActivities.filter(activity => 
        startOfDay(new Date(activity.created_at)).getTime() === date.getTime()
      ).length
    };
  }).reverse();

  const maxActivities = Math.max(...last7Days.map(d => d.activities), 1);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <Badge variant={membershipGrowth > 0 ? "default" : "secondary"}>
                {membershipGrowth > 0 ? '+' : ''}{membershipGrowth.toFixed(1)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">{totalMembers}</h3>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {((activeMembers / Math.max(totalMembers, 1)) * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">{activeMembers}</h3>
            <p className="text-sm text-muted-foreground">Active Members</p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Today</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">{recentActivities.length}</h3>
            <p className="text-sm text-muted-foreground">Recent Activities</p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-4 w-4 text-purple-600" />
              </div>
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">Score</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">
              {Math.round((activeMembers / Math.max(totalMembers, 1)) * 100)}
            </h3>
            <p className="text-sm text-muted-foreground">Engagement Score</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activity Trends
            </CardTitle>
            <CardDescription>Team activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {last7Days.map((day, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-muted-foreground">{day.date}</div>
                  <div className="flex-1">
                    <Progress 
                      value={(day.activities / maxActivities) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div className="w-8 text-sm font-medium">{day.activities}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Role Distribution
            </CardTitle>
            <CardDescription>Member roles across the team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(roleDistribution).map(([role, count]) => {
                const percentage = (count / Math.max(totalMembers, 1)) * 100;
                const colors = {
                  'Admin': 'bg-red-500',
                  'Manager': 'bg-blue-500',
                  'Editor': 'bg-green-500',
                  'Member': 'bg-gray-500',
                  'Viewer': 'bg-yellow-500'
                };
                
                return (
                  <div key={role} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-24">
                      <div className={`w-3 h-3 rounded-full ${colors[role as keyof typeof colors] || 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">{role}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <div className="text-sm text-muted-foreground w-12">
                      {count} ({percentage.toFixed(0)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Team Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Team Health
            </CardTitle>
            <CardDescription>Overall team performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Member Engagement</span>
                  <span className="text-sm text-muted-foreground">
                    {((activeMembers / Math.max(totalMembers, 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={(activeMembers / Math.max(totalMembers, 1)) * 100} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Team Capacity</span>
                  <span className="text-sm text-muted-foreground">
                    {team.member_limit ? `${totalMembers}/${team.member_limit}` : `${totalMembers}/∞`}
                  </span>
                </div>
                <Progress 
                  value={team.member_limit ? (totalMembers / team.member_limit) * 100 : 50} 
                  className="h-2" 
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Activity Level</span>
                  <span className="text-sm text-muted-foreground">
                    {recentActivities.length > 10 ? 'High' : recentActivities.length > 5 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <Progress 
                  value={Math.min((recentActivities.length / 15) * 100, 100)} 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Performance
            </CardTitle>
            <CardDescription>Key metrics from the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-bold text-primary">{recentActivities.length}</div>
                <div className="text-xs text-muted-foreground">Activities</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-bold text-green-600">{activeMembers}</div>
                <div className="text-xs text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {new Set(recentActivities.map(a => a.user_id)).size}
                </div>
                <div className="text-xs text-muted-foreground">Contributors</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {Math.round((recentActivities.length / 7) * 10) / 10}
                </div>
                <div className="text-xs text-muted-foreground">Avg/Day</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};