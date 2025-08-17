import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Image as ImageIcon, Video, File as FileIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useCreateContent } from '@/hooks/useContentMutations';
import { useContentCategories } from '@/hooks/useContentQueries';
import { ContentType, ContentStatus } from '@/types/content';
import { FileUploadService } from '@/services/fileUploadService';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface FileWithMetadata extends File {
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress?: number;
}

export const FileUploadDialog = ({ open, onOpenChange, projectId }: FileUploadDialogProps) => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { toast } = useToast();

  const { uploadFiles, isUploading, uploadProgress, validateFiles, cancelUpload } = useFileUpload({
    onSuccess: (uploadResults) => {
      // Create content items for uploaded files with auto-processing
      uploadResults.forEach(result => {
        createContent.mutate({
          title: title || result.originalFilename,
          description,
          content_type: (contentType || FileUploadService.getContentTypeFromMime(result.mimeType)) as ContentType,
          project_id: projectId,
          file_path: result.filePath,
          thumbnail_path: result.thumbnailSet?.medium?.path,
          file_size: result.fileSize,
          mime_type: result.mimeType,
          category_id: categoryId || undefined,
          status: 'draft' as ContentStatus,
          
        });
      });
      
      toast({
        title: "Upload successful",
        description: `${uploadResults.length} file(s) uploaded and processing started`,
      });
      
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Upload failed", 
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const createContent = useCreateContent();
  const { data: categories } = useContentCategories();


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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const { valid, errors } = validateFiles(newFiles, contentType || 'document');
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast({
        title: "File validation failed",
        description: `${errors.length} file(s) failed validation`,
        variant: "destructive",
      });
      return;
    }

    const filesWithMetadata: FileWithMetadata[] = valid.map(file => ({
      ...file,
      id: `${Date.now()}-${Math.random()}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...filesWithMetadata]);
    setValidationErrors([]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleUpload = () => {
    if (files.length === 0) return;

    // Update file status to uploading
    setFiles(prev => prev.map(file => ({ ...file, status: 'uploading' as const })));

    uploadFiles({
      files: files.map(f => new File([f], f.name, { type: f.type })),
      projectId,
      contentType: contentType || FileUploadService.getContentTypeFromMime(files[0].type)
    });
  };

  const handleCancelUpload = () => {
    if (isUploading && cancelUpload) {
      cancelUpload('user-cancelled');
      setFiles(prev => prev.map(file => ({ 
        ...file, 
        status: file.status === 'uploading' ? 'pending' : file.status 
      })));
    }
  };

  const handleClose = () => {
    if (isUploading) {
      const confirm = window.confirm('Upload in progress. Are you sure you want to cancel?');
      if (!confirm) return;
      handleCancelUpload();
    }

    // Clean up preview URLs
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setFiles([]);
    setTitle('');
    setDescription('');
    setContentType('');
    setCategoryId('');
    setTags([]);
    setTagInput('');
    setValidationErrors([]);
    onOpenChange(false);
  };

  // Update file progress based on upload progress
  useEffect(() => {
    if (uploadProgress.size > 0) {
      setFiles(prev => prev.map(file => {
        const progress = uploadProgress.get(file.name);
        if (progress) {
          return {
            ...file,
            progress: progress.progress,
            status: progress.progress === 100 ? 'success' : 'uploading'
          };
        }
        return file;
      }));
    }
  }, [uploadProgress]);

  const totalProgress = Array.from(uploadProgress.values()).reduce((sum, progress) => sum + Math.max(0, progress.progress), 0) / Math.max(1, uploadProgress.size);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Content</DialogTitle>
          <DialogDescription>
            Upload files and add them to your content library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Drag and drop files here</h3>
            <p className="text-muted-foreground mb-4">Or click to browse and select files</p>
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isUploading}
            >
              Browse Files
            </Button>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Validation Errors</span>
                </div>
                <ul className="text-xs text-destructive space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files ({files.length})</Label>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {file.preview ? (
                      <img src={file.preview} alt={file.name} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        {file.status === 'success' && <CheckCircle className="h-4 w-4 text-success" />}
                        {file.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {file.status === 'uploading' && file.progress !== undefined && (
                        <Progress value={file.progress} className="w-full h-1 mt-1" />
                      )}
                      {file.error && (
                        <p className="text-xs text-destructive mt-1">{file.error}</p>
                      )}
                    </div>
                    {!isUploading && (
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
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Label>Upload Progress</Label>
              <Progress value={totalProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Uploading {files.length} file(s)... {Math.round(totalProgress)}%
              </p>
            </div>
          )}

          {/* Content Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title..."
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="blog-post">Blog Post</SelectItem>
                  <SelectItem value="social-media">Social Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this content..."
              disabled={isUploading}
            />
          </div>

          {categories && categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                disabled={isUploading}
              />
              <Button onClick={addTag} variant="outline" disabled={isUploading}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    {!isUploading && (
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)} 
                      />
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {isUploading ? 'Cancel Upload' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || isUploading}
            className="gradient-primary"
          >
            {isUploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};