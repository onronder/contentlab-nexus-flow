import { supabase } from '@/integrations/supabase/client';
import { Competitor, CompetitorAnalysisMetadata } from '@/types/competitors';

export interface AnalysisRequest {
  competitorId: string;
  analysisType: 'positioning' | 'content_gap' | 'market_share' | 'feature_comparison' | 'pricing' | 'marketing';
  projectObjectives?: string[];
  industryContext?: string;
}

export interface AnalysisResult {
  id: string;
  competitorId: string;
  analysisType: string;
  insights: Record<string, any>;
  confidence_score: number;
  recommendations: string[];
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ProjectInsights {
  projectId: string;
  competitiveOverview: string;
  marketOpportunities: string[];
  strategicRecommendations: string[];
  topThreats: string[];
  confidenceScore: number;
  generatedAt: string;
}

export class AIAnalysisService {
  private static instance: AIAnalysisService;

  static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  private constructor() {}

  /**
   * Analyze a specific competitor using AI
   */
  async analyzeCompetitor(
    competitorId: string,
    analysisType: AnalysisRequest['analysisType'] = 'positioning'
  ): Promise<AnalysisResult> {
    try {
      // Get competitor data
      const competitor = await this.getCompetitorData(competitorId);
      if (!competitor) {
        throw new Error('Competitor not found');
      }

      // Create analysis request
      const analysisRequest: AnalysisRequest = {
        competitorId,
        analysisType,
        industryContext: competitor.industry || 'general'
      };

      // Call the analyze-competitor edge function
      const { data, error } = await supabase.functions.invoke('analyze-competitor', {
        body: { 
          competitor,
          analysisRequest
        }
      });

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(`Analysis failed: ${error.message}`);
      }

      // Store results in database
      const result = await this.storeAnalysisResult(data);
      
      // Update competitor's last_analyzed timestamp
      await this.updateCompetitorAnalysisTimestamp(competitorId);

      return result;
    } catch (error) {
      console.error('Competitor analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate project-wide competitive insights
   */
  async generateCompetitiveInsights(projectId: string): Promise<ProjectInsights> {
    try {
      // Get all competitors for the project
      const { data: competitors, error: competitorsError } = await supabase
        .from('project_competitors')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'active');

      if (competitorsError) {
        throw new Error(`Failed to fetch competitors: ${competitorsError.message}`);
      }

      if (!competitors || competitors.length === 0) {
        throw new Error('No active competitors found for this project');
      }

      // Get project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) {
        throw new Error(`Failed to fetch project: ${projectError.message}`);
      }

      // Call the generate-insights edge function
      const { data, error: insightsError } = await supabase.functions.invoke('generate-insights', {
        body: { 
          projectId,
          competitors,
          project
        }
      });

      if (insightsError) {
        console.error('Insights generation error:', insightsError);
        throw new Error(`Insights generation failed: ${insightsError.message}`);
      }

      return data;
    } catch (error) {
      console.error('Project insights generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze market position of a competitor
   */
  async analyzeMarketPosition(competitorId: string, projectId: string): Promise<AnalysisResult> {
    return this.analyzeCompetitor(competitorId, 'positioning');
  }

  /**
   * Identify content gaps for a competitor
   */
  async identifyContentGaps(competitorId: string, projectId: string): Promise<AnalysisResult> {
    return this.analyzeCompetitor(competitorId, 'content_gap');
  }

  /**
   * Generate strategic recommendations for a project
   */
  async generateStrategicRecommendations(projectId: string): Promise<string[]> {
    const insights = await this.generateCompetitiveInsights(projectId);
    return insights.strategicRecommendations;
  }

  /**
   * Start bulk analysis for multiple competitors
   */
  async bulkAnalyzeCompetitors(
    competitorIds: string[],
    analysisType: AnalysisRequest['analysisType'] = 'positioning'
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    
    // Process competitors in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < competitorIds.length; i += batchSize) {
      const batch = competitorIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.analyzeCompetitor(id, analysisType));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error(`Analysis failed for competitor ${batch[index]}:`, result.reason);
          }
        });
      } catch (error) {
        console.error('Batch analysis error:', error);
      }

      // Add delay between batches to respect rate limits
      if (i + batchSize < competitorIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  /**
   * Get analysis history for a competitor
   */
  async getAnalysisHistory(competitorId: string): Promise<CompetitorAnalysisMetadata[]> {
    const { data, error } = await supabase
      .from('competitor_analysis_metadata')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch analysis history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Cancel a running analysis
   */
  async cancelAnalysis(analysisId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('competitor_analysis_metadata')
        .update({ status: 'cancelled' })
        .eq('id', analysisId)
        .eq('status', 'pending');

      if (error) {
        throw new Error(`Failed to cancel analysis: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Cancel analysis failed:', error);
      return false;
    }
  }

  /**
   * Get estimated cost for analysis
   */
  getAnalysisCostEstimate(
    competitorCount: number,
    analysisType: AnalysisRequest['analysisType']
  ): { estimatedTokens: number; estimatedCost: number } {
    // Rough estimates based on analysis complexity
    const baseTokens = {
      positioning: 3000,
      content_gap: 3500,
      market_share: 2500,
      feature_comparison: 4000,
      pricing: 2000,
      marketing: 3200
    };

    const tokensPerCompetitor = baseTokens[analysisType];
    const totalTokens = tokensPerCompetitor * competitorCount;
    
    // GPT-4 pricing (approximate): $0.03 per 1K input tokens, $0.06 per 1K output tokens
    // Assume 70% input, 30% output
    const inputCost = (totalTokens * 0.7) / 1000 * 0.03;
    const outputCost = (totalTokens * 0.3) / 1000 * 0.06;
    const estimatedCost = inputCost + outputCost;

    return {
      estimatedTokens: totalTokens,
      estimatedCost: Number(estimatedCost.toFixed(4))
    };
  }

  // Private helper methods

  private async getCompetitorData(competitorId: string): Promise<Competitor | null> {
    const { data, error } = await supabase
      .from('project_competitors')
      .select('*')
      .eq('id', competitorId)
      .single();

    if (error) {
      console.error('Error fetching competitor:', error);
      return null;
    }

    return data as any; // Cast to any to handle database type differences
  }

  private async storeAnalysisResult(analysisData: any): Promise<AnalysisResult> {
    const { data, error } = await supabase
      .from('competitor_analysis_metadata')
      .insert({
        competitor_id: analysisData.competitorId,
        analysis_type: analysisData.analysisType,
        status: 'completed',
        confidence_score: analysisData.confidence_score,
        results_summary: analysisData.insights,
        parameters: analysisData.parameters || {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store analysis result: ${error.message}`);
    }

    return {
      id: data.id,
      competitorId: data.competitor_id,
      analysisType: data.analysis_type,
      insights: (data.results_summary as Record<string, any>) || {},
      confidence_score: data.confidence_score,
      recommendations: analysisData.recommendations || [],
      created_at: data.created_at,
      status: data.status as 'pending' | 'processing' | 'completed' | 'failed'
    };
  }

  private async updateCompetitorAnalysisTimestamp(competitorId: string): Promise<void> {
    const { error } = await supabase
      .from('project_competitors')
      .update({ 
        last_analyzed: new Date().toISOString()
        // Note: analysis_count increment handled by database trigger
      })
      .eq('id', competitorId);

    if (error) {
      console.error('Failed to update competitor timestamp:', error);
    }
  }
}

// Export singleton instance
export const aiAnalysisService = AIAnalysisService.getInstance();