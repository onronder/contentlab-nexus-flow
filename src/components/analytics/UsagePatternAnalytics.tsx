import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Sankey } from 'recharts';
import { Users, Search, Clock, MapPin, Smartphone, Monitor, Calendar, TrendingUp } from 'lucide-react';

interface UsagePatternAnalyticsProps {
  projectId: string;
}

export function UsagePatternAnalytics({ projectId }: UsagePatternAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [segment, setSegment] = useState('all');

  // Mock data - replace with actual analytics data
  const usageMetrics = {
    totalSessions: 12485,
    uniqueUsers: 8934,
    averageSessionDuration: '6:42',
    bounceRate: 24.5,
    pageViews: 45682,
    searchQueries: 3247
  };

  const userJourneyData = [
    { step: 'Landing', users: 1000, retention: 100 },
    { step: 'Browse', users: 850, retention: 85 },
    { step: 'Search', users: 680, retention: 68 },
    { step: 'View Content', users: 540, retention: 54 },
    { step: 'Engage', users: 380, retention: 38 },
    { step: 'Convert', users: 190, retention: 19 }
  ];

  const searchBehaviorData = [
    { query: 'project templates', count: 456, clicks: 389, ctr: 85.3 },
    { query: 'design assets', count: 378, clicks: 298, ctr: 78.8 },
    { query: 'marketing materials', count: 289, clicks: 245, ctr: 84.8 },
    { query: 'brand guidelines', count: 234, clicks: 187, ctr: 79.9 },
    { query: 'presentation slides', count: 198, clicks: 156, ctr: 78.8 }
  ];

  const temporalPatterns = [
    { hour: '00:00', usage: 12, day: 'Monday' },
    { hour: '06:00', usage: 45, day: 'Monday' },
    { hour: '09:00', usage: 189, day: 'Monday' },
    { hour: '12:00', usage: 234, day: 'Monday' },
    { hour: '15:00', usage: 298, day: 'Monday' },
    { hour: '18:00', usage: 156, day: 'Monday' },
    { hour: '21:00', usage: 89, day: 'Monday' }
  ];

  const audienceSegments = [
    { 
      name: 'Power Users', 
      percentage: 15, 
      characteristics: 'High engagement, frequent access',
      avgSessions: 12,
      contentPreference: 'Advanced materials'
    },
    { 
      name: 'Regular Users', 
      percentage: 35, 
      characteristics: 'Consistent usage patterns',
      avgSessions: 5,
      contentPreference: 'Standard templates'
    },
    { 
      name: 'Occasional Users', 
      percentage: 30, 
      characteristics: 'Sporadic engagement',
      avgSessions: 2,
      contentPreference: 'Quick references'
    },
    { 
      name: 'New Users', 
      percentage: 20, 
      characteristics: 'Exploring and learning',
      avgSessions: 1,
      contentPreference: 'Getting started guides'
    }
  ];

  const contentGaps = [
    { category: 'Video Tutorials', demand: 89, supply: 34, gap: 55 },
    { category: 'Interactive Templates', demand: 76, supply: 45, gap: 31 },
    { category: 'Mobile Assets', demand: 68, supply: 52, gap: 16 },
    { category: 'Case Studies', demand: 82, supply: 71, gap: 11 },
    { category: 'Documentation', demand: 65, supply: 59, gap: 6 }
  ];

  const deviceData = [
    { device: 'Desktop', users: 5678, percentage: 63.5 },
    { device: 'Mobile', users: 2345, percentage: 26.2 },
    { device: 'Tablet', users: 921, percentage: 10.3 }
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Usage Pattern Analytics</h2>
          <p className="text-muted-foreground">
            Advanced insights into user behavior and content consumption patterns
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
            </SelectContent>
          </Select>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="power">Power Users</SelectItem>
              <SelectItem value="regular">Regular Users</SelectItem>
              <SelectItem value="new">New Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Usage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.totalSessions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.uniqueUsers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.averageSessionDuration}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.bounceRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.pageViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Queries</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageMetrics.searchQueries.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="journey" className="space-y-4">
        <TabsList>
          <TabsTrigger value="journey">User Journey</TabsTrigger>
          <TabsTrigger value="search">Search Behavior</TabsTrigger>
          <TabsTrigger value="temporal">Temporal Patterns</TabsTrigger>
          <TabsTrigger value="segments">Audience Segments</TabsTrigger>
          <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
        </TabsList>

        <TabsContent value="journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Journey Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userJourneyData.map((step, index) => (
                  <div key={step.step} className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">{step.step}</div>
                    <div className="flex-1 relative">
                      <Progress value={step.retention} className="h-6" />
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {step.users.toLocaleString()} users ({step.retention}%)
                      </div>
                    </div>
                    {index < userJourneyData.length - 1 && (
                      <div className="text-sm text-muted-foreground">
                        -{Math.round(((userJourneyData[index].users - userJourneyData[index + 1].users) / userJourneyData[index].users) * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Search Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchBehaviorData.map((query, index) => (
                  <div key={query.query} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{query.query}</div>
                      <div className="text-sm text-muted-foreground">
                        {query.count} searches • {query.clicks} clicks
                      </div>
                    </div>
                    <Badge variant={query.ctr > 80 ? "default" : "secondary"}>
                      {query.ctr}% CTR
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temporal" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hourly Usage Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={temporalPatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="usage" stroke={COLORS[0]} fill={COLORS[0]} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ device, percentage }) => `${device} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="users"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audience Segmentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {audienceSegments.map((segment, index) => (
                  <div key={segment.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{segment.name}</h4>
                      <Badge variant="outline">{segment.percentage}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{segment.characteristics}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Avg Sessions:</span>
                        <span className="ml-1 font-medium">{segment.avgSessions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prefers:</span>
                        <span className="ml-1 font-medium">{segment.contentPreference}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Gap Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentGaps.map((gap, index) => (
                  <div key={gap.category} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{gap.category}</span>
                      <span className="text-muted-foreground">Gap: {gap.gap}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Demand</div>
                        <Progress value={gap.demand} className="h-2" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Supply</div>
                        <Progress value={gap.supply} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}