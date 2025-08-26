import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Globe, 
  RefreshCw, 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Database,
  Wifi
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  lastActive: Date;
  location: string;
  isCurrentDevice: boolean;
  sessionId: string;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'error';
}

interface SessionData {
  currentTeamId: string;
  recentTeams: string[];
  preferences: Record<string, any>;
  workspaceState: Record<string, any>;
  lastSync: Date;
}

interface SyncConflict {
  id: string;
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: Date;
  resolved: boolean;
}

export const EnhancedSessionManager: React.FC = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const generateMockDevices = useCallback((): Device[] => {
    return [
      {
        id: 'current',
        name: 'MacBook Pro',
        type: 'desktop',
        browser: 'Chrome 120',
        os: 'macOS 14.0',
        lastActive: new Date(),
        location: 'San Francisco, CA',
        isCurrentDevice: true,
        sessionId: 'session_current',
        syncStatus: 'synced'
      },
      {
        id: 'mobile_1',
        name: 'iPhone 15 Pro',
        type: 'mobile',
        browser: 'Safari 17',
        os: 'iOS 17.1',
        lastActive: new Date(Date.now() - 1800000), // 30 minutes ago
        location: 'San Francisco, CA',
        isCurrentDevice: false,
        sessionId: 'session_mobile_1',
        syncStatus: Math.random() > 0.8 ? 'syncing' : 'synced'
      },
      {
        id: 'tablet_1',
        name: 'iPad Air',
        type: 'tablet',
        browser: 'Safari 17',
        os: 'iPadOS 17.1',
        lastActive: new Date(Date.now() - 7200000), // 2 hours ago
        location: 'San Francisco, CA',
        isCurrentDevice: false,
        sessionId: 'session_tablet_1',
        syncStatus: Math.random() > 0.9 ? 'offline' : 'synced'
      }
    ];
  }, []);

  const generateMockConflicts = useCallback((): SyncConflict[] => {
    if (Math.random() > 0.7) return [];
    
    return [
      {
        id: 'conflict_1',
        field: 'currentTeamId',
        localValue: 'team_123',
        remoteValue: 'team_456',
        timestamp: new Date(Date.now() - 300000),
        resolved: false
      }
    ];
  }, []);

  const initializeSessionManager = useCallback(async () => {
    try {
      // Simulate fetching session data
      setSessionData({
        currentTeamId: 'team_123',
        recentTeams: ['team_123', 'team_456', 'team_789'],
        preferences: {
          theme: 'dark',
          notifications: true,
          autoSave: true
        },
        workspaceState: {
          openTabs: ['dashboard', 'analytics'],
          sidebarCollapsed: false
        },
        lastSync: new Date()
      });

      setDevices(generateMockDevices());
      setSyncConflicts(generateMockConflicts());
      
    } catch (error) {
      console.error('Failed to initialize session manager:', error);
      toast({
        title: "Initialization Error",
        description: "Failed to load session data",
        variant: "destructive",
      });
    }
  }, [generateMockDevices, generateMockConflicts, toast]);

  const performSync = useCallback(async () => {
    if (syncStatus === 'syncing') return;
    
    setSyncStatus('syncing');
    setLastSyncAttempt(new Date());
    
    try {
      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update device sync statuses
      setDevices(prev => prev.map(device => ({
        ...device,
        syncStatus: Math.random() > 0.1 ? 'synced' : 'error'
      })));
      
      setSyncStatus('idle');
      
      toast({
        title: "Sync Complete",
        description: "Session data synchronized across all devices",
      });
      
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize session data",
        variant: "destructive",
      });
    }
  }, [syncStatus, toast]);

  const resolveConflict = useCallback((conflictId: string, useLocal: boolean) => {
    setSyncConflicts(prev => prev.map(conflict => 
      conflict.id === conflictId 
        ? { ...conflict, resolved: true }
        : conflict
    ));
    
    toast({
      title: "Conflict Resolved",
      description: `Using ${useLocal ? 'local' : 'remote'} value`,
    });
  }, [toast]);

  const disconnectDevice = useCallback((deviceId: string) => {
    setDevices(prev => prev.filter(device => device.id !== deviceId));
    toast({
      title: "Device Disconnected",
      description: "Device has been removed from sync",
    });
  }, [toast]);

  useEffect(() => {
    initializeSessionManager();
    
    let interval: NodeJS.Timeout;
    if (autoSync && !isOfflineMode) {
      interval = setInterval(() => {
        if (Math.random() > 0.8) { // 20% chance to sync
          performSync();
        }
      }, 30000); // Check every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [initializeSessionManager, autoSync, isOfflineMode, performSync]);

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getSyncStatusIcon = (status: Device['syncStatus']) => {
    switch (status) {
      case 'synced': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'offline': return <Wifi className="h-4 w-4 text-gray-400" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getTimeSince = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Enhanced Session Manager</h2>
          <p className="text-muted-foreground">
            Multi-device session synchronization and management
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoSync}
              onCheckedChange={setAutoSync}
              disabled={isOfflineMode}
            />
            <span className="text-sm">Auto Sync</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={performSync}
            disabled={syncStatus === 'syncing' || isOfflineMode}
          >
            <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5" />
            Synchronization Status
          </CardTitle>
          <CardDescription>
            Last sync: {lastSyncAttempt.toLocaleTimeString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {syncStatus === 'syncing' && (
                <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
              )}
              {syncStatus === 'idle' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {syncStatus === 'error' && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">
                  {syncStatus === 'syncing' && 'Synchronizing...'}
                  {syncStatus === 'idle' && 'All devices synchronized'}
                  {syncStatus === 'error' && 'Synchronization failed'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {devices.filter(d => d.syncStatus === 'synced').length} of {devices.length} devices synced
                </p>
              </div>
            </div>
            <Badge variant={
              syncStatus === 'syncing' ? 'secondary' :
              syncStatus === 'idle' ? 'default' : 'destructive'
            }>
              {syncStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sync Conflicts */}
      {syncConflicts.filter(c => !c.resolved).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Sync Conflicts
            </CardTitle>
            <CardDescription>
              Resolve conflicts to continue synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncConflicts.filter(c => !c.resolved).map((conflict) => (
                <div key={conflict.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{conflict.field}</h4>
                    <span className="text-xs text-muted-foreground">
                      {getTimeSince(conflict.timestamp)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Local Value</p>
                      <code className="block p-2 bg-muted rounded text-xs">
                        {JSON.stringify(conflict.localValue)}
                      </code>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Remote Value</p>
                      <code className="block p-2 bg-muted rounded text-xs">
                        {JSON.stringify(conflict.remoteValue)}
                      </code>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveConflict(conflict.id, true)}
                    >
                      Use Local
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveConflict(conflict.id, false)}
                    >
                      Use Remote
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Connected Devices
          </CardTitle>
          <CardDescription>
            Devices synchronized with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(device.type)}
                    {device.isCurrentDevice && (
                      <Badge variant="outline" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {device.browser} • {device.os} • {device.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active: {getTimeSince(device.lastActive)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getSyncStatusIcon(device.syncStatus)}
                    <span className="text-sm capitalize">{device.syncStatus}</span>
                  </div>
                  {!device.isCurrentDevice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectDevice(device.id)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Data */}
      {sessionData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Session Data
            </CardTitle>
            <CardDescription>
              Current session state and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-2">Current Team</p>
                <code className="text-sm">{sessionData.currentTeamId}</code>
              </div>
              <div>
                <p className="font-medium mb-2">Recent Teams</p>
                <div className="flex gap-2">
                  {sessionData.recentTeams.map((teamId, index) => (
                    <Badge key={index} variant="outline">{teamId}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Preferences</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(sessionData.preferences, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Mode Alert */}
      {isOfflineMode && (
        <Alert>
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            You are currently in offline mode. Changes will be synchronized when you reconnect.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};