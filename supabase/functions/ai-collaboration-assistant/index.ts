import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { withSecurity, validateInput, CircuitBreaker } from '../_shared/security.ts';

// Input sanitization for AI prompts
function sanitizeAIPrompt(content: string): string {
  if (!content) return '';
  
  // Remove potential prompt injection attempts
  return content
    .replace(/(?:ignore|forget|disregard)\s+(?:previous|above|all)\s+(?:instructions?|prompts?|context)/gi, '[filtered]')
    .replace(/(?:system|assistant|user):\s*$/gmi, '[filtered]')
    .replace(/```[\s\S]*?```/g, '[code block filtered]') // Remove code blocks
    .substring(0, 4000); // Limit prompt length
}

// Standardized circuit breaker configuration across all OpenAI functions
const openAICircuitBreaker = new CircuitBreaker(5, 120000, 30000); // 5 failures, 2 min timeout

const handler = withSecurity(async (req, logger) => {

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { content, sessionId, suggestionType = 'content_improvement' } = await req.json();
    
    logger.info('AI Assistant request', { 
      suggestionType, 
      sessionId, 
      contentLength: content?.length 
    });

    // Input validation
    const contentValidation = validateInput.text(content, 4000);
    if (!contentValidation.isValid) {
      throw new Error(`Content validation failed: ${contentValidation.error}`);
    }
    
    const sessionValidation = validateInput.uuid(sessionId);
    if (!sessionValidation.isValid) {
      throw new Error(`Session ID validation failed: ${sessionValidation.error}`);
    }

    // Sanitize AI prompt
    const sanitizedContent = sanitizeAIPrompt(content);

    // Get OpenAI API keys with fallback
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const openAIApiKeySecondary = Deno.env.get('OPENAI_API_KEY_SECONDARY');
    
    if (!openAIApiKey && !openAIApiKeySecondary) {
      logger.error('OpenAI API key not configured');
      throw new Error('AI service not configured');
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Call OpenAI API for suggestions with circuit breaker
    const systemPrompts = {
      content_improvement: "You are an expert content editor. Analyze the provided text and suggest improvements for clarity, readability, and engagement. Be specific and actionable. Do not reproduce sensitive information.",
      conflict_resolution: "You are a collaboration expert. Help resolve conflicts in collaborative editing by suggesting the best way to merge different versions. Do not reproduce sensitive information.",
      style_suggestion: "You are a writing style expert. Suggest improvements to tone, voice, and writing style while maintaining the original meaning. Do not reproduce sensitive information.",
      grammar_check: "You are a grammar and language expert. Identify and suggest corrections for grammar, spelling, and language issues. Do not reproduce sensitive information.",
      context_enhancement: "You are a content strategist. Suggest ways to enhance context, add relevant information, or improve structure. Do not reproduce sensitive information."
    };

    async function callOpenAI(apiKey: string) {
      return await openAICircuitBreaker.call(async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: systemPrompts[suggestionType as keyof typeof systemPrompts] || systemPrompts.content_improvement
              },
              {
                role: 'user',
                content: `Please analyze and provide suggestions for the following content:\n\n${sanitizedContent}`
              }
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('OpenAI API error', new Error(`${response.status}: ${response.statusText}`), {
            status: response.status,
            apiKeyUsed: apiKey ? 'primary' : 'secondary'
          });
          throw new Error(`AI service error: ${response.status}`);
        }

        return response.json();
      });
    }

    let aiResponse;
    try {
      aiResponse = await callOpenAI(openAIApiKey || openAIApiKeySecondary!);
    } catch (error) {
      if (openAIApiKeySecondary && openAIApiKey) {
        logger.warn('Primary API key failed, trying secondary');
        aiResponse = await callOpenAI(openAIApiKeySecondary);
      } else {
        throw error;
      }
    }

    const suggestion = aiResponse.choices[0]?.message?.content || 'No suggestions available';

    // Calculate confidence score based on content length and AI response quality
    const confidenceScore = Math.min(0.95, 0.6 + (suggestion.length / 1000) * 0.3);

    // Store suggestion in database
    const { data: suggestionData, error: insertError } = await supabaseClient
      .from('ai_suggestions')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        suggestion_type: suggestionType,
        original_content: content,
        suggested_content: suggestion,
        confidence_score: confidenceScore,
        metadata: {
          model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          content_length: content.length
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to store suggestion');
    }

    logger.info('AI suggestion created', { 
      suggestionId: suggestionData.id, 
      confidence: confidenceScore,
      suggestionType 
    });

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: suggestionData,
        aiResponse: suggestion,
        confidenceScore,
        metadata: {
          suggestionType,
          sessionId
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('AI Assistant error', error as Error);
    
    // Sanitize error message to avoid leaking sensitive info
    const sanitizedError = (error as Error).message.includes('API') 
      ? 'AI service temporarily unavailable' 
      : 'Request processing failed';
      
    return new Response(
      JSON.stringify({ 
        error: sanitizedError,
        success: false
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}, {
  requireAuth: true,
  rateLimitRequests: 20, // Allow 20 AI requests per minute per user
  rateLimitWindow: 60000,
  validateInput: true,
  enableCORS: true
});

Deno.serve(handler);