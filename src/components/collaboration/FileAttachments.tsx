import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Paperclip, X, Upload, File, Image, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  preview?: string;
  uploadProgress?: number;
  uploadStatus?: 'uploading' | 'completed' | 'error';
  storagePath?: string;
  messageId?: string;
}

interface FileAttachmentsProps {
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  messageId?: string;
  teamId?: string;
  onUploadComplete?: (attachment: FileAttachment) => void;
  enableRealTimeSync?: boolean;
}

export const FileAttachments: React.FC<FileAttachmentsProps> = (props) => {
  const { 
    attachments, 
    onAttachmentsChange,
    maxFiles = 5,
    maxSize = 10,
    allowedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx', '.xls', '.xlsx'],
    messageId,
    teamId,
    onUploadComplete,
    enableRealTimeSync = false
  } = props;
  
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadToSupabase = useCallback(async (file: File): Promise<FileAttachment> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `team-files/${teamId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('team-attachments')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('team-attachments')
      .getPublicUrl(filePath);

    // Create attachment record
    const attachment: FileAttachment = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      url: publicUrl,
      storagePath: filePath,
      messageId,
      uploadStatus: 'completed'
    };

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      attachment.preview = publicUrl;
    }

    // Save to database if needed
    if (messageId && teamId) {
      await supabase
        .from('file_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          file_path: filePath,
          team_id: teamId,
          uploaded_by: user?.id || ''
        });
    }

    return attachment;
  }, [teamId, messageId, user]);

  const handleFileSelect = async (files: FileList) => {
    if (attachments.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const newAttachments: FileAttachment[] = [...attachments];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds ${maxSize}MB limit`,
          variant: "destructive"
        });
        continue;
      }

      // Check file type
      const isAllowed = allowedTypes.some(type => {
        if (type.includes('*')) {
          return file.type.startsWith(type.replace('*', ''));
        }
        return file.name.toLowerCase().endsWith(type) || file.type === type;
      });

      if (!isAllowed) {
        toast({
          title: "File type not allowed",
          description: `${file.name} file type is not supported`,
          variant: "destructive"
        });
        continue;
      }

      try {
        // Create temporary attachment with uploading status
        const tempAttachment: FileAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          uploadProgress: 0,
          uploadStatus: 'uploading'
        };

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          tempAttachment.preview = tempAttachment.url;
        }

        newAttachments.push(tempAttachment);
        onAttachmentsChange([...newAttachments]);

        // Upload to Supabase if storage integration is enabled
        if (enableRealTimeSync && teamId) {
          const uploadedAttachment = await uploadToSupabase(file);
          
          // Update the attachment in the list
          const updatedAttachments = newAttachments.map(a => 
            a.id === tempAttachment.id ? uploadedAttachment : a
          );
          onAttachmentsChange(updatedAttachments);
          onUploadComplete?.(uploadedAttachment);
        } else {
          // Mark as completed for local-only mode
          tempAttachment.uploadStatus = 'completed';
          tempAttachment.uploadProgress = 100;
        }

      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });

        // Mark attachment as error
        const errorAttachment = newAttachments.find(a => a.name === file.name);
        if (errorAttachment) {
          errorAttachment.uploadStatus = 'error';
        }
      }
    }

    setIsUploading(false);
  };

  const removeAttachment = async (id: string) => {
    const attachment = attachments.find(a => a.id === id);
    
    if (attachment) {
      // Clean up blob URL
      if (attachment.url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.url);
      }
      
      // Remove from Supabase storage if it was uploaded
      if (attachment.storagePath && enableRealTimeSync) {
        try {
          await supabase.storage
            .from('team-attachments')
            .remove([attachment.storagePath]);
            
          // Remove from database
          if (attachment.messageId) {
            await supabase
              .from('file_attachments')
              .delete()
              .eq('message_id', attachment.messageId)
              .eq('file_url', attachment.url);
          }
        } catch (error) {
          console.error('Error removing file:', error);
        }
      }
    }
    
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  return (
    <div className="space-y-3">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or click to select
          </p>
          <Label htmlFor="file-upload">
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Paperclip className="h-4 w-4 mr-2" />
              Select Files
            </Button>
          </Label>
          <Input
            id="file-upload"
            type="file"
            multiple
            className="hidden"
            accept={allowedTypes.join(',')}
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
                e.target.value = '';
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Max {maxFiles} files, {maxSize}MB each
          </p>
        </div>
      </div>

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Attached Files ({attachments.length})</Label>
          <div className="grid gap-2">
            {attachments.map((attachment) => {
              const IconComponent = getFileIcon(attachment.type);
              
              return (
                <Card key={attachment.id} className="relative">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {attachment.preview ? (
                        <img
                          src={attachment.preview}
                          alt={attachment.name}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      
                       <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.size)}
                          </p>
                          {attachment.uploadStatus === 'uploading' && (
                            <div className="flex items-center gap-1">
                              <Progress value={attachment.uploadProgress || 0} className="w-16 h-1" />
                              <span className="text-xs text-muted-foreground">
                                {attachment.uploadProgress || 0}%
                              </span>
                            </div>
                          )}
                          {attachment.uploadStatus === 'completed' && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                          {attachment.uploadStatus === 'error' && (
                            <AlertCircle className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => removeAttachment(attachment.id)}
                        disabled={attachment.uploadStatus === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};