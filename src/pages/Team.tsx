import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, 
  Search, 
  Filter, 
  Users,
  Activity,
  Settings as SettingsIcon,
  AlertTriangle,
  Mail,
  Shield,
  MessageCircle,
  Bell,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeams, useTeamMembers, useTeamStats, useTeamActivity } from "@/hooks/useTeamQueries";
import { InviteTeamMemberDialog } from "@/components/invitations/InviteTeamMemberDialog";
import { InvitationList } from "@/components/invitations/InvitationList";
import { MemberDirectory } from "@/components/team/MemberDirectory";
import { RoleManagement } from "@/components/team/RoleManagement";
import { TeamSettings } from "@/components/team/TeamSettings";
import { TeamAnalytics } from "@/components/team/TeamAnalytics";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";
import { TeamChat } from "@/components/team/TeamChat";
import { TeamActivityFeed } from "@/components/team/TeamActivityFeed";
import { NotificationCenter } from "@/components/team/NotificationCenter";
import { TeamAdminDashboard } from "@/components/team/TeamAdminDashboard";
import { TeamBillingDashboard } from "@/components/team/TeamBillingDashboard";
import { TeamProjectsOverview } from "@/components/team/TeamProjectsOverview";
import { TeamContentLibrary } from "@/components/team/TeamContentLibrary";
import { TeamPerformanceDashboard } from "@/components/team/TeamPerformanceDashboard";
import { TeamQuickActions } from "@/components/team/TeamQuickActions";
const Team = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("members");

  // Fetch real data from database
  const { data: teams, isLoading: teamsLoading } = useTeams();
  const currentTeam = teams?.[0]; // Use first team for now
  const teamId = currentTeam?.id;

  const { data: membersResponse, isLoading: membersLoading } = useTeamMembers(teamId || "");
  const { data: stats, isLoading: statsLoading } = useTeamStats(teamId || "");
  const { data: activities, isLoading: activitiesLoading } = useTeamActivity(teamId || "");

  const members = membersResponse?.members || [];
  const isLoading = teamsLoading || membersLoading || statsLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-10 w-64 bg-muted/50 animate-pulse rounded mb-2" />
              <div className="h-6 w-96 bg-muted/50 animate-pulse rounded" />
            </div>
            <div className="h-10 w-48 bg-muted/50 animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No team state
  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-6">
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md w-full">
            <CardContent className="text-center p-6">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Team Found</h3>
              <p className="text-muted-foreground mb-2">
                You don't belong to any team yet.
              </p>
              <p className="text-muted-foreground mb-4">
                Create your team now or ask an admin to invite you.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => navigate('/create-team')} className="gradient-primary text-white shadow-elegant">
                  Create your team
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  const pendingInvitations = stats?.pending_invitations || 0;
  const adminCount = members.filter(m => m.role?.name === 'Administrator' || m.role?.slug === 'admin').length;

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{currentTeam.name}</h1>
            <p className="text-muted-foreground text-lg">
              {currentTeam.description || "Manage team members, roles, and permissions"}
            </p>
          </div>
          <InviteTeamMemberDialog 
            teamId={teamId || ""}
            trigger={
              <Button className="gradient-primary text-white shadow-elegant hover:shadow-glow transition-all duration-200">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            }
          />
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="interactive-lift">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <Badge variant="secondary">Total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">{totalMembers}</h3>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </CardContent>
          </Card>

          <Card className="interactive-lift">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">{activeMembers}</h3>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </CardContent>
          </Card>

          <Card className="interactive-lift">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Mail className="h-4 w-4 text-yellow-600" />
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">{pendingInvitations}</h3>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
            </CardContent>
          </Card>

          <Card className="interactive-lift">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Admins</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl font-bold mb-1">{adminCount}</h3>
              <p className="text-sm text-muted-foreground">Administrators</p>
            </CardContent>
          </Card>
        </div>

        {/* Search - simplified for now */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Team Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <TeamQuickActions teamId={teamId || ""} onTabChange={setActiveTab} />
          </div>
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1">
            <TabsTrigger value="members" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members ({totalMembers})</span>
              <span className="sm:hidden">Members</span>
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Management</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <MemberDirectory teamId={teamId || ""} />
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TeamChat teamId={teamId || ""} />
              </div>
              <div className="space-y-4">
                <NotificationCenter teamId={teamId || ""} />
                <TeamActivityFeed teamId={teamId || ""} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <div className="space-y-6">
              <TeamProjectsOverview />
              <TeamContentLibrary />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              <TeamAnalytics teamId={teamId || ""} />
              <TeamPerformanceDashboard teamId={teamId || ""} />
            </div>
          </TabsContent>

          <TabsContent value="management" className="mt-6">
            <Tabs defaultValue="roles" className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
                <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                <TabsTrigger value="invitations">Invitations</TabsTrigger>
                <TabsTrigger value="admin">Admin Tools</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>
              
              <TabsContent value="roles" className="mt-4">
                <RoleManagement teamId={teamId || ""} />
              </TabsContent>
              
              <TabsContent value="invitations" className="mt-4">
                <InvitationList teamId={teamId || ""} />
              </TabsContent>
              
              <TabsContent value="admin" className="mt-4">
                <TeamAdminDashboard teamId={teamId || ""} />
              </TabsContent>
              
              <TabsContent value="billing" className="mt-4">
                <TeamBillingDashboard teamId={teamId || ""} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <TeamSettings teamId={teamId || ""} />
          </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Team;