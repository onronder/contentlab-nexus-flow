/**
 * Monitoring Page - Centralized monitoring dashboard
 */
import React from 'react';
import { ErrorTrackingDashboard } from '@/components/monitoring/ErrorTrackingDashboard';
import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Shield,
  Server,
  Globe,
  Database,
  Zap
} from 'lucide-react';

export default function Monitoring() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Production Monitoring</h1>
        <p className="text-muted-foreground">
          Comprehensive monitoring and observability for your application
        </p>
      </div>
      
      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Application</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Online</span>
                </div>
              </div>
              <Globe className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Healthy</span>
                </div>
              </div>
              <Database className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Edge Functions</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Operational</span>
                </div>
              </div>
              <Zap className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Security</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Secure</span>
                </div>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Monitoring Dashboard */}
      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Error Tracking
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Infrastructure
          </TabsTrigger>
        </TabsList>

        <TabsContent value="errors">
          <ErrorTrackingDashboard />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Coming soon - Advanced analytics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics & Insights</h3>
                <p className="text-muted-foreground mb-4">
                  User behavior analytics, feature usage patterns, 
                  and business intelligence dashboards.
                </p>
                <Badge variant="outline">Phase 2.3 - Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Infrastructure Monitoring</CardTitle>
              <CardDescription>
                Coming soon - System health and infrastructure metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Infrastructure Health</h3>
                <p className="text-muted-foreground mb-4">
                  Server monitoring, resource usage, uptime tracking, 
                  and automated health checks.
                </p>
                <Badge variant="outline">Phase 2.4 - Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}