// Performance optimization utilities for ContentLab Nexus
// Implements advanced performance monitoring, optimization strategies, and metrics collection

import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  ttfb: number; // Time to First Byte
  tti: number; // Time to Interactive
}

interface BundleMetrics {
  initialBundle: number;
  totalBundle: number;
  chunkCount: number;
  compressionRatio: number;
}

interface MemoryMetrics {
  used: number;
  total: number;
  limit: number;
  heapUsed: number;
}

// Performance monitoring class
class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private startTime: number;
  
  constructor() {
    this.startTime = performance.now();
    this.initializeObservers();
    this.registerServiceWorker();
  }
  
  private initializeObservers() {
    // Core Web Vitals Observer
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.startTime;
          this.reportMetric('lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
        
        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
            this.reportMetric('fid', this.metrics.fid);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
        
        // Cumulative Layout Shift
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cls = clsValue;
              this.reportMetric('cls', clsValue);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
        
        // Navigation timing
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.ttfb = entry.responseStart - entry.requestStart;
            this.metrics.fcp = entry.firstContentfulPaint;
            this.reportMetric('ttfb', this.metrics.ttfb);
            this.reportMetric('fcp', this.metrics.fcp);
          });
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
        
      } catch (error) {
        console.warn('[Performance] Observer initialization failed:', error);
      }
    }
  }
  
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator && 'production' === import.meta.env.MODE) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[Performance] Service Worker registered:', registration);
        
        // Update service worker when new version is available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is available
                this.notifyUpdate();
              }
            });
          }
        });
      } catch (error) {
        console.warn('[Performance] Service Worker registration failed:', error);
      }
    }
  }
  
  private notifyUpdate() {
    if (window.confirm('A new version is available. Would you like to refresh?')) {
      window.location.reload();
    }
  }
  
  private reportMetric(name: string, value: number) {
    // Report to analytics service
    if ('gtag' in window && typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'web_vitals', {
        name,
        value: Math.round(value),
        metric_id: `${name}_${Date.now()}`,
      });
    }
    
    // Log in development
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name.toUpperCase()}: ${Math.round(value)}ms`);
    }
  }
  
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }
  
  getBundleMetrics(): BundleMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    const resources = performance.getEntriesByType('resource');
    
    const jsResources = resources.filter((r: any) => 
      r.name.includes('.js') && !r.name.includes('node_modules')
    );
    
    const totalSize = jsResources.reduce((acc: number, r: any) => 
      acc + (r.transferSize || r.encodedBodySize || 0), 0
    );
    
    return {
      initialBundle: navigation?.transferSize || 0,
      totalBundle: totalSize,
      chunkCount: jsResources.length,
      compressionRatio: totalSize > 0 ? (navigation?.decodedBodySize || 0) / totalSize : 1,
    };
  }
  
  getMemoryMetrics(): MemoryMetrics | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        heapUsed: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      };
    }
    return null;
  }
  
  measureComponent(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    if (import.meta.env.DEV) {
      console.log(`[Performance] Component ${name}: ${Math.round(end - start)}ms`);
    }
  }
  
  markMilestone(name: string): void {
    performance.mark(name);
    const entry = performance.getEntriesByName(name)[0];
    
    if (import.meta.env.DEV) {
      console.log(`[Performance] Milestone ${name}: ${Math.round(entry.startTime)}ms`);
    }
  }
  
  measureFromStart(name: string): number {
    const duration = performance.now() - this.startTime;
    this.reportMetric(name, duration);
    return duration;
  }
  
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Resource loading optimization
export class ResourceLoader {
  private loadedResources: Set<string> = new Set();
  private pendingResources: Map<string, Promise<void>> = new Map();
  
  // Preload critical resources
  async preloadCriticalResources(): Promise<void> {
    const criticalResources = [
      '/src/pages/Dashboard.tsx',
      '/src/pages/Analytics.tsx',
      '/src/components/ui/button.tsx',
      '/src/components/ui/card.tsx',
    ];
    
    const promises = criticalResources.map(resource => this.preloadResource(resource));
    await Promise.allSettled(promises);
  }
  
  // Preload individual resource
  preloadResource(src: string): Promise<void> {
    if (this.loadedResources.has(src)) {
      return Promise.resolve();
    }
    
    if (this.pendingResources.has(src)) {
      return this.pendingResources.get(src)!;
    }
    
    const promise = new Promise<void>((resolve, reject) => {
      if (src.endsWith('.js') || src.endsWith('.tsx')) {
        // Preload JavaScript modules
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = src;
        link.onload = () => {
          this.loadedResources.add(src);
          resolve();
        };
        link.onerror = () => reject(new Error(`Failed to preload: ${src}`));
        document.head.appendChild(link);
      } else if (src.endsWith('.css')) {
        // Preload CSS
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = src;
        link.onload = () => {
          this.loadedResources.add(src);
          resolve();
        };
        link.onerror = () => reject(new Error(`Failed to preload: ${src}`));
        document.head.appendChild(link);
      } else {
        resolve();
      }
    });
    
    this.pendingResources.set(src, promise);
    return promise;
  }
  
  // Intelligent prefetching based on user behavior
  setupIntelligentPrefetching(): void {
    let prefetchTimer: NodeJS.Timeout;
    
    const prefetchOnHover = (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.hostname === window.location.hostname) {
        clearTimeout(prefetchTimer);
        prefetchTimer = setTimeout(() => {
          this.prefetchPage(link.pathname);
        }, 100);
      }
    };
    
    document.addEventListener('mouseover', prefetchOnHover);
    document.addEventListener('touchstart', prefetchOnHover);
  }
  
  private prefetchPage(pathname: string): void {
    // Map routes to their corresponding chunks
    const routeChunks: Record<string, string[]> = {
      '/dashboard': ['/src/pages/Dashboard.tsx', '/src/components/analytics/'],
      '/analytics': ['/src/pages/Analytics.tsx', '/src/components/charts/'],
      '/competitive': ['/src/pages/Competitive.tsx', '/src/components/competitive/'],
      '/content': ['/src/pages/Content.tsx', '/src/components/content/'],
      '/projects': ['/src/pages/Projects.tsx', '/src/components/projects/'],
      '/team': ['/src/pages/Team.tsx', '/src/components/team/'],
    };
    
    const chunks = routeChunks[pathname];
    if (chunks) {
      chunks.forEach(chunk => this.preloadResource(chunk));
    }
  }
}

// Global resource loader instance
export const resourceLoader = new ResourceLoader();

// Performance optimization hooks for React
export const usePerformanceOptimization = () => {
  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.markMilestone('app-initialized');
    
    // Setup intelligent prefetching
    resourceLoader.setupIntelligentPrefetching();
    
    // Preload critical resources
    resourceLoader.preloadCriticalResources();
    
    return () => {
      performanceMonitor.destroy();
    };
  }, []);
  
  const measureRender = useCallback((componentName: string) => {
    return (fn: () => void) => {
      performanceMonitor.measureComponent(componentName, fn);
    };
  }, []);
  
  const markMilestone = useCallback((name: string) => {
    performanceMonitor.markMilestone(name);
  }, []);
  
  return {
    measureRender,
    markMilestone,
    getMetrics: () => performanceMonitor.getMetrics(),
    getBundleMetrics: () => performanceMonitor.getBundleMetrics(),
    getMemoryMetrics: () => performanceMonitor.getMemoryMetrics(),
  };
};

// Batch request optimization
export class RequestBatcher {
  private batches: Map<string, Array<{ resolve: Function; reject: Function; data: any }>> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  
  batch<T>(
    key: string,
    data: any,
    batchProcessor: (items: any[]) => Promise<T[]>,
    delay: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Initialize batch if not exists
      if (!this.batches.has(key)) {
        this.batches.set(key, []);
      }
      
      // Add request to batch
      this.batches.get(key)!.push({ resolve, reject, data });
      
      // Clear existing timeout
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key)!);
      }
      
      // Set new timeout to process batch
      this.timeouts.set(key, setTimeout(async () => {
        const batch = this.batches.get(key) || [];
        this.batches.delete(key);
        this.timeouts.delete(key);
        
        if (batch.length === 0) return;
        
        try {
          const items = batch.map(item => item.data);
          const results = await batchProcessor(items);
          
          batch.forEach((item, index) => {
            item.resolve(results[index]);
          });
        } catch (error) {
          batch.forEach(item => {
            item.reject(error);
          });
        }
      }, delay));
    });
  }
}

// Global request batcher
export const requestBatcher = new RequestBatcher();

// Performance budget monitoring
export const checkPerformanceBudget = (): {
  passed: boolean;
  violations: string[];
  score: number;
} => {
  const metrics = performanceMonitor.getMetrics();
  const bundleMetrics = performanceMonitor.getBundleMetrics();
  const memoryMetrics = performanceMonitor.getMemoryMetrics();
  
  const violations: string[] = [];
  let score = 100;
  
  // Check Core Web Vitals thresholds
  if (metrics.lcp && metrics.lcp > 2500) {
    violations.push(`LCP too slow: ${Math.round(metrics.lcp)}ms (should be < 2500ms)`);
    score -= 20;
  }
  
  if (metrics.fid && metrics.fid > 100) {
    violations.push(`FID too slow: ${Math.round(metrics.fid)}ms (should be < 100ms)`);
    score -= 15;
  }
  
  if (metrics.cls && metrics.cls > 0.1) {
    violations.push(`CLS too high: ${metrics.cls.toFixed(3)} (should be < 0.1)`);
    score -= 15;
  }
  
  if (metrics.fcp && metrics.fcp > 1800) {
    violations.push(`FCP too slow: ${Math.round(metrics.fcp)}ms (should be < 1800ms)`);
    score -= 10;
  }
  
  // Check bundle size
  if (bundleMetrics.totalBundle > 500000) { // 500KB
    violations.push(`Bundle too large: ${Math.round(bundleMetrics.totalBundle / 1024)}KB (should be < 500KB)`);
    score -= 20;
  }
  
  // Check memory usage
  if (memoryMetrics && memoryMetrics.heapUsed > 0.8) {
    violations.push(`Memory usage too high: ${Math.round(memoryMetrics.heapUsed * 100)}% (should be < 80%)`);
    score -= 10;
  }
  
  return {
    passed: violations.length === 0,
    violations,
    score: Math.max(0, score),
  };
};

// Initialize performance optimizations
if (typeof window !== 'undefined') {
  // Start performance monitoring
  performanceMonitor.markMilestone('performance-monitor-initialized');
  
  // Setup resource loading optimizations
  document.addEventListener('DOMContentLoaded', () => {
    resourceLoader.preloadCriticalResources();
    performanceMonitor.markMilestone('critical-resources-preloaded');
  });
}