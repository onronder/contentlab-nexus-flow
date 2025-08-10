import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") as string;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReportRequest {
  recipients: string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  // New optional fields for persistence
  file_url?: string | null;
  file_format?: string | null;
  scheduled_report_id?: string | null;
}

serve(async (req: Request) => {
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
    const body: SendReportRequest = await req.json();
    const { recipients, subject, html, text, cc, bcc, file_url, file_format, scheduled_report_id } = body;

    if (!recipients?.length || !subject) {
      return new Response(JSON.stringify({ error: "recipients and subject are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "Reports <reports@resend.dev>",
      to: recipients,
      cc,
      bcc,
      subject,
      html: html || undefined,
      text: text || undefined,
    });

    // Try to identify the user from the Authorization header
    const authHeader = req.headers.get("Authorization") || "";
    let createdBy: string | null = null;
    try {
      if (authHeader) {
        const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: userData } = await authed.auth.getUser();
        createdBy = userData?.user?.id ?? null;
      }
    } catch (e) {
      console.warn("Could not resolve user from auth header", e);
    }

    // Persist generated report record
    try {
      const admin = createClient(supabaseUrl, serviceRole);
      await admin.from("generated_reports").insert({
        created_by: createdBy,
        scheduled_report_id: scheduled_report_id || null,
        file_url: file_url || null,
        file_format: file_format || (html ? "html" : text ? "text" : null),
        status: "sent",
      });
    } catch (e) {
      console.error("Failed to persist generated_reports", e);
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-report-email:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});