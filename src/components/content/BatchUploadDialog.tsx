import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FolderPlus, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  File as FileIcon,
  Settings,
  Zap,
  Search,
  Copy,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { useAdvancedFileManagement } from '@/hooks/useAdvancedFileManagement';
import { BatchProcessingOptions } from '@/services/advancedFileProcessingService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BatchUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface FileWithMetadata extends File {
  id: string;
  path?: string;
  relativePath?: string;
  folder?: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  progress?: number;
}

interface FolderStructure {
  [key: string]: {
    type: 'file' | 'folder';
    children?: FolderStructure;
    file?: FileWithMetadata;
  };
}

export const BatchUploadDialog = ({ open, onOpenChange, projectId }: BatchUploadDialogProps) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({});
  const [dragActive, setDragActive] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [preserveFolders, setPreserveFolders] = useState(true);
  const [processingOptions, setProcessingOptions] = useState<BatchProcessingOptions>({
    concurrency: 3,
    enableDeduplication: true,
    enableAIAnalysis: false,
    optimizationLevel: 'standard',
    generateVariants: false
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const {
    batchUpload,
    isBatchUploading,
    batchProgress,
    cancelBatchUpload,
    resetBatchProgress
  } = useAdvancedFileManagement();

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const filesWithMetadata: FileWithMetadata[] = newFiles.map(file => {
      const webkitPath = (file as any).webkitRelativePath || file.name;
      const pathParts = webkitPath.split('/');
      const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      
      return {
        ...file,
        id: `${Date.now()}-${Math.random()}`,
        path: webkitPath,
        relativePath: webkitPath,
        folder,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'pending' as const,
        progress: 0
      };
    });

    setFiles(prev => [...prev, ...filesWithMetadata]);

    if (preserveFolders) {
      const structure = buildFolderStructure(filesWithMetadata);
      setFolderStructure(structure);
    }
  }, [preserveFolders]);

  const buildFolderStructure = (files: FileWithMetadata[]): FolderStructure => {
    const structure: FolderStructure = {};
    
    files.forEach(file => {
      const pathParts = (file.relativePath || file.name).split('/');
      let current = structure;
      
      pathParts.forEach((part, index) => {
        if (index === pathParts.length - 1) {
          // This is the file
          current[part] = {
            type: 'file',
            file
          };
        } else {
          // This is a folder
          if (!current[part]) {
            current[part] = {
              type: 'folder',
              children: {}
            };
          }
          current = current[part].children!;
        }
      });
    });
    
    return structure;
  };

  const renderFolderStructure = (structure: FolderStructure, depth: number = 0): React.ReactNode => {
    return Object.entries(structure).map(([name, item]) => (
      <div key={name} className={cn("py-1", depth > 0 && "ml-4")}>
        {item.type === 'folder' ? (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FolderPlus className="h-4 w-4" />
              {name}
            </div>
            {item.children && renderFolderStructure(item.children, depth + 1)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            {getFileIcon(item.file?.type || '')}
            <span className="truncate">{name}</span>
            <span className="text-xs text-muted-foreground">
              {item.file ? ((item.file.size / 1024 / 1024).toFixed(2) + ' MB') : ''}
            </span>
          </div>
        )}
      </div>
    ));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      const newFiles = prev.filter(f => f.id !== fileId);
      
      if (preserveFolders) {
        const structure = buildFolderStructure(newFiles);
        setFolderStructure(structure);
      }
      
      return newFiles;
    });
  };

  const startBatchUpload = () => {
    if (files.length === 0) return;

    batchUpload({
      files: files.map(f => new File([f], f.name, { type: f.type })),
      projectId,
      options: processingOptions
    });
  };

  const handleClose = () => {
    if (isBatchUploading) {
      const confirm = window.confirm('Upload in progress. Are you sure you want to cancel?');
      if (!confirm) return;
      cancelBatchUpload();
    }

    // Clean up preview URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setFiles([]);
    setFolderStructure({});
    setBatchName('');
    setPreserveFolders(true);
    setShowAdvancedOptions(false);
    resetBatchProgress();
    onOpenChange(false);
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Batch Upload
          </DialogTitle>
          <DialogDescription>
            Upload multiple files and folders with advanced processing options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isBatchUploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Drag and drop files or folders here
            </h3>
            <p className="text-muted-foreground mb-4">
              Support for bulk uploads with folder structure preservation
            </p>
            
            <div className="flex gap-2 justify-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
                disabled={isBatchUploading}
              />
              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: '', directory: '' } as any)}
                onChange={handleFolderInput}
                className="hidden"
                disabled={isBatchUploading}
              />
              
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isBatchUploading}
              >
                Browse Files
              </Button>
              <Button 
                variant="outline" 
                onClick={() => folderInputRef.current?.click()}
                disabled={isBatchUploading}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Browse Folders
              </Button>
            </div>
          </div>

          {/* Batch Configuration */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Batch Configuration</h4>
                <Badge variant="secondary">
                  {files.length} files • {totalSizeMB} MB
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-name">Batch Name (optional)</Label>
                  <Input
                    id="batch-name"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Enter batch name..."
                    disabled={isBatchUploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Processing Options</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={preserveFolders}
                      onCheckedChange={setPreserveFolders}
                      disabled={isBatchUploading}
                    />
                    <span className="text-sm">Preserve folder structure</span>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="h-8 px-2"
                  disabled={isBatchUploading}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Options
                </Button>

                {showAdvancedOptions && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Concurrency Level</Label>
                        <Select
                          value={processingOptions.concurrency?.toString()}
                          onValueChange={(value) => 
                            setProcessingOptions(prev => ({ 
                              ...prev, 
                              concurrency: parseInt(value) 
                            }))
                          }
                          disabled={isBatchUploading}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 (Slow)</SelectItem>
                            <SelectItem value="3">3 (Standard)</SelectItem>
                            <SelectItem value="5">5 (Fast)</SelectItem>
                            <SelectItem value="10">10 (Very Fast)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Optimization Level</Label>
                        <Select
                          value={processingOptions.optimizationLevel}
                          onValueChange={(value: any) => 
                            setProcessingOptions(prev => ({ 
                              ...prev, 
                              optimizationLevel: value 
                            }))
                          }
                          disabled={isBatchUploading}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={processingOptions.enableDeduplication}
                          onCheckedChange={(checked) => 
                            setProcessingOptions(prev => ({ 
                              ...prev, 
                              enableDeduplication: checked 
                            }))
                          }
                          disabled={isBatchUploading}
                        />
                        <div className="flex items-center gap-2">
                          <Copy className="h-4 w-4" />
                          <span className="text-sm">Enable deduplication</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={processingOptions.enableAIAnalysis}
                          onCheckedChange={(checked) => 
                            setProcessingOptions(prev => ({ 
                              ...prev, 
                              enableAIAnalysis: checked 
                            }))
                          }
                          disabled={isBatchUploading}
                        />
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          <span className="text-sm">AI analysis & tagging</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={processingOptions.generateVariants}
                          onCheckedChange={(checked) => 
                            setProcessingOptions(prev => ({ 
                              ...prev, 
                              generateVariants: checked 
                            }))
                          }
                          disabled={isBatchUploading}
                        />
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          <span className="text-sm">Generate variants</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {batchProgress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Upload Progress</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {batchProgress.processedFiles}/{batchProgress.totalFiles}
                  </Badge>
                  {batchProgress.status === 'processing' ? (
                    <Play className="h-4 w-4 text-success" />
                  ) : (
                    <Pause className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
              <Progress value={batchProgress.overallProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {batchProgress.status === 'processing' 
                  ? `Processing files... ${Math.round(batchProgress.overallProgress)}%`
                  : `Upload ${batchProgress.status}`
                }
              </p>
            </div>
          )}

          {/* File List or Folder Structure */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {preserveFolders ? 'Folder Structure' : 'Selected Files'}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isBatchUploading}
                >
                  Clear All
                </Button>
              </div>

              <ScrollArea className="max-h-64 border rounded-lg p-3">
                {preserveFolders && Object.keys(folderStructure).length > 0 ? (
                  renderFolderStructure(folderStructure)
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-2 border rounded">
                        {file.preview ? (
                          <img src={file.preview} alt={file.name} className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                            {getFileIcon(file.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        {!isBatchUploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={isBatchUploading}
          >
            {isBatchUploading ? 'Cancel Upload' : 'Cancel'}
          </Button>
          <Button 
            onClick={startBatchUpload} 
            disabled={files.length === 0 || isBatchUploading}
            className="gradient-primary"
          >
            {isBatchUploading 
              ? 'Processing...' 
              : `Upload ${files.length} file${files.length === 1 ? '' : 's'}`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};