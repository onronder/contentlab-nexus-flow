-- Create Content Library Database Schema and Storage Setup

-- ========================================
-- STORAGE BUCKETS
-- ========================================

-- Create storage buckets for content management
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('content-files', 'content-files', false),
  ('content-thumbnails', 'content-thumbnails', true),
  ('content-drafts', 'content-drafts', false);

-- ========================================
-- CORE TABLES
-- ========================================

-- Content Categories
CREATE TABLE content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(name) >= 1 AND length(name) <= 100),
  description TEXT CHECK (length(description) <= 500),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  parent_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content Items (Main entity)
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  description TEXT CHECK (length(description) <= 2000),
  content_type TEXT NOT NULL CHECK (content_type IN ('document', 'image', 'video', 'social', 'blog_post', 'presentation', 'audio', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'under_review', 'rejected', 'scheduled')),
  file_path TEXT,
  file_size BIGINT CHECK (file_size > 0),
  mime_type TEXT,
  thumbnail_path TEXT,
  metadata JSONB DEFAULT '{}',
  content_hash TEXT,
  search_vector tsvector,
  workflow_status TEXT DEFAULT 'created' CHECK (workflow_status IN ('created', 'reviewed', 'approved', 'rejected', 'published')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Content Analytics
CREATE TABLE content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0 CHECK (views >= 0),
  likes INTEGER DEFAULT 0 CHECK (likes >= 0),
  shares INTEGER DEFAULT 0 CHECK (shares >= 0),
  comments INTEGER DEFAULT 0 CHECK (comments >= 0),
  downloads INTEGER DEFAULT 0 CHECK (downloads >= 0),
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  performance_score INTEGER DEFAULT 0 CHECK (performance_score >= 0 AND performance_score <= 100),
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  analytics_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, analytics_date)
);

-- Content Tags
CREATE TABLE content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (length(tag) >= 1 AND length(tag) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, tag)
);

-- Content Versions (for version control)
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_size BIGINT,
  changes_summary TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(content_id, version_number)
);

-- Content Collaborators (team access)
CREATE TABLE content_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(content_id, user_id)
);

