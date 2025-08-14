import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSettingsRealTimeSync } from '@/hooks/useSettingsRealTimeSync';
import { useSettingsIntegrations, useSettingsRecommendations } from '@/hooks/useSettingsIntegration';
import { SettingsRecommendationsCard } from '@/components/settings/SettingsRecommendationsCard';
import { SettingsAnalyticsCard } from '@/components/settings/SettingsAnalyticsCard';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export const SettingsIntegrationDashboard: React.FC = () => {
  const { 
    syncStatus, 
    triggerSync, 
    forceSync,
    isOnline, 
    isConnected, 
    hasPendingChanges, 
    hasConflicts 
  } = useSettingsRealTimeSync();

  const { data: integrations = [] } = useSettingsIntegrations();
  const { data: recommendations = [] } = useSettingsRecommendations();

  return (
    <div className="space-y-6">
      {/* Sync Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">Synchronization Status</CardTitle>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Last sync: {syncStatus.lastSyncAt?.toLocaleString() || 'Never'}
              </p>
              <div className="flex gap-2">
                {hasPendingChanges && (
                  <Badge variant="outline">
                    {syncStatus.pendingChanges} pending
                  </Badge>
                )}
                {hasConflicts && (
                  <Badge variant="destructive">
                    {syncStatus.conflictsCount} conflicts
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={triggerSync}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Sync Now
              </Button>
              {hasConflicts && (
                <Button variant="destructive" size="sm" onClick={() => forceSync('user_wins')}>
                  Force Sync
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Integrations</CardTitle>
          <CardDescription>
            Cross-platform settings synchronization and inheritance rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active integrations</p>
            ) : (
              integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{integration.source_setting_type} → {integration.target_setting_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {integration.integration_type} • Priority: {integration.priority}
                    </p>
                  </div>
                  <Badge variant={integration.is_active ? "default" : "secondary"}>
                    {integration.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Components */}
      <SettingsRecommendationsCard />
      <SettingsAnalyticsCard />
    </div>
  );
};