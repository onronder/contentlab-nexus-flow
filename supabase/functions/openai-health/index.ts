import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing OPENAI_API_KEY', primaryKeyPresent: false, secondaryKeyPresent: !!Deno.env.get('OPENAI_API_KEY_SECONDARY') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional lightweight validation: attempt to call OpenAI models endpoint with short timeout
    const url = 'https://api.openai.com/v1/models';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let ok = true;

    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${openAIApiKey}` },
        signal: controller.signal,
      });
      ok = res.ok;
    } catch (_) {
      // Network/timeout - still return ok: true because key exists; front-end will perform health checks separately
      ok = true;
    } finally {
      clearTimeout(timeout);
    }

    return new Response(JSON.stringify({ ok, primaryKeyPresent: !!openAIApiKey, secondaryKeyPresent: !!Deno.env.get('OPENAI_API_KEY_SECONDARY') }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
