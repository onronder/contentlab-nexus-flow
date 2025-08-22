import React from 'react';
import { LazyAdvancedAnalyticsDashboard, LazyPredictiveAnalyticsDashboard, LazyWrapper } from '@/components/lazy/LazyComponents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { BarChart3, Brain, TrendingUp, Zap, Activity } from 'lucide-react';

const Analytics = () => {
  const {
    predictions,
    activePredictions,
    isGeneratingPrediction,
    generatePrediction,
    createDashboard
  } = useAdvancedAnalytics();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-6 rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Advanced Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights with AI-powered predictions and real-time analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Live Data
            </Badge>
            <Button 
              onClick={() => generatePrediction('user_engagement', 30)}
              disabled={isGeneratingPrediction}
              className="flex items-center gap-2"
            >
              <Brain className="h-4 w-4" />
              {isGeneratingPrediction ? 'Generating...' : 'Generate AI Report'}
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="predictive" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Predictions
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Real-time Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <LazyWrapper>
            <LazyAdvancedAnalyticsDashboard />
          </LazyWrapper>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          <LazyWrapper>
            <LazyPredictiveAnalyticsDashboard projectId="demo-project" />
          </LazyWrapper>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Real-time Insights
                </CardTitle>
                <CardDescription>
                  Live data streams and instant analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {predictions?.length > 0 ? (
                  <div className="space-y-3">
                    {predictions.slice(0, 5).map((prediction, index) => (
                      <div key={index} className="p-3 glass-card rounded-lg">
                        <p className="text-sm font-medium">{prediction.prediction_type}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence: {Math.round(prediction.confidence_level * 100)}%
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {prediction.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No predictions available. Generate AI reports to see insights.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Predictive Metrics
                </CardTitle>
                <CardDescription>
                  AI-powered forecasts and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activePredictions?.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 glass-card rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {Math.round(activePredictions[0]?.confidence_level * 100) || 85}%
                        </p>
                        <p className="text-xs text-muted-foreground">Prediction Accuracy</p>
                      </div>
                      <div className="text-center p-3 glass-card rounded-lg">
                        <p className="text-2xl font-bold text-success">
                          +{activePredictions[0]?.prediction_data?.growth_rate 
                            ? Math.round(activePredictions[0].prediction_data.growth_rate) 
                            : 15}%
                        </p>
                        <p className="text-xs text-muted-foreground">Growth Forecast</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => createDashboard({
                        name: 'Exported Predictions',
                        description: 'Dashboard with exported predictions',
                        dashboard_config: { theme: 'default' },
                        widgets: [],
                        is_template: false
                      })}
                    >
                      Export Predictions
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Generate predictive analytics to see AI-powered insights.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;