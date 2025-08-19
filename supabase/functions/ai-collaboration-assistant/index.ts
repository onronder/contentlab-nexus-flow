import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { content, sessionId, suggestionType = 'content_improvement' } = await req.json();
    
    console.log(`AI Assistant request: type=${suggestionType}, sessionId=${sessionId}`);

    if (!content || !sessionId) {
      throw new Error('Content and sessionId are required');
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Call OpenAI API for suggestions
    const systemPrompts = {
      content_improvement: "You are an expert content editor. Analyze the provided text and suggest improvements for clarity, readability, and engagement. Be specific and actionable.",
      conflict_resolution: "You are a collaboration expert. Help resolve conflicts in collaborative editing by suggesting the best way to merge different versions.",
      style_suggestion: "You are a writing style expert. Suggest improvements to tone, voice, and writing style while maintaining the original meaning.",
      grammar_check: "You are a grammar and language expert. Identify and suggest corrections for grammar, spelling, and language issues.",
      context_enhancement: "You are a content strategist. Suggest ways to enhance context, add relevant information, or improve structure."
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
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
            content: `Please analyze and provide suggestions for the following content:\n\n${content}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
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

    console.log(`AI suggestion created: ${suggestionData.id} (confidence: ${confidenceScore})`);

    return new Response(
      JSON.stringify({
        success: true,
        suggestion: suggestionData,
        aiResponse: suggestion,
        confidenceScore,
        metadata: {
          processingTime: Date.now(),
          suggestionType,
          sessionId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});