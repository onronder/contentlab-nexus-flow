export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  frameRate?: number;
  bitrate?: number;
  colorProfile?: string;
  exifData?: Record<string, any>;
  pageCount?: number;
  wordCount?: number;
  textContent?: string;
  fileHash: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface ProcessingResult {
  originalFile: File;
  optimizedFile?: Blob;
  metadata: FileMetadata;
  thumbnailGenerated: boolean;
}

export interface ImageProcessingResult extends ProcessingResult {
  metadata: FileMetadata & {
    width: number;
    height: number;
    colorProfile?: string;
    exifData?: Record<string, any>;
  };
}

export interface VideoProcessingResult extends ProcessingResult {
  metadata: FileMetadata & {
    duration: number;
    width: number;
    height: number;
    frameRate?: number;
    bitrate?: number;
  };
}

export interface DocumentProcessingResult extends ProcessingResult {
  metadata: FileMetadata & {
    pageCount?: number;
    wordCount?: number;
    textContent?: string;
  };
}

export interface PDFProcessingResult extends DocumentProcessingResult {
  metadata: FileMetadata & {
    pageCount: number;
  };
}

export class FileProcessingService {
  private static instance: FileProcessingService;

  public static getInstance(): FileProcessingService {
    if (!FileProcessingService.instance) {
      FileProcessingService.instance = new FileProcessingService();
    }
    return FileProcessingService.instance;
  }

  async processFile(file: File, contentType: string): Promise<ProcessingResult> {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return this.processImage(file);
    } else if (mimeType.startsWith('video/')) {
      return this.processVideo(file);
    } else if (mimeType === 'application/pdf') {
      return this.processPDF(file);
    } else {
      return this.processDocument(file);
    }
  }

  private async processImage(file: File): Promise<ImageProcessingResult> {
    const image = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      image.onload = async () => {
        try {
          const metadata: FileMetadata = {
            width: image.width,
            height: image.height,
            fileHash: await this.generateFileHash(file),
            createdAt: new Date(file.lastModified),
            modifiedAt: new Date(file.lastModified)
          };

          // Extract EXIF data if available
          try {
            const exifData = await this.extractImageExifData(file);
            metadata.exifData = exifData;
          } catch (error) {
            console.warn('Failed to extract EXIF data:', error);
          }

          // Optimize image if it's large
          let optimizedFile: Blob | undefined;
          const maxDimension = 2048;
          if (image.width > maxDimension || image.height > maxDimension) {
            optimizedFile = await this.optimizeImage(image, file.type);
          }

          resolve({
            originalFile: file,
            optimizedFile,
            metadata: metadata as ImageProcessingResult['metadata'],
            thumbnailGenerated: true
          });
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => reject(new Error('Failed to load image for processing'));
      image.src = URL.createObjectURL(file);
    });
  }

  private async processVideo(file: File): Promise<VideoProcessingResult> {
    const video = document.createElement('video');

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = async () => {
        try {
          const metadata: FileMetadata = {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            fileHash: await this.generateFileHash(file),
            createdAt: new Date(file.lastModified),
            modifiedAt: new Date(file.lastModified)
          };

          // Extract additional video metadata if available
          try {
            const videoMetadata = await this.extractVideoMetadata(video);
            Object.assign(metadata, videoMetadata);
          } catch (error) {
            console.warn('Failed to extract video metadata:', error);
          }

          resolve({
            originalFile: file,
            metadata: metadata as VideoProcessingResult['metadata'],
            thumbnailGenerated: true
          });
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error('Failed to load video for processing'));
      video.src = URL.createObjectURL(file);
      video.load();
    });
  }

  private async processPDF(file: File): Promise<PDFProcessingResult> {
    try {
      const metadata: FileMetadata = {
        fileHash: await this.generateFileHash(file),
        createdAt: new Date(file.lastModified),
        modifiedAt: new Date(file.lastModified),
        pageCount: 1 // Default, would need PDF.js for accurate count
      };

      // Extract PDF metadata if available
      try {
        const pdfMetadata = await this.extractPDFMetadata(file);
        Object.assign(metadata, pdfMetadata);
      } catch (error) {
        console.warn('Failed to extract PDF metadata:', error);
      }

      return {
        originalFile: file,
        metadata: metadata as PDFProcessingResult['metadata'],
        thumbnailGenerated: true
      };
    } catch (error) {
      throw new Error(`Failed to process PDF: ${error}`);
    }
  }

  private async processDocument(file: File): Promise<DocumentProcessingResult> {
    try {
      const metadata: FileMetadata = {
        fileHash: await this.generateFileHash(file),
        createdAt: new Date(file.lastModified),
        modifiedAt: new Date(file.lastModified)
      };

      // Extract text content if it's a text file
      if (file.type.startsWith('text/')) {
        try {
          const textContent = await this.extractTextContent(file);
          metadata.textContent = textContent.substring(0, 1000); // First 1000 chars
          metadata.wordCount = textContent.split(/\s+/).length;
        } catch (error) {
          console.warn('Failed to extract text content:', error);
        }
      }

      return {
        originalFile: file,
        metadata: metadata as DocumentProcessingResult['metadata'],
        thumbnailGenerated: true
      };
    } catch (error) {
      throw new Error(`Failed to process document: ${error}`);
    }
  }

  private async optimizeImage(image: HTMLImageElement, originalType: string): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const maxDimension = 2048;

    // Calculate new dimensions
    let { width, height } = image;
    const aspectRatio = width / height;

    if (width > height) {
      width = Math.min(width, maxDimension);
      height = width / aspectRatio;
    } else {
      height = Math.min(height, maxDimension);
      width = height * aspectRatio;
    }

    canvas.width = Math.round(width);
    canvas.height = Math.round(height);

    // Enable high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw optimized image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Convert to optimized format
    const outputFormat = originalType === 'image/png' ? 'image/png' : 'image/jpeg';
    const quality = outputFormat === 'image/jpeg' ? 0.9 : undefined;

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        outputFormat,
        quality
      );
    });
  }

  private async extractMetadata(file: File): Promise<FileMetadata> {
    return {
      fileHash: await this.generateFileHash(file),
      createdAt: new Date(file.lastModified),
      modifiedAt: new Date(file.lastModified)
    };
  }

  private async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async extractImageExifData(file: File): Promise<Record<string, any>> {
    // This is a placeholder for EXIF extraction
    // In a real implementation, you would use a library like exif-js or piexifjs
    return {};
  }

  private async extractVideoMetadata(video: HTMLVideoElement): Promise<Partial<FileMetadata>> {
    // This is a placeholder for advanced video metadata extraction
    // In a real implementation, you would use a library like ffmpeg.wasm
    return {};
  }

  private async extractPDFMetadata(file: File): Promise<Partial<FileMetadata>> {
    // This is a placeholder for PDF metadata extraction
    // In a real implementation, you would use a library like PDF.js
    return {
      pageCount: 1 // Default value
    };
  }

  private async extractTextContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }
}

export const fileProcessingService = FileProcessingService.getInstance();