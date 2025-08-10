import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || (await req.json().catch(() => ({}))).token;
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: share, error } = await supabase
      .from("report_shares")
      .select("id, token, chart_title, payload, generated_report_id, expires_at, is_public")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!share) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (!share.is_public) {
      return new Response(JSON.stringify({ error: "Not public" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Expired" }), { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Increment download/view count if linked to generated report
    if (share.generated_report_id) {
      await supabase.rpc("increment_generated_report_download", { p_id: share.generated_report_id }).catch((e) => console.error("increment rpc", e));
    }

    return new Response(JSON.stringify({
      chart_title: share.chart_title,
      payload: share.payload,
      expires_at: share.expires_at,
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("get-report-share error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});