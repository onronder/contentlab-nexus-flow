import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApiUsage } from '@/hooks/useApiUsage';
import { Activity, DollarSign, Timer, AlertTriangle, Download, Trash2, Clock } from 'lucide-react';
import { apiMonitoringService } from '@/services/apiMonitoringService';

export function ApiDashboard() {
  const { metrics, alerts, cost, trends, exportCsv, recommendations, recentEvents } = useApiUsage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Usage</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const data = exportCsv();
            const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `api-usage-${new Date().toISOString()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="destructive" onClick={() => apiMonitoringService.clearUsageData()}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.totalRequests}</div>
            <div className="text-xs text-muted-foreground">Last {metrics.period}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" />Estimated Cost</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${metrics.estimatedCost.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">Input ${cost.inputCost.toFixed(2)} / Output ${cost.outputCost.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Timer className="w-4 h-4" />Avg Response</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{Math.round(metrics.averageResponseTime)}ms</div>
            <div className="text-xs text-muted-foreground">Success {metrics.successfulRequests} / Fail {metrics.failedRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alerts.length === 0 ? (
                <Badge variant="outline">None</Badge>
              ) : alerts.map(a => (
                <Badge key={a.id} variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {a.message}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Optimization Recommendations</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {recommendations.map((r, i) => (<li key={i}>{r}</li>))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card>
        <CardHeader><CardTitle>Recent API Events</CardTitle></CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent events.</div>
          ) : (
            <ul className="space-y-2">
              {recentEvents.slice(0, 20).map((e, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{e.endpoint} • {e.status}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" /> {new Date(e.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
