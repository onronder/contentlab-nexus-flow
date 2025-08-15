import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, FileText, Calendar, TrendingUp, TrendingDown, Target, DollarSign, Users, Eye, Share } from 'lucide-react';
import { useExecutiveReporting } from '@/hooks/useExecutiveReporting';

interface ExecutiveReportingDashboardProps {
  projectId: string;
}

export function ExecutiveReportingDashboard({ projectId }: ExecutiveReportingDashboardProps) {
  const [reportType, setReportType] = useState('executive');
  const [timeframe, setTimeframe] = useState('quarterly');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { executiveKPIs, performanceMetrics, strategicInsights, isLoading } = useExecutiveReporting(projectId);

  // Use real data from hooks
  const performanceSummary = performanceMetrics || [
    { metric: 'Content Views', current: 1567890, previous: 1342156, target: 1800000, performance: 87.1 },
    { metric: 'User Engagement', current: 234567, previous: 198234, target: 250000, performance: 93.8 },
    { metric: 'Conversion Rate', current: 12.5, previous: 10.8, target: 15.0, performance: 83.3 }
  ];

  // Use real strategic insights from database
  const strategicInsightsData = strategicInsights || [
    {
      category: 'Content Strategy',
      insight: 'Video content drives 3x higher engagement than static content',
      impact: 'High',
      recommendation: 'Increase video production budget by 40%',
      timeline: 'Q2 2024'
    }
  ];

  const benchmarkComparison = [
    { metric: 'Content Engagement', our_performance: 87, industry_average: 72, top_quartile: 92 },
    { metric: 'Content ROI', our_performance: 245, industry_average: 185, top_quartile: 310 },
    { metric: 'User Satisfaction', our_performance: 4.3, industry_average: 3.8, top_quartile: 4.6 },
    { metric: 'Time to Publish', our_performance: 2.1, industry_average: 3.2, top_quartile: 1.8 }
  ];

  const customReportTemplates = [
    { name: 'Executive Summary', description: 'High-level KPIs and strategic insights', frequency: 'Monthly' },
    { name: 'Performance Deep Dive', description: 'Detailed content performance analysis', frequency: 'Quarterly' },
    { name: 'ROI Analysis', description: 'Content investment returns and optimization', frequency: 'Quarterly' },
    { name: 'Competitive Benchmark', description: 'Industry comparison and positioning', frequency: 'Bi-annual' },
    { name: 'Strategic Planning', description: 'Forward-looking insights and recommendations', frequency: 'Annual' }
  ];

  const exportFormats = ['PDF Report', 'PowerPoint Deck', 'Excel Dashboard', 'CSV Data', 'Interactive Dashboard'];

  const historicalTrends = [
    { period: 'Q1 2023', engagement: 145, roi: 198, satisfaction: 3.9 },
    { period: 'Q2 2023', engagement: 156, roi: 215, satisfaction: 4.0 },
    { period: 'Q3 2023', engagement: 148, roi: 232, satisfaction: 4.1 },
    { period: 'Q4 2023', engagement: 162, roi: 245, satisfaction: 4.3 },
    { period: 'Q1 2024', engagement: 178, roi: 267, satisfaction: 4.3 }
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 95) return 'text-green-600';
    if (performance >= 85) return 'text-blue-600';
    if (performance >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Reporting</h2>
          <p className="text-muted-foreground">
            Comprehensive business intelligence and strategic content insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="executive">Executive Summary</SelectItem>
              <SelectItem value="performance">Performance Report</SelectItem>
              <SelectItem value="strategic">Strategic Analysis</SelectItem>
              <SelectItem value="benchmark">Benchmark Report</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <FileText className="h-4 w-4 animate-pulse" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {/* Executive KPIs Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content ROI</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executiveKPIs?.contentROI || 245.3}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              {executiveKPIs?.roiTrend || 18.5}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(executiveKPIs?.totalEngagement || 156789).toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              {executiveKPIs?.engagementTrend || 12.3}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Efficiency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executiveKPIs.contentEfficiency}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              {executiveKPIs.efficiencyTrend}% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Strategic Alignment</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executiveKPIs.strategicAlignment}%</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              {executiveKPIs.alignmentTrend}% from last period
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Executive Summary</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="insights">Strategic Insights</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceSummary.map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{metric.metric}</span>
                        <span className={`text-sm font-bold ${getPerformanceColor(metric.performance)}`}>
                          {metric.performance}%
                        </span>
                      </div>
                      <Progress value={metric.performance} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: {typeof metric.current === 'number' && metric.current > 1000 ? metric.current.toLocaleString() : metric.current}</span>
                        <span>Target: {typeof metric.target === 'number' && metric.target > 1000 ? metric.target.toLocaleString() : metric.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historical Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="engagement" stroke={COLORS[0]} name="Engagement" />
                    <Line type="monotone" dataKey="roi" stroke={COLORS[1]} name="ROI" />
                    <Line type="monotone" dataKey="satisfaction" stroke={COLORS[2]} name="Satisfaction" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Performance vs Target</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceSummary}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="performance" fill={COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Quarter-over-Quarter Growth</h4>
                  <div className="space-y-3">
                    {performanceSummary.map((metric, index) => {
                      const growth = ((metric.current - metric.previous) / metric.previous) * 100;
                      return (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm">{metric.metric}</span>
                          <div className="flex items-center gap-2">
                            {growth > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategicInsightsData.map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{insight.category}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={getImpactBadge(insight.impact)}>
                          {insight.impact} Impact
                        </Badge>
                        <Badge variant="outline">
                          {insight.timeline}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{insight.insight}</p>
                    <div className="bg-muted p-3 rounded">
                      <strong className="text-sm">Recommendation:</strong>
                      <p className="text-sm mt-1">{insight.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmark Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {benchmarkComparison.map((benchmark, index) => (
                  <div key={index} className="space-y-3">
                    <h4 className="font-medium">{benchmark.metric}</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{benchmark.our_performance}</div>
                        <div className="text-xs text-muted-foreground">Our Performance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{benchmark.industry_average}</div>
                        <div className="text-xs text-muted-foreground">Industry Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{benchmark.top_quartile}</div>
                        <div className="text-xs text-muted-foreground">Top Quartile</div>
                      </div>
                    </div>
                    <Progress 
                      value={(benchmark.our_performance / benchmark.top_quartile) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customReportTemplates.map((template, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                        <Badge variant="outline" className="mt-1">
                          {template.frequency}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline">
                        Generate
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exportFormats.map((format, index) => (
                    <Button key={index} variant="outline" className="w-full justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      {format}
                    </Button>
                  ))}
                </div>
                <Alert className="mt-4">
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Set up automated report delivery to receive regular insights via email.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}