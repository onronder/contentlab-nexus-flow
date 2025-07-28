import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, domain, keywords, location = 'global', device = 'desktop' } = await req.json();

    if (action === 'analyze_visibility') {
      // Mock SERP API integration (replace with actual SERP API when keys are configured)
      const rankings = keywords.map((keyword: string, index: number) => {
        const position = Math.floor(Math.random() * 20) + 1; // Random position 1-20
        const searchVolume = Math.floor(Math.random() * 10000) + 100;
        const costPerClick = (Math.random() * 5 + 0.5).toFixed(2);
        
        return {
          id: crypto.randomUUID(),
          keyword,
          position,
          url: `https://${domain}/page-${index + 1}`,
          title: `${keyword} - ${domain} Page Title`,
          description: `Sample description for ${keyword} from ${domain}`,
          searchVolume,
          competitionLevel: position <= 3 ? 'high' : position <= 10 ? 'medium' : 'low',
          costPerClick: parseFloat(costPerClick),
          serpFeatures: position <= 5 ? ['featured_snippet'] : [],
          searchEngine: 'google'
        };
      });

      const response = {
        success: true,
        rankings,
        creditsUsed: keywords.length,
        timestamp: new Date().toISOString(),
        metadata: {
          domain,
          location,
          device,
          totalKeywords: keywords.length
        }
      };

      console.log(`SERP analysis completed for ${domain} with ${keywords.length} keywords`);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'track_rankings') {
      // Implementation for tracking ranking changes over time
      const { competitorId, keywordList } = await req.json();
      
      // Get historical data for comparison
      const { data: historicalData, error } = await supabase
        .from('competitor_serp_data')
        .select('*')
        .eq('competitor_id', competitorId)
        .in('keyword', keywordList)
        .order('created_at', { ascending: false })
        .limit(keywordList.length);

      if (error) {
        throw new Error(`Failed to fetch historical data: ${error.message}`);
      }

      // Mock current rankings and compare with historical
      const rankingChanges = keywordList.map((keyword: string) => {
        const historical = historicalData?.find(h => h.keyword === keyword);
        const currentPosition = Math.floor(Math.random() * 20) + 1;
        const previousPosition = historical?.position || null;
        
        return {
          keyword,
          currentPosition,
          previousPosition,
          change: previousPosition ? currentPosition - previousPosition : null,
          trend: previousPosition ? 
            (currentPosition < previousPosition ? 'up' : 
             currentPosition > previousPosition ? 'down' : 'stable') : 'new'
        };
      });

      return new Response(JSON.stringify({
        success: true,
        rankingChanges,
        creditsUsed: keywordList.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Real SERP API integration would go here when API keys are configured
    // For now, we'll use mock data to demonstrate the service structure

    return new Response(JSON.stringify({
      error: 'Invalid action specified'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in SERP analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});