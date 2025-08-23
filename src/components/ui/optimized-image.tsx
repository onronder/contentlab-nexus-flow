import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { imageOptimizationService } from '@/services/imageOptimizationService';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  lazy?: boolean;
  blur?: boolean;
  responsive?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Phase 4: Optimized Image Component with lazy loading and WebP support
export const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    width,
    height,
    quality = 80,
    priority = false,
    lazy = true,
    blur = true,
    responsive = true,
    sizes,
    className,
    onLoad,
    onError,
    ...props
  }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [placeholder, setPlaceholder] = useState<string>('');
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      if (blur && !priority) {
        const blurPlaceholder = imageOptimizationService.generateBlurPlaceholder(
          width || 20,
          height || 10
        );
        setPlaceholder(blurPlaceholder);
      }
    }, [blur, priority, width, height]);

    useEffect(() => {
      const imgElement = ref ? (ref as React.RefObject<HTMLImageElement>).current : imgRef.current;
      if (!imgElement || !src) return;

      if (priority) {
        // Load immediately for priority images
        const optimizedSrc = imageOptimizationService.getOptimizedImageUrl(src, {
          width,
          height,
          quality,
        });
        
        imgElement.src = optimizedSrc;
        setIsLoaded(true);
      } else if (lazy) {
        // Use lazy loading
        const optimizedSrc = imageOptimizationService.getOptimizedImageUrl(src, {
          width,
          height,
          quality,
        });

        imageOptimizationService.lazyLoadImage(imgElement, optimizedSrc, {
          placeholder,
          onLoad: () => {
            setIsLoaded(true);
            onLoad?.();
          },
          onError: () => {
            setHasError(true);
            onError?.();
          },
          threshold: 0.1,
        });
      }
    }, [src, width, height, quality, priority, lazy, placeholder, onLoad, onError, ref]);

    const optimizedSrc = imageOptimizationService.getOptimizedImageUrl(src, {
      width,
      height,
      quality,
    });

    const srcSet = responsive
      ? imageOptimizationService.generateSrcSet(src)
      : undefined;

    return (
      <div className={cn('relative overflow-hidden', className)}>
        {/* Placeholder */}
        {!isLoaded && placeholder && (
          <img
            src={placeholder}
            alt=""
            className={cn(
              'absolute inset-0 w-full h-full object-cover filter blur-sm scale-110',
              'transition-opacity duration-300',
              isLoaded ? 'opacity-0' : 'opacity-100'
            )}
            aria-hidden="true"
          />
        )}

        {/* Skeleton loader */}
        {!isLoaded && !placeholder && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}

        {/* Main image */}
        <img
          ref={ref || imgRef}
          src={priority ? optimizedSrc : undefined}
          srcSet={responsive ? srcSet : undefined}
          sizes={sizes || (responsive ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw' : undefined)}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            hasError && 'hidden'
          )}
          onLoad={() => {
            if (priority) {
              setIsLoaded(true);
              onLoad?.();
            }
          }}
          onError={() => {
            if (priority) {
              setHasError(true);
              onError?.();
            }
          }}
          {...props}
        />

        {/* Error fallback */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <div className="text-sm">Failed to load image</div>
            </div>
          </div>
        )}

        {/* Loading indicator for priority images */}
        {priority && !isLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';