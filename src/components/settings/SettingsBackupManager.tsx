import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Plus, 
  Calendar,
  FileText,
  HardDrive,
  Clock
} from 'lucide-react';
import { useSettingsBackup } from '@/hooks/useSettingsBackup';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export const SettingsBackupManager: React.FC = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [expiryDays, setExpiryDays] = useState<string>('30');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importData, setImportData] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const {
    backups,
    isLoading,
    createBackup,
    restoreBackup,
    deleteBackup,
    exportSettings,
    importSettings,
    isCreating,
    isRestoring,
    isDeleting,
    isExporting,
    isImporting
  } = useSettingsBackup();

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the backup.",
        variant: "destructive",
      });
      return;
    }

    try {
      const expiresAt = expiryDays ? 
        new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000) : 
        undefined;

      await createBackup(backupName.trim(), backupDescription.trim() || undefined, expiresAt);
      setCreateDialogOpen(false);
      setBackupName('');
      setBackupDescription('');
      setExpiryDays('30');
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  const handleImportSettings = async () => {
    if (!importData.trim()) {
      toast({
        title: "Data Required",
        description: "Please provide data to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      await importSettings(importData, importFormat);
      setImportDialogOpen(false);
      setImportData('');
    } catch (error) {
      console.error('Failed to import settings:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getBackupTypeColor = (type: string) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'automatic': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
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
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Backup
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Settings Backup</DialogTitle>
              <DialogDescription>
                Create a backup of all your current settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="backup-name">Backup Name</Label>
                <Input
                  id="backup-name"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="Enter backup name"
                />
              </div>
              <div>
                <Label htmlFor="backup-description">Description (Optional)</Label>
                <Textarea
                  id="backup-description"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder="Describe what this backup contains"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="expiry-days">Expires After (Days)</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Never</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBackup}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Backup'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={() => exportSettings('json')}
          disabled={isExporting}
        >
          {isExporting ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export JSON
        </Button>

        <Button
          variant="outline"
          onClick={() => exportSettings('csv')}
          disabled={isExporting}
        >
          {isExporting ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export CSV
        </Button>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Settings</DialogTitle>
              <DialogDescription>
                Import settings from a backup file or text
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Import Format</Label>
                <Select value={importFormat} onValueChange={(value: 'json' | 'csv') => setImportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Import Source</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={importFormat === 'json' ? '.json' : '.csv'}
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="import-data">Or Paste Data</Label>
                <Textarea
                  id="import-data"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder={`Paste ${importFormat.toUpperCase()} data here`}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportSettings}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Importing...
                    </>
                  ) : (
                    'Import Settings'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Settings Backups
          </CardTitle>
          <CardDescription>
            Manage your settings backups and restore points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{backup.backup_name}</h3>
                        <Badge className={getBackupTypeColor(backup.backup_type)}>
                          {backup.backup_type}
                        </Badge>
                      </div>
                      {backup.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {backup.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(backup.created_at), { addSuffix: true })}
                        </div>
                        {backup.file_size && (
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(backup.file_size)}
                          </div>
                        )}
                        {backup.expires_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {formatDistanceToNow(new Date(backup.expires_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Settings from Backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will restore all your settings from the backup "{backup.backup_name}".
                              Your current settings will be replaced. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => restoreBackup(backup.id)}
                              disabled={isRestoring}
                            >
                              {isRestoring ? (
                                <>
                                  <LoadingSpinner size="sm" className="mr-2" />
                                  Restoring...
                                </>
                              ) : (
                                'Restore Backup'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the backup "{backup.backup_name}".
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBackup(backup.id)}
                              disabled={isDeleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeleting ? (
                                <>
                                  <LoadingSpinner size="sm" className="mr-2" />
                                  Deleting...
                                </>
                              ) : (
                                'Delete Backup'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  
                  {backup.metadata && Object.keys(backup.metadata).length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Backup Details
                        </summary>
                        <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(backup.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
              
              {backups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No backups created yet</p>
                  <p className="text-sm">Create your first backup to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};