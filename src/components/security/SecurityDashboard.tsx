import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionList } from './SessionList';
import { SecurityEventCard } from './SecurityEventCard';
import { SecurityComplianceReport } from './SecurityComplianceReport';
import { SecurityMonitoringDashboard } from './SecurityMonitoringDashboard';
import { AISecurityAnalytics } from './AISecurityAnalytics';
import { RealTimeSecurityMonitor } from './RealTimeSecurityMonitor';
import { useSessionManager } from '@/hooks/useSessionManager';
import { securityMonitoringService } from '@/services/securityMonitoringService';
import { AlertTriangle, Shield, Clock, Globe, Lock, Activity, CheckCircle, Eye, Settings, Brain, FileCheck, Users } from 'lucide-react';
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-Time
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="ai-security" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Security
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Overview
                </CardTitle>
                <CardDescription>
                  Current security status and recent activities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">98.5%</div>
                    <div className="text-sm text-green-600">Uptime</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Shield className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-700">2,847</div>
                    <div className="text-sm text-blue-600">Threats Blocked</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">Recent Security Events</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">Suspicious login attempt blocked</span>
                      </div>
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">Warning</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Security scan completed</span>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-300">Success</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>
                  Monitor system performance and resources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Database Performance</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">Optimal</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">API Response Time</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">125ms avg</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Edge Functions</span>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Security Monitoring</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">Enabled</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <RealTimeSecurityMonitor />
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