import { supabase } from '@/integrations/supabase/client';

export interface SearchFilters {
  contentTypes?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number; // bytes
    max: number; // bytes
  };
  tags?: string[];
  categories?: string[];
  folders?: string[];
  status?: string[];
  qualityScore?: {
    min: number;
    max: number;
  };
  storageTier?: string[];
  hasAITags?: boolean;
  hasDuplicates?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  filePath?: string;
  thumbnailPath?: string;
  fileSize?: number;
  mimeType?: string;
  tags: string[];
  aiTags?: string[];
  quality?: number;
  relevanceScore: number;
  lastModified: Date;
  folderPath?: string;
  metadata?: any;
}

export interface VisualSearchResult extends SearchResult {
  visualSimilarity: number;
  visualFeatures: any;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  filters: SearchFilters;
  userId: string;
  isShared: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AdvancedSearchService {
  private static instance: AdvancedSearchService;

  private constructor() {}

  public static getInstance(): AdvancedSearchService {
    if (!AdvancedSearchService.instance) {
      AdvancedSearchService.instance = new AdvancedSearchService();
    }
    return AdvancedSearchService.instance;
  }

  // Full-text search with advanced filtering
  async searchContent(
    query: string,
    projectId: string,
    filters: SearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<SearchResult[]> {
    let searchQuery = supabase
      .from('content_items')
      .select(`
        id,
        title,
        description,
        content_type,
        file_path,
        thumbnail_path,
        file_size,
        mime_type,
        metadata,
        content_quality_score,
        ai_tags,
        updated_at,
        folder_id,
        content_tags(tag),
        file_folders(folder_path)
      `)
      .eq('project_id', projectId);

    // Apply text search
    if (query.trim()) {
      searchQuery = searchQuery.textSearch('search_vector', query, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Apply filters
    if (filters.contentTypes?.length) {
      searchQuery = searchQuery.in('content_type', filters.contentTypes);
    }

    if (filters.dateRange) {
      searchQuery = searchQuery
        .gte('updated_at', filters.dateRange.start.toISOString())
        .lte('updated_at', filters.dateRange.end.toISOString());
    }

    if (filters.sizeRange) {
      if (filters.sizeRange.min > 0) {
        searchQuery = searchQuery.gte('file_size', filters.sizeRange.min);
      }
      if (filters.sizeRange.max > 0) {
        searchQuery = searchQuery.lte('file_size', filters.sizeRange.max);
      }
    }

    if (filters.status?.length) {
      searchQuery = searchQuery.in('status', filters.status);
    }

    if (filters.qualityScore) {
      if (filters.qualityScore.min > 0) {
        searchQuery = searchQuery.gte('content_quality_score', filters.qualityScore.min);
      }
      if (filters.qualityScore.max > 0) {
        searchQuery = searchQuery.lte('content_quality_score', filters.qualityScore.max);
      }
    }

    if (filters.storageTier?.length) {
      searchQuery = searchQuery.in('storage_tier', filters.storageTier);
    }

    if (filters.hasAITags) {
      searchQuery = searchQuery.not('ai_tags', 'is', null);
    }

    if (filters.hasDuplicates) {
      searchQuery = searchQuery.not('duplicate_of', 'is', null);
    }

    if (filters.folders?.length) {
      searchQuery = searchQuery.in('folder_id', filters.folders);
    }

    const { data, error } = await searchQuery
      .range(offset, offset + limit - 1)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      contentType: item.content_type,
      filePath: item.file_path,
      thumbnailPath: item.thumbnail_path,
      fileSize: item.file_size,
      mimeType: item.mime_type,
      tags: (item.content_tags as any[])?.map(t => t.tag) || [],
      aiTags: item.ai_tags || [],
      quality: item.content_quality_score,
      relevanceScore: query.trim() ? this.calculateRelevanceScore(item, query) : 1.0,
      lastModified: new Date(item.updated_at),
      folderPath: item.file_folders?.folder_path,
      metadata: item.metadata
    }));
  }

  // Visual similarity search
  async searchSimilarImages(
    referenceImageId: string,
    projectId: string,
    threshold: number = 0.8,
    limit: number = 20
  ): Promise<VisualSearchResult[]> {
    // Get reference image features
    const { data: refData } = await supabase
      .from('content_search_index')
      .select('visual_features')
      .eq('content_id', referenceImageId)
      .single();

    if (!refData?.visual_features) {
      throw new Error('Reference image features not found');
    }

    // Find similar images based on visual features
    // This would typically use a vector similarity search
    // For now, we'll use a simplified approach
    const { data, error } = await supabase
      .from('content_items')
      .select(`
        id,
        title,
        description,
        content_type,
        file_path,
        thumbnail_path,
        file_size,
        mime_type,
        updated_at,
        content_search_index(visual_features)
      `)
      .eq('project_id', projectId)
      .eq('content_type', 'image')
      .neq('id', referenceImageId)
      .limit(limit);

    if (error) throw error;

    // Calculate visual similarity scores
    const results: VisualSearchResult[] = (data || [])
      .map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        contentType: item.content_type,
        filePath: item.file_path,
        thumbnailPath: item.thumbnail_path,
        fileSize: item.file_size,
        mimeType: item.mime_type,
        tags: [], // Would need to fetch separately
        relevanceScore: 1.0,
        lastModified: new Date(item.updated_at),
        visualSimilarity: this.calculateVisualSimilarity(
          refData.visual_features,
          (item.content_search_index as any)?.visual_features || {}
        ),
        visualFeatures: (item.content_search_index as any)?.visual_features || {}
      }))
      .filter(item => item.visualSimilarity >= threshold)
      .sort((a, b) => b.visualSimilarity - a.visualSimilarity);

    return results;
  }

  // Advanced content recommendations
  async getContentRecommendations(
    userId: string,
    projectId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    // Get user's content interaction patterns
    const { data: userActivity } = await supabase
      .from('content_items')
      .select(`
        id,
        title,
        content_type,
        ai_tags,
        access_count,
        last_accessed_at,
        content_tags(tag)
      `)
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('access_count', { ascending: false })
      .limit(50);

    // Analyze patterns and recommend similar content
    const patterns = this.analyzeUserPatterns(userActivity || []);
    
    // Find content matching user patterns
    let recommendationQuery = supabase
      .from('content_items')
      .select(`
        id,
        title,
        description,
        content_type,
        file_path,
        thumbnail_path,
        file_size,
        mime_type,
        metadata,
        content_quality_score,
        ai_tags,
        updated_at,
        content_tags(tag)
      `)
      .eq('project_id', projectId)
      .neq('user_id', userId); // Exclude user's own content

    if (patterns.preferredTypes.length > 0) {
      recommendationQuery = recommendationQuery.in('content_type', patterns.preferredTypes);
    }

    const { data, error } = await recommendationQuery
      .order('content_quality_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      contentType: item.content_type,
      filePath: item.file_path,
      thumbnailPath: item.thumbnail_path,
      fileSize: item.file_size,
      mimeType: item.mime_type,
      tags: (item.content_tags as any[])?.map(t => t.tag) || [],
      aiTags: item.ai_tags || [],
      quality: item.content_quality_score,
      relevanceScore: this.calculateRecommendationScore(item, patterns),
      lastModified: new Date(item.updated_at),
      metadata: item.metadata
    }));
  }

  // Saved search management
  async saveSearch(
    name: string,
    query: string,
    filters: SearchFilters,
    userId: string,
    description?: string
  ): Promise<SavedSearch> {
    const searchId = crypto.randomUUID();
    
    const savedSearch: SavedSearch = {
      id: searchId,
      name,
      description,
      query,
      filters,
      userId,
      isShared: false,
      useCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, this would be saved to a database table
    // For now, we'll store in localStorage as an example
    const savedSearches = await this.getSavedSearches(userId);
    savedSearches.push(savedSearch);
    localStorage.setItem(`savedSearches_${userId}`, JSON.stringify(savedSearches));

    return savedSearch;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    // In a real implementation, this would fetch from database
    const saved = localStorage.getItem(`savedSearches_${userId}`);
    return saved ? JSON.parse(saved) : [];
  }

  async deleteSavedSearch(searchId: string, userId: string): Promise<void> {
    const savedSearches = await this.getSavedSearches(userId);
    const filtered = savedSearches.filter(s => s.id !== searchId);
    localStorage.setItem(`savedSearches_${userId}`, JSON.stringify(filtered));
  }

  // Update search index for content
  async updateSearchIndex(contentId: string, content: any): Promise<void> {
    const vectors = await this.generateSearchVectors(content);
    const aiKeywords = await this.extractAIKeywords(content);
    const qualityScore = this.calculateContentQuality(content);

    const { error } = await supabase
      .from('content_search_index')
      .upsert([{
        content_id: contentId,
        title_vector: vectors.title,
        description_vector: vectors.description,
        content_vector: vectors.content,
        tag_vector: vectors.tags,
        combined_vector: vectors.combined,
        ai_keywords: aiKeywords,
        content_quality_score: qualityScore,
        last_indexed_at: new Date().toISOString(),
        index_version: 1
      }]);

    if (error) throw error;
  }

  // Helper methods
  private calculateRelevanceScore(item: any, query: string): number {
    let score = 0;
    const queryTerms = query.toLowerCase().split(' ');
    
    // Title relevance
    if (item.title) {
      const titleMatches = queryTerms.filter(term => 
        item.title.toLowerCase().includes(term)
      ).length;
      score += (titleMatches / queryTerms.length) * 0.4;
    }
    
    // Description relevance
    if (item.description) {
      const descMatches = queryTerms.filter(term => 
        item.description.toLowerCase().includes(term)
      ).length;
      score += (descMatches / queryTerms.length) * 0.3;
    }
    
    // Tag relevance
    if (item.content_tags) {
      const tagText = item.content_tags.map((t: any) => t.tag).join(' ').toLowerCase();
      const tagMatches = queryTerms.filter(term => 
        tagText.includes(term)
      ).length;
      score += (tagMatches / queryTerms.length) * 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  private calculateVisualSimilarity(features1: any, features2: any): number {
    // Simplified visual similarity calculation
    // In reality, this would use proper image feature vectors
    if (!features1 || !features2) return 0;
    
    // Placeholder calculation
    return Math.random() * 0.3 + 0.7; // Returns 0.7-1.0 for demo
  }

  private analyzeUserPatterns(userActivity: any[]): any {
    const patterns = {
      preferredTypes: [] as string[],
      preferredTags: [] as string[],
      activityScore: 0
    };

    // Analyze content type preferences
    const typeFreq: Record<string, number> = {};
    userActivity.forEach(item => {
      typeFreq[item.content_type] = (typeFreq[item.content_type] || 0) + item.access_count;
    });

    patterns.preferredTypes = Object.entries(typeFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);

    return patterns;
  }

  private calculateRecommendationScore(item: any, patterns: any): number {
    let score = 0;
    
    if (patterns.preferredTypes.includes(item.content_type)) {
      score += 0.4;
    }
    
    if (item.content_quality_score) {
      score += item.content_quality_score * 0.3;
    }
    
    // Recent content gets higher score
    const daysSinceUpdate = (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSinceUpdate) / 30) * 0.3;
    
    return Math.min(score, 1.0);
  }

  private async generateSearchVectors(content: any): Promise<any> {
    // Placeholder for text-to-vector conversion
    // In reality, this would use proper NLP/embedding services
    return {
      title: null,
      description: null,
      content: null,
      tags: null,
      combined: null
    };
  }

  private async extractAIKeywords(content: any): Promise<string[]> {
    // Placeholder for AI keyword extraction
    return [];
  }

  private calculateContentQuality(content: any): number {
    let score = 0.5; // Base score
    
    if (content.title && content.title.length > 5) score += 0.1;
    if (content.description && content.description.length > 20) score += 0.1;
    if (content.tags && content.tags.length > 0) score += 0.1;
    if (content.thumbnail_path) score += 0.1;
    if (content.file_size && content.file_size > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }
}

export const advancedSearchService = AdvancedSearchService.getInstance();