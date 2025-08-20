import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { withSecurity, SecurityLogger } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CDNRequest {
  action: 'cache' | 'invalidate' | 'optimize' | 'analyze' | 'configure';
  filePaths?: string[];
  projectId?: string;
  settings?: {
    cacheTtl?: number;
    compressionLevel?: 'low' | 'medium' | 'high';
    enableWebP?: boolean;
    enableBrotli?: boolean;
  };
}

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {
  try {
    logger.info('CDN manager request received');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, filePaths = [], projectId, settings = {} }: CDNRequest = await req.json();

    logger.info('CDN Manager operation', { action, fileCount: filePaths.length, projectId });

    let results: any = {
      action,
      executedAt: new Date().toISOString(),
      processed: 0,
      errors: []
    };

    switch (action) {
      case 'cache':
        results = await cacheFiles(supabase, filePaths, settings);
        break;
      
      case 'invalidate':
        results = await invalidateCache(supabase, filePaths);
        break;
      
      case 'optimize':
        results = await optimizeDelivery(supabase, projectId, settings);
        break;
      
      case 'analyze':
        results = await analyzePerformance(supabase, projectId);
        break;
      
      case 'configure':
        results = await configureCDN(supabase, projectId, settings);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    logger.info('CDN operation completed', { action, processed: results.processed });
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    logger.error('CDN Manager operation failed', error, { action: req.url });
    return new Response(JSON.stringify({
      error: error.message || 'CDN operation failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export default withSecurity(handler, {
  requireAuth: true,
  rateLimitRequests: 100,
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});

async function cacheFiles(supabase: any, filePaths: string[], settings: any) {
  console.log(`Caching ${filePaths.length} files`);
  
  let cachedCount = 0;
  const errors: string[] = [];
  const results: any[] = [];

  for (const filePath of filePaths) {
    try {
      // Check if file exists in storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('content')
        .download(filePath);

      if (downloadError) {
        errors.push(`File not found: ${filePath}`);
        continue;
      }

      // Generate cache headers based on content type
      const mimeType = fileData.type;
      const cacheTtl = settings.cacheTtl || getCacheTtlByType(mimeType);
      
      // Simulate CDN caching process
      const cacheEntry = {
        filePath,
        mimeType,
        size: fileData.size,
        cacheTtl,
        cacheKey: generateCacheKey(filePath),
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + cacheTtl * 1000).toISOString(),
        compressionUsed: settings.compressionLevel || 'medium',
        webpEnabled: settings.enableWebP && mimeType.startsWith('image/'),
        brotliEnabled: settings.enableBrotli
      };

      // Store cache metadata
      await supabase
        .from('content_items')
        .update({
          metadata: {
            cdn: {
              cached: true,
              cacheKey: cacheEntry.cacheKey,
              cachedAt: cacheEntry.cachedAt,
              expiresAt: cacheEntry.expiresAt,
              settings: settings
            }
          }
        })
        .eq('file_path', filePath);

      results.push(cacheEntry);
      cachedCount++;
    } catch (error: any) {
      errors.push(`Error caching ${filePath}: ${error.message}`);
    }
  }

  return {
    action: 'cache',
    processed: cachedCount,
    results,
    errors,
    cachingStrategy: {
      defaultTtl: settings.cacheTtl || 3600,
      compression: settings.compressionLevel || 'medium',
      webpOptimization: settings.enableWebP || true,
      brotliCompression: settings.enableBrotli || true
    }
  };
}

async function invalidateCache(supabase: any, filePaths: string[]) {
  console.log(`Invalidating cache for ${filePaths.length} files`);
  
  let invalidatedCount = 0;
  const errors: string[] = [];

  for (const filePath of filePaths) {
    try {
      // Update content metadata to mark cache as invalid
      const { error } = await supabase
        .from('content_items')
        .update({
          metadata: {
            cdn: {
              cached: false,
              invalidatedAt: new Date().toISOString(),
              reason: 'manual_invalidation'
            }
          }
        })
        .eq('file_path', filePath);

      if (error) {
        errors.push(`Failed to invalidate ${filePath}: ${error.message}`);
        continue;
      }

      // Simulate CDN invalidation API call
      console.log(`CDN cache invalidated for: ${filePath}`);
      invalidatedCount++;
    } catch (error: any) {
      errors.push(`Error invalidating ${filePath}: ${error.message}`);
    }
  }

  return {
    action: 'invalidate',
    processed: invalidatedCount,
    errors,
    invalidatedAt: new Date().toISOString()
  };
}

async function optimizeDelivery(supabase: any, projectId: string, settings: any) {
  console.log(`Optimizing delivery for project ${projectId}`);

  // Find frequently accessed files
  const { data: frequentFiles, error } = await supabase
    .from('content_items')
    .select('id, file_path, access_count, file_size, content_type')
    .eq('project_id', projectId)
    .gte('access_count', 10)
    .order('access_count', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch files for optimization: ${error.message}`);
  }

  let optimizedCount = 0;
  const optimizations: any[] = [];
  const errors: string[] = [];

  for (const file of frequentFiles || []) {
    try {
      const optimization = {
        fileId: file.id,
        filePath: file.file_path,
        strategy: determineOptimizationStrategy(file),
        estimatedSavings: calculateSavings(file),
        appliedAt: new Date().toISOString()
      };

      // Apply optimization based on strategy
      switch (optimization.strategy) {
        case 'preload':
          await setupPreloading(supabase, file.id);
          break;
        case 'compress':
          await enhanceCompression(supabase, file.id);
          break;
        case 'cdn_push':
          await pushToCDNEdge(supabase, file.id);
          break;
      }

      optimizations.push(optimization);
      optimizedCount++;
    } catch (error: any) {
      errors.push(`Error optimizing ${file.file_path}: ${error.message}`);
    }
  }

  return {
    action: 'optimize',
    processed: optimizedCount,
    optimizations,
    errors,
    summary: {
      totalFiles: frequentFiles?.length || 0,
      optimized: optimizedCount,
      estimatedBandwidthSavings: optimizations.reduce((sum, opt) => sum + opt.estimatedSavings.bandwidth, 0),
      estimatedCostSavings: optimizations.reduce((sum, opt) => sum + opt.estimatedSavings.cost, 0)
    }
  };
}

async function analyzePerformance(supabase: any, projectId: string) {
  console.log(`Analyzing CDN performance for project ${projectId}`);

  // Get file access patterns
  const { data: files, error } = await supabase
    .from('content_items')
    .select('file_path, file_size, access_count, last_accessed_at, content_type, metadata')
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to fetch files for analysis: ${error.message}`);
  }

  const analysis = {
    totalFiles: files?.length || 0,
    totalSize: files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0,
    averageAccessCount: files?.reduce((sum, f) => sum + (f.access_count || 0), 0) / (files?.length || 1) || 0,
    cacheHitRate: calculateCacheHitRate(files || []),
    fileTypes: analyzeFileTypes(files || []),
    recommendations: generateRecommendations(files || []),
    performance: {
      bandwidth: calculateBandwidthUsage(files || []),
      cost: calculateCostMetrics(files || []),
      efficiency: calculateEfficiencyScore(files || [])
    }
  };

  return {
    action: 'analyze',
    projectId,
    analysis,
    generatedAt: new Date().toISOString()
  };
}

async function configureCDN(supabase: any, projectId: string, settings: any) {
  console.log(`Configuring CDN for project ${projectId}`);

  const configuration = {
    projectId,
    settings: {
      defaultCacheTtl: settings.cacheTtl || 3600,
      compressionLevel: settings.compressionLevel || 'medium',
      webpOptimization: settings.enableWebP !== false,
      brotliCompression: settings.enableBrotli !== false,
      geolocation: true,
      http2Support: true,
      securityHeaders: true
    },
    appliedAt: new Date().toISOString()
  };

  // Save configuration
  await supabase
    .from('projects')
    .update({
      settings: {
        cdn: configuration.settings
      }
    })
    .eq('id', projectId);

  return {
    action: 'configure',
    configuration,
    message: 'CDN configuration updated successfully'
  };
}

// Helper functions
function getCacheTtlByType(mimeType: string): number {
  if (mimeType.startsWith('image/')) return 86400; // 24 hours
  if (mimeType.startsWith('video/')) return 604800; // 7 days
  if (mimeType.includes('javascript') || mimeType.includes('css')) return 31536000; // 1 year
  if (mimeType.includes('pdf')) return 3600; // 1 hour
  return 1800; // 30 minutes default
}

function generateCacheKey(filePath: string): string {
  return `cdn-${btoa(filePath).replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
}

function determineOptimizationStrategy(file: any): string {
  if (file.access_count > 100) return 'preload';
  if (file.file_size > 1000000) return 'compress';
  if (file.access_count > 50) return 'cdn_push';
  return 'cache';
}

function calculateSavings(file: any): any {
  return {
    bandwidth: Math.floor(file.file_size * 0.3), // 30% compression savings
    cost: file.access_count * 0.001 // $0.001 per request
  };
}

async function setupPreloading(supabase: any, fileId: string): Promise<void> {
  await supabase
    .from('content_items')
    .update({
      metadata: {
        cdn: { preload: true, preloadSetAt: new Date().toISOString() }
      }
    })
    .eq('id', fileId);
}

async function enhanceCompression(supabase: any, fileId: string): Promise<void> {
  await supabase
    .from('content_items')
    .update({
      metadata: {
        cdn: { compression: 'high', compressedAt: new Date().toISOString() }
      }
    })
    .eq('id', fileId);
}

async function pushToCDNEdge(supabase: any, fileId: string): Promise<void> {
  await supabase
    .from('content_items')
    .update({
      metadata: {
        cdn: { edgeCached: true, pushedAt: new Date().toISOString() }
      }
    })
    .eq('id', fileId);
}

function calculateCacheHitRate(files: any[]): number {
  const cachedFiles = files.filter(f => f.metadata?.cdn?.cached);
  return files.length > 0 ? (cachedFiles.length / files.length) * 100 : 0;
}

function analyzeFileTypes(files: any[]): any {
  const typeMap = files.reduce((acc, file) => {
    const type = file.content_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(typeMap).map(([type, count]) => ({ type, count }));
}

function generateRecommendations(files: any[]): string[] {
  const recommendations: string[] = [];
  
  const largeFiles = files.filter(f => f.file_size > 5000000);
  if (largeFiles.length > 0) {
    recommendations.push(`Consider compressing ${largeFiles.length} large files (>5MB)`);
  }

  const frequentFiles = files.filter(f => f.access_count > 100);
  if (frequentFiles.length > 0) {
    recommendations.push(`Enable preloading for ${frequentFiles.length} frequently accessed files`);
  }

  const uncachedFiles = files.filter(f => !f.metadata?.cdn?.cached);
  if (uncachedFiles.length > 0) {
    recommendations.push(`Cache ${uncachedFiles.length} files to improve performance`);
  }

  return recommendations;
}

function calculateBandwidthUsage(files: any[]): any {
  const totalSize = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
  const totalRequests = files.reduce((sum, f) => sum + (f.access_count || 0), 0);
  
  return {
    totalSizeGB: totalSize / (1024 * 1024 * 1024),
    totalRequests,
    estimatedBandwidthGB: (totalSize * totalRequests) / (1024 * 1024 * 1024)
  };
}

function calculateCostMetrics(files: any[]): any {
  const bandwidth = calculateBandwidthUsage(files);
  const storage = files.reduce((sum, f) => sum + (f.file_size || 0), 0) / (1024 * 1024 * 1024);
  
  return {
    storageGB: storage,
    estimatedMonthlyCost: bandwidth.estimatedBandwidthGB * 0.05 + storage * 0.02 // $0.05/GB bandwidth + $0.02/GB storage
  };
}

function calculateEfficiencyScore(files: any[]): number {
  const cachedFiles = files.filter(f => f.metadata?.cdn?.cached).length;
  const compressedFiles = files.filter(f => f.metadata?.cdn?.compression).length;
  const optimizedFiles = files.filter(f => f.metadata?.optimization).length;
  
  const totalFiles = files.length;
  if (totalFiles === 0) return 0;
  
  return ((cachedFiles + compressedFiles + optimizedFiles) / (totalFiles * 3)) * 100;
}