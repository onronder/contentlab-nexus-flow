import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Crown, Shield, User, ChevronRight } from 'lucide-react';
import { useTeam, useTeamMembers } from '@/hooks/useTeamQueries';

interface TeamOverviewStepProps {
  teamId: string;
  invitationId: string;
  onNext: () => void;
  onComplete: () => void;
}

export function TeamOverviewStep({ teamId, onNext }: TeamOverviewStepProps) {
  const { data: team } = useTeam(teamId);
  const { data: teamMembers = [] } = useTeamMembers(teamId);

  // Mock data for demonstration if no real data
  const mockTeamMembers = [
    {
      id: '1',
      user_id: '1',
      role: 'owner',
      user: {
        full_name: 'Sarah Johnson',
        email: 'sarah@company.com',
        avatar_url: null
      },
      joined_at: '2024-01-15'
    },
    {
      id: '2',
      user_id: '2',
      role: 'admin',
      user: {
        full_name: 'Michael Chen',
        email: 'michael@company.com',
        avatar_url: null
      },
      joined_at: '2024-01-20'
    },
    {
      id: '3',
      user_id: '3',
      role: 'analyst',
      user: {
        full_name: 'Emily Rodriguez',
        email: 'emily@company.com',
        avatar_url: null
      },
      joined_at: '2024-02-01'
    }
  ];

  const membersArray = Array.isArray(teamMembers) ? teamMembers : [];
  const displayMembers = membersArray.length > 0 ? membersArray : mockTeamMembers;
  const displayTeam = team || {
    name: 'Content Strategy Team',
    description: 'Focused on competitive analysis and content optimization',
    member_count: displayMembers.length
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
            {displayTeam.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {displayTeam.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{displayMembers.length} team members</span>
            <span>•</span>
            <span>Active since January 2024</span>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Your Teammates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Get to know the people you'll be working with
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayMembers.map((member, index) => (
              <div key={member.id || index} className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.user?.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.user?.full_name?.split(' ').map(n => n[0]).join('') || 
                       member.user?.email?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {member.user?.full_name || member.user?.email}
                      </h4>
                      {getRoleIcon(member.role)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.user?.email}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Team Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h4 className="font-medium">Team Owner</h4>
              <p className="text-sm text-muted-foreground">
                Full administrative control
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <h4 className="font-medium">Administrators</h4>
              <p className="text-sm text-muted-foreground">
                Manage team settings and members
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-medium">Team Members</h4>
              <p className="text-sm text-muted-foreground">
                Collaborate on projects and content
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 <strong>Tip:</strong> You can always view team member information and contact details 
          from the Team page in the main navigation.
        </p>
      </div>
    </div>
  );
}