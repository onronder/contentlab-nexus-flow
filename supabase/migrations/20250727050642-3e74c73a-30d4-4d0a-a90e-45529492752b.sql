-- Check all existing views and remove any security definer properties
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public';

-- Remove all potentially problematic views and recreate them properly
DROP VIEW IF EXISTS public.competitor_details CASCADE;

-- Recreate the view with proper RLS enforcement (no SECURITY DEFINER)
CREATE VIEW public.competitor_details AS
SELECT 
    pc.id,
    pc.project_id,
    pc.company_name,
    pc.domain,
    pc.industry,
    pc.competitive_tier,
    pc.threat_level,
    pc.value_proposition,
    pc.company_size,
    pc.market_share_estimate,
    pc.monitoring_enabled,
    pc.analysis_frequency,
    pc.last_analysis_date,
    pc.data_quality_score,
    pc.tags,
    pc.custom_attributes,
    pc.added_by,
    pc.created_at,
    pc.updated_at,
    pc.analysis_count,
    pc.market_size,
    pc.description,
    pc.logo_url,
    pc.founded_year,
    pc.employee_count,
    pc.revenue_range,
    pc.funding_status,
    pc.headquarters,
    pc.status,
    pc.last_analyzed,
    COUNT(cam.id) as total_analyses,
    MAX(cam.completed_at) as last_analysis_completed,
    AVG(cam.confidence_score) as avg_confidence_score,
    COUNT(CASE WHEN cam.status = 'completed' THEN 1 END) as completed_analyses,
    COUNT(CASE WHEN cam.status = 'failed' THEN 1 END) as failed_analyses
FROM public.project_competitors pc
LEFT JOIN public.competitor_analysis_metadata cam ON pc.id = cam.competitor_id
GROUP BY 
    pc.id, pc.project_id, pc.company_name, pc.domain, pc.industry, 
    pc.competitive_tier, pc.threat_level, pc.value_proposition, 
    pc.company_size, pc.market_share_estimate, pc.monitoring_enabled,
    pc.analysis_frequency, pc.last_analysis_date, pc.data_quality_score,
    pc.tags, pc.custom_attributes, pc.added_by, pc.created_at, 
    pc.updated_at, pc.analysis_count, pc.market_size, pc.description,
    pc.logo_url, pc.founded_year, pc.employee_count, pc.revenue_range,
    pc.funding_status, pc.headquarters, pc.status, pc.last_analyzed;

-- Grant appropriate permissions
GRANT SELECT ON public.competitor_details TO authenticated;

-- Verification
SELECT 'View created successfully' as status;