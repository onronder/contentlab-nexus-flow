import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withSecurity, validateInput, CircuitBreaker } from '../_shared/security.ts';
import { globalPerformanceMonitor } from '../_shared/monitoring.ts';

const openAICircuitBreaker = new CircuitBreaker(5, 120000, 60000); // More lenient for analysis

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

const handler = withSecurity(async (req, logger) => {
  const endTimer = globalPerformanceMonitor.startTimer('competitor_analysis');
  
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
    
    const requestBody = await req.json();
    const { competitor, analysisRequest } = requestBody;
    
    // Enhanced input validation
    if (!competitor || !analysisRequest) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: competitor and analysisRequest',
        status: 'failed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate competitor data
    const companyNameValidation = validateInput.text(competitor.company_name, 100);
    if (!companyNameValidation.isValid) {
      return new Response(JSON.stringify({
        error: `Invalid company name: ${companyNameValidation.error}`,
        status: 'failed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate domain if provided
    if (competitor.domain) {
      const domainValidation = validateInput.text(competitor.domain, 200);
      if (!domainValidation.isValid) {
        return new Response(JSON.stringify({
          error: `Invalid domain: ${domainValidation.error}`,
          status: 'failed'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Validate analysis type
    const validAnalysisTypes = ['positioning', 'content_gap', 'market_share'];
    if (!validAnalysisTypes.includes(analysisRequest.analysisType)) {
      return new Response(JSON.stringify({
        error: `Invalid analysis type. Must be one of: ${validAnalysisTypes.join(', ')}`,
        status: 'failed'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Starting competitor analysis', {
      company: competitor.company_name,
      domain: competitor.domain,
      analysis_type: analysisRequest.analysisType
    });

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

    // Call OpenAI API with circuit breaker and retry logic
    async function callOpenAI(apiKey: string) {
      return openAICircuitBreaker.call(async () => {
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
            temperature: 0.3,
            max_tokens: 1100, // Slightly reduced to save tokens
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

    logger.info('OpenAI response received', {
      tokens_used: data.usage?.total_tokens || 0,
      model: data.model
    });

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

    logger.info('Analysis completed successfully', {
      company: competitor.company_name,
      analysis_type: analysisRequest.analysisType,
      confidence_score: result.confidence_score
    });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Error in analyze-competitor function', error as Error, {
      company: req.url.includes('competitor') ? 'unknown' : undefined,
      circuit_state: openAICircuitBreaker.getState()
    });
    
    globalPerformanceMonitor.recordError(error as Error, 'competitor_analysis');
    
    const err: any = error || {};
    const retryAfter = err?.retryAfter || parseInt(err?.headers?.['retry-after'] || '60', 10) || 60;
    const headers = { 'Content-Type': 'application/json' } as Record<string,string>;

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
      status: 'failed',
      correlationId: logger.correlationId
    }), {
      status: 500,
      headers,
    });
  } finally {
    endTimer();
  }
}, {
  requireAuth: true,
  rateLimitRequests: 20, // Stricter rate limiting for AI operations
  rateLimitWindow: 60000,
  validateInput: true
});

Deno.serve(handler);