import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { competitor, analysisRequest } = await req.json();

    console.log('Starting analysis for competitor:', competitor.company_name);

    // Prepare analysis prompt based on type
    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisRequest.analysisType) {
      case 'positioning':
        systemPrompt = `You are a competitive intelligence analyst. Analyze the competitive positioning of companies based on provided data. Return structured JSON with insights, confidence scores, and recommendations.`;
        userPrompt = `Analyze the competitive positioning of ${competitor.company_name} in the ${competitor.industry || 'general'} industry.

Company Details:
- Name: ${competitor.company_name}
- Domain: ${competitor.domain}
- Industry: ${competitor.industry || 'Not specified'}
- Description: ${competitor.description || 'Not provided'}
- Company Size: ${competitor.company_size || 'Not specified'}
- Founded: ${competitor.founded_year || 'Not specified'}
- Headquarters: ${competitor.headquarters || 'Not specified'}
- Value Proposition: ${competitor.value_proposition || 'Not provided'}

Provide analysis on:
1. Market positioning strengths
2. Competitive advantages
3. Potential weaknesses
4. Market opportunities
5. Strategic recommendations

Return response in this exact JSON format:
{
  "insights": {
    "positioning_strengths": ["strength1", "strength2"],
    "competitive_advantages": ["advantage1", "advantage2"],
    "potential_weaknesses": ["weakness1", "weakness2"],
    "market_opportunities": ["opportunity1", "opportunity2"],
    "strategic_summary": "brief summary"
  },
  "confidence_score": 0.85,
  "recommendations": ["recommendation1", "recommendation2"],
  "parameters": {
    "analysis_type": "positioning",
    "competitor_domain": "${competitor.domain}",
    "industry": "${competitor.industry || 'general'}"
  }
}`;
        break;

      case 'content_gap':
        systemPrompt = `You are a content strategy analyst. Identify content gaps and opportunities based on competitor analysis.`;
        userPrompt = `Perform content gap analysis for ${competitor.company_name}.

Company Details:
- Name: ${competitor.company_name}
- Domain: ${competitor.domain}
- Industry: ${competitor.industry || 'general'}
- Description: ${competitor.description || 'Not provided'}
- Value Proposition: ${competitor.value_proposition || 'Not provided'}
${analysisRequest.projectObjectives ? `- Project Objectives: ${analysisRequest.projectObjectives.join(', ')}` : ''}

Analyze content strategy and identify:
1. Content themes they likely cover
2. Content gaps that could be exploited
3. Content quality assessment
4. Recommended content strategies
5. Priority content opportunities

Return response in this exact JSON format:
{
  "insights": {
    "content_themes": ["theme1", "theme2"],
    "content_gaps": ["gap1", "gap2"],
    "quality_assessment": "assessment",
    "content_opportunities": ["opportunity1", "opportunity2"],
    "content_summary": "brief summary"
  },
  "confidence_score": 0.80,
  "recommendations": ["recommendation1", "recommendation2"],
  "parameters": {
    "analysis_type": "content_gap",
    "competitor_domain": "${competitor.domain}",
    "industry": "${competitor.industry || 'general'}"
  }
}`;
        break;

      case 'market_share':
        systemPrompt = `You are a market research analyst. Estimate market share and competitive positioning.`;
        userPrompt = `Analyze market share positioning for ${competitor.company_name}.

Company Details:
- Name: ${competitor.company_name}
- Domain: ${competitor.domain}
- Industry: ${competitor.industry || 'general'}
- Company Size: ${competitor.company_size || 'Not specified'}
- Market Size: ${competitor.market_size || 'Not specified'}
- Revenue Range: ${competitor.revenue_range || 'Not specified'}

Provide analysis on:
1. Estimated market share
2. Market position relative to competitors
3. Growth trajectory indicators
4. Market penetration strategies
5. Competitive threats

Return response in this exact JSON format:
{
  "insights": {
    "market_share_estimate": "estimate",
    "market_position": "position description",
    "growth_indicators": ["indicator1", "indicator2"],
    "penetration_strategies": ["strategy1", "strategy2"],
    "competitive_threats": ["threat1", "threat2"]
  },
  "confidence_score": 0.75,
  "recommendations": ["recommendation1", "recommendation2"],
  "parameters": {
    "analysis_type": "market_share",
    "competitor_domain": "${competitor.domain}",
    "industry": "${competitor.industry || 'general'}"
  }
}`;
        break;

      default:
        throw new Error(`Unsupported analysis type: ${analysisRequest.analysisType}`);
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log('OpenAI response received');

    // Parse JSON response
    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      // Fallback to structured response
      analysisResult = {
        insights: {
          summary: content,
          analysis_type: analysisRequest.analysisType
        },
        confidence_score: 0.7,
        recommendations: ["Further analysis recommended"],
        parameters: {
          analysis_type: analysisRequest.analysisType,
          competitor_domain: competitor.domain,
          industry: competitor.industry || 'general'
        }
      };
    }

    // Add metadata
    const result = {
      competitorId: competitor.id,
      analysisType: analysisRequest.analysisType,
      insights: analysisResult.insights,
      confidence_score: analysisResult.confidence_score || 0.7,
      recommendations: analysisResult.recommendations || [],
      parameters: analysisResult.parameters || {},
      status: 'completed',
      created_at: new Date().toISOString()
    };

    console.log('Analysis completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-competitor function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      status: 'failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});