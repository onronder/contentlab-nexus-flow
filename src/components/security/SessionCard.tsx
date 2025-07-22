import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Monitor, Smartphone, Tablet, MapPin, Clock, Shield, X } from 'lucide-react';
import { SessionInfo } from '@/hooks/useSessionManager';

interface SessionCardProps {
  session: SessionInfo;
  isCurrentSession?: boolean;
  onTerminate: (sessionId: string) => void;
}

export const SessionCard = ({ session, isCurrentSession, onTerminate }: SessionCardProps) => {
  const [isTerminating, setIsTerminating] = useState(false);

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getSecurityStatus = () => {
    const flags = session.security_flags;
    if (flags.suspicious) return { label: 'Suspicious', variant: 'destructive' as const };
    if (flags.new_location) return { label: 'New Location', variant: 'secondary' as const };
    return { label: 'Normal', variant: 'default' as const };
  };

  const handleTerminate = async () => {
    setIsTerminating(true);
    try {
      await onTerminate(session.id);
    } finally {
      setIsTerminating(false);
    }
  };

  const securityStatus = getSecurityStatus();

  return (
    <Card className={`transition-all duration-200 ${isCurrentSession ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getDeviceIcon(session.device_info.type)}
            <div className="flex flex-col">
              <span className="font-medium">
                {session.device_info.browser} on {session.device_info.os}
              </span>
              <span className="text-sm text-muted-foreground">
                {session.device_info.type}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCurrentSession && (
              <Badge variant="default">Current</Badge>
            )}
            <Badge variant={securityStatus.variant}>
              <Shield className="h-3 w-3 mr-1" />
              {securityStatus.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {session.location_info.city && session.location_info.country
                ? `${session.location_info.city}, ${session.location_info.country}`
                : (session.ip_address as string) || 'Unknown location'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Created:</span> {format(new Date(session.created_at), 'PPp')}
          </div>
          <div>
            <span className="font-medium">Last active:</span> {format(new Date(session.last_activity), 'PPp')}
          </div>
          <div>
            <span className="font-medium">Expires:</span> {format(new Date(session.expires_at), 'PPp')}
          </div>
        </div>

        {!isCurrentSession && (
          <div className="pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  disabled={isTerminating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Terminate Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminate Session</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to terminate this session? The user will be signed out from this device.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleTerminate} disabled={isTerminating}>
                    {isTerminating ? 'Terminating...' : 'Terminate'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};