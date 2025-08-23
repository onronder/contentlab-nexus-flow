// Phase 4: Image & Media Optimization Service
export class ImageOptimizationService {
  private static instance: ImageOptimizationService;
  private loadedImages: Set<string> = new Set();
  private preloadQueue: string[] = [];
  private isWebPSupported: boolean | null = null;

  static getInstance(): ImageOptimizationService {
    if (!ImageOptimizationService.instance) {
      ImageOptimizationService.instance = new ImageOptimizationService();
    }
    return ImageOptimizationService.instance;
  }

  constructor() {
    this.checkWebPSupport();
  }

  // Check WebP support
  private async checkWebPSupport(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      this.isWebPSupported = dataURL.indexOf('data:image/webp') === 0;
    } catch {
      this.isWebPSupported = false;
    }
  }

  // Get optimized image URL with format and size parameters
  getOptimizedImageUrl(
    originalUrl: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpeg' | 'png';
      fit?: 'cover' | 'contain' | 'fill';
    }
  ): string {
    if (!originalUrl) return '';

    // If it's a Supabase storage URL, add transformation parameters
    if (originalUrl.includes('supabase.co/storage/v1/object/public/')) {
      const url = new URL(originalUrl);
      const params = new URLSearchParams();

      // Use WebP if supported and not explicitly set to another format
      const format = options?.format || (this.isWebPSupported ? 'webp' : 'jpeg');
      
      if (options?.width) params.set('width', options.width.toString());
      if (options?.height) params.set('height', options.height.toString());
      if (options?.quality) params.set('quality', options.quality.toString());
      if (format) params.set('format', format);
      if (options?.fit) params.set('fit', options.fit);

      if (params.toString()) {
        url.searchParams.set('transform', params.toString());
      }

      return url.toString();
    }

    return originalUrl;
  }

  // Progressive image loading with intersection observer
  lazyLoadImage(
    img: HTMLImageElement,
    src: string,
    options?: {
      placeholder?: string;
      onLoad?: () => void;
      onError?: () => void;
      threshold?: number;
    }
  ): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback for environments without IntersectionObserver
      img.src = src;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLImageElement;
            
            // Preload the image
            const tempImg = new Image();
            tempImg.onload = () => {
              target.src = src;
              target.classList.add('loaded');
              options?.onLoad?.();
              this.loadedImages.add(src);
            };
            tempImg.onerror = () => {
              options?.onError?.();
            };
            tempImg.src = src;

            observer.unobserve(target);
          }
        });
      },
      { threshold: options?.threshold || 0.1 }
    );

    // Set placeholder if provided
    if (options?.placeholder) {
      img.src = options.placeholder;
    }

    observer.observe(img);
  }

  // Generate responsive image srcset
  generateSrcSet(
    baseUrl: string,
    sizes: number[] = [320, 640, 768, 1024, 1280, 1536]
  ): string {
    return sizes
      .map(size => {
        const url = this.getOptimizedImageUrl(baseUrl, { width: size });
        return `${url} ${size}w`;
      })
      .join(', ');
  }

  // Generate blur placeholder
  generateBlurPlaceholder(width: number = 20, height: number = 10): string {
    if (typeof window === 'undefined') return '';

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    // Create a simple gradient placeholder
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'hsl(var(--muted))');
    gradient.addColorStop(1, 'hsl(var(--muted-foreground))');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas.toDataURL();
  }

  // Preload critical images
  preloadImages(urls: string[]): void {
    urls.forEach(url => {
      if (!this.loadedImages.has(url) && !this.preloadQueue.includes(url)) {
        this.preloadQueue.push(url);
        
        const img = new Image();
        img.onload = () => {
          this.loadedImages.add(url);
          this.preloadQueue = this.preloadQueue.filter(u => u !== url);
        };
        img.onerror = () => {
          this.preloadQueue = this.preloadQueue.filter(u => u !== url);
        };
        img.src = url;
      }
    });
  }

  // Get image dimensions efficiently
  async getImageDimensions(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Compress image on client side
  async compressImage(
    file: File,
    options?: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: string;
    }
  ): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options || {};
        
        let { width, height } = img;

        // Calculate new dimensions
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
              const compressedFile = new File([blob], file.name, {
                type: options?.format || file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          options?.format || file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Get cache statistics
  getCacheStats() {
    return {
      loadedImages: this.loadedImages.size,
      preloadQueue: this.preloadQueue.length,
      webpSupported: this.isWebPSupported
    };
  }

  // Clear cache
  clearCache(): void {
    this.loadedImages.clear();
    this.preloadQueue = [];
  }
}

export const imageOptimizationService = ImageOptimizationService.getInstance();