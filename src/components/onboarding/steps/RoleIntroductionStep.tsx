import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Eye, 
  Edit, 
  Plus, 
  Trash2, 
  Settings, 
  Users, 
  BarChart3,
  FileText,
  Check,
  X
} from 'lucide-react';

interface RoleIntroductionStepProps {
  teamId: string;
  invitationId: string;
  onNext: () => void;
  onComplete: () => void;
}

// Mock role data - in production, this would come from the invitation or user's team role
const mockUserRole = {
  name: 'Content Analyst',
  slug: 'analyst',
  description: 'Responsible for content analysis, competitive research, and performance monitoring',
  hierarchy_level: 5,
  permissions: [
    { name: 'View Projects', granted: true, icon: Eye },
    { name: 'Create Content', granted: true, icon: Plus },
    { name: 'Edit Content', granted: true, icon: Edit },
    { name: 'View Analytics', granted: true, icon: BarChart3 },
    { name: 'Generate Reports', granted: true, icon: FileText },
    { name: 'Manage Team', granted: false, icon: Users },
    { name: 'Delete Projects', granted: false, icon: Trash2 },
    { name: 'System Settings', granted: false, icon: Settings }
  ]
};

export function RoleIntroductionStep({ teamId, invitationId, onNext }: RoleIntroductionStepProps) {
  const role = mockUserRole;

  return (
    <div className="space-y-6">
      {/* Role Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            Your Role: {role.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {role.description}
          </p>
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {role.name}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Access Level: {role.hierarchy_level}/10
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Permissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Here's what you can do with your current role
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {role.permissions.map((permission, index) => {
              const Icon = permission.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    permission.granted 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                      : 'bg-muted/50 border-muted'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    permission.granted 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-muted'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      permission.granted 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <span className={`font-medium ${
                      permission.granted 
                        ? 'text-green-900 dark:text-green-100' 
                        : 'text-muted-foreground'
                    }`}>
                      {permission.name}
                    </span>
                  </div>
                  
                  {permission.granted ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle>Key Responsibilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Content Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Analyze content performance, identify trends, and provide insights to improve content strategy.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Competitive Research</h4>
                <p className="text-sm text-muted-foreground">
                  Monitor competitors, track their strategies, and report findings to the team.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Performance Monitoring</h4>
                <p className="text-sm text-muted-foreground">
                  Track key metrics, generate reports, and recommend optimization strategies.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium">Team Collaboration</h4>
                <p className="text-sm text-muted-foreground">
                  Work with team members on projects, share insights, and contribute to strategic decisions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6">
        <h3 className="font-semibold text-foreground mb-3">Ready to get started?</h3>
        <p className="text-muted-foreground mb-4">
          With your {role.name} role, you'll be able to make meaningful contributions to your team's success. 
          Let's continue with a quick tour of the platform features you'll be using most.
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Content Management</Badge>
          <Badge variant="outline">Analytics Dashboard</Badge>
          <Badge variant="outline">Competitive Analysis</Badge>
          <Badge variant="outline">Team Collaboration</Badge>
        </div>
      </div>
    </div>
  );
}