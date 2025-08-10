import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRecord {
  id: string;
  created_by: string;
  email_subject: string;
  email_body_html: string | null;
  recipients: string[];
  cc: string[] | null;
  bcc: string[] | null;
  format: string;
  cadence: string;
  timezone: string;
  hour_utc: number;
  minute_utc: number;
  next_run_at: string;
  payload: Record<string, unknown>;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRole);
    const { data: due, error } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", new Date().toISOString())
      .limit(50);

    if (error) throw error;

    const resend = new Resend(resendApiKey);

    const tasks = (due || []).map(async (s: ScheduleRecord) => {
      try {
        const emailResp = await resend.emails.send({
          from: "Reports <reports@resend.dev>",
          to: s.recipients,
          cc: s.cc || undefined,
          bcc: s.bcc || undefined,
          subject: s.email_subject,
          html: s.email_body_html || undefined,
        });

        // Log generated report row
        const { error: insertErr } = await supabase.from("generated_reports").insert({
          created_by: s.created_by,
          scheduled_report_id: s.id,
          file_format: s.format,
          status: "sent",
          file_url: null,
        });
        if (insertErr) console.error("generated_reports insert error", insertErr);

        // Compute and set next_run_at / last_run_at
        const { data: nextRun } = await supabase.rpc("compute_next_run_at", {
          current: new Date().toISOString(),
          cadence: s.cadence,
          hour: s.hour_utc,
          minute: s.minute_utc,
          tz: s.timezone,
        });

        const { error: updErr } = await supabase
          .from("scheduled_reports")
          .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun })
          .eq("id", s.id);
        if (updErr) console.error("schedule update error", updErr);

        return { id: s.id, emailResp };
      } catch (e) {
        console.error("Process schedule failed", s.id, e);
        // mark next_run_at anyway to avoid tight loops
        await supabase
          .from("scheduled_reports")
          .update({ last_run_at: new Date().toISOString(), next_run_at: new Date(Date.now() + 60*60*1000).toISOString() })
          .eq("id", s.id);
        return { id: s.id, error: String(e) };
      }
    });

    const results = await Promise.all(tasks);

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("process-scheduled-reports error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});