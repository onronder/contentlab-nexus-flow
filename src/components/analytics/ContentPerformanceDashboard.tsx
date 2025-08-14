import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Eye, Heart, Share2, Download, Clock, Target, DollarSign } from 'lucide-react';
import { useAdvancedContentAnalytics } from '@/hooks/useAdvancedContentAnalytics';

interface ContentPerformanceDashboardProps {
  projectId: string;
}

export function ContentPerformanceDashboard({ projectId }: ContentPerformanceDashboardProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [contentType, setContentType] = useState('all');
  const { analyticsData, isLoading, error } = useAdvancedContentAnalytics(projectId);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-destructive">Error loading analytics</div>;
  }

  // Use real analytics data
  const performanceMetrics = analyticsData?.performanceMetrics || {
    totalViews: 0,
    totalEngagement: 0,
    averageTimeSpent: '0:00',
    conversionRate: 0,
    roi: 0,
    trends: {
      views: 0,
      engagement: 0,
      timeSpent: 0,
      conversion: 0
    }
  };

  const engagementData = [
    { date: '2024-01-01', views: 1200, likes: 89, shares: 45, comments: 23, downloads: 67 },
    { date: '2024-01-02', views: 1350, likes: 102, shares: 52, comments: 31, downloads: 78 },
    { date: '2024-01-03', views: 1180, likes: 95, shares: 48, comments: 27, downloads: 65 },
    { date: '2024-01-04', views: 1420, likes: 118, shares: 61, comments: 35, downloads: 82 },
    { date: '2024-01-05', views: 1580, likes: 134, shares: 73, comments: 42, downloads: 91 },
    { date: '2024-01-06', views: 1380, likes: 112, shares: 58, comments: 33, downloads: 75 },
    { date: '2024-01-07', views: 1650, likes: 145, shares: 79, comments: 48, downloads: 98 }
  ];

  const contentTypePerformance = [
    { type: 'Video', performance: 85, count: 156, avgEngagement: 4.2 },
    { type: 'Image', performance: 78, count: 342, avgEngagement: 3.8 },
    { type: 'Document', performance: 72, count: 189, avgEngagement: 3.1 },
    { type: 'Presentation', performance: 68, count: 98, avgEngagement: 2.9 },
    { type: 'Audio', performance: 65, count: 76, avgEngagement: 2.7 }
  ];

  const roiAnalysis = [
    { category: 'Content Creation', investment: 15000, return: 42000, roi: 180 },
    { category: 'Distribution', investment: 8000, return: 28000, roi: 250 },
    { category: 'Optimization', investment: 3000, return: 12000, roi: 300 },
    { category: 'Analytics', investment: 2000, return: 8000, roi: 300 }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Performance Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into content effectiveness and engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="presentation">Presentations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.totalViews.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {performanceMetrics.trends.views > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              {Math.abs(performanceMetrics.trends.views)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.totalEngagement.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {performanceMetrics.trends.engagement > 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              {Math.abs(performanceMetrics.trends.engagement)}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time Spent</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.averageTimeSpent}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              {performanceMetrics.trends.timeSpent}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.conversionRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              {performanceMetrics.trends.conversion}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.roi}%</div>
            <Badge variant="outline" className="text-green-600">
              Excellent
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="engagement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="engagement">Engagement Analytics</TabsTrigger>
          <TabsTrigger value="performance">Content Performance</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="lifecycle">Content Lifecycle</TabsTrigger>
        </TabsList>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="views" stackId="1" stroke={COLORS[0]} fill={COLORS[0]} />
                  <Area type="monotone" dataKey="likes" stackId="1" stroke={COLORS[1]} fill={COLORS[1]} />
                  <Area type="monotone" dataKey="shares" stackId="1" stroke={COLORS[2]} fill={COLORS[2]} />
                  <Area type="monotone" dataKey="comments" stackId="1" stroke={COLORS[3]} fill={COLORS[3]} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Type Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentTypePerformance.map((content, index) => (
                  <div key={content.type} className="flex items-center gap-4">
                    <div className="w-20 text-sm font-medium">{content.type}</div>
                    <div className="flex-1">
                      <Progress value={content.performance} className="h-2" />
                    </div>
                    <div className="w-16 text-sm text-muted-foreground">{content.performance}%</div>
                    <div className="w-20 text-sm text-muted-foreground">{content.count} items</div>
                    <div className="w-16 text-sm text-muted-foreground">{content.avgEngagement}/5</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ROI Analysis by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={roiAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="investment" fill={COLORS[0]} name="Investment ($)" />
                  <Bar dataKey="return" fill={COLORS[1]} name="Return ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Lifecycle Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">Content Age Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: '0-30 days', value: 35 },
                          { name: '31-90 days', value: 28 },
                          { name: '91-180 days', value: 22 },
                          { name: '180+ days', value: 15 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[1, 2, 3, 4].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Performance by Age</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fresh (0-30 days)</span>
                      <span className="text-green-600">High Performance</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recent (31-90 days)</span>
                      <span className="text-blue-600">Good Performance</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Mature (91-180 days)</span>
                      <span className="text-yellow-600">Declining</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Old (180+ days)</span>
                      <span className="text-red-600">Needs Refresh</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}