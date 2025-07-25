import React, { useEffect, useState } from 'react';
import { useUser, useSession, useSupabaseClient } from '@/contexts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const AuthSessionDebugger: React.FC = () => {
  const user = useUser();
  const session = useSession();
  const supabase = useSupabaseClient();
  const [sessionCheck, setSessionCheck] = useState<any>(null);

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    setSessionCheck({ data, error, timestamp: new Date().toISOString() });
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Auth Session Debug
          <Button onClick={refreshSession} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-sm mb-2">useUser() Hook</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify({
                user: user ? {
                  id: user.id,
                  email: user.email,
                  isUndefined: user === undefined
                } : user,
                loading: user === undefined
              }, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm mb-2">useSession() Hook</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
              {JSON.stringify({
                session: session ? {
                  access_token: session.access_token ? 'present' : 'missing',
                  user_id: session.user?.id,
                  expires_at: session.expires_at
                } : session,
                loading: session === undefined
              }, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2">Manual Session Check</h3>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto h-32">
            {sessionCheck ? JSON.stringify(sessionCheck, null, 2) : 'Click refresh to check session'}
          </pre>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Auth State: {user ? 'Authenticated' : 'Not Authenticated'}</span>
          <span>Last Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};