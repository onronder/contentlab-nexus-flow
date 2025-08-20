import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionList } from './SessionList';
import { SecurityEventCard } from './SecurityEventCard';
import { SecurityComplianceReport } from './SecurityComplianceReport';
import { SecurityMonitoringDashboard } from './SecurityMonitoringDashboard';
import { AISecurityAnalytics } from './AISecurityAnalytics';
import { useSessionManager } from '@/hooks/useSessionManager';
import { securityMonitoringService } from '@/services/securityMonitoringService';
import { AlertTriangle, Shield, Clock, Globe, Lock, Activity, CheckCircle, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';

export const SecurityDashboard = () => {
  const { sessions, securityEvents } = useSessionManager();
  const [securityMetrics, setSecurityMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load enhanced security metrics
  useEffect(() => {
    const loadSecurityMetrics = async () => {
      try {
        const metrics = await securityMonitoringService.getSecurityMetrics();
        setSecurityMetrics(metrics);
      } catch (error) {
        console.error('Failed to load security metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityMetrics();
  }, []);

  const recentEvents = securityEvents.slice(0, 10);
  const activeSessions = sessions.filter(session => 
    new Date(session.expires_at) > new Date()
  );

  const getOverallSecurityStatus = () => {
    if (!securityMetrics) return { status: 'Loading...', variant: 'secondary' as const, icon: Shield };
    
    if (securityMetrics.threat_score >= 80) return { status: 'Critical Risk', variant: 'destructive' as const, icon: AlertTriangle };
    if (securityMetrics.threat_score >= 60) return { status: 'High Risk', variant: 'destructive' as const, icon: AlertTriangle };
    if (securityMetrics.threat_score >= 40) return { status: 'Medium Risk', variant: 'secondary' as const, icon: AlertTriangle };
    if (securityMetrics.threat_score >= 20) return { status: 'Low Risk', variant: 'default' as const, icon: Shield };
    return { status: 'Secure', variant: 'default' as const, icon: Shield };
  };

  const securityStatus = getOverallSecurityStatus();
  const StatusIcon = securityStatus.icon;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="ai-security">AI Security</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Security Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Status</CardTitle>
                <StatusIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant={securityStatus.variant}>
                    {securityStatus.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Threat Score: {securityMetrics?.threat_score || 0}/100
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityMetrics?.active_sessions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {securityMetrics?.suspicious_sessions > 0 && (
                    <span className="text-red-500">{securityMetrics.suspicious_sessions} suspicious</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threats (24h)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityMetrics?.total_threats_24h || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {securityMetrics?.critical_threats_7d || 0} critical (7d)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{securityMetrics?.failed_login_attempts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {securityMetrics?.blocked_ips?.length || 0} blocked IPs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Security Events */}
          {recentEvents.length > 0 && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle>Recent Security Events</CardTitle>
                  <CardDescription>
                    Latest security-related activities on your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentEvents.map((event) => (
                    <SecurityEventCard key={event.id} event={event} />
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Security Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Security Recommendations</CardTitle>
              <CardDescription>
                Improve your account security with these recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Enable two-factor authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span>Review active sessions regularly</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-purple-500" />
                  <span>Use strong, unique passwords</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  <span>Monitor security events</span>
                </div>
                {securityMetrics?.threat_score > 50 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ High threat level detected. Consider reviewing recent activity.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="monitoring" className="space-y-6">
          <SecurityMonitoringDashboard />
        </TabsContent>
        
        <TabsContent value="ai-security" className="space-y-6">
          <AISecurityAnalytics />
        </TabsContent>
        
        <TabsContent value="compliance" className="space-y-6">
          <SecurityComplianceReport />
        </TabsContent>
        
        <TabsContent value="sessions" className="space-y-6">
          <SessionList />
        </TabsContent>
      </Tabs>
    </div>
  );
};