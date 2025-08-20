import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, AlertTriangle, Activity } from 'lucide-react';

interface SecurityMetric {
  date: string;
  threats_blocked: number;
  requests_analyzed: number;
  anomalies_detected: number;
  response_time_ms: number;
}

interface ThreatDistribution {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const COLORS = {
  low: '#10B981',
  medium: '#F59E0B', 
  high: '#EF4444',
  critical: '#7C2D12'
};

export function SecurityMetricsChart() {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [threatDistribution, setThreatDistribution] = useState<ThreatDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);

        // Fetch security events from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: events, error } = await supabase
          .from('security_events')
          .select('*')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Process events into daily metrics
        const dailyMetrics = new Map<string, SecurityMetric>();
        const threatTypes = new Map<string, { count: number; severity: string }>();

        events?.forEach(event => {
          const date = new Date(event.created_at).toISOString().split('T')[0];
          
          if (!dailyMetrics.has(date)) {
            dailyMetrics.set(date, {
              date,
              threats_blocked: 0,
              requests_analyzed: 0,
              anomalies_detected: 0,
              response_time_ms: 0
            });
          }

          const metric = dailyMetrics.get(date)!;
          metric.requests_analyzed += 1;

          if (event.event_type === 'threat_blocked') {
            metric.threats_blocked += 1;
          }
          
          if (event.event_type === 'anomaly_detected') {
            metric.anomalies_detected += 1;
          }

          // Track threat distribution
          const eventData = typeof event.event_data === 'object' && event.event_data !== null ? event.event_data : {};
          const threatType = (eventData as any)?.threat_type || event.event_type;
          const severity = event.severity || 'medium';
          
          if (!threatTypes.has(threatType)) {
            threatTypes.set(threatType, { count: 0, severity });
          }
          threatTypes.get(threatType)!.count += 1;
        });

        setMetrics(Array.from(dailyMetrics.values()));
        
        setThreatDistribution(
          Array.from(threatTypes.entries()).map(([type, data]) => ({
            type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            count: data.count,
            severity: data.severity as 'low' | 'medium' | 'high' | 'critical'
          }))
        );

      } catch (error) {
        console.error('Error fetching security metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const totalThreats = threatDistribution.reduce((acc, threat) => acc + threat.count, 0);
  const totalRequests = metrics.reduce((acc, metric) => acc + metric.requests_analyzed, 0);
  const avgResponseTime = metrics.length > 0 
    ? metrics.reduce((acc, metric) => acc + metric.response_time_ms, 0) / metrics.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Threats Blocked</p>
                <p className="text-2xl font-bold text-green-600">{totalThreats}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Requests Analyzed</p>
                <p className="text-2xl font-bold text-blue-600">{totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold text-yellow-600">{Math.round(avgResponseTime)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="threats">Threat Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Security Activity (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString()} 
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="threats_blocked" 
                    stroke="#EF4444" 
                    name="Threats Blocked"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests_analyzed" 
                    stroke="#3B82F6" 
                    name="Requests Analyzed"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="anomalies_detected" 
                    stroke="#F59E0B" 
                    name="Anomalies"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Threat Distribution
                <div className="flex gap-2">
                  {Object.entries(COLORS).map(([severity, color]) => (
                    <Badge key={severity} style={{ backgroundColor: color, color: 'white' }}>
                      {severity}
                    </Badge>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={threatDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="count"
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {threatDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.severity]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="font-medium">Threat Details</h4>
                  {threatDistribution.map((threat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[threat.severity] }}
                        />
                        <span className="font-medium">{threat.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{threat.count}</Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-white border-0`}
                          style={{ backgroundColor: COLORS[threat.severity] }}
                        >
                          {threat.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}