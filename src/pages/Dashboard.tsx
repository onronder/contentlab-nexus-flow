import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Building2, 
  Target, 
  Users, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Activity,
  Clock,
  Globe,
  ArrowRight,
  Plus,
  TestTube
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthDatabaseTester } from '@/components/testing/AuthDatabaseTester';
import { useDashboardStats, type DashboardStats } from '@/hooks/useDashboardStats';
import { useRecentActivity, type ActivityItem } from '@/hooks/useRecentActivity';
import { useMonitoringAlerts, type MonitoringAlert } from '@/hooks/useMonitoringAlerts';
import { usePerformanceMetrics, type PerformanceMetrics } from '@/hooks/usePerformanceMetrics';

const Dashboard = () => {
  const { data: dashboardStats, isLoading: isStatsLoading } = useDashboardStats();
  const { data: recentActivity, isLoading: isActivityLoading } = useRecentActivity();
  const { data: alerts, isLoading: isAlertsLoading } = useMonitoringAlerts();
  const { data: performanceMetrics, isLoading: isPerformanceLoading } = usePerformanceMetrics();

  // Type-safe access to data
  const stats = dashboardStats as DashboardStats | undefined;
  const activities = recentActivity as ActivityItem[] | undefined;
  const alertsList = alerts as MonitoringAlert[] | undefined;
  const metrics = performanceMetrics as PerformanceMetrics | undefined;

  const formatChange = (value: number) => {
    const isPositive = value >= 0;
    const icon = isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
    const color = isPositive ? "text-success" : "text-destructive";
    const sign = isPositive ? "+" : "";
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span className="text-xs">{sign}{Math.abs(value)}%</span>
      </div>
    );
  };

  const quickStats = [
    {
      title: "Active Projects",
      value: stats?.activeProjects?.toString() || "0",
      subtitle: "Active projects",
      icon: Building2,
      change: formatChange(stats?.projectsChange || 0),
      color: "text-primary"
    },
    {
      title: "Competitors Tracked", 
      value: stats?.competitorsTracked?.toString() || "0",
      subtitle: "Being monitored",
      icon: Target,
      change: formatChange(stats?.competitorsChange || 0),
      color: "text-primary"
    },
    {
      title: "Team Members",
      value: stats?.teamMembers?.toString() || "0", 
      subtitle: "Across all projects",
      icon: Users,
      change: formatChange(stats?.teamMembersChange || 0),
      color: "text-primary"
    },
    {
      title: "Content Items",
      value: stats?.contentItems?.toString() || "0",
      subtitle: "Total content",
      icon: FileText,
      change: formatChange(stats?.contentItemsChange || 0),
      color: "text-primary"
    }
  ];

  if (isStatsLoading && isActivityLoading && isAlertsLoading && isPerformanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Get icon component from icon name
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, any> = {
      Building2,
      Target, 
      Users,
      FileText,
      BarChart3,
      Activity
    };
    return iconMap[iconName] || Activity;
  };

  const quickActions = [
    {
      title: "Create New Project",
      description: "Start tracking a new competitive project",
      icon: Plus,
      href: "/projects/create",
      variant: "default" as const
    },
    {
      title: "Add Competitor",
      description: "Monitor a new competitor's activities",
      icon: Target,
      href: "/competitive",
      variant: "outline" as const
    },
    {
      title: "View Analytics",
      description: "Check your latest performance metrics",
      icon: BarChart3,
      href: "/analytics",
      variant: "outline" as const
    },
    {
      title: "Test Authentication",
      description: "Verify auth & database integration",
      icon: TestTube,
      href: "#auth-test",
      variant: "outline" as const
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Welcome back! Here's an overview of your competitive intelligence platform.
          </p>
        </div>
        <Button asChild>
          <Link to="/projects/create">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="shadow-elegant hover:shadow-glow transition-elegant">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                <div className="text-xs">
                  {stat.change}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {alertsList && alertsList.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle>Active Alerts</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/competitive">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>
              Important updates that require your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsList?.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.severity === 'high' ? 'bg-destructive' : 'bg-warning'
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.company}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{alert.time}</span>
              </div>
            )) || (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">No active alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>
              Latest updates from across your projects and team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={activity.id}>
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 ${activity.color} rounded-full`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{activity.title}</p>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                      </div>
                    </div>
                    {index < activities.length - 1 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle>Quick Actions</CardTitle>
            </div>
            <CardDescription>
              Common tasks to get things done faster
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="w-full justify-start h-auto p-4"
                asChild
              >
                <Link to={action.href}>
                  <div className="flex items-start gap-3">
                    <action.icon className="h-4 w-4 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </div>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              <CardTitle>Performance Overview</CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/analytics">
                View Details
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
          <CardDescription>
            Key metrics and trends from your competitive analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isPerformanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="text-2xl font-bold text-success">
                    {metrics?.contentPerformance || 0}%
                  </div>
                  {formatChange(metrics?.contentPerformanceChange || 0)}
                </div>
                <p className="text-sm text-muted-foreground">Content Performance</p>
                <p className="text-xs text-muted-foreground">average score</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="text-2xl font-bold text-primary">
                    {metrics?.marketCoverage || 0}%
                  </div>
                  {formatChange(metrics?.marketCoverageChange || 0)}
                </div>
                <p className="text-sm text-muted-foreground">Market Coverage</p>
                <p className="text-xs text-muted-foreground">industries covered</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="text-2xl font-bold text-warning">
                    {metrics?.competitiveScore || 0}
                  </div>
                  {formatChange(metrics?.competitiveScoreChange || 0)}
                </div>
                <p className="text-sm text-muted-foreground">Competitive Score</p>
                <p className="text-xs text-muted-foreground">out of 5.0</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phase 4 Testing Section */}
      <div id="auth-test">
        <AuthDatabaseTester />
      </div>
    </div>
  );
};

export default Dashboard;