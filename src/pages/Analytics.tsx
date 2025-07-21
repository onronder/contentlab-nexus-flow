
import { useState, useMemo, Suspense, lazy } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Activity, 
  Target,
  Users,
  DollarSign,
  Eye
} from "lucide-react";
import { mockAnalyticsMetrics } from "@/data/mockData";
import { OptimizedChart } from "@/components/charts/OptimizedChart";
import { MetricCardSkeleton, TableSkeleton } from "@/components/ui/loading-skeletons";

// Lazy load chart components for better performance
const LazyLineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const LazyBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const LazyAreaChart = lazy(() => import('recharts').then(module => ({ default: module.AreaChart })));
const LazyPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
const LazyRadarChart = lazy(() => import('recharts').then(module => ({ default: module.RadarChart })));

// Import other recharts components
import { 
  Line, 
  Bar, 
  Area, 
  Pie, 
  Cell, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const Analytics = () => {
  const [dateRange, setDateRange] = useState("30");
  const [isLoading, setIsLoading] = useState(false);

  // Memoize chart data for performance
  const chartData = useMemo(() => ({
    performanceData: [
      { name: 'Jan 1', performance: 65, competitors: 58, content: 72 },
      { name: 'Jan 7', performance: 72, competitors: 62, content: 75 },
      { name: 'Jan 14', performance: 68, competitors: 65, content: 78 },
      { name: 'Jan 21', performance: 78, competitors: 70, content: 82 },
      { name: 'Jan 28', performance: 85, competitors: 75, content: 88 },
    ],
    contentPerformanceData: [
      { name: 'Blog Posts', value: 245, color: '#3B82F6' },
      { name: 'Videos', value: 189, color: '#8B5CF6' },
      { name: 'Social Media', value: 156, color: '#10B981' },
      { name: 'Documents', value: 132, color: '#F59E0B' },
      { name: 'Images', value: 98, color: '#EF4444' },
    ],
    competitorAnalysisData: [
      { subject: 'Content Quality', A: 80, B: 85, fullMark: 100 },
      { subject: 'SEO Performance', A: 75, B: 70, fullMark: 100 },
      { subject: 'Social Engagement', A: 90, B: 75, fullMark: 100 },
      { subject: 'Market Share', A: 65, B: 80, fullMark: 100 },
      { subject: 'Innovation', A: 85, B: 60, fullMark: 100 },
      { subject: 'Customer Satisfaction', A: 78, B: 88, fullMark: 100 },
    ],
    trafficSourcesData: [
      { name: 'Organic Search', value: 45, color: '#3B82F6' },
      { name: 'Social Media', value: 25, color: '#8B5CF6' },
      { name: 'Direct', value: 20, color: '#10B981' },
      { name: 'Referrals', value: 10, color: '#F59E0B' },
    ],
    engagementData: [
      { name: 'Week 1', likes: 4000, shares: 2400, comments: 1200 },
      { name: 'Week 2', likes: 3000, shares: 1398, comments: 2210 },
      { name: 'Week 3', likes: 2000, shares: 3800, comments: 2290 },
      { name: 'Week 4', likes: 2780, shares: 3908, comments: 2000 },
    ]
  }), []);

  const formatChange = (value: number, type: string) => {
    const isPositive = type === "increase";
    const icon = isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
    const color = isPositive ? "text-green-600" : "text-red-600";
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span className="text-xs">{Math.abs(value)}%</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground text-lg">Monitor performance and gain insights from your competitive intelligence data</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] z-50">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))
          ) : (
            mockAnalyticsMetrics.map((metric) => (
              <Card key={metric.id} className="interactive-lift">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {metric.category === "content" && <BarChart3 className="h-4 w-4 text-primary" />}
                      {metric.category === "competitive" && <Target className="h-4 w-4 text-primary" />}
                      {metric.category === "social" && <Users className="h-4 w-4 text-primary" />}
                      {metric.category === "seo" && <Eye className="h-4 w-4 text-primary" />}
                      {metric.category === "market" && <DollarSign className="h-4 w-4 text-primary" />}
                    </div>
                    {formatChange(metric.change, metric.changeType)}
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="text-2xl font-bold mb-1">{metric.value}{metric.category === "social" ? "%" : ""}</h3>
                  <p className="text-sm text-muted-foreground">{metric.name}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Charts Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Overview */}
          <OptimizedChart
            title="Performance Overview"
            description="Track your competitive intelligence performance over time"
            icon={<Activity className="h-5 w-5" />}
            height={300}
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <Suspense fallback={<div>Loading chart...</div>}>
                <LazyLineChart data={chartData.performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="performance" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="competitors" stroke="#8B5CF6" strokeWidth={2} />
                  <Line type="monotone" dataKey="content" stroke="#10B981" strokeWidth={2} />
                </LazyLineChart>
              </Suspense>
            </ResponsiveContainer>
          </OptimizedChart>

          {/* Content Performance */}
          <OptimizedChart
            title="Content Performance"
            description="Content engagement by type"
            icon={<BarChart3 className="h-5 w-5" />}
            height={250}
          >
            <ResponsiveContainer width="100%" height="100%">
              <Suspense fallback={<div>Loading chart...</div>}>
                <LazyBarChart data={chartData.contentPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" />
                </LazyBarChart>
              </Suspense>
            </ResponsiveContainer>
          </OptimizedChart>

          {/* Competitor Analysis Radar */}
          <OptimizedChart
            title="Competitor Analysis"
            description="Performance comparison radar"
            icon={<Target className="h-5 w-5" />}
            height={250}
          >
            <ResponsiveContainer width="100%" height="100%">
              <Suspense fallback={<div>Loading chart...</div>}>
                <LazyRadarChart data={chartData.competitorAnalysisData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Us" dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Radar name="Competitor" dataKey="B" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                  <Legend />
                </LazyRadarChart>
              </Suspense>
            </ResponsiveContainer>
          </OptimizedChart>

          {/* Traffic Sources */}
          <OptimizedChart
            title="Traffic Sources"
            description="Visitor acquisition channels"
            icon={<PieChartIcon className="h-5 w-5" />}
            height={250}
          >
            <ResponsiveContainer width="100%" height="100%">
              <Suspense fallback={<div>Loading chart...</div>}>
                <LazyPieChart>
                  <Pie
                    data={chartData.trafficSourcesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.trafficSourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </LazyPieChart>
              </Suspense>
            </ResponsiveContainer>
          </OptimizedChart>

          {/* Engagement Metrics */}
          <OptimizedChart
            title="Engagement Metrics"
            description="Social media engagement trends"
            icon={<Users className="h-5 w-5" />}
            height={250}
          >
            <ResponsiveContainer width="100%" height="100%">
              <Suspense fallback={<div>Loading chart...</div>}>
                <LazyAreaChart data={chartData.engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="likes" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
                  <Area type="monotone" dataKey="shares" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" />
                  <Area type="monotone" dataKey="comments" stackId="1" stroke="#10B981" fill="#10B981" />
                </LazyAreaChart>
              </Suspense>
            </ResponsiveContainer>
          </OptimizedChart>

          {/* ROI Tracking Gauge */}
          <Card className="interactive-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                ROI Tracking
              </CardTitle>
              <CardDescription>Return on investment metrics</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">87.5%</div>
                <div className="text-sm text-muted-foreground mb-4">Overall ROI</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-green-600 bg-green-100">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12.3%
                  </Badge>
                  <span className="text-xs text-muted-foreground">vs last month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Tables */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-4 z-10">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="performance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics Comparison</CardTitle>
                <CardDescription>Detailed breakdown of performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TableSkeleton rows={6} cols={5} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Metric</th>
                          <th className="text-left p-2">Current</th>
                          <th className="text-left p-2">Previous</th>
                          <th className="text-left p-2">Change</th>
                          <th className="text-left p-2">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockAnalyticsMetrics.map((metric) => (
                          <tr key={metric.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{metric.name}</td>
                            <td className="p-2">{metric.value}</td>
                            <td className="p-2">{(metric.value - metric.change).toFixed(1)}</td>
                            <td className="p-2">{formatChange(metric.change, metric.changeType)}</td>
                            <td className="p-2">
                              <Badge variant="outline">{(metric.value + 10).toFixed(1)}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Competitor Benchmarking</CardTitle>
                <CardDescription>Compare your performance against key competitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Competitor Analysis</h3>
                  <p className="text-muted-foreground">Detailed competitor benchmarking data will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Analytics</CardTitle>
                <CardDescription>Performance metrics for your content library</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Content Performance</h3>
                  <p className="text-muted-foreground">Detailed content analytics will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engagement" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Analytics</CardTitle>
                <CardDescription>Social media and content engagement insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Engagement Insights</h3>
                  <p className="text-muted-foreground">Detailed engagement analytics will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;
