import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmptyTeamStateProps {
  title?: string;
  description?: string;
  showAlert?: boolean;
  alertMessage?: string;
}

export function EmptyTeamState({ 
  title = "No team data", 
  description = "Select a team to view content",
  showAlert = false,
  alertMessage = "You may not have access to this team's data"
}: EmptyTeamStateProps) {
  return (
    <div className="space-y-4">
      {showAlert && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4 text-center max-w-md">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}