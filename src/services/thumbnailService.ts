import { supabase } from '@/integrations/supabase/client';

export interface ThumbnailResult {
  path: string;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface ThumbnailSet {
  small: ThumbnailResult;
  medium: ThumbnailResult;
  large: ThumbnailResult;
}

export interface ThumbnailSize {
  width: number;
  height: number;
  quality: number;
}

export class ThumbnailService {
  private static instance: ThumbnailService;
  private readonly THUMBNAIL_BUCKET = 'content-thumbnails';
  private readonly THUMBNAIL_SIZES: Record<string, ThumbnailSize> = {
    small: { width: 150, height: 150, quality: 0.8 },
    medium: { width: 300, height: 300, quality: 0.85 },
    large: { width: 600, height: 600, quality: 0.9 }
  };

  public static getInstance(): ThumbnailService {
    if (!ThumbnailService.instance) {
      ThumbnailService.instance = new ThumbnailService();
    }
    return ThumbnailService.instance;
  }

  async generateThumbnails(file: File, userId: string, contentId: string): Promise<ThumbnailSet> {
    const mimeType = file.type.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return this.generateImageThumbnails(file, userId, contentId);
    } else if (mimeType.startsWith('video/')) {
      return this.generateVideoThumbnails(file, userId, contentId);
    } else if (mimeType === 'application/pdf') {
      return this.generatePDFThumbnails(file, userId, contentId);
    } else {
      return this.generateDefaultThumbnails(file, userId, contentId);
    }
  }