-- Content Activity Log (audit trail)
CREATE TABLE content_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'published', 'archived', 'viewed', 'downloaded', 'shared', 'commented', 'liked', 'reviewed')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_content_items_user_id ON content_items(user_id);
CREATE INDEX idx_content_items_project_id ON content_items(project_id);
CREATE INDEX idx_content_items_status ON content_items(status);
CREATE INDEX idx_content_items_content_type ON content_items(content_type);
CREATE INDEX idx_content_items_created_at ON content_items(created_at DESC);
CREATE INDEX idx_content_items_search_vector ON content_items USING gin(search_vector);
CREATE INDEX idx_content_analytics_content_id ON content_analytics(content_id);
CREATE INDEX idx_content_analytics_date ON content_analytics(analytics_date DESC);
CREATE INDEX idx_content_tags_content_id ON content_tags(content_id);
CREATE INDEX idx_content_tags_tag ON content_tags(tag);
CREATE INDEX idx_content_activity_content_id ON content_activity_log(content_id);
CREATE INDEX idx_content_activity_user_id ON content_activity_log(user_id);
CREATE INDEX idx_content_activity_created_at ON content_activity_log(created_at DESC);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(ARRAY(SELECT tag FROM content_tags WHERE content_id = NEW.id), ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate performance score
CREATE OR REPLACE FUNCTION calculate_content_performance_score()
RETURNS TRIGGER AS $$
DECLARE
  score INTEGER := 0;
  engagement_weight INTEGER := 40;
  reach_weight INTEGER := 30;
  quality_weight INTEGER := 30;
BEGIN
  -- Calculate engagement score (40% weight)
  score := score + LEAST(
    (NEW.views * 1 + NEW.likes * 3 + NEW.shares * 5 + NEW.comments * 4) / GREATEST(NEW.views, 1) * engagement_weight,
    engagement_weight
  );
  
  -- Calculate reach score (30% weight)
  score := score + LEAST(
    NEW.reach / GREATEST(NEW.impressions, 1) * 100 * reach_weight / 100,
    reach_weight
  );
  
  -- Calculate quality score (30% weight) - based on CTR and conversion
  score := score + LEAST(
    (NEW.click_through_rate + NEW.conversion_rate) * quality_weight / 2,
    quality_weight
  );
  
  NEW.performance_score := LEAST(score, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log content activity
CREATE OR REPLACE FUNCTION log_content_activity()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  user_id_val UUID;
BEGIN
  user_id_val := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status AND NEW.status = 'published' THEN
      action_type := 'published';
    ELSIF OLD.status != NEW.status AND NEW.status = 'archived' THEN
      action_type := 'archived';
    ELSE
      action_type := 'updated';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;
  
  INSERT INTO content_activity_log (
    content_id,
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    user_id_val,
    action_type,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'Content created: ' || NEW.title
      WHEN TG_OP = 'UPDATE' THEN 'Content updated: ' || NEW.title
      WHEN TG_OP = 'DELETE' THEN 'Content deleted: ' || OLD.title
    END,
    jsonb_build_object(
      'operation', TG_OP,
      'content_type', COALESCE(NEW.content_type, OLD.content_type),
      'status', COALESCE(NEW.status, OLD.status)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Update timestamps
CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

CREATE TRIGGER update_content_categories_updated_at
  BEFORE UPDATE ON content_categories
  FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

CREATE TRIGGER update_content_analytics_updated_at
  BEFORE UPDATE ON content_analytics
  FOR EACH ROW EXECUTE FUNCTION update_content_updated_at();

-- Update search vector
CREATE TRIGGER update_content_search_vector_trigger
  BEFORE INSERT OR UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION update_content_search_vector();

-- Calculate performance score
CREATE TRIGGER calculate_performance_score_trigger
  BEFORE INSERT OR UPDATE ON content_analytics
  FOR EACH ROW EXECUTE FUNCTION calculate_content_performance_score();

-- Log content activity
CREATE TRIGGER log_content_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON content_items
  FOR EACH ROW EXECUTE FUNCTION log_content_activity();

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_activity_log ENABLE ROW LEVEL SECURITY;

-- Content Categories Policies (shared across projects)
CREATE POLICY "Users can view all categories" ON content_categories
  FOR SELECT USING (true);

CREATE POLICY "Users can create categories" ON content_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update categories" ON content_categories
  FOR UPDATE USING (true);

-- Content Items Policies
CREATE POLICY "Users can view content they own or collaborate on" ON content_items
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT p.id FROM projects p 
      WHERE p.created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM project_team_members ptm 
        WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() AND ptm.invitation_status = 'active'
      )
    ) OR
    id IN (
      SELECT content_id FROM content_collaborators 
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Users can create content in accessible projects" ON content_items
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (
      SELECT p.id FROM projects p 
      WHERE p.created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM project_team_members ptm 
        WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager', 'editor', 'analyst') 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "Users can update their own content or collaborate content" ON content_items
  FOR UPDATE USING (
    user_id = auth.uid() OR
    id IN (
      SELECT content_id FROM content_collaborators 
      WHERE user_id = auth.uid() AND role IN ('editor', 'admin') AND accepted_at IS NOT NULL
    ) OR
    project_id IN (
      SELECT p.id FROM projects p 
      WHERE p.created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM project_team_members ptm 
        WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager') 
        AND ptm.invitation_status = 'active'
      )
    )
  );

CREATE POLICY "Users can delete their own content" ON content_items
  FOR DELETE USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT p.id FROM projects p 
      WHERE p.created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM project_team_members ptm 
        WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() 
        AND ptm.role IN ('admin', 'manager') 
        AND ptm.invitation_status = 'active'
      )
    )
  );

-- Content Analytics Policies
CREATE POLICY "Users can view analytics for accessible content" ON content_analytics
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM content_items 
      WHERE user_id = auth.uid() OR
      project_id IN (
        SELECT p.id FROM projects p 
        WHERE p.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm 
          WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() AND ptm.invitation_status = 'active'
        )
      )
    )
  );

CREATE POLICY "System can manage analytics" ON content_analytics
  FOR ALL USING (true);

-- Content Tags Policies
CREATE POLICY "Users can manage tags for accessible content" ON content_tags
  FOR ALL USING (
    content_id IN (
      SELECT id FROM content_items 
      WHERE user_id = auth.uid() OR
      project_id IN (
        SELECT p.id FROM projects p 
        WHERE p.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm 
          WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() 
          AND ptm.role IN ('admin', 'manager', 'editor', 'analyst') 
          AND ptm.invitation_status = 'active'
        )
      )
    )
  );

