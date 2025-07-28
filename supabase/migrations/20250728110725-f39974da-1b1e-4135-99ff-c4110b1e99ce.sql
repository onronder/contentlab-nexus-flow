-- Enable realtime for key competitor tables
ALTER TABLE public.project_competitors REPLICA IDENTITY FULL;
ALTER TABLE public.monitoring_alerts REPLICA IDENTITY FULL;
ALTER TABLE public.competitor_serp_data REPLICA IDENTITY FULL;
ALTER TABLE public.competitor_website_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.competitor_analysis_metadata REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_competitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_serp_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_website_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_analysis_metadata;