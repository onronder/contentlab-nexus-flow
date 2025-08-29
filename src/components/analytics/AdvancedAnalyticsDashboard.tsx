import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Activity, 
  BarChart3, 
  PieChart, 
  LineChart,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { advancedAnalyticsService } from '@/services/advancedAnalyticsService';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { logger } from '@/utils/consoleReplacement';

interface AnalyticsDashboardProps {
  teamId?: string;
  projectId?: string;
}

interface Insight {
  id: string;
  insight_type: string;
  insight_category: string;
  title: string;
  description: string;
  confidence_score: number;
  impact_level: string;
  recommended_actions: string[];
  is_actionable: boolean;
  created_at: string;
}

interface BusinessMetrics {
  revenue: Array<{
    metric_name: string;
    current_value: number;
    target_value?: number;
    change_percentage: number;
    trend: string;
  }>;
  conversion: Array<{
    metric_name: string;
    current_value: number;
    target_value?: number;
    change_percentage: number;
  }>;
  growth: Array<{
    metric_name: string;
    current_value: number;
    change_percentage: number;
  }>;
  engagement: Array<{
    metric_name: string;
    current_value: number;
    change_percentage: number;
  }>;
}

export const AdvancedAnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  teamId,
  projectId
}) => {
  const userId = useCurrentUserId();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [userEngagement, setUserEngagement] = useState<any>(null);
  const [systemPerformance, setSystemPerformance] = useState<any>(null);
  const [customEvents, setCustomEvents] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Load insights
      const insightsData = await advancedAnalyticsService.getAnalyticsInsights({
        teamId,
        projectId,
        limit: 10
      });
      setInsights(insightsData || []);

      // Load business metrics
      const businessData = await advancedAnalyticsService.aggregateBusinessMetrics({
        teamId,
        projectId
      });
      setBusinessMetrics(businessData);

      // Load user engagement
      const engagementData = await advancedAnalyticsService.getUserEngagementAnalytics({
        teamId,
        userId
      });
      setUserEngagement(engagementData);

      // Load system performance
      const performanceData = await advancedAnalyticsService.getSystemPerformanceAnalytics({});
      setSystemPerformance(performanceData);

      // Load custom events
      const eventsData = await advancedAnalyticsService.getCustomEventsAnalytics({
        teamId,
        projectId
      });
      setCustomEvents(eventsData);

    } catch (error) {
      logger.analytics('Error loading analytics data', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    try {
      setRefreshing(true);
      await advancedAnalyticsService.generateInsights({
        teamId,
        projectId
      });
      
      // Reload insights after generation
      const insightsData = await advancedAnalyticsService.getAnalyticsInsights({
        teamId,
        projectId,
        limit: 10
      });
      setInsights(insightsData || []);

      toast({
        title: "Success",
        description: "New insights generated successfully!",
      });
    } catch (error) {
      logger.analytics('Error generating insights', error);
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const dismissInsight = async (insightId: string) => {
    try {
      await advancedAnalyticsService.dismissInsight(insightId);
      setInsights(insights.filter(insight => insight.id !== insightId));
      
      toast({
        title: "Success",
        description: "Insight dismissed successfully.",
      });
    } catch (error) {
      logger.analytics('Error dismissing insight', error);
      toast({
        title: "Error",
        description: "Failed to dismiss insight. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [teamId, projectId, userId]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'anomaly': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <Lightbulb className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Loading analytics dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and metrics for your platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadAnalyticsData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={generateNewInsights}
            disabled={refreshing}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Generate Insights
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userEngagement?.totalEvents?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userEngagement?.uniqueUsers?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Length</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userEngagement?.avgEventsPerSession?.toFixed(1) || '0'} events
            </div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Events</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customEvents?.totalEvents?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {customEvents?.uniqueEventNames || 0} unique types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI-Powered Insights
              </CardTitle>
              <CardDescription>
                Automatically generated insights based on your data patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getInsightIcon(insight.insight_type)}
                          <CardTitle className="text-lg">{insight.title}</CardTitle>
                          <Badge variant="outline" className="capitalize">
                            {insight.insight_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getImpactColor(insight.impact_level)}`} />
                          <span className="text-sm capitalize">{insight.impact_level} Impact</span>
                        </div>
                      </div>
                      <CardDescription>{insight.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Confidence:</span>
                          <Progress value={insight.confidence_score} className="flex-1" />
                          <span className="text-sm">{insight.confidence_score}%</span>
                        </div>
                        
                        {insight.recommended_actions.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">Recommended Actions:</span>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {insight.recommended_actions.map((action, index) => (
                                <li key={index} className="text-sm text-muted-foreground">
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-muted-foreground">
                            Generated {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissInsight(insight.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No insights yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate AI-powered insights from your data
                  </p>
                  <Button onClick={generateNewInsights} disabled={refreshing}>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Generate Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Metrics Tab */}
        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {businessMetrics && Object.entries(businessMetrics).map(([category, metrics]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category} Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.isArray(metrics) && metrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{metric.metric_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Target: {metric.target_value || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{metric.current_value}</p>
                        <div className="flex items-center">
                          {metric.change_percentage > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className={`text-sm ${metric.change_percentage > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {metric.change_percentage?.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* User Engagement Tab */}
        <TabsContent value="engagement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
              </CardHeader>
              <CardContent>
                {userEngagement?.eventsByType && Object.entries(userEngagement.eventsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-2">
                    <span className="capitalize">{type}</span>
                    <Badge variant="secondary">{count as number}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                {userEngagement?.pageViews && Object.entries(userEngagement.pageViews)
                  .slice(0, 5)
                  .map(([page, views]) => (
                    <div key={page} className="flex items-center justify-between py-2">
                      <span className="truncate">{page}</span>
                      <Badge variant="secondary">{views as number}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>
                Performance metrics and system health indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemPerformance?.metrics ? (
                Object.entries(systemPerformance.metrics).map(([metricName, data]: [string, any]) => (
                  <div key={metricName} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{metricName}</h4>
                      <span className="text-sm text-muted-foreground">{data.unit}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Average</p>
                        <p className="font-medium">{data.average}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min</p>
                        <p className="font-medium">{data.min}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Max</p>
                        <p className="font-medium">{data.max}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Count</p>
                        <p className="font-medium">{data.count}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No performance metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Events Analysis</CardTitle>
              <CardDescription>
                Analysis of custom events and their patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customEvents?.eventsByName ? (
                Object.entries(customEvents.eventsByName).map(([eventName, data]: [string, any]) => (
                  <div key={eventName} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{eventName}</h4>
                      <Badge>{data.count} events</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Value</p>
                        <p className="font-medium">{data.totalValue}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Value</p>
                        <p className="font-medium">{data.avgValue}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Categories</p>
                        <p className="font-medium">{Object.keys(data.categories).length}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No custom events data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};