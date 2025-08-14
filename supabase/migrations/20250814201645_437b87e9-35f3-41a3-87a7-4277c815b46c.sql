-- Advanced File Management Schema Enhancement

-- Add folder hierarchy support
CREATE TABLE IF NOT EXISTS file_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  team_id UUID,
  user_id UUID NOT NULL,
  folder_path TEXT NOT NULL, -- Full path for efficient queries
  is_system BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, parent_id, name)
);

-- Add file processing jobs table
CREATE TABLE IF NOT EXISTS file_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  job_type TEXT NOT NULL, -- 'optimization', 'thumbnail', 'analysis', 'deduplication'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  priority INTEGER DEFAULT 0,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  processing_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add file deduplication table
CREATE TABLE IF NOT EXISTS file_deduplication (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  original_content_id UUID NOT NULL,
  duplicate_content_ids UUID[] DEFAULT '{}',
  similarity_score DECIMAL(5,4),
  deduplication_status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'merged'
  space_saved BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(content_hash, file_size)
);

-- Add file versions table
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  version_label TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_hash TEXT NOT NULL,
  change_summary TEXT,
  is_current BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(content_id, version_number)
);

-- Add batch upload sessions table
CREATE TABLE IF NOT EXISTS batch_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  upload_settings JSONB DEFAULT '{}',
  folder_structure JSONB DEFAULT '{}',
  batch_metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add enhanced search index table
CREATE TABLE IF NOT EXISTS content_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL UNIQUE,
  title_vector TSVECTOR,
  description_vector TSVECTOR,
  content_vector TSVECTOR,
  tag_vector TSVECTOR,
  combined_vector TSVECTOR,
  visual_features JSONB DEFAULT '{}', -- For visual similarity search
  ai_keywords TEXT[],
  language TEXT DEFAULT 'en',
  content_quality_score DECIMAL(3,2),
  last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  index_version INTEGER DEFAULT 1
);

-- Add file storage analytics table
CREATE TABLE IF NOT EXISTS file_storage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  team_id UUID,
  user_id UUID,
  analytics_date DATE DEFAULT CURRENT_DATE,
  total_files INTEGER DEFAULT 0,
  total_storage_bytes BIGINT DEFAULT 0,
  storage_by_type JSONB DEFAULT '{}',
  upload_activity JSONB DEFAULT '{}',
  most_accessed_files JSONB DEFAULT '{}',
  storage_optimization_savings BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, analytics_date)
);

-- Add content lifecycle policies table
CREATE TABLE IF NOT EXISTS content_lifecycle_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID,
  team_id UUID,
  user_id UUID NOT NULL,
  policy_rules JSONB NOT NULL, -- Defines archival, deletion, etc. rules
  is_active BOOLEAN DEFAULT true,
  auto_apply BOOLEAN DEFAULT false,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE file_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_deduplication ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_storage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_lifecycle_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_folders
CREATE POLICY "Users can manage folders for their teams"
  ON file_folders FOR ALL
  USING (
    user_id = auth.uid() OR 
    (team_id IN (
      SELECT tm.team_id FROM team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    ))
  );

-- RLS Policies for file_processing_jobs  
CREATE POLICY "Users can view processing jobs for their content"
  ON file_processing_jobs FOR SELECT
  USING (
    content_id IN (
      SELECT ci.id FROM content_items ci 
      WHERE ci.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage processing jobs"
  ON file_processing_jobs FOR ALL
  USING (true);

-- RLS Policies for file_deduplication
CREATE POLICY "Users can view deduplication for their content"
  ON file_deduplication FOR SELECT
  USING (
    original_content_id IN (
      SELECT ci.id FROM content_items ci 
      WHERE ci.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage deduplication"
  ON file_deduplication FOR ALL
  USING (true);

-- RLS Policies for file_versions
CREATE POLICY "Users can manage versions for their content"
  ON file_versions FOR ALL
  USING (
    content_id IN (
      SELECT ci.id FROM content_items ci 
      WHERE ci.user_id = auth.uid()
    )
  );

-- RLS Policies for batch_upload_sessions
CREATE POLICY "Users can manage their own batch sessions"
  ON batch_upload_sessions FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for content_search_index
CREATE POLICY "Users can view search index for accessible content"
  ON content_search_index FOR SELECT
  USING (
    content_id IN (
      SELECT ci.id FROM content_items ci 
      WHERE ci.user_id = auth.uid() OR 
      ci.team_id IN (
        SELECT tm.team_id FROM team_members tm 
        WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
      )
    )
  );

CREATE POLICY "System can manage search index"
  ON content_search_index FOR ALL
  USING (true);

-- RLS Policies for file_storage_analytics
CREATE POLICY "Users can view analytics for accessible projects"
  ON file_storage_analytics FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT p.id FROM projects p 
      WHERE p.created_by = auth.uid() OR 
      p.team_id IN (
        SELECT tm.team_id FROM team_members tm 
        WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
      )
    )
  );

-- RLS Policies for content_lifecycle_policies
CREATE POLICY "Users can manage lifecycle policies for their content"
  ON content_lifecycle_policies FOR ALL
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT tm.team_id FROM team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.is_active = true AND tm.status = 'active'
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_project ON file_folders(parent_id, project_id);
CREATE INDEX IF NOT EXISTS idx_file_folders_path ON file_folders(folder_path);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_status ON file_processing_jobs(status, priority);
CREATE INDEX IF NOT EXISTS idx_file_processing_jobs_content ON file_processing_jobs(content_id);
CREATE INDEX IF NOT EXISTS idx_file_deduplication_hash ON file_deduplication(content_hash);
CREATE INDEX IF NOT EXISTS idx_file_versions_content ON file_versions(content_id, version_number);
CREATE INDEX IF NOT EXISTS idx_batch_sessions_user_status ON batch_upload_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_search_index_content ON content_search_index(content_id);
CREATE INDEX IF NOT EXISTS idx_search_combined_vector ON content_search_index USING gin(combined_vector);
CREATE INDEX IF NOT EXISTS idx_storage_analytics_date ON file_storage_analytics(analytics_date, project_id);

-- Add triggers for maintaining folder paths
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.folder_path = NEW.name;
  ELSE
    SELECT folder_path || '/' || NEW.name INTO NEW.folder_path
    FROM file_folders WHERE id = NEW.parent_id;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_folder_path
  BEFORE INSERT OR UPDATE ON file_folders
  FOR EACH ROW EXECUTE FUNCTION update_folder_path();

-- Add trigger for file version management
CREATE OR REPLACE FUNCTION manage_file_versions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_current = true THEN
    -- Mark other versions as not current
    UPDATE file_versions 
    SET is_current = false 
    WHERE content_id = NEW.content_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_file_versions
  AFTER INSERT OR UPDATE ON file_versions
  FOR EACH ROW EXECUTE FUNCTION manage_file_versions();

-- Add content_items enhancements for advanced file management
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES file_folders(id),
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS optimization_level TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES content_items(id),
ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_quality_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS storage_tier TEXT DEFAULT 'hot', -- 'hot', 'warm', 'cold', 'archive'
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;