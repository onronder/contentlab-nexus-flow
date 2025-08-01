import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface WelcomeStepProps {
  teamId: string;
  invitationId: string;
  onNext: () => void;
  onComplete: () => void;
}

export function WelcomeStep({ teamId, invitationId, onNext }: WelcomeStepProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="text-center py-8">
        <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-6">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Welcome to ContentLab Nexus, {user?.email?.split('@')[0]}! 🎉
        </h2>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You've successfully joined a new team and we're excited to have you onboard. 
          Let's take a few minutes to get you familiar with your new workspace and teammates.
        </p>
      </div>

      {/* Team Information Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Team Workspace</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              You'll have access to collaborative tools for competitive analysis, content management, and strategic insights.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Content Library</Badge>
              <Badge variant="secondary">Analytics</Badge>
              <Badge variant="secondary">Team Collaboration</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Your Team</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Connect with your teammates and understand the team structure, roles, and ongoing projects.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Team Members</Badge>
              <Badge variant="secondary">Project Access</Badge>
              <Badge variant="secondary">Communication</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What's Next */}
      <div className="bg-muted/50 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3">What we'll cover in this onboarding:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Team structure and members</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Your role and permissions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Platform features tour</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Getting started with projects</span>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          This will only take a few minutes, and you can always revisit this information later.
        </p>
      </div>
    </div>
  );
}