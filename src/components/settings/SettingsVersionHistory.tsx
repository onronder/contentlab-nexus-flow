import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { History, RotateCcw, Eye, Calendar, User, FileText } from 'lucide-react';
import { useSettingsVersioning, useSettingsHistory } from '@/hooks/useSettingsVersioning';
import { formatDistanceToNow } from 'date-fns';

interface SettingsVersionHistoryProps {
  settingType: string;
  entityId: string;
  currentData?: any;
}

export const SettingsVersionHistory: React.FC<SettingsVersionHistoryProps> = ({
  settingType,
  entityId,
  currentData
}) => {
  const [selectedVersion, setSelectedVersion] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  const {
    versions,
    isLoading: versionsLoading,
    restoreVersion,
    isRestoring
  } = useSettingsVersioning(settingType, entityId);

  const {
    data: auditLogs = [],
    isLoading: historyLoading
  } = useSettingsHistory(settingType, entityId);

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion(versionId);
      setSelectedVersion(null);
    } catch (error) {
      console.error('Failed to restore version:', error);
    }
  };

  const renderDataComparison = (oldData: any, newData: any) => {
    const changes: Array<{ path: string; old: any; new: any }> = [];
    
    const findChanges = (obj1: any, obj2: any, path = '') => {
      if (typeof obj1 !== typeof obj2) {
        changes.push({ path, old: obj1, new: obj2 });
        return;
      }
      
      if (typeof obj1 === 'object' && obj1 !== null) {
        const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
        allKeys.forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          if (!(key in obj1)) {
            changes.push({ path: newPath, old: undefined, new: obj2[key] });
          } else if (!(key in obj2)) {
            changes.push({ path: newPath, old: obj1[key], new: undefined });
          } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
            findChanges(obj1[key], obj2[key], newPath);
          }
        });
      } else if (obj1 !== obj2) {
        changes.push({ path, old: obj1, new: obj2 });
      }
    };

    findChanges(oldData, newData);
    return changes;
  };

  if (versionsLoading || historyLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            View and restore previous versions of your settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{version.version_number}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVersion(version)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Settings Version {version.version_number}
                            </DialogTitle>
                            <DialogDescription>
                              {version.change_summary || 'No description available'}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Created:</span>{' '}
                                {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                              </div>
                              <div>
                                <span className="font-medium">Version:</span> {version.version_number}
                              </div>
                            </div>
                            <Separator />
                            <div>
                              <h4 className="font-medium mb-2">Settings Data</h4>
                              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                                {JSON.stringify(version.settings_data, null, 2)}
                              </pre>
                            </div>
                            {currentData && index > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">Changes from Current</h4>
                                <div className="space-y-2">
                                  {renderDataComparison(currentData, version.settings_data).map((change, idx) => (
                                    <div key={idx} className="border rounded p-2 text-sm">
                                      <div className="font-medium">{change.path}</div>
                                      <div className="grid grid-cols-2 gap-2 mt-1">
                                        <div>
                                          <span className="text-destructive">Old:</span>{' '}
                                          {JSON.stringify(change.old)}
                                        </div>
                                        <div>
                                          <span className="text-primary">New:</span>{' '}
                                          {JSON.stringify(change.new)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {index > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Settings Version?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will restore your settings to version {version.version_number} and create a new version with the current settings as backup.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestore(version.id)}
                                disabled={isRestoring}
                              >
                                {isRestoring ? (
                                  <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Restoring...
                                  </>
                                ) : (
                                  'Restore Version'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </div>
                    {version.change_summary && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5" />
                        <span>{version.change_summary}</span>
                      </div>
                    )}
                    {version.changed_fields && version.changed_fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {version.changed_fields.map((field, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {versions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No version history available</p>
                  <p className="text-sm">Changes will appear here once you start modifying settings</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Detailed log of all settings changes and actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm capitalize">
                        {log.action.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {log.field_path && (
                      <div className="text-sm text-muted-foreground">
                        Field: <code className="bg-muted px-1 rounded">{log.field_path}</code>
                      </div>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {auditLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activity logged yet</p>
                  <p className="text-sm">Settings changes will be tracked here</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};