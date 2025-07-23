-- Projects table with comprehensive project management fields
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    industry VARCHAR(100) NOT NULL,
    project_type VARCHAR(50) NOT NULL DEFAULT 'competitive_analysis',
    target_market TEXT,
    primary_objectives JSONB DEFAULT '[]'::jsonb,
    success_metrics JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'planning',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    start_date TIMESTAMP WITH TIME ZONE,
    target_end_date TIMESTAMP WITH TIME ZONE,
    actual_end_date TIMESTAMP WITH TIME ZONE,
    is_public BOOLEAN DEFAULT false,
    allow_team_access BOOLEAN DEFAULT true,
    auto_analysis_enabled BOOLEAN DEFAULT true,
    notification_settings JSONB DEFAULT '{"email": true, "inApp": true, "frequency": "daily"}'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('planning', 'active', 'paused', 'completed', 'archived', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_project_type CHECK (project_type IN ('competitive_analysis', 'market_research', 'brand_monitoring', 'content_strategy', 'seo_analysis')),
    CONSTRAINT valid_dates CHECK (target_end_date IS NULL OR start_date IS NULL OR target_end_date >= start_date)
);

-- Project team members with sophisticated permission management
CREATE TABLE project_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}'::jsonb,
    access_level VARCHAR(20) NOT NULL DEFAULT 'full',
    allowed_sections TEXT[] DEFAULT '{"dashboard", "competitors", "analysis", "reports"}',
    invitation_status VARCHAR(20) DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE,
    is_temporary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'manager', 'analyst', 'member', 'viewer')),
    CONSTRAINT valid_access_level CHECK (access_level IN ('full', 'limited', 'read_only', 'restricted')),
    CONSTRAINT valid_invitation_status CHECK (invitation_status IN ('pending', 'active', 'suspended', 'expired', 'revoked')),
    UNIQUE(project_id, user_id)
);

-- Project competitors for competitive intelligence tracking
CREATE TABLE project_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50),
    competitive_tier VARCHAR(20) NOT NULL DEFAULT 'direct',
    threat_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    market_share_estimate DECIMAL(5,2),
    value_proposition TEXT,
    monitoring_enabled BOOLEAN DEFAULT true,
    analysis_frequency VARCHAR(20) DEFAULT 'weekly',
    last_analysis_date TIMESTAMP WITH TIME ZONE,
    analysis_count INTEGER DEFAULT 0,
    data_quality_score DECIMAL(5,2),
    custom_attributes JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    added_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_competitive_tier CHECK (competitive_tier IN ('direct', 'indirect', 'substitute', 'emerging', 'potential')),
    CONSTRAINT valid_threat_level CHECK (threat_level IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_analysis_frequency CHECK (analysis_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    CONSTRAINT valid_market_share CHECK (market_share_estimate IS NULL OR (market_share_estimate >= 0 AND market_share_estimate <= 100)),
    UNIQUE(project_id, domain)
);

-- Project analytics and performance tracking
CREATE TABLE project_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    measurement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source VARCHAR(100),
    calculation_method TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_metric_unit CHECK (metric_unit IN ('percentage', 'currency', 'number', 'decimal', 'count', 'ratio'))
);

-- Project activities and audit trail
CREATE TABLE project_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_activity_type CHECK (activity_type IN ('project_created', 'project_updated', 'project_deleted', 'member_added', 'member_removed', 'competitor_added', 'competitor_removed', 'analysis_started', 'analysis_completed', 'settings_changed'))
);

-- Project templates for quick setup
CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    project_type VARCHAR(50) NOT NULL,
    default_settings JSONB DEFAULT '{}'::jsonb,
    suggested_objectives JSONB DEFAULT '[]'::jsonb,
    suggested_metrics JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_industry ON projects(industry);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

CREATE INDEX idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX idx_project_team_members_user_id ON project_team_members(user_id);
CREATE INDEX idx_project_team_members_role ON project_team_members(role);

CREATE INDEX idx_project_competitors_project_id ON project_competitors(project_id);
CREATE INDEX idx_project_competitors_threat_level ON project_competitors(threat_level);
CREATE INDEX idx_project_competitors_domain ON project_competitors(domain);

CREATE INDEX idx_project_analytics_project_id ON project_analytics(project_id);
CREATE INDEX idx_project_analytics_metric_name ON project_analytics(metric_name);
CREATE INDEX idx_project_analytics_measurement_date ON project_analytics(measurement_date DESC);

CREATE INDEX idx_project_activities_project_id ON project_activities(project_id);
CREATE INDEX idx_project_activities_user_id ON project_activities(user_id);
CREATE INDEX idx_project_activities_created_at ON project_activities(created_at DESC);

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view projects they own or are members of" ON projects
    FOR SELECT USING (
        created_by = auth.uid() OR 
        id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND invitation_status = 'active')
    );

CREATE POLICY "Users can create projects" ON projects
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Project owners and admins can update projects" ON projects
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager') AND invitation_status = 'active')
    );

CREATE POLICY "Project owners can delete projects" ON projects
    FOR DELETE USING (created_by = auth.uid());

-- Project team members RLS policies
CREATE POLICY "Team members can view project team" ON project_team_members
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()) OR
        project_id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND invitation_status = 'active')
    );

CREATE POLICY "Project owners and admins can manage team" ON project_team_members
    FOR ALL USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()) OR
        project_id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager') AND invitation_status = 'active')
    );

-- Project competitors RLS policies
CREATE POLICY "Team members can view competitors" ON project_competitors
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()) OR
        project_id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND invitation_status = 'active')
    );

CREATE POLICY "Team members with permissions can manage competitors" ON project_competitors
    FOR ALL USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()) OR
        project_id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'analyst') AND invitation_status = 'active')
    );

-- Project analytics RLS policies
CREATE POLICY "Team members can view analytics" ON project_analytics
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()) OR
        project_id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND invitation_status = 'active')
    );

-- Project activities RLS policies
CREATE POLICY "Team members can view activities" ON project_activities
    FOR SELECT USING (
        project_id IN (SELECT id FROM projects WHERE created_by = auth.uid()) OR
        project_id IN (SELECT project_id FROM project_team_members WHERE user_id = auth.uid() AND invitation_status = 'active')
    );

-- Project templates RLS policies
CREATE POLICY "Users can view public templates and their own" ON project_templates
    FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create templates" ON project_templates
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" ON project_templates
    FOR UPDATE USING (created_by = auth.uid());

-- Apply triggers to relevant tables
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_team_members_updated_at BEFORE UPDATE ON project_team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_competitors_updated_at BEFORE UPDATE ON project_competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_templates_updated_at BEFORE UPDATE ON project_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log project activities
CREATE OR REPLACE FUNCTION log_project_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO project_activities (project_id, user_id, activity_type, activity_description, entity_type, entity_id)
        VALUES (NEW.id, auth.uid(), 'project_created', 'Project created: ' || NEW.name, 'project', NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO project_activities (project_id, user_id, activity_type, activity_description, entity_type, entity_id)
        VALUES (NEW.id, auth.uid(), 'project_updated', 'Project updated: ' || NEW.name, 'project', NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO project_activities (project_id, user_id, activity_type, activity_description, entity_type, entity_id)
        VALUES (OLD.id, auth.uid(), 'project_deleted', 'Project deleted: ' || OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply activity logging trigger
CREATE TRIGGER log_project_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_project_activity();