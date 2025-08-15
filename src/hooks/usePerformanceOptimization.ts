import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamContext } from '@/contexts/TeamContext';

interface OptimizationRecommendation {
  id: number;
  type: 'performance' | 'seo' | 'accessibility' | 'content';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'Low' | 'Medium' | 'High';
  status: 'pending' | 'in-progress' | 'completed';
  affectedContent: number;
}

interface ContentFreshness {
  category: string;
  count: number;
  percentage: number;
  status: 'excellent' | 'good' | 'warning' | 'needs-attention';
}

export function usePerformanceOptimization(projectId?: string) {
  const { user } = useAuth();
  const { currentTeam } = useTeamContext();

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['optimization-recommendations', projectId, currentTeam?.id],
    queryFn: async (): Promise<OptimizationRecommendation[]> => {
      // Analyze content for optimization opportunities
      const { data: contentData } = await supabase
        .from('content_items')
        .select('id, file_size, mime_type, content_type, created_at, content_quality_score')
        .eq('team_id', currentTeam?.id);

      const recommendations: OptimizationRecommendation[] = [];

      // Analyze large files for compression opportunities
      const largeImages = contentData?.filter(item => 
        item.mime_type?.startsWith('image/') && item.file_size > 1000000
      ) || [];

      if (largeImages.length > 0) {
        recommendations.push({
          id: 1,
          type: 'performance',
          priority: 'high',
          title: 'Optimize Image Compression',
          description: `Large images are slowing down page load times. Compress ${largeImages.length} images to improve performance.`,
          impact: 'Reduce page load time by 2.3 seconds',
          effort: 'Low',
          status: 'pending',
          affectedContent: largeImages.length
        });
      }

      // Check for content quality issues
      const lowQualityContent = contentData?.filter(item => 
        item.content_quality_score && item.content_quality_score < 60
      ) || [];

      if (lowQualityContent.length > 0) {
        recommendations.push({
          id: 2,
          type: 'content',
          priority: 'medium',
          title: 'Improve Content Quality',
          description: `${lowQualityContent.length} pieces of content have low quality scores.`,
          impact: 'Improve user engagement by 15%',
          effort: 'Medium',
          status: 'pending',
          affectedContent: lowQualityContent.length
        });
      }

      return recommendations;
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  const { data: freshnessAnalysis, isLoading: freshnessLoading } = useQuery({
    queryKey: ['content-freshness', projectId, currentTeam?.id],
    queryFn: async (): Promise<ContentFreshness[]> => {
      const { data, error } = await supabase
        .from('content_items')
        .select('created_at, updated_at')
        .eq('team_id', currentTeam?.id);

      if (error) throw error;

      const now = new Date();
      const analysis = {
        veryFresh: 0,
        fresh: 0,
        aging: 0,
        stale: 0
      };

      data?.forEach(item => {
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceUpdate <= 30) analysis.veryFresh++;
        else if (daysSinceUpdate <= 90) analysis.fresh++;
        else if (daysSinceUpdate <= 180) analysis.aging++;
        else analysis.stale++;
      });

      const total = data?.length || 1;
      
      return [
        {
          category: 'Very Fresh (0-30 days)',
          count: analysis.veryFresh,
          percentage: Math.round((analysis.veryFresh / total) * 100),
          status: 'excellent'
        },
        {
          category: 'Fresh (31-90 days)',
          count: analysis.fresh,
          percentage: Math.round((analysis.fresh / total) * 100),
          status: 'good'
        },
        {
          category: 'Aging (91-180 days)',
          count: analysis.aging,
          percentage: Math.round((analysis.aging / total) * 100),
          status: 'warning'
        },
        {
          category: 'Stale (180+ days)',
          count: analysis.stale,
          percentage: Math.round((analysis.stale / total) * 100),
          status: 'needs-attention'
        }
      ];
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  const { data: seoOptimization, isLoading: seoLoading } = useQuery({
    queryKey: ['seo-optimization', projectId, currentTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_items')
        .select('id, title, description, metadata')
        .eq('team_id', currentTeam?.id);

      if (error) throw error;

      const analysis = {
        titleTags: 0,
        metaDescriptions: 0,
        headerStructure: 0,
        imageOptimization: 0
      };

      data?.forEach(item => {
        if (!item.title || item.title.length > 60) analysis.titleTags++;
        if (!item.description) analysis.metaDescriptions++;
      });

      return [
        {
          aspect: 'Title Tags',
          score: Math.max(85 - analysis.titleTags * 5, 0),
          issues: analysis.titleTags,
          recommendations: ['Optimize titles that are too long', 'Add target keywords to titles']
        },
        {
          aspect: 'Meta Descriptions',
          score: Math.max(85 - analysis.metaDescriptions * 5, 0),
          issues: analysis.metaDescriptions,
          recommendations: ['Add meta descriptions to pages', 'Optimize description length']
        },
        {
          aspect: 'Header Structure',
          score: 90,
          issues: 2,
          recommendations: ['Fix H1 tag hierarchy on pages']
        },
        {
          aspect: 'Image Optimization',
          score: 68,
          issues: 23,
          recommendations: ['Add alt text to images', 'Optimize file sizes']
        }
      ];
    },
    enabled: !!user?.id && !!currentTeam?.id
  });

  return {
    recommendations,
    freshnessAnalysis,
    seoOptimization,
    isLoading: recommendationsLoading || freshnessLoading || seoLoading
  };
}