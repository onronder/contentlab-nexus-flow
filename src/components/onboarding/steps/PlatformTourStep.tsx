import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FolderOpen, 
  BarChart3, 
  Users, 
  Settings,
  Target,
  FileText,
  Shield,
  ArrowRight,
  Lightbulb,
  Zap
} from 'lucide-react';

interface PlatformTourStepProps {
  teamId: string;
  invitationId: string;
  onNext: () => void;
  onComplete: () => void;
}

const platformFeatures = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Your central hub for project overview, recent activity, and key metrics',
    features: ['Project summaries', 'Recent activity', 'Key performance indicators', 'Quick actions'],
    path: '/dashboard'
  },
  {
    icon: FolderOpen,
    title: 'Projects',
    description: 'Manage competitive analysis projects and track progress',
    features: ['Create projects', 'Track competitors', 'Monitor progress', 'Team collaboration'],
    path: '/projects'
  },
  {
    icon: FileText,
    title: 'Content',
    description: 'Organize, analyze, and optimize your content library',
    features: ['Content library', 'Performance tracking', 'Version control', 'Collaboration tools'],
    path: '/content'
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Deep insights into performance metrics and competitive intelligence',
    features: ['Performance reports', 'Competitive insights', 'Trend analysis', 'Custom dashboards'],
    path: '/analytics'
  },
  {
    icon: Target,
    title: 'Competitive',
    description: 'Monitor competitors and track market intelligence',
    features: ['Competitor tracking', 'Market analysis', 'SERP monitoring', 'Alerts & notifications'],
    path: '/competitive'
  },
  {
    icon: Users,
    title: 'Team',
    description: 'Collaborate with teammates and manage team settings',
    features: ['Team directory', 'Role management', 'Invitation system', 'Activity tracking'],
    path: '/team'
  }
];

export function PlatformTourStep({ teamId, invitationId, onNext }: PlatformTourStepProps) {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="text-center py-4">
        <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
          <Zap className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Platform Overview
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get familiar with the key features and sections you'll be using. 
          This tour will help you navigate efficiently and make the most of your workspace.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platformFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Card key={index} className="group hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {feature.description}
                </p>
                <div className="space-y-2 mb-4">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <Badge variant="outline" className="text-xs">
                  {feature.path}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Quick Tips for Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Start with the Dashboard</h4>
                  <p className="text-xs text-muted-foreground">Get an overview of current projects and recent activity</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Explore Active Projects</h4>
                  <p className="text-xs text-muted-foreground">Check what your team is currently working on</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Set Up Notifications</h4>
                  <p className="text-xs text-muted-foreground">Stay informed about important updates and mentions</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">4</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Connect with Teammates</h4>
                  <p className="text-xs text-muted-foreground">Introduce yourself and understand ongoing collaborations</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">5</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Customize Your Workspace</h4>
                  <p className="text-xs text-muted-foreground">Adjust settings and preferences to match your workflow</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">6</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Ask Questions</h4>
                  <p className="text-xs text-muted-foreground">Don't hesitate to reach out to teammates for guidance</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Hint */}
      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
            <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Navigation Tip</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Use the sidebar navigation to move between different sections. 
              You can also use keyboard shortcuts: <kbd className="px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">Ctrl + K</kbd> to open the command palette.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}