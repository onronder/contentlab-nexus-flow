/**
 * Metrics Collection Endpoint for Production Monitoring
 * Provides system metrics in Prometheus format or JSON
 */

import { withSecurity } from '../_shared/security.ts';
import { globalPerformanceMonitor } from '../_shared/monitoring.ts';

const handler = withSecurity(async (req, logger) => {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'json';
  
  logger.info('Metrics requested', { format });
  
  const metrics = globalPerformanceMonitor.getMetrics();
  
  if (format === 'prometheus') {
    // Convert to Prometheus format
    const prometheusMetrics = convertToPrometheus(metrics);
    
    return new Response(prometheusMetrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache'
      }
    });
  }
  
  // Default JSON format
  const summary = {
    timestamp: new Date().toISOString(),
    metrics_count: metrics.length,
    metrics: metrics.slice(-50), // Return last 50 metrics
    summary: generateMetricsSummary(metrics)
  };
  
  logger.info('Metrics served', { 
    format, 
    count: metrics.length,
    summary_included: true
  });
  
  return new Response(JSON.stringify(summary), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
}, {
  requireAuth: false, // Metrics should be accessible for monitoring
  rateLimitRequests: 120,
  rateLimitWindow: 60000
});

function convertToPrometheus(metrics: any[]): string {
  const metricGroups = new Map<string, any[]>();
  
  // Group metrics by name
  metrics.forEach(metric => {
    if (!metricGroups.has(metric.name)) {
      metricGroups.set(metric.name, []);
    }
    metricGroups.get(metric.name)!.push(metric);
  });
  
  let output = '';
  
  for (const [name, metricList] of metricGroups) {
    // Add metric help and type
    output += `# HELP ${name} Application metric\n`;
    output += `# TYPE ${name} ${getPrometheusType(name)}\n`;
    
    // Add metric values
    metricList.forEach(metric => {
      const labels = metric.tags ? 
        Object.entries(metric.tags)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',') : '';
      
      const labelsStr = labels ? `{${labels}}` : '';
      output += `${name}${labelsStr} ${metric.value} ${new Date(metric.timestamp).getTime()}\n`;
    });
    
    output += '\n';
  }
  
  return output;
}

function getPrometheusType(metricName: string): string {
  if (metricName.includes('duration') || metricName.includes('time')) {
    return 'histogram';
  }
  if (metricName.includes('count') || metricName.includes('total')) {
    return 'counter';
  }
  return 'gauge';
}

function generateMetricsSummary(metrics: any[]): Record<string, any> {
  const summary: Record<string, any> = {};
  
  // Group by metric name
  const groups = metrics.reduce((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name].push(metric.value);
    return acc;
  }, {} as Record<string, number[]>);
  
  // Calculate statistics for each metric
  Object.entries(groups).forEach(([name, values]) => {
    if (values.length > 0) {
      const sorted = [...values].sort((a, b) => a - b);
      summary[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    }
  });
  
  return summary;
}

Deno.serve(handler);