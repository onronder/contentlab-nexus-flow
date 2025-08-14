import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  User, 
  Users, 
  CreditCard, 
  Plug, 
  Shield, 
  Bell, 
  Upload, 
  Eye, 
  EyeOff,
  Check,
  X,
  ExternalLink,
  Trash2,
  Settings as SettingsIcon,
  FileText,
  TrendingUp,
  Zap,
  RefreshCw as Sync
} from "lucide-react";
import { useUserProfile, useUpdateUserProfile } from "@/hooks/useUserProfile";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { useContentSettings } from "@/hooks/useContentSettings";
import { useCompetitiveSettings } from "@/hooks/useCompetitiveSettings";
import { useAnalyticsSettings } from "@/hooks/useAnalyticsSettings";
import { SettingsSync } from "@/components/settings/SettingsSync";
import { SettingsAutomation } from "@/components/settings/SettingsAutomation";
import { SettingsIntegrationDashboard } from "@/components/settings/SettingsIntegrationDashboard";
import { SettingsErrorBoundary } from "@/components/ui/settings-error-boundary";
import { ErrorAlert } from "@/components/ui/error-alert";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  
  const { data: userProfile, isLoading: isProfileLoading, error: profileError, refetch: refetchProfile } = useUserProfile();
  const { data: userSettings, isLoading: isSettingsLoading, error: settingsError, refetch: refetchSettings } = useUserSettings();
  const { data: teamSettings, isLoading: isTeamLoading, error: teamError, refetch: refetchTeam } = useTeamSettings();
  const { settings: contentSettings, isLoading: contentLoading, updateSettings: updateContentSettings } = useContentSettings();
  const { settings: competitiveSettings, isLoading: competitiveLoading, updateSettings: updateCompetitiveSettings } = useCompetitiveSettings();
  const { settings: analyticsSettings, isLoading: analyticsLoading, updateSettings: updateAnalyticsSettings } = useAnalyticsSettings();
  
  const updateProfile = useUpdateUserProfile();
  const updateSettings = useUpdateUserSettings();
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: '',
    phone: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weekly: true,
    mentions: true
  });

  // Update form when profile data loads
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        full_name: userProfile.full_name || '',
        bio: userProfile.bio || '',
        phone: userProfile.phone || ''
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (userSettings) {
      setNotifications({
        email: userSettings.notification_preferences?.email ?? true,
        push: userSettings.notification_preferences?.push ?? false,
        weekly: userSettings.notification_preferences?.in_app ?? true,
        mentions: true
      });
    }
  }, [userSettings]);

  const handleProfileSave = () => {
    updateProfile.mutate(profileForm);
  };

  const handleNotificationSave = () => {
    updateSettings.mutate({
      notification_preferences: {
        email: notifications.email,
        push: notifications.push,
        in_app: notifications.weekly
      }
    });
  };

  const handleRetryAll = () => {
    refetchProfile();
    refetchSettings();
    refetchTeam();
  };

  // Handle loading states
  if (isProfileLoading || isSettingsLoading || isTeamLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Handle error states
  if (profileError || settingsError || teamError) {
    const errorMessage = profileError?.message || settingsError?.message || teamError?.message || 'Failed to load settings';
    return (
      <div className="container mx-auto p-6">
        <ErrorAlert
          title="Settings Loading Error"
          message={errorMessage}
          onRetry={handleRetryAll}
          retryLabel="Retry Loading Settings"
        />
      </div>
    );
  }

  return (
    <SettingsErrorBoundary onRetry={handleRetryAll}>
      <div className="min-h-screen bg-gradient-subtle p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
              <p className="text-muted-foreground text-lg">Manage your account, team, and application preferences</p>
            </div>
          </div>

          {/* Settings Tabs */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Content
              </TabsTrigger>
              <TabsTrigger value="competitive" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Competitive
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="integration" className="flex items-center gap-2">
                <Plug className="h-4 w-4" />
                Integration
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Automation
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <Sync className="h-4 w-4" />
                Sync
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Manage your personal profile information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={userProfile?.avatar_url || ''} />
                      <AvatarFallback>
                        {userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Change Photo
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        JPG, GIF or PNG. 1MB max.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={userProfile?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value="••••••••••"
                          disabled
                          className="bg-muted pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Notification Preferences</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="email-notifications">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch
                          id="email-notifications"
                          checked={notifications.email}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, email: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="push-notifications">Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive push notifications in your browser
                          </p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={notifications.push}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, push: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="weekly-notifications">Weekly Reports</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive weekly activity summaries
                          </p>
                        </div>
                        <Switch
                          id="weekly-notifications"
                          checked={notifications.weekly}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, weekly: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleProfileSave} disabled={updateProfile.isPending}>
                      {updateProfile.isPending ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleNotificationSave}
                      disabled={updateSettings.isPending}
                    >
                      {updateSettings.isPending ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Updating...
                        </>
                      ) : (
                        'Update Notifications'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your team configuration and member settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isTeamLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : teamError ? (
                    <ErrorAlert
                      title="Team Settings Error"
                      message={teamError.message}
                      onRetry={refetchTeam}
                      retryLabel="Retry Loading Team Settings"
                    />
                  ) : teamSettings ? (
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{teamSettings.name}</h4>
                            <p className="text-sm text-muted-foreground">{teamSettings.description}</p>
                          </div>
                          <Badge variant="outline">Member</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Members:</span>
                            <span className="ml-2 font-medium">{teamSettings.memberCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Active:</span>
                            <span className="ml-2 font-medium">{teamSettings.activeUsers}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pending:</span>
                            <span className="ml-2 font-medium">{teamSettings.pendingInvitations}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No team settings available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Management Settings</CardTitle>
                  <CardDescription>
                    Configure how your content is managed, organized, and processed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {contentLoading ? (
                    <div className="text-sm text-muted-foreground">Loading content settings...</div>
                  ) : contentSettings ? (
                    <>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Management</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="auto-save">Auto-save content</Label>
                            <Switch 
                              id="auto-save" 
                              checked={contentSettings.managementSettings?.autoSave ?? true}
                              onCheckedChange={(checked) => 
                                updateContentSettings({
                                  managementSettings: {
                                    ...contentSettings.managementSettings,
                                    autoSave: checked
                                  }
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="version-control">Enable version control</Label>
                            <Switch 
                              id="version-control" 
                              checked={contentSettings.managementSettings?.versionControl ?? true}
                              onCheckedChange={(checked) => 
                                updateContentSettings({
                                  managementSettings: {
                                    ...contentSettings.managementSettings,
                                    versionControl: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Workflow</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="approval-required">Require approval for publishing</Label>
                            <Switch 
                              id="approval-required" 
                              checked={contentSettings.workflowSettings?.approvalRequired ?? false}
                              onCheckedChange={(checked) => 
                                updateContentSettings({
                                  workflowSettings: {
                                    ...contentSettings.workflowSettings,
                                    approvalRequired: checked
                                  }
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="auto-publish">Auto-publish approved content</Label>
                            <Switch 
                              id="auto-publish" 
                              checked={contentSettings.workflowSettings?.autoPublish ?? false}
                              onCheckedChange={(checked) => 
                                updateContentSettings({
                                  workflowSettings: {
                                    ...contentSettings.workflowSettings,
                                    autoPublish: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Upload Settings</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="max-file-size">Maximum file size (MB)</Label>
                            <Input 
                              id="max-file-size" 
                              type="number" 
                              value={Math.round((contentSettings.uploadSettings?.maxFileSize ?? 10485760) / 1048576)}
                              className="mt-1"
                              onChange={(e) => {
                                const sizeInBytes = parseInt(e.target.value) * 1048576;
                                updateContentSettings({
                                  uploadSettings: {
                                    ...contentSettings.uploadSettings,
                                    maxFileSize: sizeInBytes
                                  }
                                });
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="auto-optimize">Auto-optimize uploads</Label>
                            <Switch 
                              id="auto-optimize" 
                              checked={contentSettings.uploadSettings?.autoOptimize ?? true}
                              onCheckedChange={(checked) => 
                                updateContentSettings({
                                  uploadSettings: {
                                    ...contentSettings.uploadSettings,
                                    autoOptimize: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-destructive">Failed to load content settings</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Competitive Tab */}
            <TabsContent value="competitive" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Competitive Intelligence Settings</CardTitle>
                  <CardDescription>
                    Configure monitoring, analysis, and reporting for competitive intelligence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {competitiveLoading ? (
                    <div className="text-sm text-muted-foreground">Loading competitive settings...</div>
                  ) : competitiveSettings ? (
                    <>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Monitoring</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="auto-monitoring">Enable automatic monitoring</Label>
                            <Switch 
                              id="auto-monitoring" 
                              checked={competitiveSettings.monitoringSettings?.autoMonitoring ?? true}
                              onCheckedChange={(checked) => 
                                updateCompetitiveSettings({
                                  monitoringSettings: {
                                    ...competitiveSettings.monitoringSettings,
                                    autoMonitoring: checked
                                  }
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="monitoring-frequency">Monitoring frequency</Label>
                            <Select 
                              value={competitiveSettings.monitoringSettings?.frequency ?? 'daily'}
                              onValueChange={(value) => 
                                updateCompetitiveSettings({
                                  monitoringSettings: {
                                    ...competitiveSettings.monitoringSettings,
                                    frequency: value as 'hourly' | 'daily' | 'weekly'
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Analysis</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="analysis-depth">Analysis depth level</Label>
                            <Select 
                              value={competitiveSettings.analysisSettings?.depthLevel ?? 'standard'}
                              onValueChange={(value) => 
                                updateCompetitiveSettings({
                                  analysisSettings: {
                                    ...competitiveSettings.analysisSettings,
                                    depthLevel: value as 'basic' | 'standard' | 'deep'
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">Basic</SelectItem>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="deep">Deep</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="track-changes">Track competitor changes</Label>
                            <Switch 
                              id="track-changes" 
                              checked={competitiveSettings.analysisSettings?.trackChanges ?? true}
                              onCheckedChange={(checked) => 
                                updateCompetitiveSettings({
                                  analysisSettings: {
                                    ...competitiveSettings.analysisSettings,
                                    trackChanges: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Alerts</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="email-alerts">Email alerts</Label>
                            <Switch 
                              id="email-alerts" 
                              checked={competitiveSettings.alertingSettings?.emailAlerts ?? true}
                              onCheckedChange={(checked) => 
                                updateCompetitiveSettings({
                                  alertingSettings: {
                                    ...competitiveSettings.alertingSettings,
                                    emailAlerts: checked
                                  }
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="in-app-alerts">In-app alerts</Label>
                            <Switch 
                              id="in-app-alerts" 
                              checked={competitiveSettings.alertingSettings?.inAppAlerts ?? true}
                              onCheckedChange={(checked) => 
                                updateCompetitiveSettings({
                                  alertingSettings: {
                                    ...competitiveSettings.alertingSettings,
                                    inAppAlerts: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-destructive">Failed to load competitive settings</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Settings</CardTitle>
                  <CardDescription>
                    Configure dashboards, reports, and data management for analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {analyticsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading analytics settings...</div>
                  ) : analyticsSettings ? (
                    <>
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Dashboard</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="default-date-range">Default date range</Label>
                            <Select 
                              value={analyticsSettings.dashboardSettings?.defaultDateRange ?? '30d'}
                              onValueChange={(value) => 
                                updateAnalyticsSettings({
                                  dashboardSettings: {
                                    ...analyticsSettings.dashboardSettings,
                                    defaultDateRange: value as '7d' | '30d' | '90d' | '1y'
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                                <SelectItem value="90d">Last 90 days</SelectItem>
                                <SelectItem value="1y">Last year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show-realtime">Show real-time data</Label>
                            <Switch 
                              id="show-realtime" 
                              checked={analyticsSettings.dashboardSettings?.showRealTime ?? false}
                              onCheckedChange={(checked) => 
                                updateAnalyticsSettings({
                                  dashboardSettings: {
                                    ...analyticsSettings.dashboardSettings,
                                    showRealTime: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Charts</h4>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="default-chart-type">Default chart type</Label>
                            <Select 
                              value={analyticsSettings.chartSettings?.defaultChartType ?? 'line'}
                              onValueChange={(value) => 
                                updateAnalyticsSettings({
                                  chartSettings: {
                                    ...analyticsSettings.chartSettings,
                                    defaultChartType: value as 'line' | 'bar' | 'area' | 'pie'
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="area">Area Chart</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="show-data-labels">Show data labels</Label>
                            <Switch 
                              id="show-data-labels" 
                              checked={analyticsSettings.chartSettings?.showDataLabels ?? true}
                              onCheckedChange={(checked) => 
                                updateAnalyticsSettings({
                                  chartSettings: {
                                    ...analyticsSettings.chartSettings,
                                    showDataLabels: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Privacy</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="anonymize-data">Anonymize personal data</Label>
                            <Switch 
                              id="anonymize-data" 
                              checked={analyticsSettings.privacySettings?.anonymizeData ?? true}
                              onCheckedChange={(checked) => 
                                updateAnalyticsSettings({
                                  privacySettings: {
                                    ...analyticsSettings.privacySettings,
                                    anonymizeData: checked
                                  }
                                })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="allow-data-export">Allow data export</Label>
                            <Switch 
                              id="allow-data-export" 
                              checked={analyticsSettings.privacySettings?.dataExport ?? true}
                              onCheckedChange={(checked) => 
                                updateAnalyticsSettings({
                                  privacySettings: {
                                    ...analyticsSettings.privacySettings,
                                    dataExport: checked
                                  }
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-destructive">Failed to load analytics settings</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integration Tab */}
            <TabsContent value="integration" className="space-y-6">
              <SettingsIntegrationDashboard />
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-6">
              <SettingsAutomation />
            </TabsContent>

            {/* Sync Tab */}
            <TabsContent value="sync" className="space-y-6">
              <SettingsSync />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SettingsErrorBoundary>
  );
};

export default Settings;