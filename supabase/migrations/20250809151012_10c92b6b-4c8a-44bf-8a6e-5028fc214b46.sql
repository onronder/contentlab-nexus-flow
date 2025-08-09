-- Reporting schema for automated reports
-- 1) Report templates
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb, -- chart/dashboard configuration and data query params
  format text NOT NULL DEFAULT 'pdf', -- 'pdf' | 'xlsx' | 'csv' | 'json'
  branding jsonb DEFAULT '{}'::jsonb, -- logo, colors, footer, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

-- Owner-based access policies
CREATE POLICY "Users can view their own report templates"
ON public.report_templates
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own report templates"
ON public.report_templates
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own report templates"
ON public.report_templates
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own report templates"
ON public.report_templates
FOR DELETE
USING (created_by = auth.uid());

-- updated_at trigger
CREATE TRIGGER report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Scheduled reports
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly','cron')),
  cron text, -- when frequency = 'cron'
  recipients text[] NOT NULL DEFAULT '{}'::text[],
  conditions jsonb DEFAULT '{}'::jsonb, -- optional conditional triggers/thresholds
  is_active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_due ON public.scheduled_reports (is_active, next_run_at);

-- Owner-based policies
CREATE POLICY "Users can view their own scheduled reports"
ON public.scheduled_reports
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own scheduled reports"
ON public.scheduled_reports
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own scheduled reports"
ON public.scheduled_reports
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own scheduled reports"
ON public.scheduled_reports
FOR DELETE
USING (created_by = auth.uid());

CREATE TRIGGER scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Generated reports archive
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  scheduled_report_id uuid REFERENCES public.scheduled_reports(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  file_format text, -- 'pdf' | 'xlsx' | 'csv' | 'json'
  file_url text, -- optional link to storage
  error text,
  download_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON public.generated_reports (template_id, generated_at DESC);

-- Owner-based policies
CREATE POLICY "Users can view their own generated reports"
ON public.generated_reports
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Users can insert their own generated reports"
ON public.generated_reports
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own generated reports"
ON public.generated_reports
FOR UPDATE
USING (created_by = auth.uid());

-- Usually we don't allow deleting archives; omit DELETE policy for now

-- Helper to increment download count
CREATE OR REPLACE FUNCTION public.increment_generated_report_download(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.generated_reports
  SET download_count = download_count + 1
  WHERE id = p_id;
END;
$$;