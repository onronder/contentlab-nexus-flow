import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SessionList } from './SessionList';
import { SecurityEventCard } from './SecurityEventCard';
import { useSessionManager } from '@/hooks/useSessionManager';
import { AlertTriangle, Shield, Clock, Globe } from 'lucide-react';

export const SecurityDashboard = () => {
  const { sessions, securityEvents } = useSessionManager();

  const recentEvents = securityEvents.slice(0, 10);
  const activeSessions = sessions.filter(session => 
    new Date(session.expires_at) > new Date()
  );

  const securityMetrics = {
    totalSessions: activeSessions.length,
    suspiciousSessions: activeSessions.filter(s => s.security_flags.suspicious).length,
    newLocationSessions: activeSessions.filter(s => s.security_flags.new_location).length,
    recentSecurityEvents: securityEvents.filter(event => 
      new Date(event.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length
  };

  const getOverallSecurityStatus = () => {
    if (securityMetrics.suspiciousSessions > 0) {
      return { status: 'High Risk', variant: 'destructive' as const, icon: AlertTriangle };
    }
    if (securityMetrics.newLocationSessions > 0 || securityMetrics.recentSecurityEvents > 5) {
      return { status: 'Medium Risk', variant: 'secondary' as const, icon: AlertTriangle };
    }
    return { status: 'Low Risk', variant: 'default' as const, icon: Shield };
  };

  const securityStatus = getOverallSecurityStatus();
  const StatusIcon = securityStatus.icon;

  return (
    <div className="space-y-6">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              Across all devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics.recentSecurityEvents}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Indicators</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {securityMetrics.suspiciousSessions}
            </div>
            <p className="text-xs text-muted-foreground">
              Suspicious sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Management */}
      <SessionList />

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
            Keep your account secure with these recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Account Security</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Regularly review and terminate unused sessions</li>
              <li>• Enable two-factor authentication for added security</li>
              <li>• Use a strong, unique password for your account</li>
              <li>• Monitor security events for unusual activity</li>
            </ul>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Session Management</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Sign out from devices you no longer use</li>
              <li>• Be cautious when using public or shared computers</li>
              <li>• Terminate all sessions if you suspect unauthorized access</li>
              <li>• Regularly check for sessions from unknown locations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};