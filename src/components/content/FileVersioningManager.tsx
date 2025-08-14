import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  History, 
  Download, 
  RotateCcw as Restore,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Clock,
  User,
  ChevronRight,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { useAdvancedFileManagement } from '@/hooks/useAdvancedFileManagement';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileVersioningManagerProps {
  contentId: string;
  currentVersion?: {
    id: string;
    versionNumber: number;
    filePath: string;
    fileSize: number;
    createdAt: Date;
    createdBy: string;
    changesSummary?: string;
  };
}

export const FileVersioningManager = ({ contentId, currentVersion }: FileVersioningManagerProps) => {
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  
  const { 
    createVersion,
    isCreatingVersion 
  } = useAdvancedFileManagement();

  // Mock data for versions - replace with actual hook data
  const versions = [];
  const isLoadingVersions = false;

  

  const getFileIcon = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) {
      return <Video className="h-4 w-4" />;
    }
    if (['pdf', 'doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-4 w-4" />;
    }
    return <FileIcon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateVersion = async () => {
    if (!selectedFile || !changesSummary.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a file and provide a summary of changes.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createVersion({
        contentId,
        file: selectedFile,
        changesSummary: changesSummary.trim(),
        versionLabel: versionLabel.trim() || undefined
      } as any);

      toast({
        title: "Version Created",
        description: "New file version has been created successfully.",
      });

      setIsCreateVersionOpen(false);
      setSelectedFile(null);
      setVersionLabel('');
      setChangesSummary('');
    } catch (error) {
      toast({
        title: "Version Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create new version.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            File Versions
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage different versions of this file
          </p>
        </div>
        
        <Dialog open={isCreateVersionOpen} onOpenChange={setIsCreateVersionOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              New Version
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Version</DialogTitle>
              <DialogDescription>
                Upload a new version of this file with tracking information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="version-file">New File</Label>
                <Input
                  id="version-file"
                  type="file"
                  onChange={handleFileSelect}
                  accept="*/*"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="version-label">Version Label (Optional)</Label>
                <Input
                  id="version-label"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="e.g., v2.1, Final Draft, etc."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="changes-summary">Changes Summary *</Label>
                <Textarea
                  id="changes-summary"
                  value={changesSummary}
                  onChange={(e) => setChangesSummary(e.target.value)}
                  placeholder="Describe what changed in this version..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateVersionOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateVersion} 
                disabled={isCreatingVersion || !selectedFile || !changesSummary.trim()}
              >
                {isCreatingVersion ? 'Creating...' : 'Create Version'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Version */}
      {currentVersion && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge variant="default" className="bg-primary">Current</Badge>
                Version {currentVersion.versionNumber}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-background rounded">
                {getFileIcon(currentVersion.filePath)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {currentVersion.filePath.split('/').pop()}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(currentVersion.fileSize)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(currentVersion.createdAt, { addSuffix: true })}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {currentVersion.createdBy}
                  </span>
                </div>
                {currentVersion.changesSummary && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentVersion.changesSummary}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Version History</CardTitle>
          <CardDescription>
            Previous versions of this file
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingVersions ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-6">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No previous versions</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] w-full">
              <div className="space-y-3">
                {versions.map((version, index) => (
                  <div 
                    key={version.id} 
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 bg-background rounded">
                      {getFileIcon(version.filePath)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          Version {version.versionNumber}
                        </p>
                        {version.versionLabel && (
                          <Badge variant="outline" className="text-xs">
                            {version.versionLabel}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(version.fileSize)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.createdBy}
                        </span>
                      </div>
                      
                      {version.changesSummary && (
                        <p className="text-xs text-muted-foreground">
                          {version.changesSummary}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      {index > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Restore className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Version</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore this version? This will create a new version with the selected file as the current version.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction>
                                Restore Version
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};