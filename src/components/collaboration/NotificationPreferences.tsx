import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Bell, Mail, Phone, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreference {
  category: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sound: boolean;
}

interface NotificationPreferencesProps {
  preferences: NotificationPreference[];
  onPreferencesChange: (preferences: NotificationPreference[]) => void;
}

const NOTIFICATION_CATEGORIES = [
  { id: 'mention', label: 'Mentions', description: 'When someone mentions you in a message' },
  { id: 'message', label: 'Direct Messages', description: 'Direct messages sent to you' },
  { id: 'task', label: 'Task Updates', description: 'Task assignments and status changes' },
  { id: 'project', label: 'Project Updates', description: 'Project milestones and changes' },
  { id: 'team', label: 'Team Activity', description: 'General team updates and announcements' },
  { id: 'system', label: 'System Notifications', description: 'System maintenance and updates' }
];

const DIGEST_FREQUENCIES = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'hourly', label: 'Every Hour' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Summary' }
];

export function NotificationPreferences({ 
  preferences, 
  onPreferencesChange 
}: NotificationPreferencesProps) {
  const [digestFrequency, setDigestFrequency] = useState('daily');
  const [quietHours, setQuietHours] = useState({ enabled: false, start: '22:00', end: '08:00' });
  const { toast } = useToast();

  const updatePreference = (category: string, channel: string, enabled: boolean) => {
    const updatedPreferences = preferences.map(pref => 
      pref.category === category 
        ? { ...pref, [channel]: enabled }
        : pref
    );
    onPreferencesChange(updatedPreferences);
  };

  const getPreference = (category: string) => {
    return preferences.find(p => p.category === category) || {
      category,
      email: true,
      push: true,
      inApp: true,
      sound: true
    };
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive browser notifications"
        });
      } else {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings",
          variant: "destructive"
        });
      }
    }
  };

  const savePreferences = () => {
    // Here you would save to your backend
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Browser Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications in your browser
              </p>
            </div>
            <Button variant="outline" onClick={requestNotificationPermission}>
              Enable
            </Button>
          </div>
        </div>

        <Separator />

        {/* Digest Settings */}
        <div className="space-y-3">
          <Label className="font-medium">Notification Frequency</Label>
          <Select value={digestFrequency} onValueChange={setDigestFrequency}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {DIGEST_FREQUENCIES.map(freq => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Choose how often you want to receive notification summaries
          </p>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Disable notifications during these hours
              </p>
            </div>
            <Switch
              checked={quietHours.enabled}
              onCheckedChange={(enabled) => 
                setQuietHours(prev => ({ ...prev, enabled }))
              }
            />
          </div>
          
          {quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Start Time</Label>
                <Select value={quietHours.start} onValueChange={(start) => 
                  setQuietHours(prev => ({ ...prev, start }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">End Time</Label>
                <Select value={quietHours.end} onValueChange={(end) => 
                  setQuietHours(prev => ({ ...prev, end }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Category Preferences */}
        <div className="space-y-4">
          <Label className="font-medium">Notification Categories</Label>
          
          <div className="space-y-4">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const pref = getPreference(category.id);
              
              return (
                <div key={category.id} className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">{category.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pref.inApp}
                        onCheckedChange={(checked) => 
                          updatePreference(category.id, 'inApp', checked)
                        }
                      />
                      <Bell className="h-4 w-4" />
                      <Label className="text-sm">In-App</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pref.email}
                        onCheckedChange={(checked) => 
                          updatePreference(category.id, 'email', checked)
                        }
                      />
                      <Mail className="h-4 w-4" />
                      <Label className="text-sm">Email</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pref.push}
                        onCheckedChange={(checked) => 
                          updatePreference(category.id, 'push', checked)
                        }
                      />
                      <Phone className="h-4 w-4" />
                      <Label className="text-sm">Push</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={pref.sound}
                        onCheckedChange={(checked) => 
                          updatePreference(category.id, 'sound', checked)
                        }
                      />
                      <Bell className="h-4 w-4" />
                      <Label className="text-sm">Sound</Label>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={savePreferences}>
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}