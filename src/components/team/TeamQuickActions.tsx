import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Settings, 
  MessageSquare, 
  BarChart3, 
  Users,
  Calendar,
  FileText,
  Shield
} from "lucide-react";
import { useTeamContext } from "@/contexts/TeamContext";
import { InviteTeamMemberDialog } from "@/components/invitations/InviteTeamMemberDialog";

interface TeamQuickActionsProps {
  teamId: string;
  onTabChange: (tab: string) => void;
}

export function TeamQuickActions({ teamId, onTabChange }: TeamQuickActionsProps) {
  const { currentTeam, hasTeamAccess } = useTeamContext();

  const quickActions = [
    {
      icon: UserPlus,
      title: "Invite Member",
      description: "Add new team members",
      action: "invite",
      permission: "manage_members",
      color: "bg-primary/10 text-primary"
    },
    {
      icon: MessageSquare,
      title: "Team Chat",
      description: "Join the conversation",
      action: () => onTabChange("communication"),
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: BarChart3,
      title: "View Analytics",
      description: "Team performance insights",
      action: () => onTabChange("analytics"),
      color: "bg-green-100 text-green-600"
    },
    {
      icon: FileText,
      title: "Browse Projects",
      description: "View team projects",
      action: () => onTabChange("projects"),
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: Shield,
      title: "Manage Roles",
      description: "Set permissions",
      action: () => onTabChange("management"),
      permission: "manage_members",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: Settings,
      title: "Team Settings",
      description: "Configure team",
      action: () => onTabChange("settings"),
      permission: "manage_settings",
      color: "bg-gray-100 text-gray-600"
    }
  ];

  const visibleActions = quickActions.filter(action => 
    !action.permission || hasTeamAccess(action.permission)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common team management tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {visibleActions.map((action, index) => {
            if (action.action === "invite") {
              return (
                <InviteTeamMemberDialog 
                  key={index}
                  teamId={teamId}
                  trigger={
                    <Button
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
                    >
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  }
                />
              );
            }

            return (
              <Button
                key={index}
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
                onClick={typeof action.action === 'function' ? action.action : undefined}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
        
        {/* Team Status */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Team Status</span>
            <Badge variant={currentTeam?.is_active ? "default" : "secondary"}>
              {currentTeam?.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Created {currentTeam?.created_at ? new Date(currentTeam.created_at).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}