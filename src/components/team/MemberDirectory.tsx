import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Download, 
  Grid3X3, 
  List, 
  MoreVertical,
  Mail,
  Edit,
  Trash2,
  Users,
  Clock,
  Calendar,
  SlidersHorizontal
} from 'lucide-react';
import { TeamMember, MemberStatus } from '@/types/team';
import { useTeamMembers } from '@/hooks/useTeamQueries';
import { TeamMemberCard } from './TeamMemberCard';
import { EditMemberDialog } from './EditMemberDialog';

interface MemberDirectoryProps {
  teamId: string;
  onInviteMember?: () => void;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'role' | 'joined' | 'last_active';

export const MemberDirectory: React.FC<MemberDirectoryProps> = ({
  teamId,
  onInviteMember
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string | MemberStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const { data: membersData, isLoading } = useTeamMembers(teamId, {
    filters: {
      search: searchTerm || undefined,
      role_slug: roleFilter !== 'all' ? roleFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter as MemberStatus : undefined
    },
    sort: {
      field: sortBy === 'name' ? 'name' : sortBy === 'role' ? 'role' : sortBy === 'joined' ? 'joined_at' : 'last_activity_at',
      direction: 'asc'
    }
  });

  const members = membersData?.members || [];

  const handleSelectMember = (memberId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers(prev => [...prev, memberId]);
    } else {
      setSelectedMembers(prev => prev.filter(id => id !== memberId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMembers(members.map(m => m.id));
    } else {
      setSelectedMembers([]);
    }
  };

  const handleExport = () => {
    const csvContent = [
      'Name,Email,Role,Status,Joined Date,Last Active',
      ...members.map(member => [
        member.user?.display_name || 'N/A',
        member.user?.email || 'N/A',
        member.role?.name || 'N/A',
        member.status,
        member.joined_at || member.created_at,
        member.last_activity_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Directory</h3>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''}
            {selectedMembers.length > 0 && ` • ${selectedMembers.length} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none border-r"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search members..."
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
            <SelectItem value="member">Member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
          <SelectTrigger className="w-[140px]">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="joined">Joined Date</SelectItem>
            <SelectItem value="last_active">Last Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedMembers.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedMembers.length === members.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Change Role
                </Button>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div key={member.id} className="relative">
              <Checkbox
                className="absolute top-4 left-4 z-10 bg-background border-2"
                checked={selectedMembers.includes(member.id)}
                onCheckedChange={(checked) => handleSelectMember(member.id, checked as boolean)}
              />
              <TeamMemberCard
                member={member}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-4">
                      <Checkbox
                        checked={selectedMembers.length === members.length && members.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-4 font-medium">Member</th>
                    <th className="text-left p-4 font-medium">Role</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                    <th className="text-left p-4 font-medium">Last Active</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member, index) => (
                    <tr key={member.id} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => handleSelectMember(member.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user?.avatar_url} alt={member.user?.display_name} />
                            <AvatarFallback>
                              {member.user?.display_name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user?.display_name}</p>
                            <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline">
                          {member.role?.name || 'No Role'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(member.joined_at || member.created_at)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatLastActive(member.last_activity_at)}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingMember(member)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Member
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {members.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team members found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Invite team members to get started"}
            </p>
            {onInviteMember && (
              <Button onClick={onInviteMember} className="gradient-primary">
                <Users className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Member Dialog */}
      <EditMemberDialog
        member={editingMember}
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        teamId={teamId}
      />
    </div>
  );
};