  private async generateImageThumbnails(file: File, userId: string, contentId: string): Promise<ThumbnailSet> {
    const image = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      image.onload = async () => {
        try {
          const thumbnails: Partial<ThumbnailSet> = {};
          
          for (const [sizeKey, sizeConfig] of Object.entries(this.THUMBNAIL_SIZES)) {
            const dimensions = this.calculateThumbnailDimensions(
              image.width,
              image.height,
              sizeConfig.width,
              sizeConfig.height
            );

            canvas.width = dimensions.width;
            canvas.height = dimensions.height;

            // Enable high-quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Clear canvas and draw image
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

            // Apply sharpening filter for better quality
            this.applySharpeningFilter(ctx, dimensions.width, dimensions.height);

            const blob = await this.canvasToOptimizedBlob(canvas, sizeConfig.quality);
            const thumbnailPath = `${userId}/${contentId}/thumbnail_${sizeKey}.jpg`;

            const { error } = await supabase.storage
              .from(this.THUMBNAIL_BUCKET)
              .upload(thumbnailPath, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (error) throw error;

            const { data: urlData } = supabase.storage
              .from(this.THUMBNAIL_BUCKET)
              .getPublicUrl(thumbnailPath);

            thumbnails[sizeKey as keyof ThumbnailSet] = {
              path: thumbnailPath,
              url: urlData.publicUrl,
              width: dimensions.width,
              height: dimensions.height,
              size: blob.size,
              format: 'image/jpeg'
            };
          }

          resolve(thumbnails as ThumbnailSet);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => reject(new Error('Failed to load image for thumbnail generation'));
      image.src = URL.createObjectURL(file);
    });
  }

  private async generateVideoThumbnails(file: File, userId: string, contentId: string): Promise<ThumbnailSet> {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        // Seek to 10% of video duration for better frame
        video.currentTime = video.duration * 0.1;
      };

      video.onseeked = async () => {
        try {
          const thumbnails: Partial<ThumbnailSet> = {};

          for (const [sizeKey, sizeConfig] of Object.entries(this.THUMBNAIL_SIZES)) {
            const dimensions = this.calculateThumbnailDimensions(
              video.videoWidth,
              video.videoHeight,
              sizeConfig.width,
              sizeConfig.height
            );

            canvas.width = dimensions.width;
            canvas.height = dimensions.height;

            // Draw video frame
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, dimensions.width, dimensions.height);

            // Add play button overlay
            this.drawPlayButtonOverlay(ctx, dimensions.width, dimensions.height);

            const blob = await this.canvasToOptimizedBlob(canvas, sizeConfig.quality);
            const thumbnailPath = `${userId}/${contentId}/thumbnail_${sizeKey}.jpg`;

            const { error } = await supabase.storage
              .from(this.THUMBNAIL_BUCKET)
              .upload(thumbnailPath, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (error) throw error;

            const { data: urlData } = supabase.storage
              .from(this.THUMBNAIL_BUCKET)
              .getPublicUrl(thumbnailPath);

            thumbnails[sizeKey as keyof ThumbnailSet] = {
              path: thumbnailPath,
              url: urlData.publicUrl,
              width: dimensions.width,
              height: dimensions.height,
              size: blob.size,
              format: 'image/jpeg'
            };
          }

          resolve(thumbnails as ThumbnailSet);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error('Failed to load video for thumbnail generation'));
      video.src = URL.createObjectURL(file);
      video.load();
    });
  }

  private async generatePDFThumbnails(file: File, userId: string, contentId: string): Promise<ThumbnailSet> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const thumbnails: Partial<ThumbnailSet> = {};

    for (const [sizeKey, sizeConfig] of Object.entries(this.THUMBNAIL_SIZES)) {
      canvas.width = sizeConfig.width;
      canvas.height = sizeConfig.height;

      // Create PDF document icon
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Document outline
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // PDF icon
      ctx.fillStyle = '#dc2626';
      ctx.font = `bold ${Math.min(canvas.width * 0.15, 24)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('PDF', canvas.width / 2, canvas.height * 0.4);
      
      // Filename
      ctx.fillStyle = '#374151';
      ctx.font = `${Math.min(canvas.width * 0.08, 12)}px Arial`;
      const fileName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
      ctx.fillText(fileName, canvas.width / 2, canvas.height * 0.7);

      const blob = await this.canvasToOptimizedBlob(canvas, sizeConfig.quality);
      const thumbnailPath = `${userId}/${contentId}/thumbnail_${sizeKey}.jpg`;

      const { error } = await supabase.storage
        .from(this.THUMBNAIL_BUCKET)
        .upload(thumbnailPath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(this.THUMBNAIL_BUCKET)
        .getPublicUrl(thumbnailPath);

      thumbnails[sizeKey as keyof ThumbnailSet] = {
        path: thumbnailPath,
        url: urlData.publicUrl,
        width: canvas.width,
        height: canvas.height,
        size: blob.size,
        format: 'image/jpeg'
      };
    }

    return thumbnails as ThumbnailSet;
  }

  private async generateDefaultThumbnails(file: File, userId: string, contentId: string): Promise<ThumbnailSet> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const thumbnails: Partial<ThumbnailSet> = {};

    for (const [sizeKey, sizeConfig] of Object.entries(this.THUMBNAIL_SIZES)) {
      canvas.width = sizeConfig.width;
      canvas.height = sizeConfig.height;

      // Create generic file icon
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Background
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // File outline
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // File icon
      ctx.fillStyle = '#6b7280';
      ctx.font = `${Math.min(canvas.width * 0.3, 48)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('📄', canvas.width / 2, canvas.height * 0.5);
      
      // Filename
      ctx.fillStyle = '#374151';
      ctx.font = `${Math.min(canvas.width * 0.08, 12)}px Arial`;
      const fileName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
      ctx.fillText(fileName, canvas.width / 2, canvas.height * 0.8);

      const blob = await this.canvasToOptimizedBlob(canvas, sizeConfig.quality);
      const thumbnailPath = `${userId}/${contentId}/thumbnail_${sizeKey}.jpg`;

      const { error } = await supabase.storage
        .from(this.THUMBNAIL_BUCKET)
        .upload(thumbnailPath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(this.THUMBNAIL_BUCKET)
        .getPublicUrl(thumbnailPath);

      thumbnails[sizeKey as keyof ThumbnailSet] = {
        path: thumbnailPath,
        url: urlData.publicUrl,
        width: canvas.width,
        height: canvas.height,
        size: blob.size,
        format: 'image/jpeg'
      };
    }

    return thumbnails as ThumbnailSet;
  }

  private calculateThumbnailDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    let width: number;
    let height: number;

    if (aspectRatio > targetAspectRatio) {
      width = targetWidth;
      height = targetWidth / aspectRatio;
    } else {
      height = targetHeight;
      width = targetHeight * aspectRatio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  private async canvasToOptimizedBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        'image/jpeg',
        quality
      );
    });
  }

  private applySharpeningFilter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const sharpenKernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];

      const output = new Uint8ClampedArray(data);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) { // RGB channels only
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                const kernelIdx = (ky + 1) * 3 + (kx + 1);
                sum += data[idx] * sharpenKernel[kernelIdx];
              }
            }
            const outputIdx = (y * width + x) * 4 + c;
            output[outputIdx] = Math.max(0, Math.min(255, sum));
          }
        }
      }

      const outputImageData = new ImageData(output, width, height);
      ctx.putImageData(outputImageData, 0, 0);
    } catch (error) {
      // If sharpening fails, continue without it
      console.warn('Sharpening filter failed:', error);
    }
  }

  private drawPlayButtonOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.15;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Play triangle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const triangleSize = radius * 0.5;
    ctx.moveTo(centerX - triangleSize * 0.3, centerY - triangleSize);
    ctx.lineTo(centerX - triangleSize * 0.3, centerY + triangleSize);
    ctx.lineTo(centerX + triangleSize * 0.7, centerY);
    ctx.closePath();
    ctx.fill();
  }
}

export const thumbnailService = ThumbnailService.getInstance();