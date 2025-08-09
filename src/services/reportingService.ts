import { supabase } from "@/integrations/supabase/client";

export async function sendChartEmail(params: {
  recipients: string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  const { data, error } = await supabase.functions.invoke("send-report-email", {
    body: params,
  });
  if (error) throw error;
  return data;
}
