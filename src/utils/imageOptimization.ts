// Image optimization utilities for ContentLab Nexus
// Provides WebP/AVIF conversion, compression, and responsive loading

import React, { useEffect, RefObject } from 'react';

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  width?: number;
  height?: number;
  lazy?: boolean;
}

interface ResponsiveImageSet {
  webp?: string;
  avif?: string;
  fallback: string;
  srcSet: string;
}

// Check browser support for modern image formats
export const getImageFormatSupport = (): {
  webp: boolean;
  avif: boolean;
} => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return {
    webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
    avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
  };
};

// Generate optimized image URL with format conversion
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string => {
  const {
    quality = 85,
    format = 'auto',
    width,
    height,
  } = options;
  
  // Skip optimization for external URLs or SVGs
  if (originalUrl.startsWith('http') || originalUrl.endsWith('.svg')) {
    return originalUrl;
  }
  
  const support = getImageFormatSupport();
  let targetFormat = format;
  
  if (format === 'auto') {
    if (support.avif) {
      targetFormat = 'avif';
    } else if (support.webp) {
      targetFormat = 'webp';
    } else {
      return originalUrl; // No optimization needed
    }
  }
  
  // In a real implementation, this would connect to an image optimization service
  // For now, we return the original URL with query parameters that could be used by a CDN
  const params = new URLSearchParams();
  params.set('format', targetFormat);
  params.set('quality', quality.toString());
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  
  return `${originalUrl}?${params.toString()}`;
};

// Generate responsive image srcSet for different screen densities
export const generateResponsiveImageSet = (
  baseUrl: string,
  widths: number[] = [480, 768, 1024, 1280, 1920],
  options: ImageOptimizationOptions = {}
): ResponsiveImageSet => {
  const support = getImageFormatSupport();
  
  const generateSrcSet = (format?: 'webp' | 'avif') => {
    return widths
      .map(width => {
        const url = getOptimizedImageUrl(baseUrl, { ...options, width, format });
        return `${url} ${width}w`;
      })
      .join(', ');
  };
  
  const result: ResponsiveImageSet = {
    fallback: baseUrl,
    srcSet: generateSrcSet(),
  };
  
  if (support.webp) {
    result.webp = generateSrcSet('webp');
  }
  
  if (support.avif) {
    result.avif = generateSrcSet('avif');
  }
  
  return result;
};

// Lazy loading intersection observer
class LazyImageLoader {
  private observer: IntersectionObserver;
  private images: Set<HTMLImageElement> = new Set();
  
  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer.unobserve(img);
            this.images.delete(img);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );
  }
  
  observe(img: HTMLImageElement) {
    this.images.add(img);
    this.observer.observe(img);
  }
  
  private loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    const srcSet = img.dataset.srcset;
    
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
    
    if (srcSet) {
      img.srcset = srcSet;
      img.removeAttribute('data-srcset');
    }
    
    img.classList.remove('lazy-loading');
    img.classList.add('lazy-loaded');
  }
  
  disconnect() {
    this.observer.disconnect();
    this.images.clear();
  }
}

// Global lazy loader instance
export const lazyLoader = new LazyImageLoader();

// Hook for lazy loading images in React
export const useLazyImage = (ref: RefObject<HTMLImageElement>) => {
  useEffect(() => {
    const img = ref.current;
    if (img) {
      lazyLoader.observe(img);
    }
    
    return () => {
      if (img) {
        // Observer cleanup is handled in the LazyImageLoader class
      }
    };
  }, [ref]);
};

// Preload critical images
export const preloadImage = (src: string, options: ImageOptimizationOptions = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    
    img.src = getOptimizedImageUrl(src, options);
  });
};

// Batch preload multiple images
export const preloadImages = async (
  sources: string[],
  options: ImageOptimizationOptions = {}
): Promise<void> => {
  const promises = sources.map(src => preloadImage(src, options));
  
  try {
    await Promise.all(promises);
    console.log(`[ImageOptimization] Preloaded ${sources.length} images`);
  } catch (error) {
    console.warn('[ImageOptimization] Some images failed to preload:', error);
  }
};

// Image compression utility (client-side)
export const compressImage = (
  file: File,
  options: { quality?: number; maxWidth?: number; maxHeight?: number } = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const {
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
    } = options;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not supported'));
      return;
    }
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Image dimension utility
export const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};