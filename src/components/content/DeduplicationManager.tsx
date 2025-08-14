import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Copy,
  Trash2,
  Eye,
  Image as ImageIcon,
  Video,
  FileText,
  File as FileIcon,
  HardDrive,
  Zap,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Merge
} from 'lucide-react';
import { useAdvancedFileManagement } from '@/hooks/useAdvancedFileManagement';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DeduplicationManagerProps {
  projectId: string;
}

interface DuplicateGroup {
  id: string;
  originalId: string;
  duplicateIds: string[];
  similarityScore: number;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  spaceSaved: number;
  status: 'pending' | 'processed' | 'merged';
  files: {
    id: string;
    title: string;
    filePath: string;
    createdAt: Date;
    fileSize: number;
    isOriginal: boolean;
  }[];
}

export const DeduplicationManager = ({ projectId }: DeduplicationManagerProps) => {
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  
  const { toast } = useToast();
  
  const { 
    mergeDuplicates,
    isMergingDuplicates 
  } = useAdvancedFileManagement();

  // Mock data for demonstration - replace with actual data from hook
  const duplicateGroups: DuplicateGroup[] = [
    {
      id: '1',
      originalId: 'content-1',
      duplicateIds: ['content-2', 'content-3'],
      similarityScore: 0.98,
      contentHash: 'abc123',
      fileSize: 2048576,
      mimeType: 'image/jpeg',
      spaceSaved: 4097152,
      status: 'pending',
      files: [
        {
          id: 'content-1',
          title: 'Marketing Banner Original',
          filePath: '/uploads/banner-original.jpg',
          createdAt: new Date('2024-01-15'),
          fileSize: 2048576,
          isOriginal: true
        },
        {
          id: 'content-2',
          title: 'Marketing Banner Copy',
          filePath: '/uploads/banner-copy.jpg',
          createdAt: new Date('2024-01-16'),
          fileSize: 2048576,
          isOriginal: false
        },
        {
          id: 'content-3',
          title: 'Banner Duplicate',
          filePath: '/uploads/banner-dup.jpg',
          createdAt: new Date('2024-01-17'),
          fileSize: 2048576,
          isOriginal: false
        }
      ]
    },
    {
      id: '2',
      originalId: 'content-4',
      duplicateIds: ['content-5'],
      similarityScore: 0.95,
      contentHash: 'def456',
      fileSize: 1048576,
      mimeType: 'application/pdf',
      spaceSaved: 1048576,
      status: 'pending',
      files: [
        {
          id: 'content-4',
          title: 'Product Spec Sheet',
          filePath: '/uploads/spec-original.pdf',
          createdAt: new Date('2024-01-10'),
          fileSize: 1048576,
          isOriginal: true
        },
        {
          id: 'content-5',
          title: 'Product Specifications',
          filePath: '/uploads/spec-duplicate.pdf',
          createdAt: new Date('2024-01-12'),
          fileSize: 1048576,
          isOriginal: false
        }
      ]
    }
  ];

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicateIds.length, 0);
  const totalSpaceSaved = duplicateGroups.reduce((sum, group) => sum + group.spaceSaved, 0);
  const processedGroups = duplicateGroups.filter(g => g.status === 'processed').length;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.95) return 'text-red-600';
    if (score >= 0.85) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const handleSelectGroup = (groupId: string, selected: boolean) => {
    const newSelected = new Set(selectedDuplicates);
    if (selected) {
      newSelected.add(groupId);
    } else {
      newSelected.delete(groupId);
    }
    setSelectedDuplicates(newSelected);
  };

  const handleMergeDuplicates = async () => {
    if (selectedDuplicates.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select duplicate groups to merge.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const selectedGroups = duplicateGroups.filter(g => selectedDuplicates.has(g.id));
      
      for (const group of selectedGroups) {
        await mergeDuplicates({
          originalId: group.originalId,
          duplicateIds: group.duplicateIds,
          deleteOriginals: true
        } as any);
      }

      toast({
        title: "Duplicates Merged",
        description: `Successfully merged ${selectedDuplicates.size} duplicate group(s).`,
      });

      setSelectedDuplicates(new Set());
    } catch (error) {
      toast({
        title: "Merge Failed",
        description: error instanceof Error ? error.message : "Failed to merge duplicates.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Copy className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDuplicates}</p>
                <p className="text-sm text-muted-foreground">Duplicates Found</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatFileSize(totalSpaceSaved)}</p>
                <p className="text-sm text-muted-foreground">Space Recoverable</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round((processedGroups / duplicateGroups.length) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Duplicate Groups</h3>
          <p className="text-sm text-muted-foreground">
            Review and merge duplicate files to save storage space
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedDuplicates(new Set())}
            disabled={selectedDuplicates.size === 0}
          >
            Clear Selection
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                disabled={selectedDuplicates.size === 0 || isProcessing}
                className="gap-2"
              >
                <Merge className="h-4 w-4" />
                Merge Selected ({selectedDuplicates.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Merge Duplicate Files</AlertDialogTitle>
                <AlertDialogDescription>
                  This will merge {selectedDuplicates.size} duplicate group(s). The original files will be kept and duplicates will be removed. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleMergeDuplicates}>
                  Merge Duplicates
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Duplicate Groups List */}
      <div className="space-y-4">
        {duplicateGroups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
              <p className="text-muted-foreground">
                Great! Your content library is clean and optimized.
              </p>
            </CardContent>
          </Card>
        ) : (
          duplicateGroups.map((group) => (
            <Card key={group.id} className={cn(
              "transition-all duration-200",
              selectedDuplicates.has(group.id) && "ring-2 ring-primary"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDuplicates.has(group.id)}
                      onCheckedChange={(checked) => handleSelectGroup(group.id, !!checked)}
                      className="mt-1"
                    />
                    <div className="flex items-center gap-2">
                      {getFileIcon(group.mimeType)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {group.duplicateIds.length + 1} Similar Files
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs", getSimilarityColor(group.similarityScore))}
                          >
                            {(group.similarityScore * 100).toFixed(1)}% similar
                          </Badge>
                          {group.status === 'processed' && (
                            <Badge variant="default" className="bg-green-500">
                              Processed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Can save {formatFileSize(group.spaceSaved)} of storage
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Duplicate Files Preview</DialogTitle>
                        <DialogDescription>
                          Review similar files before merging
                        </DialogDescription>
                      </DialogHeader>
                      
                      <ScrollArea className="h-[400px] w-full">
                        <div className="space-y-3">
                          {group.files.map((file) => (
                            <div 
                              key={file.id}
                              className={cn(
                                "flex items-center gap-3 p-3 border rounded-lg",
                                file.isOriginal && "bg-green-50 border-green-200"
                              )}
                            >
                              <div className="p-2 bg-background rounded">
                                {getFileIcon(group.mimeType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium truncate">{file.title}</p>
                                  {file.isOriginal && (
                                    <Badge variant="default" className="text-xs bg-green-500">
                                      Original
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {file.filePath} • {formatFileSize(file.fileSize)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Created {file.createdAt.toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!file.isOriginal && (
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {group.files.slice(0, 3).map((file) => (
                    <div 
                      key={file.id}
                      className={cn(
                        "p-3 border rounded-lg",
                        file.isOriginal && "bg-green-50 border-green-200"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium truncate">{file.title}</p>
                        {file.isOriginal && (
                          <Badge variant="outline" className="text-xs">
                            Original
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)} • {file.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
                
                {group.files.length > 3 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    +{group.files.length - 3} more files...
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};