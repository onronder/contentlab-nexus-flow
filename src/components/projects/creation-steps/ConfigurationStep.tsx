import React from 'react';
import { ProjectCreationInput } from '@/types/projects';
import { ValidationError } from '@/utils/projectValidation';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfigurationStepProps {
  formData: ProjectCreationInput;
  validationErrors: ValidationError[];
  onChange: (updates: Partial<ProjectCreationInput>) => void;
}

export function ConfigurationStep({ formData, validationErrors, onChange }: ConfigurationStepProps) {
  const updateNotificationSettings = (key: keyof ProjectCreationInput['notificationSettings'], value: any) => {
    onChange({
      notificationSettings: {
        ...formData.notificationSettings,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Project Configuration
        </h2>
        <p className="text-gray-600">
          Configure project settings and preferences for optimal competitive intelligence workflow.
        </p>
      </div>

      {/* Access Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Access & Sharing</CardTitle>
          <CardDescription>
            Control who can access and collaborate on this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Allow Team Access</Label>
              <div className="text-sm text-gray-600">
                Enable team members to be invited to collaborate on this project
              </div>
            </div>
            <Switch
              checked={formData.allowTeamAccess}
              onCheckedChange={(checked) => onChange({ allowTeamAccess: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Public Project</Label>
              <div className="text-sm text-gray-600">
                Make this project visible to other users in your organization
              </div>
            </div>
            <Switch
              checked={formData.isPublic}
              onCheckedChange={(checked) => onChange({ isPublic: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Analysis Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis & Automation</CardTitle>
          <CardDescription>
            Configure automated analysis and monitoring preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto Analysis</Label>
              <div className="text-sm text-gray-600">
                Automatically run competitive analysis based on predefined schedules
              </div>
            </div>
            <Switch
              checked={formData.autoAnalysisEnabled}
              onCheckedChange={(checked) => onChange({ autoAnalysisEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Choose how you want to be notified about project updates and insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Email Notifications</Label>
              <div className="text-sm text-gray-600">
                Receive project updates via email
              </div>
            </div>
            <Switch
              checked={formData.notificationSettings.email}
              onCheckedChange={(checked) => updateNotificationSettings('email', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">In-App Notifications</Label>
              <div className="text-sm text-gray-600">
                Show notifications within the application
              </div>
            </div>
            <Switch
              checked={formData.notificationSettings.inApp}
              onCheckedChange={(checked) => updateNotificationSettings('inApp', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-frequency">Notification Frequency</Label>
            <Select
              value={formData.notificationSettings.frequency}
              onValueChange={(value) => updateNotificationSettings('frequency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}