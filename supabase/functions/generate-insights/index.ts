import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting and retry utilities
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 8000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on non-rate-limit errors
      if (!error.message.includes('429') && !error.message.includes('Too Many Requests')) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // More aggressive exponential backoff with longer delays
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 3000; // Up to 3 seconds jitter
      const delayMs = Math.min(exponentialDelay + jitter, 180000); // Max 3 minutes
      
      console.log(`Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const OPENAI_API_KEY_SECONDARY = Deno.env.get('OPENAI_API_KEY_SECONDARY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!OPENAI_API_KEY && !OPENAI_API_KEY_SECONDARY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });
    const { projectId, competitors, project } = await req.json();

    console.log('Generating insights for project:', project.name, 'with', competitors.length, 'competitors');

    // Prepare competitor summary
    const competitorSummary = competitors.map(comp => ({
      name: comp.company_name,
      domain: comp.domain,
      industry: comp.industry,
      size: comp.company_size,
      tier: comp.competitive_tier,
      threat_level: comp.threat_level,
      description: comp.description,
      value_proposition: comp.value_proposition
    }));

    const systemPrompt = `You are a strategic business analyst. Generate comprehensive competitive insights and strategic recommendations based on project data and competitor analysis. Provide actionable strategic guidance for competitive positioning.`;

    const userPrompt = `Generate competitive insights for the project "${project.name}" in the ${project.industry} industry.

Project Details:
- Name: ${project.name}
- Industry: ${project.industry}
- Description: ${project.description || 'Not provided'}
- Objectives: ${JSON.stringify(project.primary_objectives || [])}
- Target Market: ${project.target_market || 'Not specified'}
- Status: ${project.status}

Competitors Analysis:
${competitorSummary.map(comp => `
- ${comp.name} (${comp.domain})
  - Industry: ${comp.industry || 'Not specified'}
  - Size: ${comp.size || 'Not specified'}
  - Tier: ${comp.tier}
  - Threat Level: ${comp.threat_level}
  - Description: ${comp.description || 'Not provided'}
  - Value Proposition: ${comp.value_proposition || 'Not provided'}
`).join('\n')}

Provide comprehensive analysis with:
1. Competitive landscape overview
2. Market opportunities identification
3. Strategic recommendations
4. Top competitive threats
5. Overall confidence assessment

Return response in this exact JSON format:
{
  "projectId": "${projectId}",
  "competitiveOverview": "comprehensive overview of the competitive landscape",
  "marketOpportunities": [
    "opportunity 1 description",
    "opportunity 2 description",
    "opportunity 3 description"
  ],
  "strategicRecommendations": [
    "strategic recommendation 1",
    "strategic recommendation 2", 
    "strategic recommendation 3"
  ],
  "topThreats": [
    "threat 1 description",
    "threat 2 description",
    "threat 3 description"
  ],
  "confidenceScore": 0.85,
  "generatedAt": "${new Date().toISOString()}"
}`;

    // Call OpenAI API with retry logic and key rotation
    async function callOpenAI(apiKey: string) {
      return retryWithExponentialBackoff(async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Use cheaper, faster model
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.4,
            max_tokens: 1800, // Slightly reduced to save tokens
          }),
        });

        if (!res.ok) {
          let errorBody: any = null;
          try { errorBody = await res.json(); } catch { errorBody = { error: await res.text() }; }
          const e: any = new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
          e.status = res.status;
          e.headers = Object.fromEntries(res.headers.entries());
          e.code = errorBody?.error?.code || errorBody?.error?.type || '';
          e.detail = errorBody?.error?.message || JSON.stringify(errorBody);
          if (res.status === 429) {
            const ra = res.headers.get('retry-after');
            if (ra) e.retryAfter = parseInt(ra, 10);
          }
          throw e;
        }
        
        return res;
      });
    }

    let activeKey = OPENAI_API_KEY || OPENAI_API_KEY_SECONDARY!;
    let response: Response;
    try {
      response = await callOpenAI(activeKey);
    } catch (err) {
      const msg = (err as Error).message || '';
      if (OPENAI_API_KEY_SECONDARY && (msg.includes('429') || msg.includes('401') || /unauthorized|invalid api key/i.test(msg))) {
        activeKey = OPENAI_API_KEY_SECONDARY;
        response = await callOpenAI(activeKey);
      } else {
        throw err;
      }
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    console.log('OpenAI insights response received');

    // Parse JSON response
    let insights;
    try {
      insights = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', content);
      // Fallback to structured response
      insights = {
        projectId: projectId,
        competitiveOverview: "Competitive analysis completed. " + content.substring(0, 500),
        marketOpportunities: [
          "Market opportunity analysis available in detailed report",
          "Further market research recommended",
          "Competitive positioning opportunities identified"
        ],
        strategicRecommendations: [
          "Strategic recommendations available in detailed analysis",
          "Further competitive analysis recommended",
          "Market positioning strategy development suggested"
        ],
        topThreats: [
          "Competitive threats identified in analysis",
          "Market competition monitoring recommended",
          "Competitive response strategy needed"
        ],
        confidenceScore: 0.7,
        generatedAt: new Date().toISOString()
      };
    }

    // Ensure all required fields are present
    const result = {
      projectId: insights.projectId || projectId,
      competitiveOverview: insights.competitiveOverview || "Competitive analysis completed",
      marketOpportunities: insights.marketOpportunities || [],
      strategicRecommendations: insights.strategicRecommendations || [],
      topThreats: insights.topThreats || [],
      confidenceScore: insights.confidenceScore || 0.7,
      generatedAt: insights.generatedAt || new Date().toISOString()
    };

    console.log('Project insights generated successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    const err: any = error || {};
    const retryAfter = err?.retryAfter || parseInt(err?.headers?.['retry-after'] || '60', 10) || 60;
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' } as Record<string,string>;
    
    // Insufficient quota → 402 Payment Required
    if (err?.code === 'insufficient_quota' || /insufficient_quota/i.test(err?.detail || err?.message || '')) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI quota exhausted. Please check your plan and billing or rotate the API key.',
        errorType: 'quota_exhausted',
        status: 'failed'
      }), {
        status: 402,
        headers,
      });
    }

    // Handle rate limiting specifically
    if (err?.status === 429 || /429|Too Many Requests|rate limited/i.test(err?.message || '')) {
      return new Response(JSON.stringify({ 
        error: 'AI analysis is temporarily rate limited. Please try again shortly.',
        errorType: 'rate_limited',
        status: 'failed',
        retryAfter
      }), {
        status: 429,
        headers: { ...headers, 'Retry-After': String(retryAfter) },
      });
    }
    
    // Handle other API errors
    if (err?.status === 401 || /Unauthorized|invalid api key/i.test(err?.detail || err?.message || '')) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key invalid or missing. Please update configuration.',
        errorType: 'unauthorized',
        status: 'failed'
      }), {
        status: 401,
        headers,
      });
    }

    if (err?.message?.includes('OpenAI API error') || err?.status === 503) {
      return new Response(JSON.stringify({ 
        error: 'AI analysis service is temporarily unavailable. Please try again later.',
        errorType: 'service_unavailable',
        status: 'failed'
      }), {
        status: 503,
        headers,
      });
    }
    
    // Generic error handling
    return new Response(JSON.stringify({ 
      error: 'Analysis failed due to an unexpected error.',
      errorType: 'internal_error',
      status: 'failed'
    }), {
      status: 500,
      headers,
    });
  }
});