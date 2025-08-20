import { supabase } from '@/integrations/supabase/client';

interface StorageAnalyticsData {
  totalFiles: number;
  totalStorage: number;
  storageByType: Record<string, number>;
  uploadTrend: Array<{ date: string; uploads: number; size: number }>;
  topFiles: Array<{ name: string; size: number; type: string; lastAccessed: Date }>;
  storageTierDistribution: Array<{ tier: string; files: number; storage: number }>;
}

interface StorageOptimization {
  category: string;
  description: string;
  potentialSavings: number;
  affectedFiles: number;
  actionType: string;
}

export class RealStorageAnalyticsService {
  private static instance: RealStorageAnalyticsService;

  static getInstance(): RealStorageAnalyticsService {
    if (!RealStorageAnalyticsService.instance) {
      RealStorageAnalyticsService.instance = new RealStorageAnalyticsService();
    }
    return RealStorageAnalyticsService.instance;
  }

  async getStorageAnalytics(projectId: string, dateRange: string = '30d'): Promise<StorageAnalyticsData> {
    try {
      const daysBack = this.parseDateRange(dateRange);
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      // Get content items for the project
      const { data: contentItems, error: contentError } = await supabase
        .from('content_items')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', startDate.toISOString());

      if (contentError) {
        console.error('Error fetching content items:', contentError);
        return this.getEmptyAnalytics();
      }

      const items = contentItems || [];
      
      // Calculate total files and storage
      const totalFiles = items.length;
      const totalStorage = items.reduce((sum, item) => sum + (item.file_size || 0), 0);

      // Calculate storage by type
      const storageByType: Record<string, number> = {};
      items.forEach(item => {
        if (!item.mime_type || !item.file_size) return;
        
        const category = this.getMimeTypeCategory(item.mime_type);
        storageByType[category] = (storageByType[category] || 0) + item.file_size;
      });

      // Generate upload trend from creation dates
      const uploadTrend = this.calculateUploadTrend(items, daysBack);

      // Get top files by size
      const topFiles = items
        .filter(item => item.file_size && item.title)
        .sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
        .slice(0, 5)
        .map(item => ({
          name: item.title,
          size: item.file_size || 0,
          type: this.getMimeTypeCategory(item.mime_type || ''),
          lastAccessed: new Date(item.last_accessed_at || item.updated_at)
        }));

      // Calculate storage tier distribution based on access patterns
      const storageTierDistribution = this.calculateStorageTiers(items);

      return {
        totalFiles,
        totalStorage,
        storageByType,
        uploadTrend,
        topFiles,
        storageTierDistribution
      };
    } catch (error) {
      console.error('Error in getStorageAnalytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  async getStorageOptimizations(projectId: string): Promise<StorageOptimization[]> {
    try {
      const { data: contentItems, error } = await supabase
        .from('content_items')
        .select('*')
        .eq('project_id', projectId);

      if (error || !contentItems) {
        return [];
      }

      const optimizations: StorageOptimization[] = [];

      // Find large images that could be compressed
      const largeImages = contentItems.filter(item => 
        item.mime_type?.startsWith('image/') && 
        (item.file_size || 0) > 5 * 1024 * 1024 // 5MB
      );

      if (largeImages.length > 0) {
        const totalSize = largeImages.reduce((sum, item) => sum + (item.file_size || 0), 0);
        optimizations.push({
          category: 'Image Compression',
          description: `${largeImages.length} large images could be compressed`,
          potentialSavings: Math.round(totalSize * 0.3), // Estimate 30% compression
          affectedFiles: largeImages.length,
          actionType: 'compress'
        });
      }

      // Find old files that could be archived
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      const oldFiles = contentItems.filter(item => 
        new Date(item.last_accessed_at || item.updated_at) < oldDate
      );

      if (oldFiles.length > 0) {
        optimizations.push({
          category: 'Archive Old Files',
          description: `${oldFiles.length} files haven't been accessed in 90+ days`,
          potentialSavings: 0,
          affectedFiles: oldFiles.length,
          actionType: 'archive'
        });
      }

      // Find potential duplicates by content hash
      const hashGroups = new Map<string, any[]>();
      contentItems.forEach(item => {
        if (item.content_hash) {
          if (!hashGroups.has(item.content_hash)) {
            hashGroups.set(item.content_hash, []);
          }
          hashGroups.get(item.content_hash)!.push(item);
        }
      });

      const duplicateGroups = Array.from(hashGroups.values()).filter(group => group.length > 1);
      if (duplicateGroups.length > 0) {
        const duplicateFiles = duplicateGroups.reduce((sum, group) => sum + group.length - 1, 0);
        const duplicateSize = duplicateGroups.reduce((sum, group) => {
          const fileSize = group[0].file_size || 0;
          return sum + fileSize * (group.length - 1);
        }, 0);

        optimizations.push({
          category: 'Remove Duplicates',
          description: `${duplicateFiles} duplicate files found`,
          potentialSavings: duplicateSize,
          affectedFiles: duplicateFiles,
          actionType: 'deduplicate'
        });
      }

      return optimizations;
    } catch (error) {
      console.error('Error in getStorageOptimizations:', error);
      return [];
    }
  }

  private parseDateRange(dateRange: string): number {
    switch (dateRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private getMimeTypeCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }

  private calculateUploadTrend(items: any[], daysBack: number): Array<{ date: string; uploads: number; size: number }> {
    const trend: Record<string, { uploads: number; size: number }> = {};
    
    // Initialize all days
    for (let i = 0; i < Math.min(daysBack, 7); i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      trend[dateKey] = { uploads: 0, size: 0 };
    }

    // Count uploads per day
    items.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (trend[date]) {
        trend[date].uploads++;
        trend[date].size += item.file_size || 0;
      }
    });

    return Object.entries(trend)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateStorageTiers(items: any[]): Array<{ tier: string; files: number; storage: number }> {
    const now = Date.now();
    const tiers = {
      hot: { files: 0, storage: 0 },
      warm: { files: 0, storage: 0 },
      cold: { files: 0, storage: 0 }
    };

    items.forEach(item => {
      const lastAccessed = new Date(item.last_accessed_at || item.updated_at).getTime();
      const daysSinceAccess = (now - lastAccessed) / (24 * 60 * 60 * 1000);
      const fileSize = item.file_size || 0;

      if (daysSinceAccess <= 7) {
        tiers.hot.files++;
        tiers.hot.storage += fileSize;
      } else if (daysSinceAccess <= 30) {
        tiers.warm.files++;
        tiers.warm.storage += fileSize;
      } else {
        tiers.cold.files++;
        tiers.cold.storage += fileSize;
      }
    });

    return [
      { tier: 'hot', files: tiers.hot.files, storage: tiers.hot.storage },
      { tier: 'warm', files: tiers.warm.files, storage: tiers.warm.storage },
      { tier: 'cold', files: tiers.cold.files, storage: tiers.cold.storage }
    ];
  }

  private getEmptyAnalytics(): StorageAnalyticsData {
    return {
      totalFiles: 0,
      totalStorage: 0,
      storageByType: {},
      uploadTrend: [],
      topFiles: [],
      storageTierDistribution: []
    };
  }
}

export const realStorageAnalytics = RealStorageAnalyticsService.getInstance();