-- Content Versions Policies
CREATE POLICY "Users can view versions for accessible content" ON content_versions
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM content_items 
      WHERE user_id = auth.uid() OR
      project_id IN (
        SELECT p.id FROM projects p 
        WHERE p.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm 
          WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() AND ptm.invitation_status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can create versions for their content" ON content_versions
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    content_id IN (
      SELECT id FROM content_items 
      WHERE user_id = auth.uid() OR
      id IN (
        SELECT content_id FROM content_collaborators 
        WHERE user_id = auth.uid() AND role IN ('editor', 'admin') AND accepted_at IS NOT NULL
      )
    )
  );

-- Content Collaborators Policies
CREATE POLICY "Users can view collaborators for their content" ON content_collaborators
  FOR SELECT USING (
    user_id = auth.uid() OR
    content_id IN (
      SELECT id FROM content_items WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Content owners can manage collaborators" ON content_collaborators
  FOR ALL USING (
    content_id IN (
      SELECT id FROM content_items WHERE user_id = auth.uid()
    )
  );

-- Content Activity Log Policies
CREATE POLICY "Users can view activity for accessible content" ON content_activity_log
  FOR SELECT USING (
    user_id = auth.uid() OR
    content_id IN (
      SELECT id FROM content_items 
      WHERE user_id = auth.uid() OR
      project_id IN (
        SELECT p.id FROM projects p 
        WHERE p.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm 
          WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() AND ptm.invitation_status = 'active'
        )
      )
    )
  );

-- ========================================
-- STORAGE POLICIES
-- ========================================

-- Content Files Bucket Policies
CREATE POLICY "Users can view content files they have access to"
  ON storage.objects FOR SELECT USING (
    bucket_id = 'content-files' AND
    (storage.foldername(name))[1] IN (
      SELECT ci.id::text 
      FROM content_items ci 
      WHERE ci.user_id = auth.uid() OR
      ci.project_id IN (
        SELECT p.id FROM projects p 
        WHERE p.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm 
          WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() AND ptm.invitation_status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can upload content files to accessible projects"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'content-files' AND
    (storage.foldername(name))[1] IN (
      SELECT ci.id::text 
      FROM content_items ci 
      WHERE ci.user_id = auth.uid() OR
      ci.project_id IN (
        SELECT p.id FROM projects p 
        WHERE p.created_by = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM project_team_members ptm 
          WHERE ptm.project_id = p.id AND ptm.user_id = auth.uid() 
          AND ptm.role IN ('admin', 'manager', 'editor', 'analyst') 
          AND ptm.invitation_status = 'active'
        )
      )
    )
  );

CREATE POLICY "Users can update their content files"
  ON storage.objects FOR UPDATE USING (
    bucket_id = 'content-files' AND
    (storage.foldername(name))[1] IN (
      SELECT ci.id::text 
      FROM content_items ci 
      WHERE ci.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their content files"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'content-files' AND
    (storage.foldername(name))[1] IN (
      SELECT ci.id::text 
      FROM content_items ci 
      WHERE ci.user_id = auth.uid()
    )
  );

-- Content Thumbnails Bucket Policies (public bucket)
CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects FOR SELECT USING (bucket_id = 'content-thumbnails');

CREATE POLICY "Users can upload thumbnails for their content"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'content-thumbnails' AND
    (storage.foldername(name))[1] IN (
      SELECT ci.id::text 
      FROM content_items ci 
      WHERE ci.user_id = auth.uid()
    )
  );

-- Content Drafts Bucket Policies
CREATE POLICY "Users can manage their draft files"
  ON storage.objects FOR ALL USING (
    bucket_id = 'content-drafts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- SEED DATA
-- ========================================

-- Insert default content categories
INSERT INTO content_categories (name, description, color, icon) VALUES
  ('Marketing', 'Marketing materials and campaigns', '#ef4444', 'megaphone'),
  ('Documentation', 'Technical and product documentation', '#3b82f6', 'file-text'),
  ('Social Media', 'Social media content and posts', '#8b5cf6', 'share-2'),
  ('Blog Posts', 'Blog articles and written content', '#10b981', 'edit-3'),
  ('Presentations', 'Slides and presentation materials', '#f59e0b', 'presentation'),
  ('Videos', 'Video content and multimedia', '#ec4899', 'video'),
  ('Images', 'Photos, graphics, and visual assets', '#06b6d4', 'image'),
  ('Other', 'Miscellaneous content', '#6b7280', 'folder');