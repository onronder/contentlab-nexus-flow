
import { useState, useMemo, useEffect, Suspense, lazy } from "react";
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

import { OptimizedChart } from "@/components/charts/OptimizedChart";
import { MetricCardSkeleton, TableSkeleton } from "@/components/ui/loading-skeletons";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";

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
import ChartConfigPanel, { ChartBuilderConfig } from "@/components/analytics/ChartConfigPanel";
import ConfigurableChart from "@/components/analytics/ConfigurableChart";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { loadPresets, upsertPreset, deletePreset, generatePresetId, type ChartPreset } from "@/utils/chartConfigStorage";

const Analytics = () => {
  const [dateRange, setDateRange] = useState("30");
  const { data: analyticsData, isLoading } = useAnalyticsData();
  const STORAGE_KEY = "analytics.customChartConfig";
  const defaultChartConfig: ChartBuilderConfig = {
    chartType: "line",
    palette: "default",
    customColors: [],
    height: 320,
    title: "Custom Chart",
    xLabel: "",
    yLabel: "",
    xKey: "name",
    yKeys: ["performance"],
    rightAxisKeys: [],
    normalization: "none",
    formula: null,
    showBrush: true,
    showLegend: true,
    showTrendline: false,
    ciLowerKey: undefined,
    ciUpperKey: undefined,
    annotations: [],
    selectionEnabled: true,
    playbackEnabled: false,
    refreshInterval: 1000,
    dataset: "performance",
  };
const [chartConfig, setChartConfig] = useState<ChartBuilderConfig>(defaultChartConfig);
  const [presets, setPresets] = useState<ChartPreset[]>([]);
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setChartConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chartConfig));
    } catch {}
  }, [chartConfig]);

  // Load saved presets on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const handleReset = () => {
    setChartConfig(defaultChartConfig);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast({ title: "Chart reset", description: "Your custom chart has been reset." });
  };

  const applyPreset = (presetId: string) => {
    const p = presets.find((x) => x.id === presetId);
    if (p) {
      setChartConfig((prev) => ({ ...prev, ...p.config }));
      toast({ title: "Preset applied", description: `Applied preset: ${p.name}` });
    }
  };

  const savePreset = () => {
    const name = (presetName || chartConfig.title || "Preset").trim();
    const id = generatePresetId();
    upsertPreset({ id, name, config: chartConfig });
    setPresets(loadPresets());
    setPresetName("");
    toast({ title: "Preset saved", description: `Saved as: ${name}` });
  };

  const removePreset = (id: string) => {
    deletePreset(id);
    setPresets(loadPresets());
    toast({ title: "Preset deleted" });
  };
  
  // Use real data if available, provide default structure if no data
  const realMetrics = analyticsData ? [
    { id: '1', name: 'Total Projects', value: analyticsData.totalProjects, change: 15, changeType: 'increase', category: 'content' },
    { id: '2', name: 'Active Projects', value: analyticsData.activeProjects, change: 8, changeType: 'increase', category: 'content' },
    { id: '3', name: 'Completion Rate', value: analyticsData.completionRate, change: 12, changeType: 'increase', category: 'competitive' },
    { id: '4', name: 'Team Members', value: analyticsData.teamMembers, change: 5, changeType: 'increase', category: 'social' },
    { id: '5', name: 'Content Items', value: analyticsData.contentPerformance.reduce((sum, cp) => sum + cp.value, 0), change: 23, changeType: 'increase', category: 'seo' },
    { id: '6', name: 'Market Coverage', value: 87, change: 3, changeType: 'increase', category: 'market' }
  ] : [
    { id: '1', name: 'Total Projects', value: 0, change: 0, changeType: 'neutral', category: 'content' },
    { id: '2', name: 'Active Projects', value: 0, change: 0, changeType: 'neutral', category: 'content' },
    { id: '3', name: 'Completion Rate', value: 0, change: 0, changeType: 'neutral', category: 'competitive' },
    { id: '4', name: 'Team Members', value: 0, change: 0, changeType: 'neutral', category: 'social' },
    { id: '5', name: 'Content Items', value: 0, change: 0, changeType: 'neutral', category: 'seo' },
    { id: '6', name: 'Market Coverage', value: 0, change: 0, changeType: 'neutral', category: 'market' }
  ];

  // Use real chart data when available
  const chartData = useMemo(() => ({
    performanceData: analyticsData?.projectTimeline || [
      { name: 'Jan 1', performance: 65, competitors: 58, content: 72 },
      { name: 'Jan 7', performance: 72, competitors: 62, content: 75 },
      { name: 'Jan 14', performance: 68, competitors: 65, content: 78 },
      { name: 'Jan 21', performance: 78, competitors: 70, content: 82 },
      { name: 'Jan 28', performance: 85, competitors: 75, content: 88 },
    ],
    contentPerformanceData: analyticsData?.contentPerformance || [
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
    trafficSourcesData: analyticsData?.competitorsByStatus || [
      { name: 'Organic Search', value: 45, color: '#3B82F6' },
      { name: 'Social Media', value: 25, color: '#8B5CF6' },
      { name: 'Direct', value: 20, color: '#10B981' },
      { name: 'Referrals', value: 10, color: '#F59E0B' },
    ],
    engagementData: analyticsData?.engagementMetrics || [
      { name: 'Week 1', likes: 4000, shares: 2400, comments: 1200 },
      { name: 'Week 2', likes: 3000, shares: 1398, comments: 2210 },
      { name: 'Week 3', likes: 2000, shares: 3800, comments: 2290 },
      { name: 'Week 4', likes: 2780, shares: 3908, comments: 2000 },
    ]
  }), [analyticsData]);

  const selectedData = useMemo(() => {
    if (chartConfig.dataset === "performance") return chartData.performanceData;
    if (chartConfig.dataset === "engagement") return chartData.engagementData;
    return chartData.contentPerformanceData;
  }, [chartConfig.dataset, chartData]);

  const availableXKeys = useMemo(() => {
    const first = selectedData?.[0] ?? {} as any;
    return Object.keys(first).filter((k) => typeof (first as any)[k] !== 'object');
  }, [selectedData]);

  const availableYKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedData?.forEach((row: any) => {
      Object.keys(row).forEach((k) => {
        if (k !== chartConfig.xKey && typeof row[k] === 'number') keys.add(k);
      });
    });
    const arr = Array.from(keys);
    return arr.length ? arr : ["value"];
  }, [selectedData, chartConfig.xKey]);

  // Reconcile config when dataset changes to ensure keys exist
  const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  useEffect(() => {
    if (!selectedData?.length) return;
    let nextX = chartConfig.xKey;
    if (!availableXKeys.includes(nextX)) nextX = availableXKeys[0] || nextX;

    const filteredY = chartConfig.yKeys.filter((k) => availableYKeys.includes(k));
    const nextY = filteredY.length ? filteredY : (availableYKeys.length ? [availableYKeys[0]] : chartConfig.yKeys);

    if (nextX !== chartConfig.xKey || !arraysEqual(nextY, chartConfig.yKeys)) {
      setChartConfig((prev) => ({ ...prev, xKey: nextX, yKeys: Array.from(new Set(nextY)) }));
    }
  }, [chartConfig.dataset, selectedData, availableXKeys, availableYKeys]);


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

        {/* Custom Chart Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <ChartConfigPanel
              config={chartConfig}
              onChange={(partial) => setChartConfig((prev) => ({ ...prev, ...partial }))}
              availableXKeys={availableXKeys}
              availableYKeys={availableYKeys}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-[180px]"
                />
                <Button variant="outline" onClick={savePreset}>Save preset</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Presets</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {presets.length ? (
                      presets.map((p) => (
                        <div key={p.id}>
                          <DropdownMenuItem onClick={() => applyPreset(p.id)}>Apply: {p.name}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removePreset(p.id)}>Delete: {p.name}</DropdownMenuItem>
                        </div>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No presets</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </div>
            <ConfigurableChart
              title={chartConfig.title || "Custom Chart"}
              data={selectedData as any[]}
              config={chartConfig}
            />
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))
          ) : (
            realMetrics.map((metric) => (
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
                ) : analyticsData ? (
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
                        {realMetrics.map((metric) => (
                          <tr key={metric.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{metric.name}</td>
                            <td className="p-2">{metric.value}</td>
                            <td className="p-2">{Math.max(0, metric.value - metric.change)}</td>
                            <td className="p-2">{formatChange(metric.change, metric.changeType)}</td>
                            <td className="p-2">
                              <Badge variant="outline">{metric.value + 10}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
                    <p className="text-muted-foreground">Start creating projects to see analytics data here</p>
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
