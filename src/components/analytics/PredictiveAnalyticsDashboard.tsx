import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Brain, Target, AlertTriangle, Calendar, Users } from 'lucide-react';

interface PredictiveAnalyticsDashboardProps {
  projectId: string;
}

export function PredictiveAnalyticsDashboard({ projectId }: PredictiveAnalyticsDashboardProps) {
  const [forecastPeriod, setForecastPeriod] = useState('90d');
  const [confidenceLevel, setConfidenceLevel] = useState('medium');

  // Mock predictive data - replace with actual ML predictions
  const performanceForecasts = [
    { date: '2024-02-01', actual: 1200, predicted: null, confidence: null },
    { date: '2024-02-15', actual: 1350, predicted: null, confidence: null },
    { date: '2024-03-01', actual: 1180, predicted: null, confidence: null },
    { date: '2024-03-15', actual: null, predicted: 1420, confidence: 85 },
    { date: '2024-04-01', actual: null, predicted: 1580, confidence: 82 },
    { date: '2024-04-15', actual: null, predicted: 1650, confidence: 78 },
    { date: '2024-05-01', actual: null, predicted: 1720, confidence: 75 }
  ];

  const contentDemandPrediction = [
    { category: 'Video Tutorials', currentDemand: 78, predictedDemand: 92, growth: 18, confidence: 87 },
    { category: 'Interactive Templates', currentDemand: 65, predictedDemand: 85, growth: 31, confidence: 83 },
    { category: 'Case Studies', currentDemand: 82, predictedDemand: 89, growth: 9, confidence: 91 },
    { category: 'Documentation', currentDemand: 59, predictedDemand: 62, growth: 5, confidence: 94 },
    { category: 'Mobile Assets', currentDemand: 45, predictedDemand: 67, growth: 49, confidence: 76 }
  ];

  const lifecyclePredictions = [
    {
      content: 'Brand Guidelines v2.1',
      currentStage: 'Mature',
      predictedObsolescence: '6 months',
      confidence: 82,
      recommendation: 'Schedule refresh',
      risk: 'medium'
    },
    {
      content: 'Marketing Templates Q1',
      currentStage: 'Peak',
      predictedObsolescence: '12 months',
      confidence: 91,
      recommendation: 'Monitor performance',
      risk: 'low'
    },
    {
      content: 'Product Documentation',
      currentStage: 'Declining',
      predictedObsolescence: '2 months',
      confidence: 95,
      recommendation: 'Immediate update needed',
      risk: 'high'
    }
  ];

  const audienceGrowthPrediction = [
    { segment: 'Power Users', current: 156, predicted: 189, growth: 21, likelihood: 'high' },
    { segment: 'Regular Users', current: 342, predicted: 423, growth: 24, likelihood: 'high' },
    { segment: 'Occasional Users', current: 298, predicted: 287, growth: -4, likelihood: 'medium' },
    { segment: 'New Users', current: 189, predicted: 245, growth: 30, likelihood: 'medium' }
  ];

  const strategicRecommendations = [
    {
      type: 'Content Strategy',
      priority: 'high',
      prediction: 'Video content demand will increase 45% in next quarter',
      recommendation: 'Increase video production capacity by 30%',
      impact: 'High engagement boost expected',
      confidence: 87
    },
    {
      type: 'Resource Planning',
      priority: 'medium',
      prediction: 'Peak usage expected in March-April',
      recommendation: 'Scale infrastructure and support resources',
      impact: 'Prevent performance degradation',
      confidence: 92
    },
    {
      type: 'Content Lifecycle',
      priority: 'high',
      prediction: '15% of content will become obsolete in 3 months',
      recommendation: 'Implement proactive refresh schedule',
      impact: 'Maintain content relevance',
      confidence: 89
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 80) return 'text-blue-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Predictive Analytics</h2>
          <p className="text-muted-foreground">
            AI-powered forecasting and strategic content planning insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
              <SelectItem value="180d">6 months</SelectItem>
              <SelectItem value="365d">1 year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Confidence</SelectItem>
              <SelectItem value="medium">Medium Confidence</SelectItem>
              <SelectItem value="high">High Confidence</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          Predictions are based on historical data, current trends, and machine learning models. 
          Use these insights to inform strategic decisions, but consider external factors that may impact outcomes.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Forecast</TabsTrigger>
          <TabsTrigger value="demand">Content Demand</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle Prediction</TabsTrigger>
          <TabsTrigger value="audience">Audience Growth</TabsTrigger>
          <TabsTrigger value="strategy">Strategic Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Content Performance Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceForecasts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="actual" 
                    stroke={COLORS[0]} 
                    strokeWidth={2}
                    name="Actual Performance"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke={COLORS[1]} 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Predicted Performance"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">+18%</div>
                  <div className="text-sm text-muted-foreground">Expected Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">85%</div>
                  <div className="text-sm text-muted-foreground">Avg. Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">1,720</div>
                  <div className="text-sm text-muted-foreground">Peak Prediction</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demand" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Demand Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentDemandPrediction.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">{item.category}</h4>
                      <div className="flex items-center gap-2">
                        {item.growth > 20 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : item.growth < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-blue-500" />
                        )}
                        <Badge variant={item.growth > 20 ? 'default' : 'secondary'}>
                          {item.growth > 0 ? '+' : ''}{item.growth}%
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Current Demand</div>
                        <Progress value={item.currentDemand} className="h-2 mt-1" />
                        <div className="text-xs text-muted-foreground mt-1">{item.currentDemand}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Predicted Demand</div>
                        <Progress value={item.predictedDemand} className="h-2 mt-1" />
                        <div className="text-xs text-muted-foreground mt-1">{item.predictedDemand}%</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className={getConfidenceColor(item.confidence)}>{item.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Lifecycle Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lifecyclePredictions.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{item.content}</h4>
                        <div className="text-sm text-muted-foreground">
                          Current: {item.currentStage}
                        </div>
                      </div>
                      <Badge variant={getRiskColor(item.risk)}>
                        {item.risk} risk
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Obsolescence:</span>
                        <span className="ml-2 font-medium">{item.predictedObsolescence}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className={`ml-2 font-medium ${getConfidenceColor(item.confidence)}`}>
                          {item.confidence}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 p-2 bg-muted rounded text-sm">
                      <strong>Recommendation:</strong> {item.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audience Growth Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audienceGrowthPrediction.map((segment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{segment.segment}</h4>
                      <div className="text-sm text-muted-foreground">
                        {segment.current} → {segment.predicted} users
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-lg font-bold ${segment.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {segment.growth > 0 ? '+' : ''}{segment.growth}%
                        </div>
                        <div className="text-xs text-muted-foreground">Growth</div>
                      </div>
                      <Badge variant={segment.likelihood === 'high' ? 'default' : 'secondary'}>
                        {segment.likelihood} likelihood
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategicRecommendations.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={rec.priority === 'high' ? 'destructive' : 'default'}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{rec.type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.prediction}</p>
                      </div>
                      <div className={`text-sm font-medium ${getConfidenceColor(rec.confidence)}`}>
                        {rec.confidence}% confidence
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <strong className="text-sm">Recommendation:</strong>
                        <p className="text-sm text-muted-foreground">{rec.recommendation}</p>
                      </div>
                      <div>
                        <strong className="text-sm">Expected Impact:</strong>
                        <p className="text-sm text-muted-foreground">{rec.impact}</p>
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