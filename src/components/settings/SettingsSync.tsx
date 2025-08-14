import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Upload,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

export function SettingsSync() {
  const {
    syncStatus,
    syncPendingChanges,
    forceSync,
    resolveConflict,
    exportAllSettings,
    importAllSettings,
  } = useSettingsSync();

  const getSyncStatusIcon = () => {
    switch (syncStatus.syncStatus) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus.syncStatus) {
      case 'syncing':
        return 'Synchronizing...';
      case 'success':
        return 'Up to date';
      case 'error':
        return 'Sync failed';
      default:
        return 'Ready to sync';
    }
  };

  const getSyncStatusColor = () => {
    switch (syncStatus.syncStatus) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'syncing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleExportSettings = async () => {
    try {
      const settingsData = await exportAllSettings();
      const blob = new Blob([settingsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          importAllSettings(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings Synchronization</h2>
        <p className="text-muted-foreground">
          Manage cross-device synchronization and conflict resolution
        </p>
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Sync Status
          </CardTitle>
          <CardDescription>
            Real-time synchronization across all your devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSyncStatusIcon()}
              <span className="font-medium">{getSyncStatusText()}</span>
              <Badge variant={getSyncStatusColor()}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={forceSync}
              disabled={syncStatus.syncStatus === 'syncing' || !syncStatus.isOnline}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Sync
            </Button>
          </div>

          {syncStatus.lastSync && (
            <div className="text-sm text-muted-foreground">
              Last synchronized: {syncStatus.lastSync.toLocaleString()}
            </div>
          )}

          {syncStatus.pendingChanges > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">
                {syncStatus.pendingChanges} pending change(s) waiting to sync
              </span>
              <Button 
                size="sm" 
                onClick={syncPendingChanges}
                disabled={!syncStatus.isOnline}
              >
                Sync Now
              </Button>
            </div>
          )}

          {syncStatus.syncStatus === 'syncing' && (
            <div className="space-y-2">
              <Progress value={65} className="h-2" />
              <p className="text-sm text-muted-foreground">Synchronizing settings...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <CardDescription>
            Devices that have access to your synchronized settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Desktop - Chrome</p>
                  <p className="text-sm text-muted-foreground">Current device</p>
                </div>
              </div>
              <Badge variant="default">Active</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">iPhone</p>
                  <p className="text-sm text-muted-foreground">Last active 2 hours ago</p>
                </div>
              </div>
              <Badge variant="secondary">Offline</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Tablet className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">iPad</p>
                  <p className="text-sm text-muted-foreground">Last active yesterday</p>
                </div>
              </div>
              <Badge variant="secondary">Offline</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflict Resolution */}
      <Card>
        <CardHeader>
          <CardTitle>Conflict Resolution</CardTitle>
          <CardDescription>
            How to handle conflicts when settings differ between devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={syncStatus.conflictResolution === 'user' ? 'default' : 'outline'}
              onClick={() => resolveConflict('user')}
              className="h-auto p-4 flex-col gap-2"
            >
              <Monitor className="h-5 w-5" />
              <span className="text-xs">Local Priority</span>
            </Button>
            <Button
              variant={syncStatus.conflictResolution === 'server' ? 'default' : 'outline'}
              onClick={() => resolveConflict('server')}
              className="h-auto p-4 flex-col gap-2"
            >
              <Wifi className="h-5 w-5" />
              <span className="text-xs">Server Priority</span>
            </Button>
            <Button
              variant={syncStatus.conflictResolution === 'merge' ? 'default' : 'outline'}
              onClick={() => resolveConflict('merge')}
              className="h-auto p-4 flex-col gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="text-xs">Smart Merge</span>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Current strategy: <strong className="capitalize">{syncStatus.conflictResolution}</strong>
            {syncStatus.conflictResolution === 'merge' && ' (Recommended)'}
          </p>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>
            Export and import your settings for backup or migration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportSettings} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <Button variant="outline" onClick={handleImportSettings} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Export creates a JSON file with all your settings. Import will replace current settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}