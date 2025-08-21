import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRealtimeSecurityAlerts } from '@/hooks/useRealtimeSecurityAlerts'
import { supabase } from '@/integrations/supabase/client'
import { AlertTriangle, Shield, Activity, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ThreatPrediction {
  threatType: string
  probability: number
  timeFrame: string
  confidence: number
  mitigationStrategies: string[]
}

interface SecurityTrend {
  metric: string
  trend: 'increasing' | 'decreasing' | 'stable'
  changePercent: number
  prediction: number
}

export const RealTimeSecurityMonitor = () => {
  const { alerts, isConnected, connectionError, clearAlert, clearAllAlerts } = useRealtimeSecurityAlerts()
  const [threatPredictions, setThreatPredictions] = useState<ThreatPrediction[]>([])
  const [securityTrends, setSecurityTrends] = useState<SecurityTrend[]>([])
  const [overallRiskScore, setOverallRiskScore] = useState<number>(0)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  useEffect(() => {
    loadPredictiveAnalytics()
  }, [])

  const loadPredictiveAnalytics = async () => {
    setIsLoadingAnalytics(true)
    try {
      const { data, error } = await supabase.functions.invoke('predictive-security-analytics', {
        body: { analysisType: 'comprehensive', timeRange: 30 }
      })

      if (error) throw error

      if (data?.analytics) {
        setThreatPredictions(data.analytics.threatPredictions || [])
        setSecurityTrends(data.analytics.securityTrends || [])
        setOverallRiskScore(data.analytics.overallRiskScore || 0)
      }
    } catch (error) {
      console.error('Failed to load predictive analytics:', error)
      toast.error('Failed to load security predictions')
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈'
      case 'decreasing': return '📉'
      case 'stable': return '➡️'
      default: return '❓'
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-destructive'
    if (score >= 0.6) return 'text-orange-500'
    if (score >= 0.4) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-Time Security Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          {connectionError && (
            <CardDescription className="text-destructive">
              Connection Error: {connectionError}
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Overall Risk Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                <span className={getRiskScoreColor(overallRiskScore)}>
                  {Math.round(overallRiskScore * 100)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Overall Risk Score</p>
            </div>
            <Button 
              onClick={loadPredictiveAnalytics} 
              disabled={isLoadingAnalytics}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Security Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Live Security Alerts
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{alerts.length} alerts</Badge>
                {alerts.length > 0 && (
                  <Button onClick={clearAllAlerts} variant="ghost" size="sm">
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No security alerts at this time
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => clearAlert(alert.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Threat Predictions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ML Threat Predictions</CardTitle>
            <CardDescription>
              AI-powered threat analysis and risk predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              {threatPredictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoadingAnalytics ? 'Analyzing threats...' : 'No threats predicted'}
                </div>
              ) : (
                <div className="space-y-4">
                  {threatPredictions.map((prediction, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{prediction.threatType.replace('_', ' ')}</h4>
                        <Badge variant="outline">
                          {Math.round(prediction.probability * 100)}% risk
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Timeframe: {prediction.timeFrame}
                      </p>
                      <div className="text-xs">
                        <p className="font-medium">Mitigation strategies:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {prediction.mitigationStrategies.slice(0, 2).map((strategy, idx) => (
                            <li key={idx} className="text-muted-foreground">{strategy}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Security Trends */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Security Trends Analysis</CardTitle>
          <CardDescription>
            Historical patterns and trend predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityTrends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isLoadingAnalytics ? 'Analyzing trends...' : 'No trend data available'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {securityTrends.map((trend, index) => (
                <div key={index} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{trend.metric.replace('_', ' ')}</h4>
                    <span className="text-2xl">{getTrendIcon(trend.trend)}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Change:</span> {trend.changePercent}%
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Prediction:</span> {Math.round(trend.prediction)}
                    </p>
                    <Badge variant={trend.trend === 'increasing' ? 'destructive' : trend.trend === 'decreasing' ? 'secondary' : 'outline'}>
                      {trend.trend}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}