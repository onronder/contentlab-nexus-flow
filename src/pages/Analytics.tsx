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
  Eye,
  Settings,
  Maximize2,
  Filter,
  RefreshCw
} from "lucide-react";

import { OptimizedChart } from "@/components/charts/OptimizedChart";
import { MetricCardSkeleton, TableSkeleton } from "@/components/ui/loading-skeletons";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  const [selectedMetricCategory, setSelectedMetricCategory] = useState("all");
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
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
    { id: '1', name: 'Total Projects', value: analyticsData.totalProjects, change: 15, changeType: 'increase', category: 'content', icon: BarChart3 },
    { id: '2', name: 'Active Projects', value: analyticsData.activeProjects, change: 8, changeType: 'increase', category: 'content', icon: Activity },
    { id: '3', name: 'Completion Rate', value: analyticsData.completionRate, change: 12, changeType: 'increase', category: 'performance', icon: Target },
    { id: '4', name: 'Team Members', value: analyticsData.teamMembers, change: 5, changeType: 'increase', category: 'team', icon: Users },
    { id: '5', name: 'Content Items', value: analyticsData.contentPerformance.reduce((sum, cp) => sum + cp.value, 0), change: 23, changeType: 'increase', category: 'content', icon: Eye },
    { id: '6', name: 'Market Coverage', value: 87, change: 3, changeType: 'increase', category: 'market', icon: DollarSign }
  ] : [
    { id: '1', name: 'Total Projects', value: 24, change: 15, changeType: 'increase', category: 'content', icon: BarChart3 },
    { id: '2', name: 'Active Projects', value: 18, change: 8, changeType: 'increase', category: 'content', icon: Activity },
    { id: '3', name: 'Completion Rate', value: 75, change: 12, changeType: 'increase', category: 'performance', icon: Target },
    { id: '4', name: 'Team Members', value: 12, change: 5, changeType: 'increase', category: 'team', icon: Users },
    { id: '5', name: 'Content Items', value: 1240, change: 23, changeType: 'increase', category: 'content', icon: Eye },
    { id: '6', name: 'Market Coverage', value: 87, change: 3, changeType: 'increase', category: 'market', icon: DollarSign }
  ];

  // Filter metrics based on selected category
  const filteredMetrics = useMemo(() => {
    if (selectedMetricCategory === "all") return realMetrics;
    return realMetrics.filter(metric => metric.category === selectedMetricCategory);
  }, [realMetrics, selectedMetricCategory]);

  // Use real chart data when available
  const chartData = useMemo(() => ({
    performanceData: analyticsData?.projectTimeline || [
      { name: 'Jan', performance: 65, competitors: 58, content: 72 },
      { name: 'Feb', performance: 72, competitors: 62, content: 75 },
      { name: 'Mar', performance: 68, competitors: 65, content: 78 },
      { name: 'Apr', performance: 78, competitors: 70, content: 82 },
      { name: 'May', performance: 85, competitors: 75, content: 88 },
      { name: 'Jun', performance: 92, competitors: 80, content: 95 },
    ],
    contentPerformanceData: analyticsData?.contentPerformance || [
      { name: 'Blog Posts', value: 245, color: 'hsl(var(--primary))' },
      { name: 'Videos', value: 189, color: 'hsl(var(--chart-2))' },
      { name: 'Social Media', value: 156, color: 'hsl(var(--chart-3))' },
      { name: 'Documents', value: 132, color: 'hsl(var(--chart-4))' },
      { name: 'Images', value: 98, color: 'hsl(var(--chart-5))' },
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
      { name: 'Organic Search', value: 45, color: 'hsl(var(--primary))' },
      { name: 'Social Media', value: 25, color: 'hsl(var(--chart-2))' },
      { name: 'Direct', value: 20, color: 'hsl(var(--chart-3))' },
      { name: 'Referrals', value: 10, color: 'hsl(var(--chart-4))' },
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
    const color = isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
    
    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span className="text-xs font-medium">{Math.abs(value)}%</span>
      </div>
    );
  };

  const formatValue = (value: number, category: string) => {
    if (category === "performance" && value <= 100) return `${value}%`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Monitor performance and gain insights from your data</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Metrics Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Key Metrics</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedMetricCategory} onValueChange={setSelectedMetricCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="market">Market</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <MetricCardSkeleton key={i} />
              ))
            ) : (
              filteredMetrics.map((metric) => {
                const IconComponent = metric.icon;
                return (
                  <Card key={metric.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        {formatChange(metric.change, metric.changeType)}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-bold">{formatValue(metric.value, metric.category)}</h3>
                        <p className="text-sm text-muted-foreground leading-tight">{metric.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Analytics Overview</h2>
            <Dialog open={isChartBuilderOpen} onOpenChange={setIsChartBuilderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Custom Chart Builder
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Custom Chart Builder</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 h-full overflow-hidden">
                  <div className="lg:col-span-1 overflow-y-auto">
                    <ChartConfigPanel
                      config={chartConfig}
                      onChange={(partial) => setChartConfig((prev) => ({ ...prev, ...partial }))}
                      availableXKeys={availableXKeys}
                      availableYKeys={availableYKeys}
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Preset name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          className="w-[140px]"
                        />
                        <Button variant="outline" size="sm" onClick={savePreset}>Save</Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">Presets</Button>
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
                      <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
                    </div>
                    <div className="h-[500px] overflow-y-auto">
                      <ConfigurableChart
                        title={chartConfig.title || "Custom Chart"}
                        data={selectedData as any[]}
                        config={chartConfig}
                      />
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Performance Trends</CardTitle>
                  <CardDescription>Track your competitive intelligence performance</CardDescription>
                </div>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <LazyLineChart data={chartData.performanceData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="performance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="competitors" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="content" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                      </LazyLineChart>
                    </Suspense>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Content Performance */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Content Performance</CardTitle>
                  <CardDescription>Content engagement by type</CardDescription>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <LazyBarChart data={chartData.contentPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </LazyBarChart>
                    </Suspense>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Traffic Sources</CardTitle>
                  <CardDescription>Distribution of traffic sources</CardDescription>
                </div>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <LazyPieChart>
                        <Pie
                          data={chartData.trafficSourcesData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.trafficSourcesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </LazyPieChart>
                    </Suspense>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Competitor Analysis */}
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Competitor Analysis</CardTitle>
                  <CardDescription>Performance comparison radar</CardDescription>
                </div>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <LazyRadarChart data={chartData.competitorAnalysisData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" className="text-xs" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                        <Radar name="Us" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        <Radar name="Competitors" dataKey="B" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip />
                      </LazyRadarChart>
                    </Suspense>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Analytics Tables */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detailed Analytics</h2>
          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Detailed performance breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Performance data will be displayed here when available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="competitors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Competitor Analysis</CardTitle>
                  <CardDescription>Detailed competitor insights</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Competitor data will be displayed here when available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Performance</CardTitle>
                  <CardDescription>Content analytics and insights</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Content data will be displayed here when available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="engagement" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Metrics</CardTitle>
                  <CardDescription>User engagement and interaction data</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <TableSkeleton />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Engagement data will be displayed here when available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Analytics;