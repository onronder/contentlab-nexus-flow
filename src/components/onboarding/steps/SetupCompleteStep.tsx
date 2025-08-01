import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Rocket, 
  Star, 
  Target, 
  Users, 
  BookOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface SetupCompleteStepProps {
  teamId: string;
  invitationId: string;
  onNext: () => void;
  onComplete: () => void;
}

const nextSteps = [
  {
    icon: Target,
    title: 'Explore Active Projects',
    description: 'Check what your team is currently working on and see how you can contribute',
    action: 'View Projects',
    path: '/projects'
  },
  {
    icon: Users,
    title: 'Meet Your Team',
    description: 'Connect with teammates and understand current collaborations',
    action: 'Visit Team Page',
    path: '/team'
  },
  {
    icon: BookOpen,
    title: 'Review Documentation',
    description: 'Learn about team processes, guidelines, and best practices',
    action: 'Read Docs',
    path: '/docs'
  }
];

const achievements = [
  'Joined your team successfully',
  'Learned about team structure',
  'Understood your role and permissions',
  'Completed platform tour',
  'Ready to start collaborating!'
];

export function SetupCompleteStep({ teamId, invitationId, onComplete }: SetupCompleteStepProps) {
  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center py-8">
        <div className="mx-auto bg-green-100 dark:bg-green-900/30 rounded-full p-4 w-fit mb-6">
          <Rocket className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Welcome aboard! 🎉
        </h2>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          You've successfully completed the onboarding process and you're now ready to start collaborating with your team on ContentLab Nexus!
        </p>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Star className="h-5 w-5 text-yellow-500" />
            Onboarding Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm">{achievement}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Next Steps</CardTitle>
          <p className="text-sm text-muted-foreground">
            Here are some great ways to get started with your team
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nextSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {step.action}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Team Welcome */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3">Your Team is Excited to Have You!</h3>
        <p className="text-muted-foreground mb-4">
          You're now part of a collaborative workspace focused on competitive analysis, content optimization, and strategic insights. 
          Your unique perspective and skills will help drive the team's success.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Competitive Analysis</Badge>
          <Badge variant="secondary">Content Strategy</Badge>
          <Badge variant="secondary">Performance Analytics</Badge>
          <Badge variant="secondary">Team Collaboration</Badge>
        </div>
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
              <Target className="h-4 w-4" />
              <span className="text-xs">Projects</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">Team</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs">Content</span>
            </Button>
            <Button variant="outline" size="sm" className="h-auto p-3 flex flex-col gap-2">
              <Star className="h-4 w-4" />
              <span className="text-xs">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Final CTA */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Ready to dive in and start making an impact with your team?
        </p>
        <Button onClick={onComplete} size="lg" className="flex items-center gap-2">
          Let's Get Started
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}