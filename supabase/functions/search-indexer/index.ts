import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import { withSecurity, SecurityLogger } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  action: 'index' | 'search' | 'recommend' | 'analyze';
  projectId?: string;
  teamId?: string;
  query?: string;
  contentId?: string;
  filters?: {
    contentType?: string[];
    dateRange?: { start: string; end: string };
    tags?: string[];
    quality?: { min: number; max: number };
  };
  options?: {
    limit?: number;
    offset?: number;
    includeVectorSearch?: boolean;
    enableSemanticSearch?: boolean;
  };
}

const handler = async (req: Request, logger: SecurityLogger): Promise<Response> => {
  try {
    logger.info('Search indexer request received');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      action, 
      projectId, 
      teamId, 
      query, 
      contentId,
      filters = {},
      options = {}
    }: SearchRequest = await req.json();

    console.log(`Search Indexer: Executing ${action} action`);

    let results: any = {
      action,
      executedAt: new Date().toISOString()
    };

    switch (action) {
      case 'index':
        results = await indexContent(supabase, projectId, teamId);
        break;
      
      case 'search':
        results = await performSearch(supabase, query || '', filters, options);
        break;
      
      case 'recommend':
        results = await generateRecommendations(supabase, contentId || '', options);
        break;
      
      case 'analyze':
        results = await analyzeSearchPatterns(supabase, projectId);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    logger.info('Search indexer operation completed', { action });
    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    logger.error('Search indexer operation failed', error, { action: req.url });
    return new Response(JSON.stringify({
      error: error.message || 'Search operation failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export default withSecurity(handler, {
  requireAuth: true,
  rateLimitRequests: 50,
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});

async function indexContent(supabase: any, projectId?: string, teamId?: string) {
  console.log('Starting content indexing process');

  // Get content items to index
  let query = supabase
    .from('content_items')
    .select('id, title, description, content_type, metadata, ai_tags, created_at, updated_at');

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);

  const { data: content, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch content for indexing: ${error.message}`);
  }

  let indexedCount = 0;
  const errors: string[] = [];
  const indexResults: any[] = [];

  for (const item of content || []) {
    try {
      // Generate search vectors
      const vectors = generateSearchVectors(item);
      
      // Extract and enhance keywords
      const keywords = extractEnhancedKeywords(item);
      
      // Calculate quality score
      const qualityScore = calculateContentQuality(item);
      
      // Generate visual features for images
      const visualFeatures = item.content_type?.startsWith('image/') 
        ? await generateVisualFeatures(item) 
        : {};

      // Update search index
      const { error: indexError } = await supabase
        .from('content_search_index')
        .upsert({
          content_id: item.id,
          title_vector: vectors.title,
          content_vector: vectors.content,
          description_vector: vectors.description,
          combined_vector: vectors.combined,
          tag_vector: vectors.tags,
          ai_keywords: keywords,
          content_quality_score: qualityScore,
          visual_features: visualFeatures,
          language: detectLanguage(item.title + ' ' + item.description),
          last_indexed_at: new Date().toISOString(),
          index_version: 2
        }, {
          onConflict: 'content_id'
        });

      if (indexError) {
        errors.push(`Failed to index ${item.id}: ${indexError.message}`);
        continue;
      }

      indexResults.push({
        contentId: item.id,
        vectors: Object.keys(vectors).length,
        keywords: keywords.length,
        qualityScore
      });

      indexedCount++;
    } catch (error: any) {
      errors.push(`Error indexing ${item.id}: ${error.message}`);
    }
  }

  return {
    action: 'index',
    processed: indexedCount,
    totalItems: content?.length || 0,
    indexResults,
    errors,
    indexedAt: new Date().toISOString()
  };
}

async function performSearch(supabase: any, query: string, filters: any, options: any) {
  console.log(`Performing search for query: "${query}"`);

  const { limit = 20, offset = 0, includeVectorSearch = true, enableSemanticSearch = true } = options;

  // Build search query
  let searchQuery = supabase
    .from('content_search_index')
    .select(`
      content_id,
      ai_keywords,
      content_quality_score,
      visual_features,
      last_indexed_at,
      content_items!inner(
        id,
        title,
        description,
        content_type,
        file_path,
        thumbnail_path,
        created_at,
        updated_at,
        status,
        ai_tags,
        metadata
      )
    `)
    .range(offset, offset + limit - 1);

  // Apply text search if query provided
  if (query.trim()) {
    if (includeVectorSearch) {
      // Use full-text search on combined vector
      searchQuery = searchQuery.textSearch('combined_vector', query, {
        type: 'websearch',
        config: 'english'
      });
    } else {
      // Simple text matching
      searchQuery = searchQuery.or(
        `content_items.title.ilike.%${query}%,content_items.description.ilike.%${query}%`
      );
    }
  }

  // Apply filters
  if (filters.contentType?.length) {
    searchQuery = searchQuery.in('content_items.content_type', filters.contentType);
  }

  if (filters.dateRange) {
    searchQuery = searchQuery
      .gte('content_items.created_at', filters.dateRange.start)
      .lte('content_items.created_at', filters.dateRange.end);
  }

  if (filters.quality) {
    searchQuery = searchQuery
      .gte('content_quality_score', filters.quality.min)
      .lte('content_quality_score', filters.quality.max);
  }

  if (filters.tags?.length) {
    searchQuery = searchQuery.overlaps('content_items.ai_tags', filters.tags);
  }

  // Execute search
  const { data: searchResults, error } = await searchQuery
    .order('content_quality_score', { ascending: false })
    .order('content_items.created_at', { ascending: false });

  if (error) {
    throw new Error(`Search query failed: ${error.message}`);
  }

  // Enhance results with semantic similarity if enabled
  let enhancedResults = searchResults || [];
  if (enableSemanticSearch && query.trim()) {
    enhancedResults = await addSemanticScoring(enhancedResults, query);
  }

  // Generate search analytics
  const analytics = generateSearchAnalytics(enhancedResults, query, filters);

  return {
    action: 'search',
    query,
    filters,
    results: enhancedResults.map(result => ({
      ...result.content_items,
      searchMetadata: {
        qualityScore: result.content_quality_score,
        keywords: result.ai_keywords,
        visualFeatures: result.visual_features,
        relevanceScore: result.relevanceScore || 1.0
      }
    })),
    pagination: {
      offset,
      limit,
      total: enhancedResults.length,
      hasMore: enhancedResults.length === limit
    },
    analytics
  };
}

async function generateRecommendations(supabase: any, contentId: string, options: any) {
  console.log(`Generating recommendations for content: ${contentId}`);

  // Get source content
  const { data: sourceContent, error: sourceError } = await supabase
    .from('content_search_index')
    .select(`
      *,
      content_items!inner(*)
    `)
    .eq('content_id', contentId)
    .single();

  if (sourceError || !sourceContent) {
    throw new Error('Source content not found for recommendations');
  }

  // Find similar content using various strategies
  const recommendations = await Promise.all([
    findSimilarByKeywords(supabase, sourceContent),
    findSimilarByTags(supabase, sourceContent),
    findSimilarByType(supabase, sourceContent),
    findTrendingContent(supabase, sourceContent)
  ]);

  // Combine and deduplicate recommendations
  const allRecommendations = recommendations.flat();
  const uniqueRecommendations = deduplicateRecommendations(allRecommendations, contentId);

  // Score and rank recommendations
  const scoredRecommendations = scoreRecommendations(uniqueRecommendations, sourceContent);

  return {
    action: 'recommend',
    sourceContentId: contentId,
    recommendations: scoredRecommendations.slice(0, options.limit || 10),
    strategies: {
      keywords: recommendations[0].length,
      tags: recommendations[1].length,
      contentType: recommendations[2].length,
      trending: recommendations[3].length
    },
    generatedAt: new Date().toISOString()
  };
}

async function analyzeSearchPatterns(supabase: any, projectId?: string) {
  console.log('Analyzing search patterns and content performance');

  // Get content analytics
  let query = supabase
    .from('content_items')
    .select('content_type, ai_tags, access_count, created_at, content_quality_score');

  if (projectId) query = query.eq('project_id', projectId);

  const { data: content, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch content for analysis: ${error.message}`);
  }

  const analysis = {
    contentDistribution: analyzeContentDistribution(content || []),
    popularTags: analyzePopularTags(content || []),
    qualityMetrics: analyzeQualityMetrics(content || []),
    accessPatterns: analyzeAccessPatterns(content || []),
    recommendations: generateAnalysisRecommendations(content || [])
  };

  return {
    action: 'analyze',
    projectId,
    analysis,
    totalContent: content?.length || 0,
    analyzedAt: new Date().toISOString()
  };
}

// Helper functions
function generateSearchVectors(item: any): any {
  const title = item.title || '';
  const description = item.description || '';
  const tags = (item.ai_tags || []).join(' ');
  const extractedText = item.metadata?.extractedText || '';

  return {
    title,
    content: extractedText,
    description,
    combined: `${title} ${description} ${tags} ${extractedText}`.trim(),
    tags
  };
}

function extractEnhancedKeywords(item: any): string[] {
  const keywords = new Set<string>();
  
  // Extract from AI tags
  (item.ai_tags || []).forEach((tag: string) => keywords.add(tag.toLowerCase()));
  
  // Extract from title and description
  const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
  const words = text.match(/\b\w{3,}\b/g) || [];
  words.forEach(word => keywords.add(word));

  // Extract from AI analysis if available
  if (item.metadata?.aiAnalysis?.topics?.primaryTopics) {
    item.metadata.aiAnalysis.topics.primaryTopics.forEach((topic: string) => 
      keywords.add(topic.toLowerCase())
    );
  }

  return Array.from(keywords).slice(0, 20); // Limit to top 20 keywords
}

function calculateContentQuality(item: any): number {
  let score = 50; // Base score

  // Title quality
  if (item.title && item.title.length > 10) score += 10;
  if (item.title && item.title.length > 20) score += 5;

  // Description quality
  if (item.description && item.description.length > 50) score += 10;
  if (item.description && item.description.length > 100) score += 5;

  // AI analysis quality
  if (item.metadata?.aiAnalysis?.quality?.score) {
    score += Math.min(item.metadata.aiAnalysis.quality.score * 0.3, 30);
  }

  // Tags and metadata
  if (item.ai_tags && item.ai_tags.length > 0) score += 5;
  if (item.ai_tags && item.ai_tags.length > 3) score += 5;

  return Math.min(Math.max(score, 0), 100);
}

async function generateVisualFeatures(item: any): Promise<any> {
  // Simulate visual feature extraction for images
  if (!item.content_type?.startsWith('image/')) return {};

  return {
    colors: ['#FF5733', '#33FF57', '#3357FF'], // Dominant colors
    brightness: Math.random() * 100,
    contrast: Math.random() * 100,
    saturation: Math.random() * 100,
    composition: ['rule-of-thirds', 'centered', 'symmetric'][Math.floor(Math.random() * 3)],
    objects: ['person', 'landscape', 'text', 'logo'].filter(() => Math.random() > 0.7)
  };
}

function detectLanguage(text: string): string {
  // Simple language detection (could be enhanced with ML)
  const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = text.toLowerCase().split(/\s+/);
  const englishWordCount = words.filter(word => englishWords.includes(word)).length;
  
  return englishWordCount > words.length * 0.1 ? 'en' : 'unknown';
}

async function addSemanticScoring(results: any[], query: string): Promise<any[]> {
  // Simulate semantic similarity scoring
  return results.map(result => ({
    ...result,
    relevanceScore: calculateSemanticSimilarity(result, query)
  })).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateSemanticSimilarity(result: any, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const contentText = `${result.content_items?.title || ''} ${result.content_items?.description || ''}`.toLowerCase();
  
  let matchCount = 0;
  queryWords.forEach(word => {
    if (contentText.includes(word)) matchCount++;
  });

  return queryWords.length > 0 ? matchCount / queryWords.length : 0;
}

function generateSearchAnalytics(results: any[], query: string, filters: any): any {
  return {
    totalResults: results.length,
    avgQualityScore: results.reduce((sum, r) => sum + (r.content_quality_score || 0), 0) / (results.length || 1),
    contentTypes: [...new Set(results.map(r => r.content_items?.content_type))],
    queryLength: query.length,
    filtersApplied: Object.keys(filters).length,
    searchComplexity: query.split(/\s+/).length > 3 ? 'complex' : 'simple'
  };
}

async function findSimilarByKeywords(supabase: any, sourceContent: any): Promise<any[]> {
  const keywords = sourceContent.ai_keywords || [];
  if (keywords.length === 0) return [];

  const { data } = await supabase
    .from('content_search_index')
    .select('content_id, ai_keywords, content_items!inner(*)')
    .overlaps('ai_keywords', keywords)
    .neq('content_id', sourceContent.content_id)
    .limit(10);

  return data || [];
}

async function findSimilarByTags(supabase: any, sourceContent: any): Promise<any[]> {
  const tags = sourceContent.content_items?.ai_tags || [];
  if (tags.length === 0) return [];

  const { data } = await supabase
    .from('content_items')
    .select('*')
    .overlaps('ai_tags', tags)
    .neq('id', sourceContent.content_id)
    .limit(10);

  return (data || []).map(item => ({ content_items: item }));
}

async function findSimilarByType(supabase: any, sourceContent: any): Promise<any[]> {
  const contentType = sourceContent.content_items?.content_type;
  if (!contentType) return [];

  const { data } = await supabase
    .from('content_items')
    .select('*')
    .eq('content_type', contentType)
    .neq('id', sourceContent.content_id)
    .order('access_count', { ascending: false })
    .limit(5);

  return (data || []).map(item => ({ content_items: item }));
}

async function findTrendingContent(supabase: any, sourceContent: any): Promise<any[]> {
  const { data } = await supabase
    .from('content_items')
    .select('*')
    .gte('access_count', 5)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .neq('id', sourceContent.content_id)
    .order('access_count', { ascending: false })
    .limit(5);

  return (data || []).map(item => ({ content_items: item }));
}

function deduplicateRecommendations(recommendations: any[], excludeId: string): any[] {
  const seen = new Set([excludeId]);
  return recommendations.filter(rec => {
    const id = rec.content_items?.id || rec.content_id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function scoreRecommendations(recommendations: any[], sourceContent: any): any[] {
  return recommendations.map(rec => ({
    ...rec,
    recommendationScore: Math.random() * 100 // Simplified scoring
  })).sort((a, b) => b.recommendationScore - a.recommendationScore);
}

function analyzeContentDistribution(content: any[]): any {
  const typeDistribution = content.reduce((acc, item) => {
    const type = item.content_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(typeDistribution).map(([type, count]) => ({ type, count }));
}

function analyzePopularTags(content: any[]): any[] {
  const tagCounts = content.reduce((acc, item) => {
    (item.ai_tags || []).forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  return Object.entries(tagCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));
}

function analyzeQualityMetrics(content: any[]): any {
  const scores = content.map(item => item.content_quality_score || 0).filter(score => score > 0);
  
  return {
    average: scores.reduce((sum, score) => sum + score, 0) / (scores.length || 1),
    median: scores.sort()[Math.floor(scores.length / 2)] || 0,
    distribution: {
      low: scores.filter(s => s < 40).length,
      medium: scores.filter(s => s >= 40 && s < 70).length,
      high: scores.filter(s => s >= 70).length
    }
  };
}

function analyzeAccessPatterns(content: any[]): any {
  const accessCounts = content.map(item => item.access_count || 0);
  const totalAccess = accessCounts.reduce((sum, count) => sum + count, 0);
  
  return {
    totalAccess,
    averageAccess: totalAccess / (content.length || 1),
    mostAccessed: Math.max(...accessCounts),
    distribution: {
      noAccess: accessCounts.filter(c => c === 0).length,
      lowAccess: accessCounts.filter(c => c > 0 && c < 10).length,
      mediumAccess: accessCounts.filter(c => c >= 10 && c < 100).length,
      highAccess: accessCounts.filter(c => c >= 100).length
    }
  };
}

function generateAnalysisRecommendations(content: any[]): string[] {
  const recommendations: string[] = [];
  
  const lowQualityCount = content.filter(item => (item.content_quality_score || 0) < 40).length;
  if (lowQualityCount > 0) {
    recommendations.push(`Improve quality for ${lowQualityCount} low-quality content items`);
  }

  const untaggedCount = content.filter(item => !item.ai_tags || item.ai_tags.length === 0).length;
  if (untaggedCount > 0) {
    recommendations.push(`Add tags to ${untaggedCount} untagged content items`);
  }

  const noAccessCount = content.filter(item => (item.access_count || 0) === 0).length;
  if (noAccessCount > 0) {
    recommendations.push(`Promote ${noAccessCount} content items with no access`);
  }

  return recommendations;
}