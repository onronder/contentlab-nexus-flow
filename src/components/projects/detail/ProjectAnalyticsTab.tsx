import React from 'react';
import { Project } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, Target, Clock, Activity, PieChart, LineChart } from 'lucide-react';

interface ProjectAnalyticsTabProps {
  project: Project;
  analytics?: any;
}

export function ProjectAnalyticsTab({ project, analytics }: ProjectAnalyticsTabProps) {
  // Use real analytics data when available
  const realMetrics = {
    competitorAnalysisCount: analytics?.analysisCount || 0,
    totalCompetitors: analytics?.competitorCount || 0,
    teamProductivity: analytics?.teamProductivity || 0,
    goalCompletionRate: analytics?.goalCompletionRate || 0,
    avgAnalysisTime: analytics?.avgAnalysisTime || 'N/A',
    lastAnalysisDate: analytics?.lastAnalysisDate ? new Date(analytics.lastAnalysisDate) : null,
    resourceUtilization: analytics?.resourceUtilization || 0,
    riskScore: analytics?.riskScore || 0,
  };

  const performanceMetrics = [
    {
      name: 'Analysis Completion Rate',
      value: 89,
      target: 90,
      trend: '+5%',
      status: 'good'
    },
    {
      name: 'Data Quality Score',
      value: 92,
      target: 85,
      trend: '+12%',
      status: 'excellent'
    },
    {
      name: 'Team Engagement',
      value: 76,
      target: 80,
      trend: '-3%',
      status: 'warning'
    },
    {
      name: 'Project Velocity',
      value: 68,
      target: 75,
      trend: '+8%',
      status: 'improving'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'improving': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'warning': return 'outline';
      case 'improving': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realMetrics.competitorAnalysisCount}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realMetrics.totalCompetitors}</div>
            <p className="text-xs text-muted-foreground">
              Across {project.industry}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Productivity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realMetrics.teamProductivity}%</div>
            <Progress value={realMetrics.teamProductivity} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goal Achievement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realMetrics.goalCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {project.primaryObjectives.length} objectives tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{metric.name}</span>
                    <Badge variant={getStatusBadge(metric.status)}>
                      {metric.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
                      {metric.trend}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {metric.value}% / {metric.target}%
                    </span>
                  </div>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resource Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Resource Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Team Capacity</span>
                <span className="text-sm font-medium">{realMetrics.resourceUtilization}%</span>
              </div>
              <Progress value={realMetrics.resourceUtilization} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Analysis Tools</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <Progress value={92} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Data Sources</span>
                <span className="text-sm font-medium">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Average analysis time: <span className="font-medium">{realMetrics.avgAnalysisTime}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Project Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {100 - realMetrics.riskScore}/100
              </div>
              <p className="text-sm text-muted-foreground">Overall Health Score</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Timeline Adherence</span>
                <Badge variant="default">Good</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Budget Status</span>
                <Badge variant="default">On Track</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Quality Metrics</span>
                <Badge variant="default">Excellent</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Risk Level</span>
                <Badge variant="outline">Low</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Analysis Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Competitor Categories</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Direct Competitors</span>
                  <span className="text-sm font-medium">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Indirect Competitors</span>
                  <span className="text-sm font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Emerging Threats</span>
                  <span className="text-sm font-medium">1</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Analysis Types</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Market Positioning</span>
                  <span className="text-sm font-medium">4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Feature Comparison</span>
                  <span className="text-sm font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Pricing Analysis</span>
                  <span className="text-sm font-medium">5</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Data Sources</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Web Scraping</span>
                  <span className="text-sm font-medium">45%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">API Integration</span>
                  <span className="text-sm font-medium">30%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Manual Research</span>
                  <span className="text-sm font-medium">25%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Analytics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Metrics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Success Metrics Tracking</h4>
              {project.successMetrics.slice(0, 3).map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">{metric}</span>
                    <span className="text-sm font-medium">{65 + index * 10}%</span>
                  </div>
                  <Progress value={65 + index * 10} className="h-1" />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Objective Progress</h4>
              {project.primaryObjectives.slice(0, 3).map((objective, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm truncate">{objective}</span>
                    <Badge variant={index % 2 === 0 ? "default" : "secondary"}>
                      {index % 2 === 0 ? "Complete" : "In Progress"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}