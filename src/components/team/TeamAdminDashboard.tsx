import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  CreditCard, 
  FileCheck, 
  Database, 
  Settings,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  Lock,
  Download
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TeamBillingService } from "@/services/teamBillingService";
import { TeamSecurityService } from "@/services/teamSecurityService";
import { TeamComplianceService } from "@/services/teamComplianceService";
import { TeamDataExportService } from "@/services/teamDataExportService";

interface TeamAdminDashboardProps {
  teamId: string;
}

export const TeamAdminDashboard = ({ teamId }: TeamAdminDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard data
  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ['team-billing', teamId],
    queryFn: () => TeamBillingService.getTeamBilling(teamId),
    enabled: !!teamId
  });

  const { data: securityMetrics, isLoading: securityLoading } = useQuery({
    queryKey: ['security-metrics', teamId],
    queryFn: () => TeamSecurityService.getSecurityMetrics(teamId),
    enabled: !!teamId
  });

  const { data: compliance, isLoading: complianceLoading } = useQuery({
    queryKey: ['team-compliance', teamId],
    queryFn: () => TeamComplianceService.getTeamCompliance(teamId),
    enabled: !!teamId
  });

  const { data: usageAlerts } = useQuery({
    queryKey: ['usage-alerts', teamId],
    queryFn: () => TeamBillingService.getUsageAlerts(teamId),
    enabled: !!teamId && !!billing
  });

  const { data: complianceScore } = useQuery({
    queryKey: ['compliance-score', teamId],
    queryFn: () => TeamSecurityService.getComplianceScore(teamId),
    enabled: !!teamId
  });

  const isLoading = billingLoading || securityLoading || complianceLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Administration</h1>
          <p className="text-muted-foreground">
            Enterprise-grade team management and governance
          </p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Admin Settings
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <Badge variant={billing?.subscription_status === 'active' ? 'default' : 'destructive'}>
                {billing?.subscription_status || 'Unknown'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">
              {billing?.subscription_tier?.charAt(0).toUpperCase() + billing?.subscription_tier?.slice(1) || 'Basic'}
            </h3>
            <p className="text-sm text-muted-foreground">Subscription Tier</p>
            <p className="text-xs text-muted-foreground mt-1">
              ${billing?.monthly_cost || 0}/month
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <Badge 
                variant={complianceScore && complianceScore >= 80 ? 'default' : 'secondary'}
                className={complianceScore && complianceScore >= 80 ? 'bg-green-100 text-green-800' : ''}
              >
                {complianceScore ? `${Math.round(complianceScore)}%` : 'N/A'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">Security Score</h3>
            <p className="text-sm text-muted-foreground">Compliance Rating</p>
            {complianceScore && (
              <Progress value={complianceScore} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <Badge variant="secondary">
                {securityMetrics?.open_incidents || 0} Open
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">
              {securityMetrics?.total_events || 0}
            </h3>
            <p className="text-sm text-muted-foreground">Security Events</p>
            <p className="text-xs text-muted-foreground mt-1">
              {securityMetrics?.critical_events || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileCheck className="h-4 w-4 text-purple-600" />
              </div>
              <Badge variant="secondary">
                {compliance?.length || 0} Frameworks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold mb-1">Compliance</h3>
            <p className="text-sm text-muted-foreground">Active Frameworks</p>
            <p className="text-xs text-muted-foreground mt-1">
              {compliance?.filter(c => c.status === 'compliant').length || 0} compliant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Alerts */}
      {usageAlerts && usageAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Usage Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {usageAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{alert.metric} usage</span>
                  <div className="flex items-center gap-2">
                    <Progress value={alert.percentage} className="w-20" />
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {Math.round(alert.percentage)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-1" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-1" />
            Security
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <FileCheck className="h-4 w-4 mr-1" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-4 w-4 mr-1" />
            Data
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Lock className="h-4 w-4 mr-1" />
            Policies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resource Usage</CardTitle>
                <CardDescription>Current usage vs limits</CardDescription>
              </CardHeader>
              <CardContent>
                {billing && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Users</span>
                        <span>{billing.current_usage.users || 0} / {billing.usage_limits.users}</span>
                      </div>
                      <Progress value={(billing.current_usage.users || 0) / billing.usage_limits.users * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Projects</span>
                        <span>{billing.current_usage.projects || 0} / {billing.usage_limits.projects}</span>
                      </div>
                      <Progress value={(billing.current_usage.projects || 0) / billing.usage_limits.projects * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Storage</span>
                        <span>{billing.current_usage.storage_gb || 0} GB / {billing.usage_limits.storage_gb} GB</span>
                      </div>
                      <Progress value={(billing.current_usage.storage_gb || 0) / billing.usage_limits.storage_gb * 100} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>Top security threats</CardDescription>
              </CardHeader>
              <CardContent>
                {securityMetrics?.top_threats && securityMetrics.top_threats.length > 0 ? (
                  <div className="space-y-3">
                    {securityMetrics.top_threats.map((threat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{threat.type.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{threat.count}</Badge>
                          <Badge 
                            variant={threat.severity === 'critical' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {threat.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No security events recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
              <CardDescription>Manage your team's subscription and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Billing management interface would be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Center</CardTitle>
              <CardDescription>Monitor and manage team security</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Security management interface would be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Center</CardTitle>
              <CardDescription>Manage compliance frameworks and audits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Compliance management interface would be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export, backup, and manage team data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Backup Settings
                </Button>
              </div>
              <p className="text-muted-foreground mt-4">
                Data management interface would be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Policy Center</CardTitle>
              <CardDescription>Configure team governance and policies</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Policy management interface would be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};