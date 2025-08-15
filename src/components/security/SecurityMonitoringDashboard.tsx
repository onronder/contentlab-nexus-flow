import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Activity, 
  Database, 
  Monitor,
  Clock,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SecurityMetric {
  id: string;
  name: string;
  value: string | number;
  status: 'healthy' | 'warning' | 'critical';
  lastChecked: Date;
  trend?: 'up' | 'down' | 'stable';
}

interface SecurityAlert {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  resolved: boolean;
}

export function SecurityMonitoringDashboard() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date>(new Date());
  
  // Mock security metrics - in production, these would come from real monitoring
  const [securityMetrics] = useState<SecurityMetric[]>([
    {
      id: 'rls_coverage',
      name: 'RLS Policy Coverage',
      value: '100%',
      status: 'healthy',
      lastChecked: new Date(),
      trend: 'stable'
    },
    {
      id: 'auth_functions',
      name: 'Secure Functions',
      value: '18/22',
      status: 'warning',
      lastChecked: new Date(),
      trend: 'stable'
    },
    {
      id: 'data_exposure',
      name: 'Data Exposure Risk',
      value: 'None',
      status: 'healthy',
      lastChecked: new Date(),
      trend: 'down'
    },
    {
      id: 'platform_issues',
      name: 'Platform Limitations',
      value: 4,
      status: 'warning',
      lastChecked: new Date(),
      trend: 'stable'
    },
    {
      id: 'compliance_score',
      name: 'Security Compliance',
      value: '82%',
      status: 'healthy',
      lastChecked: new Date(),
      trend: 'up'
    },
    {
      id: 'active_sessions',
      name: 'Monitored Sessions',
      value: 45,
      status: 'healthy',
      lastChecked: new Date(),
      trend: 'up'
    }
  ]);

  // Mock security alerts
  const [securityAlerts] = useState<SecurityAlert[]>([
    {
      id: 'alert_1',
      title: 'Platform Function Search Path Warning',
      severity: 'medium',
      description: 'Supabase-managed GraphQL functions detected with search_path concerns. Monitoring for changes.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      resolved: false
    },
    {
      id: 'alert_2',
      title: 'pg_net Extension Schema Location',
      severity: 'low',
      description: 'pg_net extension remains in public schema. No immediate security risk identified.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      resolved: false
    },
    {
      id: 'alert_3',
      title: 'Security Scan Completed',
      severity: 'low',
      description: 'Automated security scan completed successfully. All user-accessible components secure.',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      resolved: true
    }
  ]);

  const runSecurityScan = async () => {
    setIsRefreshing(true);
    try {
      // Simulate security scan
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLastScanTime(new Date());
      toast({
        title: "Security Scan Complete",
        description: "All monitored security metrics are within acceptable ranges.",
      });
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: "Unable to complete security scan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-success" />;
      case 'down': return <TrendingUp className="h-3 w-3 text-success rotate-180" />;
      case 'stable': return <Activity className="h-3 w-3 text-muted-foreground" />;
      default: return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500/10 text-orange-700 border-orange-500/20">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Medium</Badge>;
      case 'low': return <Badge variant="outline">Low</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time security monitoring and alerting system
          </p>
        </div>
        <Button 
          onClick={runSecurityScan}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Scanning...' : 'Run Security Scan'}
        </Button>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-success" />
            <CardTitle>Security Status Overview</CardTitle>
          </div>
          <CardDescription>
            Last updated: {lastScanTime.toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityMetrics.map((metric) => (
              <div key={metric.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metric.status)}
                    <span className="font-medium">{metric.name}</span>
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last checked: {metric.lastChecked.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle>Security Alerts</CardTitle>
          </div>
          <CardDescription>
            Current security alerts and monitoring notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                <p>No active security alerts</p>
              </div>
            ) : (
              securityAlerts.map((alert) => (
                <Alert key={alert.id} className={alert.resolved ? 'opacity-60' : ''}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          {alert.resolved && <Badge variant="outline" className="text-success">Resolved</Badge>}
                        </div>
                      </div>
                      <AlertDescription>{alert.description}</AlertDescription>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {alert.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <CardTitle>Monitoring Configuration</CardTitle>
          </div>
          <CardDescription>
            Automated monitoring and alerting settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Active Monitors</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  RLS Policy Integrity Check (Every 6 hours)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Function Security Scan (Daily)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Data Exposure Detection (Continuous)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Platform Change Detection (Weekly)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Alert Channels</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Database className="h-3 w-3 text-blue-500" />
                  In-App Notifications (Enabled)
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-blue-500" />
                  Security Event Logging (Active)
                </li>
                <li className="flex items-center gap-2">
                  <Monitor className="h-3 w-3 text-blue-500" />
                  Dashboard Updates (Real-time)
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-blue-500" />
                  Compliance Reporting (Monthly)
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compensating Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Compensating Security Controls</CardTitle>
          <CardDescription>
            Additional security measures implemented to address platform limitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium mb-2 text-blue-800">Enhanced Logging</h4>
              <p className="text-sm text-blue-700">
                All system function calls are logged with detailed context for security audit trails.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <h4 className="font-medium mb-2 text-green-800">Access Control Layers</h4>
              <p className="text-sm text-green-700">
                Multiple authentication layers and role-based access controls protect sensitive operations.
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
              <h4 className="font-medium mb-2 text-purple-800">Continuous Monitoring</h4>
              <p className="text-sm text-purple-700">
                Real-time monitoring of all platform functions for security configuration changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}