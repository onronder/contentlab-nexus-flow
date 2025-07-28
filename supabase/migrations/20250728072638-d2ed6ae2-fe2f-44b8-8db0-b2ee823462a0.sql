-- Create tables for external data storage and monitoring

-- Table for storing SERP (search engine ranking) data
CREATE TABLE public.competitor_serp_data (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    competitor_id UUID NOT NULL,
    keyword TEXT NOT NULL,
    search_engine TEXT NOT NULL DEFAULT 'google',
    position INTEGER,
    url TEXT,
    title TEXT,
    description TEXT,
    serp_features JSONB DEFAULT '[]'::jsonb,
    search_volume INTEGER,
    competition_level TEXT,
    cost_per_click DECIMAL(10,2),
    location TEXT DEFAULT 'global',
    device TEXT DEFAULT 'desktop',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for storing website snapshots and change detection
CREATE TABLE public.competitor_website_snapshots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    competitor_id UUID NOT NULL,
    url TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    title TEXT,
    description TEXT,
    pricing_data JSONB DEFAULT '{}'::jsonb,
    content_sections JSONB DEFAULT '{}'::jsonb,
    technical_data JSONB DEFAULT '{}'::jsonb,
    change_type TEXT DEFAULT 'content',
    change_summary TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for monitoring alerts and notifications
CREATE TABLE public.monitoring_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL,
    competitor_id UUID,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    alert_data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Table for tracking external API usage and logs
CREATE TABLE public.external_data_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    api_provider TEXT NOT NULL,
    api_endpoint TEXT NOT NULL,
    request_type TEXT NOT NULL,
    competitor_id UUID,
    project_id UUID,
    request_data JSONB DEFAULT '{}'::jsonb,
    response_status INTEGER,
    response_data JSONB DEFAULT '{}'::jsonb,
    cost_credits INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_competitor_serp_data_competitor_id ON public.competitor_serp_data(competitor_id);
CREATE INDEX idx_competitor_serp_data_keyword ON public.competitor_serp_data(keyword);
CREATE INDEX idx_competitor_serp_data_created_at ON public.competitor_serp_data(created_at);

CREATE INDEX idx_competitor_website_snapshots_competitor_id ON public.competitor_website_snapshots(competitor_id);
CREATE INDEX idx_competitor_website_snapshots_url ON public.competitor_website_snapshots(url);
CREATE INDEX idx_competitor_website_snapshots_created_at ON public.competitor_website_snapshots(created_at);

CREATE INDEX idx_monitoring_alerts_project_id ON public.monitoring_alerts(project_id);
CREATE INDEX idx_monitoring_alerts_competitor_id ON public.monitoring_alerts(competitor_id);
CREATE INDEX idx_monitoring_alerts_is_read ON public.monitoring_alerts(is_read);
CREATE INDEX idx_monitoring_alerts_created_at ON public.monitoring_alerts(created_at);

CREATE INDEX idx_external_data_logs_api_provider ON public.external_data_logs(api_provider);
CREATE INDEX idx_external_data_logs_competitor_id ON public.external_data_logs(competitor_id);
CREATE INDEX idx_external_data_logs_created_at ON public.external_data_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.competitor_serp_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_website_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_data_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for competitor_serp_data
CREATE POLICY "Users can view SERP data for accessible competitors"
ON public.competitor_serp_data
FOR SELECT
USING (
    competitor_id IN (
        SELECT pc.id FROM project_competitors pc
        JOIN projects p ON pc.project_id = p.id
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.invitation_status = 'active'
        )
    )
);

CREATE POLICY "Users can manage SERP data for accessible competitors"
ON public.competitor_serp_data
FOR ALL
USING (
    competitor_id IN (
        SELECT pc.id FROM project_competitors pc
        JOIN projects p ON pc.project_id = p.id
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.role IN ('admin', 'manager', 'analyst')
            AND ptm.invitation_status = 'active'
        )
    )
);

-- Create RLS policies for competitor_website_snapshots
CREATE POLICY "Users can view website snapshots for accessible competitors"
ON public.competitor_website_snapshots
FOR SELECT
USING (
    competitor_id IN (
        SELECT pc.id FROM project_competitors pc
        JOIN projects p ON pc.project_id = p.id
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.invitation_status = 'active'
        )
    )
);

CREATE POLICY "Users can manage website snapshots for accessible competitors"
ON public.competitor_website_snapshots
FOR ALL
USING (
    competitor_id IN (
        SELECT pc.id FROM project_competitors pc
        JOIN projects p ON pc.project_id = p.id
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.role IN ('admin', 'manager', 'analyst')
            AND ptm.invitation_status = 'active'
        )
    )
);

-- Create RLS policies for monitoring_alerts
CREATE POLICY "Users can view alerts for accessible projects"
ON public.monitoring_alerts
FOR SELECT
USING (
    project_id IN (
        SELECT p.id FROM projects p
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.invitation_status = 'active'
        )
    )
);

CREATE POLICY "Users can manage alerts for accessible projects"
ON public.monitoring_alerts
FOR ALL
USING (
    project_id IN (
        SELECT p.id FROM projects p
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.role IN ('admin', 'manager')
            AND ptm.invitation_status = 'active'
        )
    )
);

-- Create RLS policies for external_data_logs
CREATE POLICY "Users can view external data logs for accessible projects"
ON public.external_data_logs
FOR SELECT
USING (
    project_id IN (
        SELECT p.id FROM projects p
        WHERE p.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM project_team_members ptm
            WHERE ptm.project_id = p.id
            AND ptm.user_id = auth.uid()
            AND ptm.invitation_status = 'active'
        )
    )
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_competitor_serp_data_updated_at
    BEFORE UPDATE ON public.competitor_serp_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();