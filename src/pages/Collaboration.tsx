import { useState } from "react";
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider";
import { CollaborationDashboard } from "@/components/collaboration/CollaborationDashboard";
import { AdvancedCollaborationManager } from "@/components/collaboration/AdvancedCollaborationManager";
import { EnhancedCollaborativeEditor } from "@/components/collaboration/EnhancedCollaborativeEditor";
import { AICollaborationPanel } from "@/components/ai/AICollaborationPanel";
import { MobileOptimizedCollaboration } from "@/components/mobile/MobileOptimizedCollaboration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useTeamQueries } from "@/hooks/queries/useTeamQueries";
import { useEnhancedMobile } from "@/hooks/useEnhancedMobile";
import { Users, FileEdit, BarChart3, Settings, Brain, Smartphone } from "lucide-react";

export function Collaboration() {
  const { user } = useAuth();
  const { data: teams } = useTeamQueries();
  const { isMobile, isOnline } = useEnhancedMobile();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [activeDemo, setActiveDemo] = useState<'editor' | 'manager' | null>(null);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access collaboration features.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentTeam = teams?.find(team => team.id === selectedTeam) || teams?.[0];

  if (!currentTeam) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Team Found</CardTitle>
            <CardDescription>
              You need to be part of a team to use collaboration features.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <CollaborationProvider teamId={currentTeam.id}>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="glass-card p-6 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Real-Time Collaboration</h1>
              <p className="text-muted-foreground mt-2">
                Collaborate with your team in real-time with advanced features
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTeam || currentTeam.id}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="px-4 py-2 rounded-lg border border-border bg-background"
              >
                {teams?.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Team: {currentTeam.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="manager" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manager
            </TabsTrigger>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              Editor Demo
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <CollaborationDashboard teamId={currentTeam.id} />
          </TabsContent>

          <TabsContent value="manager" className="space-y-6">
            <AdvancedCollaborationManager
              teamId={currentTeam.id}
              resourceId="demo-resource"
              resourceType="document"
            />
          </TabsContent>

          <TabsContent value="editor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Collaborative Editor Demo</CardTitle>
                <CardDescription>
                  Experience real-time collaborative editing with conflict resolution
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancedCollaborativeEditor
                  contentId="demo-content"
                  initialContent="# Welcome to Collaborative Editing\n\nStart typing to see real-time collaboration in action! Multiple users can edit simultaneously with automatic conflict resolution.\n\n## Features:\n- Real-time text synchronization\n- Conflict detection and resolution\n- User presence indicators\n- Cursor tracking\n- Auto-save functionality\n\nTry opening this page in multiple tabs to test the collaboration features."
                  onSave={async (content) => {
                    console.log('Saved:', content);
                    // TODO: Implement actual save logic
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AICollaborationPanel 
              sessionId="demo-session"
            />
          </TabsContent>

          <TabsContent value="mobile" className="space-y-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Mobile Collaboration
                    {!isOnline && (
                      <span className="text-xs px-2 py-1 bg-destructive text-destructive-foreground rounded">
                        Offline
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Optimized collaboration experience for mobile devices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MobileOptimizedCollaboration 
                    teamId={currentTeam.id}
                    resourceId="demo-mobile-resource"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Real-Time Presence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    See who's online and active in real-time across all collaboration sessions.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileEdit className="h-5 w-5 text-primary" />
                    Collaborative Editing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Edit documents simultaneously with automatic conflict resolution and operational transformation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Analytics & Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Track collaboration metrics, session analytics, and team performance insights.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Collaboration Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Get intelligent suggestions, automated content improvements, and AI-powered collaboration insights.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    Mobile Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Touch-optimized interfaces, offline capabilities, and responsive collaboration tools for mobile devices.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Session Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create, manage, and monitor collaboration sessions with advanced controls.
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Ready to start collaborating? Try these features:
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setActiveDemo('manager')}
                      variant="outline"
                      size="sm"
                    >
                      Start Session
                    </Button>
                    <Button 
                      onClick={() => setActiveDemo('editor')}
                      variant="outline" 
                      size="sm"
                    >
                      Try Editor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CollaborationProvider>
  );
}