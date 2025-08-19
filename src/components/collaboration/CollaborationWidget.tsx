import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCollaboration } from "./CollaborationProvider";
import { MessageSquare, Users, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";

interface CollaborationWidgetProps {
  teamId: string;
  resourceId: string;
  resourceType: string;
  className?: string;
}

export function CollaborationWidget({ 
  teamId, 
  resourceId, 
  resourceType, 
  className 
}: CollaborationWidgetProps) {
  const { state } = useCollaboration();
  const session = state?.activeSession || null;
  const isSessionActive = state?.activeSession?.isActive || false;
  const presence = state?.participants || {};
  
  const startSession = async (teamId: string, resourceId: string, resourceType: string) => {
    // Mock implementation for now
    console.log('Starting session for', { teamId, resourceId, resourceType });
  };
  
  const endSession = async () => {
    // Mock implementation for now
    console.log('Ending session');
  };
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleSession = async () => {
    setIsLoading(true);
    try {
      if (isSessionActive) {
        await endSession();
      } else {
        await startSession(teamId, resourceId, resourceType);
      }
    } catch (error) {
      console.error('Failed to toggle collaboration session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeParticipants = Object.keys(presence).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Collaboration</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isSessionActive && (
              <Badge variant="secondary" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Live
              </Badge>
            )}
            <Button
              size="sm"
              variant={isSessionActive ? "outline" : "default"}
              onClick={handleToggleSession}
              disabled={isLoading}
              className="h-7 px-2"
            >
              {isLoading ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : isSessionActive ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              <span className="ml-1 text-xs">
                {isSessionActive ? "Stop" : "Start"}
              </span>
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          {isSessionActive 
            ? "Real-time collaboration is active" 
            : "Start a collaboration session"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Session Info */}
          {isSessionActive && session && (
            <div className="glass-card p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Active Session</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{activeParticipants}</span>
                </div>
              </div>
              <div className="text-sm font-medium">{session.sessionName || 'Untitled Session'}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Started {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Participants */}
          {activeParticipants > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Active Participants</div>
              <div className="flex -space-x-2">
                {Object.entries(presence).slice(0, 4).map(([userId, userPresence]) => (
                  <div
                    key={userId}
                    className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center border-2 border-background"
                    title={`User ${userId.slice(0, 8)}`}
                  >
                    {userId.slice(0, 1).toUpperCase()}
                  </div>
                ))}
                {activeParticipants > 4 && (
                  <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center border-2 border-background">
                    +{activeParticipants - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 text-xs flex-1"
            >
              <Link to="/collaboration">
                Full Dashboard
              </Link>
            </Button>
            {isSessionActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {/* TODO: Implement invite */}}
              >
                Invite
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}