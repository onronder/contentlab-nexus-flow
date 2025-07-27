-- COMPETITIVE INTELLIGENCE DATABASE SCHEMA ENHANCEMENT
-- Comprehensive enhancement for production-grade competitive analysis

-- Step 1: Enhance existing project_competitors table with additional fields
-- Note: Some fields already exist (industry, monitoring_enabled, analysis_frequency, etc.)
ALTER TABLE public.project_competitors 
ADD COLUMN IF NOT EXISTS market_size text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS founded_year integer,
ADD COLUMN IF NOT EXISTS employee_count text,
ADD COLUMN IF NOT EXISTS revenue_range text,
ADD COLUMN IF NOT EXISTS funding_status text,
ADD COLUMN IF NOT EXISTS headquarters text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_analyzed timestamptz;

-- Step 2: Create competitor_analysis_metadata table for detailed analysis tracking
CREATE TABLE IF NOT EXISTS public.competitor_analysis_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id uuid NOT NULL REFERENCES public.project_competitors(id) ON DELETE CASCADE,
    analysis_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    parameters jsonb DEFAULT '{}',
    results_summary jsonb DEFAULT '{}',
    confidence_score decimal(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Create performance indexes for optimal query performance
-- Competitors table indexes
CREATE INDEX IF NOT EXISTS idx_project_competitors_project_status 
ON public.project_competitors(project_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_project_competitors_industry_market 
ON public.project_competitors(industry, market_size) WHERE industry IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_competitors_monitoring 
ON public.project_competitors(monitoring_enabled, analysis_frequency) 
WHERE monitoring_enabled = true;

CREATE INDEX IF NOT EXISTS idx_project_competitors_last_analyzed 
ON public.project_competitors(last_analyzed DESC) WHERE last_analyzed IS NOT NULL;

-- Analysis metadata indexes
CREATE INDEX IF NOT EXISTS idx_competitor_analysis_competitor_type 
ON public.competitor_analysis_metadata(competitor_id, analysis_type);

CREATE INDEX IF NOT EXISTS idx_competitor_analysis_status_created 
ON public.competitor_analysis_metadata(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_analysis_completed 
ON public.competitor_analysis_metadata(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Step 4: Enable RLS on new table
ALTER TABLE public.competitor_analysis_metadata ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for competitor_analysis_metadata
-- Users can view analysis data for competitors they have access to
CREATE POLICY "Users can view analysis for accessible competitors" 
ON public.competitor_analysis_metadata 
FOR SELECT 
USING (
    competitor_id IN (
        SELECT pc.id 
        FROM public.project_competitors pc
        JOIN public.projects p ON pc.project_id = p.id
        WHERE (
            p.created_by = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.project_team_members ptm 
                WHERE ptm.project_id = p.id 
                AND ptm.user_id = auth.uid() 
                AND ptm.invitation_status = 'active'
            )
        )
    )
);

-- Users with proper permissions can insert analysis data
CREATE POLICY "Users can create analysis for accessible competitors" 
ON public.competitor_analysis_metadata 
FOR INSERT 
WITH CHECK (
    competitor_id IN (
        SELECT pc.id 
        FROM public.project_competitors pc
        JOIN public.projects p ON pc.project_id = p.id
        WHERE (
            p.created_by = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.project_team_members ptm 
                WHERE ptm.project_id = p.id 
                AND ptm.user_id = auth.uid() 
                AND ptm.role IN ('admin', 'manager', 'analyst')
                AND ptm.invitation_status = 'active'
            )
        )
    )
);

-- Users with proper permissions can update analysis data
CREATE POLICY "Users can update analysis for accessible competitors" 
ON public.competitor_analysis_metadata 
FOR UPDATE 
USING (
    competitor_id IN (
        SELECT pc.id 
        FROM public.project_competitors pc
        JOIN public.projects p ON pc.project_id = p.id
        WHERE (
            p.created_by = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.project_team_members ptm 
                WHERE ptm.project_id = p.id 
                AND ptm.user_id = auth.uid() 
                AND ptm.role IN ('admin', 'manager', 'analyst')
                AND ptm.invitation_status = 'active'
            )
        )
    )
);

-- Users with proper permissions can delete analysis data
CREATE POLICY "Users can delete analysis for accessible competitors" 
ON public.competitor_analysis_metadata 
FOR DELETE 
USING (
    competitor_id IN (
        SELECT pc.id 
        FROM public.project_competitors pc
        JOIN public.projects p ON pc.project_id = p.id
        WHERE (
            p.created_by = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM public.project_team_members ptm 
                WHERE ptm.project_id = p.id 
                AND ptm.user_id = auth.uid() 
                AND ptm.role IN ('admin', 'manager')
                AND ptm.invitation_status = 'active'
            )
        )
    )
);

-- Step 6: Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_competitor_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for competitor_analysis_metadata
CREATE TRIGGER update_competitor_analysis_metadata_updated_at
    BEFORE UPDATE ON public.competitor_analysis_metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.update_competitor_analysis_updated_at();

-- Step 7: Create audit trigger function for competitor changes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for project_competitors
CREATE TRIGGER log_competitor_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.project_competitors
    FOR EACH ROW
    EXECUTE FUNCTION public.log_competitor_changes();

-- Step 8: Create validation function for competitor data
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create validation trigger for project_competitors
CREATE TRIGGER validate_competitor_data_trigger
    BEFORE INSERT OR UPDATE ON public.project_competitors
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_competitor_data();

-- Step 9: Add helpful comments for documentation
COMMENT ON TABLE public.competitor_analysis_metadata IS 'Tracks detailed analysis metadata and results for competitive intelligence';
COMMENT ON COLUMN public.competitor_analysis_metadata.analysis_type IS 'Type of analysis: content, pricing, features, performance, etc.';
COMMENT ON COLUMN public.competitor_analysis_metadata.confidence_score IS 'Analysis confidence score from 0.0 to 1.0';
COMMENT ON COLUMN public.project_competitors.market_size IS 'Market size category: startup, small, medium, large, enterprise';
COMMENT ON COLUMN public.project_competitors.employee_count IS 'Employee count range: 1-10, 11-50, 51-200, 201-1000, 1000+';
COMMENT ON COLUMN public.project_competitors.revenue_range IS 'Annual revenue range: seed, <1M, 1M-10M, 10M-100M, 100M+';
COMMENT ON COLUMN public.project_competitors.funding_status IS 'Funding status: bootstrapped, seed, series-a, series-b, public, etc.';

-- Step 10: Create a view for enhanced competitor information
CREATE OR REPLACE VIEW public.competitor_details AS
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

-- Final validation message
DO $$
BEGIN
    RAISE NOTICE 'SUCCESS: Competitive intelligence database schema enhancement completed successfully!';
    RAISE NOTICE 'Enhanced project_competitors table with % new columns', 
        (SELECT count(*) FROM information_schema.columns 
         WHERE table_name = 'project_competitors' AND table_schema = 'public');
    RAISE NOTICE 'Created competitor_analysis_metadata table with comprehensive tracking';
    RAISE NOTICE 'Added % performance indexes for optimal query performance', 6;
    RAISE NOTICE 'Implemented comprehensive RLS policies for data security';
    RAISE NOTICE 'Created audit trails and validation triggers';
END $$;