import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApiUsage } from '@/hooks/useApiUsage';
import { Activity, DollarSign, Timer, AlertTriangle, Download } from 'lucide-react';

export function ApiDashboard() {
  const { metrics, alerts, cost, trends, exportCsv, recommendations } = useApiUsage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Usage</h2>
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

      {/* Alerts Panel */}
      {alerts.some(a => a.severity === 'critical') && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Critical API issues detected. Please review usage and consider reducing analysis frequency.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
