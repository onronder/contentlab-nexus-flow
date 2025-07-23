import React from 'react';
import { Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AccessDeniedProps {
  message: string;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AccessDenied({ 
  message, 
  title = 'Access Denied', 
  action 
}: AccessDeniedProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {action && (
          <CardContent>
            <Button onClick={action.onClick} variant="outline" className="w-full">
              {action.label}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}