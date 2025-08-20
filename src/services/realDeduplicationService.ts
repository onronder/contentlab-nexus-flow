import { supabase } from '@/integrations/supabase/client';

interface DuplicateGroup {
  id: string;
  originalId: string;
  duplicateIds: string[];
  similarityScore: number;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  spaceSaved: number;
  status: 'pending' | 'processed' | 'merged';
  files: {
    id: string;
    title: string;
    filePath: string;
    createdAt: Date;
    fileSize: number;
    isOriginal: boolean;
  }[];
}

export class RealDeduplicationService {
  private static instance: RealDeduplicationService;

  static getInstance(): RealDeduplicationService {
    if (!RealDeduplicationService.instance) {
      RealDeduplicationService.instance = new RealDeduplicationService();
    }
    return RealDeduplicationService.instance;
  }

  async findDuplicateGroups(projectId: string): Promise<DuplicateGroup[]> {
    try {
      // Get all content items for the project
      const { data: contentItems, error } = await supabase
        .from('content_items')
        .select('id, title, file_path, created_at, file_size, mime_type, content_hash, duplicate_of')
        .eq('project_id', projectId)
        .not('content_hash', 'is', null);

      if (error) {
        console.error('Error fetching content items:', error);
        return [];
      }

      if (!contentItems || contentItems.length === 0) {
        return [];
      }

      // Group items by content hash
      const hashGroups = new Map<string, any[]>();
      contentItems.forEach(item => {
        if (item.content_hash && !item.duplicate_of) {
          if (!hashGroups.has(item.content_hash)) {
            hashGroups.set(item.content_hash, []);
          }
          hashGroups.get(item.content_hash)!.push(item);
        }
      });

      // Find groups with duplicates
      const duplicateGroups: DuplicateGroup[] = [];
      let groupIndex = 0;

      for (const [contentHash, items] of hashGroups.entries()) {
        if (items.length > 1) {
          // Sort by creation date to determine original
          const sortedItems = items.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          const original = sortedItems[0];
          const duplicates = sortedItems.slice(1);

          // Calculate similarity score based on file metadata
          const similarityScore = this.calculateSimilarityScore(sortedItems);

          // Calculate space that could be saved
          const spaceSaved = duplicates.reduce((sum, item) => sum + (item.file_size || 0), 0);

          const duplicateGroup: DuplicateGroup = {
            id: `group-${groupIndex++}`,
            originalId: original.id,
            duplicateIds: duplicates.map(d => d.id),
            similarityScore,
            contentHash,
            fileSize: original.file_size || 0,
            mimeType: original.mime_type || 'application/octet-stream',
            spaceSaved,
            status: 'pending',
            files: sortedItems.map((item, index) => ({
              id: item.id,
              title: item.title || `File ${index + 1}`,
              filePath: item.file_path || '',
              createdAt: new Date(item.created_at),
              fileSize: item.file_size || 0,
              isOriginal: index === 0
            }))
          };

          duplicateGroups.push(duplicateGroup);
        }
      }

      // Also find similar files without exact hash matches using Levenshtein distance
      await this.findSimilarFiles(contentItems, duplicateGroups, groupIndex);

      return duplicateGroups;
    } catch (error) {
      console.error('Error finding duplicate groups:', error);
      return [];
    }
  }

  private async findSimilarFiles(
    contentItems: any[], 
    duplicateGroups: DuplicateGroup[], 
    startIndex: number
  ): Promise<void> {
    // Group by mime type and similar file sizes for performance
    const typeGroups = new Map<string, any[]>();
    
    contentItems.forEach(item => {
      const key = `${item.mime_type}_${Math.floor((item.file_size || 0) / 1024)}k`;
      if (!typeGroups.has(key)) {
        typeGroups.set(key, []);
      }
      typeGroups.get(key)!.push(item);
    });

    let groupIndex = startIndex;

    for (const [, items] of typeGroups.entries()) {
      if (items.length < 2) continue;

      // Compare items within the same type/size group
      for (let i = 0; i < items.length - 1; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const item1 = items[i];
          const item2 = items[j];

          // Skip if already in a duplicate group
          if (duplicateGroups.some(group => 
            group.files.some(f => f.id === item1.id || f.id === item2.id)
          )) {
            continue;
          }

          const similarity = this.calculateFileSimilarity(item1, item2);
          
          if (similarity > 0.8) { // 80% similarity threshold
            const spaceSaved = Math.min(item1.file_size || 0, item2.file_size || 0);
            
            duplicateGroups.push({
              id: `similar-${groupIndex++}`,
              originalId: item1.id,
              duplicateIds: [item2.id],
              similarityScore: similarity,
              contentHash: `similar-${item1.id}-${item2.id}`,
              fileSize: item1.file_size || 0,
              mimeType: item1.mime_type || 'application/octet-stream',
              spaceSaved,
              status: 'pending',
              files: [
                {
                  id: item1.id,
                  title: item1.title || 'File 1',
                  filePath: item1.file_path || '',
                  createdAt: new Date(item1.created_at),
                  fileSize: item1.file_size || 0,
                  isOriginal: true
                },
                {
                  id: item2.id,
                  title: item2.title || 'File 2',
                  filePath: item2.file_path || '',
                  createdAt: new Date(item2.created_at),
                  fileSize: item2.file_size || 0,
                  isOriginal: false
                }
              ]
            });
          }
        }
      }
    }
  }

  private calculateSimilarityScore(items: any[]): number {
    // For exact hash matches, similarity is very high
    if (items.every(item => item.content_hash === items[0].content_hash)) {
      return 0.98;
    }

    // Calculate based on file properties
    const avgSimilarity = items.reduce((sum, item, index, array) => {
      if (index === 0) return sum;
      return sum + this.calculateFileSimilarity(array[0], item);
    }, 0) / (items.length - 1);

    return Math.min(0.95, avgSimilarity);
  }

  private calculateFileSimilarity(item1: any, item2: any): number {
    let similarity = 0;
    let factors = 0;

    // File size similarity (40% weight)
    const size1 = item1.file_size || 0;
    const size2 = item2.file_size || 0;
    if (size1 > 0 && size2 > 0) {
      const sizeSimilarity = 1 - Math.abs(size1 - size2) / Math.max(size1, size2);
      similarity += sizeSimilarity * 0.4;
      factors += 0.4;
    }

    // Mime type match (30% weight)
    if (item1.mime_type === item2.mime_type) {
      similarity += 0.3;
    }
    factors += 0.3;

    // Title similarity using Levenshtein distance (30% weight)
    if (item1.title && item2.title) {
      const titleSimilarity = this.calculateLevenshteinSimilarity(item1.title, item2.title);
      similarity += titleSimilarity * 0.3;
      factors += 0.3;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const distance = matrix[str2.length][str1.length];
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength > 0 ? 1 - distance / maxLength : 1;
  }

  async mergeDuplicates(originalId: string, duplicateIds: string[]): Promise<void> {
    try {
      // Update duplicate items to reference the original
      const { error: updateError } = await supabase
        .from('content_items')
        .update({ duplicate_of: originalId })
        .in('id', duplicateIds);

      if (updateError) {
        throw new Error(`Failed to merge duplicates: ${updateError.message}`);
      }

      // Log the merge operation
      console.log(`Merged ${duplicateIds.length} duplicates into original ${originalId}`);
    } catch (error) {
      console.error('Error merging duplicates:', error);
      throw error;
    }
  }
}

export const realDeduplicationService = RealDeduplicationService.getInstance();