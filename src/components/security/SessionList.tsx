import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SessionCard } from './SessionCard';
import { useSessionManager } from '@/hooks/useSessionManager';
import { Loader2, LogOut } from 'lucide-react';

export const SessionList = () => {
  const { sessions, isLoading, currentSessionId, terminateSession, terminateAllOtherSessions } = useSessionManager();
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);

  const activeSessions = sessions.filter(session => 
    new Date(session.expires_at) > new Date()
  );

  const handleTerminateAllOthers = async () => {
    setIsTerminatingAll(true);
    try {
      await terminateAllOtherSessions();
    } finally {
      setIsTerminatingAll(false);
    }
  };

  const otherSessions = activeSessions.filter(session => session.id !== currentSessionId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across all devices
              </CardDescription>
            </div>
            {otherSessions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isTerminatingAll}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {isTerminatingAll ? 'Terminating...' : 'Terminate All Others'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Terminate All Other Sessions</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out from all other devices except this one. 
                      You'll need to sign in again on those devices.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleTerminateAllOthers} disabled={isTerminatingAll}>
                      {isTerminatingAll ? 'Terminating...' : 'Terminate All'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isCurrentSession={session.id === currentSessionId}
                  onTerminate={terminateSession}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Session Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{activeSessions.length}</div>
                <div className="text-xs text-muted-foreground">Total Sessions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {activeSessions.filter(s => !s.security_flags.suspicious).length}
                </div>
                <div className="text-xs text-muted-foreground">Normal</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {activeSessions.filter(s => s.security_flags.suspicious).length}
                </div>
                <div className="text-xs text-muted-foreground">Suspicious</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};