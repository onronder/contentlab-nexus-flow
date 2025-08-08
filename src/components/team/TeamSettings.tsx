import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/useTeamQueries";
import { useUpdateTeam } from "@/hooks/useTeamMutations";
import { TeamUpdateInput } from "@/types/team";
import { 
  Settings, 
  Shield, 
  Users, 
  Eye, 
  Upload,
  Save,
  AlertTriangle
} from "lucide-react";

interface TeamSettingsProps {
  teamId: string;
}

export const TeamSettings = ({ teamId }: TeamSettingsProps) => {
  const { toast } = useToast();
  const { data: team, isLoading } = useTeam(teamId);
  const updateTeamMutation = useUpdateTeam();

  const [formData, setFormData] = useState<TeamUpdateInput>({
    name: "",
    description: "",
    settings: {},
    member_limit: undefined,
    is_active: true
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name,
        description: team.description || "",
        settings: team.settings || {},
        member_limit: team.member_limit,
        is_active: team.is_active
      });
    }
  }, [team]);

  const handleInputChange = (field: keyof TeamUpdateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSettingsChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateTeamMutation.mutateAsync({
        teamId,
        updates: formData
      });
      setIsDirty(false);
      toast({
        title: "Team settings updated",
        description: "Your team settings have been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Failed to update settings",
        description: "There was an error saving your team settings.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
        <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Team not found</h3>
            <p className="text-muted-foreground">Unable to load team settings.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Team Information
          </CardTitle>
          <CardDescription>
            Manage your team details and basic settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={team.settings?.avatar_url} />
              <AvatarFallback className="text-lg">
                {team.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Avatar
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Recommended: Square image, at least 400x400px
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-slug">Team Slug</Label>
              <Input
                id="team-slug"
                value={team.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Team URL identifier (cannot be changed)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your team's purpose and goals"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Access Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Control
          </CardTitle>
          <CardDescription>
            Configure team visibility and member permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="team-active">Team Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Inactive teams cannot be accessed by members
              </p>
            </div>
            <Switch
              id="team-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-limit">Member Limit</Label>
            <Input
              id="member-limit"
              type="number"
              value={formData.member_limit || ""}
              onChange={(e) => handleInputChange('member_limit', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Unlimited"
              min="1"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of team members (leave empty for unlimited)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-approve Invitations</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve new member invitations
              </p>
            </div>
            <Switch
              checked={formData.settings?.auto_approve_invitations || false}
              onCheckedChange={(checked) => handleSettingsChange('auto_approve_invitations', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Statistics
          </CardTitle>
          <CardDescription>
            Current team metrics and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{team.current_member_count}</div>
              <div className="text-sm text-muted-foreground">Active Members</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{team.member_limit || "∞"}</div>
              <div className="text-sm text-muted-foreground">Member Limit</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {new Date(team.created_at).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance Reports
          </CardTitle>
          <CardDescription>
            Configure automated performance reports and send on-demand
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Enable Reports</Label>
              <Switch
                checked={!!formData.settings?.performance_reports?.enabled}
                onCheckedChange={(checked) => handleSettingsChange('performance_reports', {
                  ...(formData.settings?.performance_reports || {}),
                  enabled: checked,
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <select
                className="w-full border rounded h-9 px-3 bg-background"
                value={formData.settings?.performance_reports?.frequency || 'monthly'}
                onChange={(e) => handleSettingsChange('performance_reports', {
                  ...(formData.settings?.performance_reports || {}),
                  frequency: e.target.value,
                })}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Recipients (comma-separated emails)</Label>
              <Input
                value={formData.settings?.performance_reports?.recipients?.join(', ') || ''}
                onChange={(e) => handleSettingsChange('performance_reports', {
                  ...(formData.settings?.performance_reports || {}),
                  recipients: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })}
                placeholder="team@company.com, lead@company.com"
              />
            </div>
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { data, error } = await supabase.functions.invoke('team-performance-report', {
                    body: {
                      teamId,
                      recipients: formData.settings?.performance_reports?.recipients || [],
                    }
                  });
                  if (error) throw error;
                  toast({ title: 'Report sent', description: 'Performance report has been dispatched.' });
                } catch (err: any) {
                  toast({ title: 'Failed to send report', description: err?.message || 'Unexpected error', variant: 'destructive' });
                }
              }}
            >
              Send report now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg">
            <div>
              <h4 className="font-medium">Deactivate Team</h4>
              <p className="text-sm text-muted-foreground">
                Temporarily disable team access for all members
              </p>
            </div>
            <Button variant="destructive" size="sm">
              Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      {isDirty && (
        <div className="sticky bottom-4 flex justify-end gap-2 p-4 bg-background/80 backdrop-blur-sm border rounded-lg">
          <Button
            variant="outline"
            onClick={() => {
              setFormData({
                name: team.name,
                description: team.description || "",
                settings: team.settings || {},
                member_limit: team.member_limit,
                is_active: team.is_active
              });
              setIsDirty(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateTeamMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateTeamMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
};