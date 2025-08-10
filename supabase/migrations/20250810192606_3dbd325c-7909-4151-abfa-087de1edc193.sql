-- Allow generated_reports.template_id to be nullable for email-only reports
alter table public.generated_reports
  alter column template_id drop not null;