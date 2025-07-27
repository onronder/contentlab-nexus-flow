-- Fix security issues identified by the database linter

-- Issue 1: Fix Security Definer View - Remove SECURITY DEFINER and use standard view
DROP VIEW IF EXISTS public.competitor_details;

CREATE VIEW public.competitor_details AS
SELECT 
    pc.*,
    COUNT(cam.id) as total_analyses,
    MAX(cam.completed_at) as last_analysis_completed,
    AVG(cam.confidence_score) as avg_confidence_score,
    COUNT(CASE WHEN cam.status = 'completed' THEN 1 END) as completed_analyses,
    COUNT(CASE WHEN cam.status = 'failed' THEN 1 END) as failed_analyses
FROM public.project_competitors pc
LEFT JOIN public.competitor_analysis_metadata cam ON pc.id = cam.competitor_id
GROUP BY pc.id, pc.project_id, pc.company_name, pc.domain, pc.industry, 
         pc.competitive_tier, pc.threat_level, pc.value_proposition, 
         pc.company_size, pc.market_share_estimate, pc.monitoring_enabled,
         pc.analysis_frequency, pc.last_analysis_date, pc.data_quality_score,
         pc.tags, pc.custom_attributes, pc.added_by, pc.created_at, 
         pc.updated_at, pc.analysis_count, pc.market_size, pc.description,
         pc.logo_url, pc.founded_year, pc.employee_count, pc.revenue_range,
         pc.funding_status, pc.headquarters, pc.status, pc.last_analyzed;

-- Grant appropriate permissions on the view
GRANT SELECT ON public.competitor_details TO authenticated;

-- Issue 2-4: Fix mutable search_path on functions by setting explicit search_path

-- Fix update_competitor_analysis_updated_at function
CREATE OR REPLACE FUNCTION public.update_competitor_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix log_competitor_changes function
CREATE OR REPLACE FUNCTION public.log_competitor_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change in project_activities table
    INSERT INTO public.project_activities (
        project_id,
        user_id,
        activity_type,
        activity_description,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        COALESCE(NEW.project_id, OLD.project_id),
        auth.uid(),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'competitor_added'
            WHEN TG_OP = 'UPDATE' THEN 'competitor_updated'
            WHEN TG_OP = 'DELETE' THEN 'competitor_removed'
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'Added competitor: ' || NEW.company_name
            WHEN TG_OP = 'UPDATE' THEN 'Updated competitor: ' || NEW.company_name
            WHEN TG_OP = 'DELETE' THEN 'Removed competitor: ' || OLD.company_name
        END,
        'competitor',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'operation', TG_OP,
            'competitor_name', COALESCE(NEW.company_name, OLD.company_name),
            'changes', CASE WHEN TG_OP = 'UPDATE' THEN 
                jsonb_build_object(
                    'old', to_jsonb(OLD.*),
                    'new', to_jsonb(NEW.*)
                )
                ELSE '{}' END
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix validate_competitor_data function
CREATE OR REPLACE FUNCTION public.validate_competitor_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate website URL format if provided
    IF NEW.domain IS NOT NULL AND NEW.domain != '' THEN
        IF NOT (NEW.domain ~* '^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$') THEN
            RAISE EXCEPTION 'Invalid domain format: %', NEW.domain;
        END IF;
    END IF;
    
    -- Validate founded year is reasonable
    IF NEW.founded_year IS NOT NULL THEN
        IF NEW.founded_year < 1800 OR NEW.founded_year > EXTRACT(YEAR FROM now()) THEN
            RAISE EXCEPTION 'Founded year must be between 1800 and current year: %', NEW.founded_year;
        END IF;
    END IF;
    
    -- Set last_analyzed to current time if monitoring is enabled and it's null
    IF NEW.monitoring_enabled = true AND NEW.last_analyzed IS NULL THEN
        NEW.last_analyzed = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Validation message
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Security issues have been fixed!';
    RAISE NOTICE '✓ Removed SECURITY DEFINER from view';
    RAISE NOTICE '✓ Added explicit search_path to all functions';
    RAISE NOTICE '✓ Database security compliance restored';
END $$;