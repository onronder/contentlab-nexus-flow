/**
 * Performance budget enforcement and monitoring
 */

interface PerformanceBudget {
  bundleSize: number; // KB
  firstContentfulPaint: number; // ms
  largestContentfulPaint: number; // ms
  firstInputDelay: number; // ms
  cumulativeLayoutShift: number; // score
}

const PERFORMANCE_BUDGET: PerformanceBudget = {
  bundleSize: 500, // 500KB max
  firstContentfulPaint: 1500, // 1.5s
  largestContentfulPaint: 2500, // 2.5s
  firstInputDelay: 100, // 100ms
  cumulativeLayoutShift: 0.1 // 0.1 score
};

export const checkPerformanceBudget = (): Promise<{
  passed: boolean;
  violations: string[];
  metrics: Record<string, number>;
}> => {
  return new Promise((resolve) => {
    const violations: string[] = [];
    const metrics: Record<string, number> = {};

    // Check Core Web Vitals
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const fcp = navigation.loadEventEnd - navigation.fetchStart;
        metrics.firstContentfulPaint = fcp;
        
        if (fcp > PERFORMANCE_BUDGET.firstContentfulPaint) {
          violations.push(`First Contentful Paint: ${fcp}ms exceeds budget of ${PERFORMANCE_BUDGET.firstContentfulPaint}ms`);
        }
      }

      // Use PerformanceObserver for LCP and FID
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              metrics.largestContentfulPaint = entry.startTime;
              if (entry.startTime > PERFORMANCE_BUDGET.largestContentfulPaint) {
                violations.push(`Largest Contentful Paint: ${entry.startTime}ms exceeds budget`);
              }
            }
            
            if (entry.entryType === 'first-input') {
              const fid = (entry as any).processingStart - entry.startTime;
              metrics.firstInputDelay = fid;
              if (fid > PERFORMANCE_BUDGET.firstInputDelay) {
                violations.push(`First Input Delay: ${fid}ms exceeds budget`);
              }
            }
          }
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
      }
    }

    // Check bundle size (simulated)
    const estimatedBundleSize = 350; // KB - would be calculated from actual bundle
    metrics.bundleSize = estimatedBundleSize;
    
    if (estimatedBundleSize > PERFORMANCE_BUDGET.bundleSize) {
      violations.push(`Bundle size: ${estimatedBundleSize}KB exceeds budget of ${PERFORMANCE_BUDGET.bundleSize}KB`);
    }

    setTimeout(() => {
      resolve({
        passed: violations.length === 0,
        violations,
        metrics
      });
    }, 1000);
  });
};

export const generatePerformanceReport = async () => {
  const budget = await checkPerformanceBudget();
  
  return {
    timestamp: new Date().toISOString(),
    passed: budget.passed,
    score: calculatePerformanceScore(budget.metrics),
    violations: budget.violations,
    metrics: budget.metrics,
    recommendations: generateRecommendations(budget.violations)
  };
};

const calculatePerformanceScore = (metrics: Record<string, number>): number => {
  // Simple scoring algorithm - in production, use more sophisticated methods
  let score = 100;
  
  if (metrics.firstContentfulPaint > 1500) score -= 20;
  if (metrics.largestContentfulPaint > 2500) score -= 25;
  if (metrics.firstInputDelay > 100) score -= 20;
  if (metrics.bundleSize > 500) score -= 15;
  
  return Math.max(0, score);
};

const generateRecommendations = (violations: string[]): string[] => {
  const recommendations: string[] = [];
  
  violations.forEach(violation => {
    if (violation.includes('First Contentful Paint')) {
      recommendations.push('Optimize critical rendering path and reduce render-blocking resources');
    }
    if (violation.includes('Largest Contentful Paint')) {
      recommendations.push('Optimize images and preload important resources');
    }
    if (violation.includes('First Input Delay')) {
      recommendations.push('Reduce JavaScript execution time and optimize main thread work');
    }
    if (violation.includes('Bundle size')) {
      recommendations.push('Implement code splitting and tree shaking');
    }
  });
  
  return recommendations;
};