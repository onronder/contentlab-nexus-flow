import { supabase } from "@/integrations/supabase/client";

export async function sendChartEmail(params: {
  recipients: string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  file_url?: string | null;
  file_format?: string | null;
  scheduled_report_id?: string | null;
}) {
  const { data, error } = await supabase.functions.invoke("send-report-email", {
    body: params,
  });
  if (error) throw error;
  return data;
}

export async function createShare(params: {
  chart_title?: string;
  payload: any;
  expires_at?: string | null;
}) {
  const { data: user } = await supabase.auth.getUser();
  const created_by = user.user?.id;
  if (!created_by) throw new Error("Not authenticated");

  const { data, error } = await (supabase as any)
    .from("report_shares")
    .insert({ created_by, chart_title: params.chart_title || null, payload: params.payload, expires_at: params.expires_at || null })
    .select("token")
    .single();
  if (error) throw error as any;
  return (data as any).token as string;
}

export async function createSchedule(params: {
  recipients: string[];
  subject: string;
  html?: string;
  format?: string;
  cadence?: "daily" | "weekly" | "monthly";
  timezone?: string;
  hour_utc?: number;
  minute_utc?: number;
  payload?: any;
}) {
  const { data: user } = await supabase.auth.getUser();
  const created_by = user.user?.id;
  if (!created_by) throw new Error("Not authenticated");

  const now = new Date();
  const timezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const hour_utc = params.hour_utc ?? now.getUTCHours();
  const minute_utc = params.minute_utc ?? now.getUTCMinutes();

  const insert = {
    created_by,
    email_subject: params.subject,
    email_body_html: params.html || null,
    recipients: params.recipients,
    format: params.format || "png",
    cadence: params.cadence || "daily",
    timezone,
    hour_utc,
    minute_utc,
    next_run_at: new Date().toISOString(),
    payload: params.payload || {},
  };

  const { data, error } = await (supabase as any).from("scheduled_reports").insert(insert).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function listSchedules() {
  const { data, error } = await (supabase as any).from("scheduled_reports").select("*").order("created_at", { ascending: false });
  if (error) throw error as any;
  return data as any;
}

export async function listGeneratedReports(limit = 50) {
  const { data, error } = await (supabase as any)
    .from("generated_reports")
    .select("id, created_at, file_url, file_format, status, scheduled_report_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error as any;
  return data as any;
}
