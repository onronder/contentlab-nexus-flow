import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error("Supabase service role not configured");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch teams with enabled performance reports
    const { data: teams, error: teamsErr } = await (supabase as any)
      .from("teams")
      .select("id, name, settings")
      .eq("is_active", true);
    if (teamsErr) throw teamsErr;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    // Helper to check due based on frequency and last_sent
    const isDue = (frequency: string, lastSent?: string | null) => {
      if (!frequency) return false;
      const now = Date.now();
      const last = lastSent ? new Date(lastSent).getTime() : 0;
      const day = 24 * 60 * 60 * 1000;
      switch (frequency) {
        case 'weekly': return now - last >= 7 * day;
        case 'monthly': return now - last >= 28 * day;
        case 'quarterly': return now - last >= 84 * day;
        default: return false;
      }
    };

    for (const team of teams || []) {
      const pr = team.settings?.performance_reports;
      const enabled = pr?.enabled === true;
      const recipients: string[] = Array.isArray(pr?.recipients) ? pr.recipients : [];
      const frequency = pr?.frequency || 'monthly';
      const lastSent = pr?.last_sent || null;

      if (!enabled || recipients.length === 0) continue;
      if (!isDue(frequency, lastSent)) continue;

      // Compute lightweight KPIs
      const { data: members } = await (supabase as any)
        .from("team_members")
        .select("user_id")
        .eq("team_id", team.id)
        .eq("is_active", true)
        .eq("status", "active");
      const memberIds = (members || []).map((m: any) => m.user_id);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: acts } = await (supabase as any)
        .from("team_activity_logs")
        .select("id, activity_type")
        .eq("team_id", team.id)
        .gte("created_at", thirtyDaysAgo);
      const comms = (acts || []).filter((a: any) => a.activity_type === 'communication').length;

      let projectCount = 0; let completedCount = 0;
      if (memberIds.length > 0) {
        const { data: ptm } = await (supabase as any)
          .from("project_team_members")
          .select("project_id")
          .in("user_id", memberIds)
          .eq("invitation_status", "active");
        const ids = Array.from(new Set((ptm || []).map((r: any) => r.project_id)));
        projectCount = ids.length;
        if (ids.length > 0) {
          const { data: completed } = await (supabase as any)
            .from("projects")
            .select("id")
            .in("id", ids)
            .eq("status", "completed");
          completedCount = (completed || []).length;
        }
      }
      const completionRate = projectCount > 0 ? Math.round((completedCount / projectCount) * 100) : 0;

      // Send email
      if (resend) {
        const subject = `Team Performance Report — ${team.name}`;
        const html = `
          <h2 style="font-family:system-ui, -apple-system;">Team Performance Report</h2>
          <p><strong>Team:</strong> ${team.name}</p>
          <ul>
            <li><strong>Active Members:</strong> ${fmt(memberIds.length)}</li>
            <li><strong>Projects:</strong> ${fmt(projectCount)}</li>
            <li><strong>Completed Projects:</strong> ${fmt(completedCount)} (${completionRate}%)</li>
            <li><strong>Activities (30d):</strong> ${fmt((acts || []).length)}</li>
            <li><strong>Messages (30d):</strong> ${fmt(comms)}</li>
          </ul>
          <p style="color:#718096">Automated report</p>
        `;
        await resend.emails.send({ from: "ContentLab Nexus <reports@resend.dev>", to: recipients, subject, html });
      }

      // Update last_sent timestamp in settings JSONB
      const newSettings = {
        ...(team.settings || {}),
        performance_reports: {
          ...(team.settings?.performance_reports || {}),
          last_sent: new Date().toISOString(),
        }
      };
      await (supabase as any)
        .from("teams")
        .update({ settings: newSettings })
        .eq("id", team.id);
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("team-performance-report-batch error", error);
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
