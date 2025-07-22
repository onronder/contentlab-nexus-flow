import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Shield } from 'lucide-react';
import { SecurityEvent } from '@/hooks/useSessionManager';

interface SecurityEventCardProps {
  event: SecurityEvent;
}

export const SecurityEventCard = ({ event }: SecurityEventCardProps) => {
  const getSeverityIcon = () => {
    switch (event.severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityVariant = () => {
    switch (event.severity) {
      case 'critical':
        return 'destructive' as const;
      case 'warning':
        return 'secondary' as const;
      default:
        return 'default' as const;
    }
  };

  const getEventTitle = () => {
    switch (event.event_type) {
      case 'session_created':
        return 'New session started';
      case 'session_terminated':
        return 'Session terminated';
      case 'all_sessions_terminated':
        return 'All sessions terminated';
      case 'login_attempt':
        return 'Login attempt';
      case 'failed_login':
        return 'Failed login attempt';
      case 'suspicious_activity':
        return 'Suspicious activity detected';
      case 'new_location':
        return 'Login from new location';
      default:
        return event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getEventDescription = () => {
    const data = event.event_data;
    
    switch (event.event_type) {
      case 'session_created':
        return `New session created from ${data.device_info?.type || 'unknown device'}`;
      case 'session_terminated':
        return 'Session was manually terminated';
      case 'all_sessions_terminated':
        return 'All other sessions were terminated for security';
      case 'new_location':
        return `Login detected from ${data.location || 'unknown location'}`;
      case 'failed_login':
        return `Failed login attempt from ${data.ip_address || 'unknown IP'}`;
      default:
        return 'Security event occurred';
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getSeverityIcon()}
            <div className="flex flex-col">
              <span className="font-medium">{getEventTitle()}</span>
              <span className="text-sm text-muted-foreground">
                {getEventDescription()}
              </span>
            </div>
          </div>
          <Badge variant={getSeverityVariant()}>
            <Shield className="h-3 w-3 mr-1" />
            {event.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Time:</span> {format(new Date(event.created_at), 'PPp')}
          </div>
          {event.ip_address && (
            <div>
              <span className="font-medium">IP Address:</span> {event.ip_address as string}
            </div>
          )}
          {event.user_agent && (
            <div>
              <span className="font-medium">User Agent:</span> {(event.user_agent as string).substring(0, 50)}...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};