import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Target, 
  Users, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Activity,
  Clock,
  Globe,
  ArrowRight,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const quickStats = [
    {
      title: "Active Projects",
      value: "12",
      subtitle: "+3 this week",
      icon: Building2,
      change: "+23%",
      color: "text-primary"
    },
    {
      title: "Competitors Tracked", 
      value: "24",
      subtitle: "Across 5 industries",
      icon: Target,
      change: "+12%",
      color: "text-primary"
    },
    {
      title: "Team Members",
      value: "8", 
      subtitle: "Marketing team",
      icon: Users,
      change: "+1",
      color: "text-primary"
    },
    {
      title: "Content Items",
      value: "156",
      subtitle: "Published this month",
      icon: FileText,
      change: "+34%",
      color: "text-primary"
    }
  ];

  const recentActivity = [
    {
      id: 1,
      title: "New competitor added: Apple Inc.",
      subtitle: "Technology sector",
      time: "2 hours ago",
      type: "competitor",
      icon: Target,
      color: "bg-primary"
    },
    {
      id: 2,
      title: "Project 'Q1 Campaign' updated",
      subtitle: "Added new content analysis",
      time: "4 hours ago", 
      type: "project",
      icon: Building2,
      color: "bg-success"
    },
    {
      id: 3,
      title: "Analytics report generated",
      subtitle: "Competitive landscape analysis",
      time: "1 day ago",
      type: "analytics",
      icon: BarChart3,
      color: "bg-warning"
    },
    {
      id: 4,
      title: "Team member invitation sent",
      subtitle: "Sarah Johnson - Content Strategist",
      time: "2 days ago",
      type: "team",
      icon: Users,
      color: "bg-secondary"
    }
  ];

  const alerts = [
    {
      id: 1,
      title: "Competitor launched new feature",
      company: "Microsoft Corporation",
      severity: "high",
      time: "3 hours ago"
    },
    {
      id: 2,
      title: "Content performance dropping",
      company: "Your Campaign #3",
      severity: "medium", 
      time: "1 day ago"
    }
  ];

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
                <Badge variant="secondary" className="text-xs">
                  {stat.change}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
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
            {alerts.map((alert) => (
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
            ))}
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
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
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
                  {index < recentActivity.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
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
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">+23%</div>
              <p className="text-sm text-muted-foreground">Content Performance</p>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">87%</div>
              <p className="text-sm text-muted-foreground">Market Coverage</p>
              <p className="text-xs text-muted-foreground">of target segments</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">4.2</div>
              <p className="text-sm text-muted-foreground">Competitive Score</p>
              <p className="text-xs text-muted-foreground">out of 5.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;