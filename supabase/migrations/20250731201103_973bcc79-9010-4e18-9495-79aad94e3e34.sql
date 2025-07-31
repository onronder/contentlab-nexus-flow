-- Final security fix: Ensure view is created properly without security definer
-- PostgreSQL views don't support SECURITY INVOKER syntax, so we create a standard view

DROP VIEW IF EXISTS public.competitor_details CASCADE;

-- Create the view normally - by default, views use the caller's privileges
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
    COUNT(cam.id) AS total_analyses,
    MAX(cam.completed_at) AS last_analysis_completed,
    AVG(cam.confidence_score) AS avg_confidence_score,
    COUNT(CASE WHEN cam.status = 'completed' THEN 1 END) AS completed_analyses,
    COUNT(CASE WHEN cam.status = 'failed' THEN 1 END) AS failed_analyses
FROM 
    public.project_competitors pc
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

-- Add comment documenting the security approach
COMMENT ON VIEW public.competitor_details IS 'Standard view that aggregates competitor data with analysis metrics. Security is enforced through RLS policies on underlying tables (project_competitors and competitor_analysis_metadata).';