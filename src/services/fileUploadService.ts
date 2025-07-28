import { supabase } from '@/integrations/supabase/client';
import { ContentType } from '@/types/content';

export interface UploadProgress {
  contentId: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  estimatedTimeRemaining?: number;
  uploadSpeed?: number; // bytes per second
}

export interface UploadResult {
  contentId: string;
  filePath: string;
  fileUrl: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  originalFilename: string;
}

export interface UploadParams {
  file: File;
  userId: string;
  projectId: string;
  contentType: string;
  title?: string;
  description?: string;
  onProgress?: (progress: UploadProgress) => void;
}

interface FileValidationConfig {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export class FileUploadService {
  private static instance: FileUploadService;
  private readonly STORAGE_BUCKET = 'content-files';
  private readonly THUMBNAIL_BUCKET = 'content-thumbnails';
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private activeUploads = new Map<string, AbortController>();

  private readonly FILE_TYPE_CONFIG: Record<ContentType, FileValidationConfig> = {
    image: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    },
    video: {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
      allowedExtensions: ['.mp4', '.webm', '.mov', '.avi']
    },
    document: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/markdown'
      ],
      allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md']
    },
    social: {
      maxSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm']
    },
    blog_post: {
      maxSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: [
        'text/html',
        'text/markdown',
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'image/png'
      ],
      allowedExtensions: ['.html', '.md', '.txt', '.pdf', '.jpg', '.jpeg', '.png']
    },
    presentation: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/pdf'
      ],
      allowedExtensions: ['.ppt', '.pptx', '.pdf']
    },
    infographic: {
      maxSize: 25 * 1024 * 1024, // 25MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf']
    },
    podcast: {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4'],
      allowedExtensions: ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
    },
    ebook: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook'],
      allowedExtensions: ['.pdf', '.epub', '.mobi']
    },
    whitepaper: {
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedExtensions: ['.pdf', '.doc', '.docx']
    }
  };

  // File type magic numbers for validation
  private readonly MAGIC_NUMBERS: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]]
  };

  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService();
    }
    return FileUploadService.instance;
  }

  async uploadFile(params: UploadParams): Promise<UploadResult> {
    const { file, userId, projectId, contentType, title, description, onProgress } = params;
    const contentId = crypto.randomUUID();
    const uploadId = `${contentId}-${Date.now()}`;
    
    try {
      // Validate file
      await this.validateFile(file, contentType as ContentType);
      
      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.activeUploads.set(uploadId, abortController);

      // Generate file path
      const sanitizedFilename = this.sanitizeFilename(file.name);
      const timestamp = Date.now();
      const filePath = this.generateFilePath(userId, contentId, `${timestamp}_${sanitizedFilename}`);

      // Initialize progress tracking
      const startTime = Date.now();
      let lastProgressTime = startTime;
      let lastProgressBytes = 0;

      const updateProgress = (progress: number, status: UploadProgress['status'] = 'uploading') => {
        const currentTime = Date.now();
        const timeElapsed = currentTime - lastProgressTime;
        const bytesUploaded = (progress / 100) * file.size;
        const bytesSinceLastUpdate = bytesUploaded - lastProgressBytes;
        
        let uploadSpeed = 0;
        let estimatedTimeRemaining = undefined;
        
        if (timeElapsed > 0 && bytesSinceLastUpdate > 0) {
          uploadSpeed = (bytesSinceLastUpdate / timeElapsed) * 1000; // bytes per second
          const remainingBytes = file.size - bytesUploaded;
          estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : undefined;
        }

        lastProgressTime = currentTime;
        lastProgressBytes = bytesUploaded;

        const progressData: UploadProgress = {
          contentId,
          filename: file.name,
          progress,
          status,
          uploadSpeed,
          estimatedTimeRemaining
        };

        onProgress?.(progressData);
      };

      updateProgress(0, 'uploading');

      // Upload main file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      updateProgress(50, 'processing');

      // Generate thumbnail for images
      let thumbnailPath: string | undefined;
      if (file.type.startsWith('image/') && !file.type.includes('svg')) {
        try {
          const thumbnailBlob = await this.generateImageThumbnail(file);
          const thumbnailFileName = `thumb_${timestamp}_${sanitizedFilename}`;
          const thumbnailFilePath = this.generateFilePath(userId, contentId, thumbnailFileName);
          
          const { error: thumbnailError } = await supabase.storage
            .from(this.THUMBNAIL_BUCKET)
            .upload(thumbnailFilePath, thumbnailBlob, {
              cacheControl: '3600',
              upsert: false
            });

          if (!thumbnailError) {
            thumbnailPath = thumbnailFilePath;
          }
        } catch (error) {
          console.warn('Failed to generate thumbnail:', error);
        }
      }

      updateProgress(90, 'processing');

      // Get file URL
      const { data: urlData } = supabase.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      updateProgress(100, 'completed');

      // Clean up
      this.activeUploads.delete(uploadId);

      return {
        contentId,
        filePath,
        fileUrl: urlData.publicUrl,
        thumbnailPath,
        fileSize: file.size,
        mimeType: file.type,
        originalFilename: file.name
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onProgress?.({
        contentId,
        filename: file.name,
        progress: 0,
        status: 'error',
        error: errorMessage
      });
      
      // Clean up
      this.activeUploads.delete(uploadId);
      throw error;
    }
  }

  async uploadMultipleFiles(
    files: File[],
    userId: string,
    projectId: string,
    contentType: string,
    onProgress?: (overallProgress: number, fileProgresses: UploadProgress[]) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const fileProgresses: UploadProgress[] = [];
    let completedFiles = 0;

    // Initialize progress tracking for all files
    files.forEach(file => {
      fileProgresses.push({
        contentId: crypto.randomUUID(),
        filename: file.name,
        progress: 0,
        status: 'uploading'
      });
    });

    // Upload files with concurrency control (max 3 concurrent uploads)
    const concurrencyLimit = 3;
    const uploadPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i += concurrencyLimit) {
      const batch = files.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;
        
        try {
          const result = await this.uploadFile({
            file,
            userId,
            projectId,
            contentType,
            onProgress: (progress) => {
              fileProgresses[fileIndex] = progress;
              const overallProgress = fileProgresses.reduce((sum, fp) => sum + fp.progress, 0) / files.length;
              onProgress?.(overallProgress, [...fileProgresses]);
            }
          });
          
          results[fileIndex] = result;
          completedFiles++;
          
        } catch (error) {
          fileProgresses[fileIndex].status = 'error';
          fileProgresses[fileIndex].error = error instanceof Error ? error.message : 'Upload failed';
          throw error;
        }
      });

      uploadPromises.push(...batchPromises);
      
      // Wait for current batch to complete before starting next batch
      await Promise.allSettled(batchPromises);
    }

    return results.filter(Boolean); // Remove any undefined results from failed uploads
  }

  async cancelUpload(uploadId: string): Promise<void> {
    const abortController = this.activeUploads.get(uploadId);
    if (abortController) {
      abortController.abort();
      this.activeUploads.delete(uploadId);
    }
  }

  private async validateFile(file: File, contentType: ContentType): Promise<void> {
    const config = this.FILE_TYPE_CONFIG[contentType];
    
    if (!config) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Check file size
    if (file.size > config.maxSize) {
      const maxSizeMB = Math.round(config.maxSize / 1024 / 1024);
      throw new Error(`File size too large. Maximum size for ${contentType} is ${maxSizeMB}MB`);
    }

    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed for ${contentType}`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!config.allowedExtensions.includes(extension)) {
      throw new Error(`File extension ${extension} is not allowed for ${contentType}`);
    }

    // Validate file magic numbers (first few bytes)
    await this.validateFileHeader(file);

    // Additional security checks
    await this.scanForMaliciousContent(file);
  }

  private async validateFileHeader(file: File): Promise<void> {
    const magicNumbers = this.MAGIC_NUMBERS[file.type];
    if (!magicNumbers) return; // Skip validation for types without magic numbers

    const arrayBuffer = await file.slice(0, 20).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const isValid = magicNumbers.some(magic => {
      return magic.every((byte, index) => bytes[index] === byte);
    });

    if (!isValid) {
      throw new Error(`File header does not match expected format for ${file.type}`);
    }
  }

  private async scanForMaliciousContent(file: File): Promise<void> {
    // Basic malicious file detection
    const maliciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.pif$/i,
      /\.com$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i
    ];

    const isMalicious = maliciousPatterns.some(pattern => pattern.test(file.name));
    if (isMalicious) {
      throw new Error('Potentially malicious file detected');
    }

    // Check for double extensions
    if ((file.name.match(/\./g) || []).length > 1) {
      const parts = file.name.split('.');
      if (parts.length > 2) {
        throw new Error('Files with multiple extensions are not allowed');
      }
    }
  }

  private generateFilePath(userId: string, contentId: string, filename: string): string {
    return `${userId}/${contentId}/${filename}`;
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    const sanitized = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 100); // Limit length

    // Ensure filename is not empty
    return sanitized || 'file';
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot).toLowerCase();
  }

  private async generateImageThumbnail(
    file: File, 
    maxWidth = 300, 
    maxHeight = 300, 
    quality = 0.7
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail generation'));
      img.src = URL.createObjectURL(file);
    });
  }

  // Utility method to get file type from MIME type
  static getContentTypeFromMime(mimeType: string): ContentType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text/')) return 'document';
    return 'document'; // Default fallback
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance();