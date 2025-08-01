import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Calendar, 
  Clock, 
  Shield, 
  Edit, 
  Trash2,
  Users,
  Activity,
  Settings as SettingsIcon
} from "lucide-react";
import { mockUsers, mockTeam, mockRecentActivities, User } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { InviteTeamMemberDialog } from "@/components/invitations/InviteTeamMemberDialog";
import { InvitationList } from "@/components/invitations/InvitationList";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { MemberDirectory } from "@/components/team/MemberDirectory";
import { RoleManagement } from "@/components/team/RoleManagement";

const Team = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "offline": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800";
      case "editor": return "bg-blue-100 text-blue-800";
      case "viewer": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="h-3 w-3" />;
      case "editor": return <Edit className="h-3 w-3" />;
      case "viewer": return <Users className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLastActive = (dateString: string) => {
    const now = new Date();
    const lastActive = new Date(dateString);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Team Management</h1>
            <p className="text-muted-foreground text-lg">Manage team members, roles, and permissions</p>
          </div>
          <InviteTeamMemberDialog 
            teamId="mock-team-id"
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
              <h3 className="text-2xl font-bold mb-1">{mockTeam.memberCount}</h3>
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
              <h3 className="text-2xl font-bold mb-1">{mockTeam.activeUsers}</h3>
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
              <h3 className="text-2xl font-bold mb-1">{mockTeam.pendingInvitations}</h3>
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
              <h3 className="text-2xl font-bold mb-1">{mockUsers.filter(u => u.role === 'admin').length}</h3>
              <p className="text-sm text-muted-foreground">Administrators</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="away">Away</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Team Content */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="members">Team Members ({mockUsers.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="settings">Team Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <MemberDirectory 
              teamId="mock-team-id"
              onInviteMember={() => setShowInviteModal(true)}
            />
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <InvitationList teamId="mock-team-id" />
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <RoleManagement teamId="mock-team-id" />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Track team member actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 rounded-lg border">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                        <AvatarFallback>{activity.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user.name}</span>
                          <span className="text-muted-foreground"> {activity.action} </span>
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{formatLastActive(activity.timestamp)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Information</CardTitle>
                  <CardDescription>Manage your team details and settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="team-name">Team Name</Label>
                      <Input id="team-name" defaultValue={mockTeam.name} />
                    </div>
                    <div>
                      <Label htmlFor="team-description">Description</Label>
                      <Input id="team-description" defaultValue={mockTeam.description} />
                    </div>
                  </div>
                  <Button className="gradient-primary">Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Permissions & Roles</CardTitle>
                  <CardDescription>Configure team member permissions and access levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Admin</h4>
                        <p className="text-sm text-muted-foreground mb-2">Full access to all features</p>
                        <Badge className="bg-red-100 text-red-800">Full Access</Badge>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Editor</h4>
                        <p className="text-sm text-muted-foreground mb-2">Can create and edit content</p>
                        <Badge className="bg-blue-100 text-blue-800">Edit Access</Badge>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">Viewer</h4>
                        <p className="text-sm text-muted-foreground mb-2">Can view and comment only</p>
                        <Badge className="bg-green-100 text-green-800">View Access</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Team;