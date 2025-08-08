import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequestBody {
  teamId: string;
  recipients?: string[];
}

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment not configured");
    }

    const { teamId, recipients = [] } = (await req.json()) as ReportRequestBody;
    if (!teamId) {
      return new Response(JSON.stringify({ error: "teamId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    // Fetch team
    const { data: team, error: teamError } = await (supabase as any)
      .from("teams")
      .select("id, name, description, created_at, current_member_count")
      .eq("id", teamId)
      .single();
    if (teamError || !team) throw teamError || new Error("Team not found");

    // Active members
    const { data: memberRows, error: memberErr } = await (supabase as any)
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("is_active", true)
      .eq("status", "active");
    if (memberErr) throw memberErr;
    const memberIds = (memberRows || []).map((m: any) => m.user_id);

    // Activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activityRows, error: actErr } = await (supabase as any)
      .from("team_activity_logs")
      .select("id, activity_type, created_at")
      .eq("team_id", teamId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });
    if (actErr) throw actErr;

    const communicationCount = (activityRows || []).filter((a: any) => a.activity_type === "communication").length;

    // Projects (unique projects linked to these members via project_team_members)
    let projectCount = 0;
    if (memberIds.length > 0) {
      const { data: ptmRows, error: ptmErr } = await (supabase as any)
        .from("project_team_members")
        .select("project_id")
        .in("user_id", memberIds)
        .eq("invitation_status", "active");
      if (ptmErr) throw ptmErr;
      const uniqueProjects = new Set((ptmRows || []).map((r: any) => r.project_id));
      projectCount = uniqueProjects.size;
    }

    // Completed projects (based on projects table for those ids)
    let completedCount = 0;
    if (projectCount > 0) {
      const { data: completed, error: compErr } = await (supabase as any)
        .from("projects")
        .select("id, status")
        .in("id", Array.from(new Set((await (supabase as any)
          .from("project_team_members").select("project_id").in("user_id", memberIds).eq("invitation_status", "active")).data || []).map((r: any) => r.project_id)))
        .eq("status", "completed");
      if (compErr) throw compErr;
      completedCount = (completed || []).length;
    }

    const completionRate = projectCount > 0 ? Math.round((completedCount / projectCount) * 100) : 0;

    const summary = {
      team: { id: team.id, name: team.name, created_at: team.created_at },
      kpis: {
        activeMembers: team.current_member_count || memberIds.length,
        projects: projectCount,
        completedProjects: completedCount,
        completionRate,
        communicationCount30d: communicationCount,
        activityCount30d: (activityRows || []).length,
      },
      generatedAt: new Date().toISOString(),
    };

    // Optionally send emails
    let emailResult: any = null;
    if (recipients.length > 0) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        console.warn("RESEND_API_KEY not configured; returning JSON only");
      } else {
        const resend = new Resend(resendKey);
        const subject = `Team Performance Report — ${team.name}`;
        const html = `
          <h2 style="font-family:system-ui, -apple-system;">Team Performance Report</h2>
          <p><strong>Team:</strong> ${team.name}</p>
          <ul>
            <li><strong>Active Members:</strong> ${fmt(summary.kpis.activeMembers)}</li>
            <li><strong>Projects:</strong> ${fmt(summary.kpis.projects)}</li>
            <li><strong>Completed Projects:</strong> ${fmt(summary.kpis.completedProjects)} (${summary.kpis.completionRate}%)</li>
            <li><strong>Activities (30d):</strong> ${fmt(summary.kpis.activityCount30d)}</li>
            <li><strong>Messages (30d):</strong> ${fmt(summary.kpis.communicationCount30d)}</li>
          </ul>
          <p style="color:#718096">Generated at ${new Date(summary.generatedAt).toLocaleString()}</p>
        `;
        const sendResp = await resend.emails.send({
          from: "ContentLab Nexus <reports@resend.dev>",
          to: recipients,
          subject,
          html,
        });
        emailResult = sendResp;
      }
    }

    return new Response(JSON.stringify({ summary, email: emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("team-performance-report error", error);
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
