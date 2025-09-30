# ContentLab Nexus - Complete Development Prompt
## Enterprise-Grade Team Collaboration Platform with Advanced CMS

**Target Production Readiness Score: 98%+**

---

## 🎯 Project Overview

Build a flawless, production-ready, enterprise-grade team collaboration platform with advanced content management capabilities. This system must handle real-time collaboration, AI-powered insights, sophisticated file processing, and enterprise workflows at scale.

---

## 📚 Technology Stack

### Frontend Stack
```json
{
  "core": {
    "react": "18.3.1",
    "typescript": "5.6.2",
    "vite": "5.4.1"
  },
  "styling": {
    "tailwindcss": "3.4.1",
    "@radix-ui/*": "latest (all components)",
    "class-variance-authority": "0.7.1",
    "tailwind-merge": "2.5.2"
  },
  "routing": {
    "react-router-dom": "6.26.2"
  },
  "state_management": {
    "@tanstack/react-query": "5.83.0",
    "@tanstack/react-query-devtools": "5.83.0"
  },
  "forms": {
    "react-hook-form": "7.53.0",
    "@hookform/resolvers": "3.9.0",
    "zod": "3.23.8"
  },
  "data_visualization": {
    "recharts": "2.15.4"
  },
  "icons": {
    "lucide-react": "0.462.0"
  },
  "utilities": {
    "date-fns": "3.6.0",
    "sonner": "1.5.0 (toast notifications)",
    "idb": "8.0.3 (IndexedDB wrapper)"
  }
}
```

### Backend Stack
```json
{
  "database": "PostgreSQL 15+ (via Supabase)",
  "authentication": "Supabase Auth",
  "storage": "Supabase Storage",
  "realtime": "Supabase Realtime",
  "edge_functions": "Deno-based Supabase Edge Functions",
  "ai_integration": "OpenAI GPT-4 + Custom ML Models"
}
```

---

## 🏗️ Architecture Requirements

### Project Structure
```
contentlab-nexus-flow/
├── src/
│   ├── assets/              # Static assets
│   ├── components/
│   │   ├── ui/             # Radix UI components (shadcn/ui)
│   │   ├── layout/         # Layout components
│   │   ├── content/        # Content-specific components
│   │   ├── collaboration/  # Real-time collaboration components
│   │   └── analytics/      # Analytics & visualization components
│   ├── hooks/
│   │   ├── content/        # Content management hooks
│   │   ├── collaboration/  # Collaboration hooks
│   │   ├── analytics/      # Analytics hooks
│   │   └── ai/            # AI-powered hooks
│   ├── pages/              # Route pages
│   ├── services/           # API service layer
│   ├── types/              # TypeScript definitions
│   ├── lib/                # Utilities
│   ├── integrations/
│   │   └── supabase/       # Supabase client & types
│   └── App.tsx
├── supabase/
│   ├── functions/          # Edge Functions (35+)
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── docs/                   # Documentation
└── tests/                  # Test files
```

---

## 🎨 Core Features (Complete Specification)

### 1. Authentication & User Management

#### Requirements
- **Multi-Provider Auth**: Email/password, Google, GitHub, Microsoft
- **Security Features**:
  - Password strength validation (min 8 chars, uppercase, lowercase, number, special char)
  - Two-factor authentication (TOTP)
  - Session management with automatic refresh
  - Password reset with email verification
  - Account recovery options
  - Login attempt rate limiting (5 attempts per 15 min)

#### Database Schema
```sql
-- Extends auth.users (managed by Supabase)

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  last_team_id UUID REFERENCES teams(id),
  preferences JSONB DEFAULT '{"theme": "system", "notifications": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_sessions_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  location_data JSONB,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions_security ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### Implementation Components
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/auth/PasswordResetForm.tsx`
- `src/components/auth/TwoFactorSetup.tsx`
- `src/hooks/auth/useAuth.ts`
- `src/hooks/auth/useSession.ts`

---

### 2. Team Management System

#### Requirements
- **Team Creation & Management**:
  - Create teams with custom names, descriptions, types
  - Set member limits
  - Team settings (privacy, permissions, integrations)
  - Team deletion with data archival

- **Role-Based Access Control (RBAC)**:
  - Hierarchy: Owner (10) > Admin (8) > Manager (6) > Member (4) > Viewer (2) > Guest (1)
  - Granular permissions per role
  - Custom role creation
  - Permission inheritance

- **Team Invitations**:
  - Email-based invitations with unique tokens
  - Invitation expiration (7 days default)
  - Invitation management (resend, cancel, track)
  - Bulk invite support

- **Member Management**:
  - Add/remove members
  - Role assignment and changes
  - Member activity tracking
  - Suspension and reactivation

#### Database Schema
```sql
CREATE TYPE team_type AS ENUM ('organization', 'project', 'department', 'client');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  team_type team_type DEFAULT 'organization',
  settings JSONB DEFAULT '{}'::jsonb,
  member_limit INTEGER DEFAULT 50,
  current_member_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  role_type TEXT, -- 'system', 'management', 'operational'
  hierarchy_level INTEGER NOT NULL, -- 1-10 scale
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role_id UUID REFERENCES user_roles(id),
  status member_status DEFAULT 'active',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id UUID REFERENCES user_roles(id),
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  declined_at TIMESTAMPTZ,
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Security Definer Functions to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_team_ids_safe(p_user_id UUID)
RETURNS TABLE(team_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id as team_id
  FROM teams t
  WHERE t.owner_id = p_user_id AND t.is_active = true
  UNION
  SELECT tm.team_id
  FROM team_members tm
  WHERE tm.user_id = p_user_id 
    AND tm.is_active = true 
    AND tm.status = 'active'::member_status;
$$;

CREATE POLICY "Users can view their teams"
  ON public.teams FOR SELECT
  USING (id IN (SELECT get_user_team_ids_safe(auth.uid())));

CREATE POLICY "Team members can view member list"
  ON public.team_members FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids_safe(auth.uid())));
```

#### Implementation Components
- `src/components/teams/TeamCreationWizard.tsx`
- `src/components/teams/TeamSettings.tsx`
- `src/components/teams/MemberManagement.tsx`
- `src/components/teams/InvitationManager.tsx`
- `src/components/teams/RoleEditor.tsx`
- `src/hooks/teams/useTeams.ts`
- `src/hooks/teams/useTeamMembers.ts`
- `src/hooks/teams/useInvitations.ts`

---

### 3. Project Management

#### Requirements
- **Project CRUD Operations**:
  - Create, read, update, delete projects
  - Project templates for quick setup
  - Project duplication
  - Project archival and restoration

- **Project Attributes**:
  - Name, description, status, priority
  - Start and end dates
  - Budget tracking
  - Custom fields (configurable)
  - Tags and categories
  - Project milestones

- **Team Assignment**:
  - Assign teams to projects
  - Project-specific roles
  - Member invitation to projects
  - Activity tracking

- **File Management**:
  - Attach files to projects
  - Version control
  - File organization (folders)
  - Access control

#### Database Schema
```sql
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES auth.users(id),
  status project_status DEFAULT 'planning',
  priority project_priority DEFAULT 'medium',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12, 2),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, slug)
);

CREATE TABLE public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- admin, manager, member, viewer
  invitation_status TEXT DEFAULT 'active',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  completion_percentage INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = p_project_id AND created_by = p_user_id
    UNION
    SELECT 1 FROM public.project_team_members 
    WHERE project_id = p_project_id 
      AND user_id = p_user_id 
      AND invitation_status = 'active'
  );
$$;

CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT
  USING (user_can_access_project(id, auth.uid()));
```

#### Implementation Components
- `src/components/projects/ProjectCard.tsx`
- `src/components/projects/ProjectList.tsx`
- `src/components/projects/ProjectForm.tsx`
- `src/components/projects/ProjectDetails.tsx`
- `src/components/projects/MilestoneTracker.tsx`
- `src/hooks/projects/useProjects.ts`
- `src/hooks/projects/useProjectMembers.ts`

---

### 4. Advanced Content Management System (CMS)

#### 4.1 Core Content Features

##### Requirements
- **Content Types**: Documents, Images, Videos, Audio, Archives, Code files
- **CRUD Operations**: Create, read, update, delete with soft delete
- **Content Organization**:
  - Folder hierarchy (unlimited depth)
  - Categories and tags
  - Custom metadata fields
  - Full-text search with filters
  - Advanced sorting and filtering

- **Content Attributes**:
  - Title, description, content type
  - File path, MIME type, file size
  - Status (draft, in_review, published, archived)
  - Workflow status (created, processing, reviewed, approved, published)
  - Quality score (0-100)
  - Access tracking (view count, last accessed)

##### Database Schema
```sql
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  folder_id UUID REFERENCES content_folders(id) ON DELETE SET NULL,
  category_id UUID REFERENCES content_categories(id),
  
  -- Core attributes
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- document, image, video, audio, archive
  mime_type TEXT,
  file_path TEXT,
  file_size BIGINT,
  thumbnail_path TEXT,
  
  -- Status and workflow
  status TEXT DEFAULT 'draft', -- draft, in_review, published, archived
  workflow_status TEXT DEFAULT 'created', -- created, processing, reviewed, approved, published
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  
  -- Advanced features
  content_hash TEXT, -- SHA-256 for deduplication
  duplicate_of UUID REFERENCES content_items(id),
  optimization_level TEXT DEFAULT 'standard', -- none, standard, aggressive
  storage_tier TEXT DEFAULT 'hot', -- hot, warm, cold
  content_quality_score NUMERIC(5, 2),
  
  -- Metadata and tracking
  metadata JSONB DEFAULT '{}'::jsonb,
  ai_tags TEXT[] DEFAULT '{}',
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Review workflow
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  
  -- Publishing
  scheduled_publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- Search
  search_vector TSVECTOR,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.content_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  parent_id UUID REFERENCES content_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6366f1',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6366f1',
  parent_id UUID REFERENCES content_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, tag)
);

-- Full-text search index
CREATE INDEX idx_content_search_vector ON content_items USING gin(search_vector);

-- Update search vector trigger
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.ai_tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_search_vector_update
  BEFORE INSERT OR UPDATE ON content_items
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_vector();

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view team content"
  ON public.content_items FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids_safe(auth.uid())));

CREATE POLICY "Team members can create content"
  ON public.content_items FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT get_user_team_ids_safe(auth.uid()))
  );
```

---

#### 4.2 Advanced File Processing Pipeline

##### Requirements
- **Automatic Processing**: Trigger processing on file upload
- **Multi-Stage Pipeline**:
  1. File validation (size, type, malware scan)
  2. Hash generation for deduplication
  3. Thumbnail/preview generation
  4. Text extraction (PDF, DOCX, etc.)
  5. Metadata extraction (EXIF, ID3, etc.)
  6. Image optimization (compression, format conversion)
  7. Video transcoding (multiple resolutions)
  8. Audio transcription
  9. AI analysis (content categorization, tagging)
  10. Quality scoring

- **Real-Time Progress Tracking**:
  - Job status updates
  - Progress percentage
  - Step-by-step completion
  - Error reporting
  - Retry mechanism

- **Processing Jobs Management**:
  - Queue system with priorities
  - Parallel processing support
  - Job cancellation
  - Job history and logs

##### Database Schema
```sql
CREATE TYPE job_status AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE job_type AS ENUM (
  'thumbnail_generation',
  'document_processing',
  'content_analysis',
  'image_optimization',
  'video_transcoding',
  'audio_transcription',
  'text_extraction',
  'metadata_extraction'
);

CREATE TABLE public.file_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  job_type job_type NOT NULL,
  status job_status DEFAULT 'pending',
  priority INTEGER DEFAULT 5, -- 1 (lowest) to 10 (highest)
  
  -- Progress tracking
  progress_percent INTEGER DEFAULT 0,
  current_step TEXT,
  total_steps INTEGER,
  
  -- Job execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  
  -- Results and errors
  result_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.processing_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES file_processing_jobs(id) ON DELETE CASCADE,
  log_level TEXT NOT NULL, -- info, warning, error, debug
  message TEXT NOT NULL,
  step_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_processing_jobs_status ON file_processing_jobs(status);
CREATE INDEX idx_processing_jobs_content ON file_processing_jobs(content_id);
CREATE INDEX idx_processing_jobs_created ON file_processing_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.file_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_job_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view processing jobs for team content"
  ON public.file_processing_jobs FOR SELECT
  USING (
    content_id IN (
      SELECT id FROM content_items 
      WHERE team_id IN (SELECT get_user_team_ids_safe(auth.uid()))
    )
  );
```

##### Edge Functions Required
```typescript
// supabase/functions/document-processor/index.ts
// - Handles PDF, DOCX, XLSX text extraction
// - Generates thumbnails
// - Extracts metadata
// - Updates job progress in real-time

// supabase/functions/image-optimizer/index.ts
// - Compresses images
// - Generates multiple sizes
// - Converts formats (WebP, AVIF)
// - Preserves EXIF data

// supabase/functions/video-transcoder/index.ts
// - Transcodes videos to multiple resolutions
// - Generates video thumbnails
// - Extracts video metadata
// - Supports adaptive streaming

// supabase/functions/audio-transcriber/index.ts
// - Transcribes audio to text
// - Supports multiple languages
// - Generates captions/subtitles
// - Uses OpenAI Whisper API

// supabase/functions/content-analyzer/index.ts
// - AI-powered content categorization
// - Auto-generates tags
// - Calculates quality score
// - Detects duplicates
```

##### Implementation Components
- `src/components/content/FileUploadWithProcessing.tsx`
- `src/components/content/ProcessingProgressIndicator.tsx`
- `src/components/content/ProcessingJobsList.tsx`
- `src/hooks/useFileProcessing.ts`
- `src/hooks/useFileProcessingIntegration.ts`
- `src/services/fileProcessingService.ts`

---

#### 4.3 Enterprise Review Workflow System

##### Requirements
- **Multi-Stage Approval Workflows**:
  - Configurable workflow stages (2-10 stages)
  - Role-based assignments per stage
  - Sequential or parallel approvals
  - Conditional routing based on content type/metadata

- **Review Features**:
  - Threaded comments on content
  - Annotations and markup
  - Change requests
  - Approval/rejection with reasoning
  - Review history and audit trail

- **Compliance & Checklists**:
  - Custom compliance checklists
  - Required fields validation
  - Policy enforcement
  - Legal review tracking
  - Version comparison

- **Notifications & Reminders**:
  - Review assignment notifications
  - Deadline reminders
  - Escalation for overdue reviews
  - Activity digests

##### Database Schema
```sql
CREATE TYPE workflow_stage_type AS ENUM ('review', 'approval', 'legal', 'compliance', 'quality_check');
CREATE TYPE review_decision AS ENUM ('pending', 'approved', 'rejected', 'changes_requested');

CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  stages JSONB NOT NULL, -- Array of stage configurations
  content_type_filter TEXT[], -- Which content types this applies to
  metadata_rules JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.content_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workflow_templates(id),
  current_stage INTEGER DEFAULT 1,
  total_stages INTEGER NOT NULL,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, cancelled
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.workflow_stage_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID REFERENCES content_workflow_instances(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_type workflow_stage_type NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_role UUID REFERENCES user_roles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Review decision
  decision review_decision DEFAULT 'pending',
  comments TEXT,
  checklist_results JSONB DEFAULT '{}'::jsonb,
  
  -- Tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  is_overdue BOOLEAN GENERATED ALWAYS AS (
    deadline IS NOT NULL AND 
    completed_at IS NULL AND 
    deadline < NOW()
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.review_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  checklist_items JSONB NOT NULL, -- Array of checklist items
  is_required BOOLEAN DEFAULT false,
  applicable_content_types TEXT[],
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  review_id UUID REFERENCES workflow_stage_reviews(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES review_comments(id),
  author_id UUID REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'general', -- general, change_request, question, suggestion
  status TEXT DEFAULT 'open', -- open, resolved, closed
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  annotations JSONB DEFAULT '{}'::jsonb, -- Position data for annotations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view team workflows"
  ON public.workflow_templates FOR SELECT
  USING (team_id IN (SELECT get_user_team_ids_safe(auth.uid())));

CREATE POLICY "Assigned reviewers can view their reviews"
  ON public.workflow_stage_reviews FOR SELECT
  USING (
    assigned_to = auth.uid() OR
    workflow_instance_id IN (
      SELECT wi.id FROM content_workflow_instances wi
      JOIN content_items ci ON wi.content_id = ci.id
      WHERE ci.team_id IN (SELECT get_user_team_ids_safe(auth.uid()))
    )
  );
```

##### Implementation Components
- `src/components/workflow/WorkflowTemplateBuilder.tsx`
- `src/components/workflow/WorkflowStageCard.tsx`
- `src/components/workflow/ReviewDashboard.tsx`
- `src/components/workflow/ChecklistEditor.tsx`
- `src/components/workflow/ReviewCommentThread.tsx`
- `src/hooks/workflow/useWorkflowTemplates.ts`
- `src/hooks/workflow/useContentWorkflow.ts`
- `src/hooks/workflow/useReviews.ts`

---

#### 4.4 Sophisticated Deduplication System

##### Requirements
- **Content Hash-Based Detection**:
  - SHA-256 hashing of file content
  - Automatic duplicate detection on upload
  - Visual similarity detection for images
  - Fuzzy matching for text content

- **Duplicate Management**:
  - Duplicate groups visualization
  - Side-by-side comparison
  - Merge functionality with data preservation
  - Keep/delete decisions
  - Batch operations

- **Storage Optimization**:
  - Single storage with multiple references
  - Automatic cleanup of orphaned files
  - Space savings reporting
  - Deduplication analytics

##### Database Schema
```sql
CREATE TABLE public.duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  similarity_score NUMERIC(5, 2) DEFAULT 100.00, -- 0-100 scale
  detection_method TEXT NOT NULL, -- 'hash', 'visual', 'fuzzy', 'metadata'
  group_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.duplicate_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES duplicate_groups(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5, 2) DEFAULT 100.00,
  is_original BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, content_id)
);

CREATE TABLE public.deduplication_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  project_id UUID REFERENCES projects(id),
  date DATE DEFAULT CURRENT_DATE,
  duplicates_found INTEGER DEFAULT 0,
  duplicates_merged INTEGER DEFAULT 0,
  space_saved_bytes BIGINT DEFAULT 0,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_duplicate_groups_hash ON duplicate_groups(content_hash);
CREATE INDEX idx_content_items_hash ON content_items(content_hash);

-- Enable RLS
ALTER TABLE public.duplicate_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduplication_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view duplicate groups"
  ON public.duplicate_groups FOR SELECT
  USING (
    original_content_id IN (
      SELECT id FROM content_items 
      WHERE team_id IN (SELECT get_user_team_ids_safe(auth.uid()))
    )
  );
```

##### Edge Functions Required
```typescript
// supabase/functions/deduplication-scanner/index.ts
// - Scans content for duplicates
// - Compares hashes
// - Visual similarity for images
// - Returns duplicate groups

// supabase/functions/content-merger/index.ts
// - Merges duplicate content items
// - Preserves metadata from all duplicates
// - Updates references
// - Cleans up storage
```

##### Implementation Components
- `src/components/content/DuplicateScanner.tsx`
- `src/components/content/DuplicateGroupCard.tsx`
- `src/components/content/DuplicateComparison.tsx`
- `src/components/content/MergeDuplicatesDialog.tsx`
- `src/hooks/content/useDuplicateDetection.ts`
- `src/services/realDeduplicationService.ts`

---

#### 4.5 Batch Upload & Processing

##### Requirements
- **Bulk Upload Interface**:
  - Drag-and-drop multiple files
  - Folder structure preservation
  - Progress tracking per file
  - Pause/resume capability
  - Upload queue management

- **Batch Processing Options**:
  - Apply metadata to all files
  - Bulk categorization and tagging
  - Workflow assignment
  - Processing settings per batch
  - Automatic folder creation

- **Session Management**:
  - Save upload sessions
  - Resume interrupted uploads
  - Session history
  - Batch analytics

##### Database Schema
```sql
CREATE TABLE public.batch_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  session_name TEXT,
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  upload_settings JSONB DEFAULT '{}'::jsonb,
  folder_structure JSONB DEFAULT '{}'::jsonb,
  batch_metadata JSONB DEFAULT '{}'::jsonb,
  error_summary TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.batch_upload_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES batch_upload_sessions(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT DEFAULT 'pending', -- pending, uploading, processing, completed, failed
  progress_percent INTEGER DEFAULT 0,
  error_message TEXT,
  upload_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.batch_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_upload_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their batch sessions"
  ON public.batch_upload_sessions FOR ALL
  USING (user_id = auth.uid());
```

##### Implementation Components
- `src/components/content/BatchUploadZone.tsx`
- `src/components/content/BatchUploadProgress.tsx`
- `src/components/content/BatchSessionManager.tsx`
- `src/hooks/content/useBatchUpload.ts`
- `src/hooks/useAdvancedFileManagement.ts`

---

#### 4.6 Content Activity Logging

##### Requirements
- **Granular Activity Tracking**:
  - All content operations (create, read, update, delete)
  - User actions with timestamps
  - IP address and user agent
  - Session tracking
  - Geographic location (optional)

- **Audit Trail**:
  - Complete history per content item
  - Before/after states for changes
  - Compliance reporting
  - Export functionality
  - Retention policies

- **Security & Privacy**:
  - GDPR compliance
  - PII anonymization options
  - Access logs
  - Suspicious activity detection

##### Database Schema
```sql
CREATE TYPE activity_type AS ENUM (
  'content_management',
  'file_operation',
  'workflow',
  'team_management',
  'communication',
  'security',
  'system'
);

CREATE TABLE public.content_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'viewed', etc.
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  project_id UUID REFERENCES projects(id),
  activity_type activity_type NOT NULL,
  action VARCHAR NOT NULL,
  description TEXT,
  resource_type VARCHAR,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT DEFAULT 'info', -- info, warning, error, critical
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR,
  target_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_team ON activity_logs(team_id, created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type, created_at DESC);
CREATE INDEX idx_content_activity_content ON content_activity_log(content_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.content_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view activity for their content"
  ON public.content_activity_log FOR SELECT
  USING (
    user_id = auth.uid() OR
    content_id IN (
      SELECT id FROM content_items 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view team activity"
  ON public.activity_logs FOR SELECT
  USING (
    user_id = auth.uid() OR
    team_id IN (SELECT get_user_team_ids_safe(auth.uid())) OR
    project_id IN (
      SELECT id FROM projects 
      WHERE created_by = auth.uid() OR
      team_id IN (SELECT get_user_team_ids_safe(auth.uid()))
    )
  );
```

##### Implementation Components
- `src/components/activity/ActivityFeed.tsx`
- `src/components/activity/ActivityTimeline.tsx`
- `src/components/activity/AuditLogViewer.tsx`
- `src/hooks/activity/useActivityLog.ts`

---

#### 4.7 Advanced Content Settings

##### Requirements
- **User-Level Settings**:
  - Default upload settings
  - Processing preferences
  - Notification preferences
  - Privacy settings

- **Team-Level Settings**:
  - Default workflows
  - Content policies
  - Storage quotas
  - Retention policies

- **Project-Level Settings**:
  - Content organization rules
  - Auto-tagging rules
  - Quality thresholds
  - Access controls

##### Database Schema
```sql
CREATE TABLE public.content_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  team_id UUID REFERENCES teams(id),
  
  -- Upload settings
  upload_settings JSONB DEFAULT '{
    "autoProcess": true,
    "generateThumbnails": true,
    "optimizeImages": true,
    "extractMetadata": true,
    "defaultOptimizationLevel": "standard"
  }'::jsonb,
  
  -- Processing settings
  processing_settings JSONB DEFAULT '{
    "autoAnalyze": true,
    "generateAITags": true,
    "calculateQualityScore": true,
    "detectDuplicates": true
  }'::jsonb,
  
  -- Workflow settings
  workflow_settings JSONB DEFAULT '{
    "defaultWorkflowId": null,
    "autoAssignReviewers": false,
    "requireApprovalBeforePublish": true
  }'::jsonb,
  
  -- Storage settings
  storage_settings JSONB DEFAULT '{
    "defaultStorageTier": "hot",
    "autoArchiveAfterDays": 365,
    "autoDeleteArchivedAfterDays": null
  }'::jsonb,
  
  -- Notification settings
  notification_settings JSONB DEFAULT '{
    "notifyOnUpload": true,
    "notifyOnProcessingComplete": true,
    "notifyOnReviewAssignment": true,
    "notifyOnApproval": true,
    "digestFrequency": "daily"
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, team_id)
);

-- Enable RLS
ALTER TABLE public.content_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own content settings"
  ON public.content_settings FOR ALL
  USING (user_id = auth.uid());
```

##### Implementation Components
- `src/components/settings/ContentSettings.tsx`
- `src/components/settings/ProcessingSettings.tsx`
- `src/components/settings/WorkflowSettings.tsx`
- `src/hooks/settings/useContentSettings.ts`

---

#### 4.8 Content Versioning & Version Control

##### Requirements
- **Automatic Versioning**:
  - Create version on every save
  - Version numbering (semantic versioning)
  - Change detection and diffing
  - Version metadata

- **Version Management**:
  - View version history
  - Compare versions side-by-side
  - Restore previous versions
  - Branch and merge support
  - Version comments and tags

- **Storage Optimization**:
  - Delta storage (only changes)
  - Compression
  - Configurable retention

##### Database Schema
```sql
CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_name TEXT,
  
  -- Version data
  file_path TEXT,
  file_size BIGINT,
  content_hash TEXT,
  delta_from_previous JSONB, -- Stores only changes for efficiency
  
  -- Metadata
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Storage
  is_deleted BOOLEAN DEFAULT false,
  storage_tier TEXT DEFAULT 'hot',
  
  UNIQUE(content_id, version_number)
);

CREATE TABLE public.content_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  base_version_id UUID REFERENCES content_versions(id),
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'active', -- active, merged, closed
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, branch_name)
);

-- Enable RLS
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Team members can view content versions"
  ON public.content_versions FOR SELECT
  USING (
    content_id IN (
      SELECT id FROM content_items 
      WHERE team_id IN (SELECT get_user_team_ids_safe(auth.uid()))
    )
  );
```

##### Implementation Components
- `src/components/content/VersionHistory.tsx`
- `src/components/content/VersionComparison.tsx`
- `src/components/content/BranchManager.tsx`
- `src/hooks/content/useContentVersionControl.ts`

---

### 5. Real-Time Collaboration

#### Requirements
- **Live Document Editing**:
  - Operational Transformation (OT) or CRDT
  - Real-time cursor tracking
  - User presence indicators
  - Conflict resolution

- **Comments & Discussions**:
  - Inline comments
  - Threaded discussions
  - @mentions with notifications
  - Emoji reactions

- **Activity Feeds**:
  - Real-time updates
  - Filtered views
  - Activity aggregation
  - Export functionality

- **Team Chat**:
  - Channel-based messaging
  - Direct messages
  - File sharing in chat
  - Message search

#### Implementation Components
- `src/components/collaboration/LiveCursors.tsx`
- `src/components/collaboration/CollaborativeEditor.tsx`
- `src/components/collaboration/CommentThread.tsx`
- `src/components/collaboration/TeamChat.tsx`
- `src/hooks/collaboration/useCollaboration.ts`
- `src/hooks/collaboration/useRealtimePresence.ts`

---

### 6. AI-Powered Features

#### Requirements
- **AI Collaboration Assistant**:
  - Context-aware suggestions
  - Content improvement recommendations
  - Writing assistance
  - Translation support

- **Predictive Analytics**:
  - Trend detection
  - Performance forecasting
  - Resource optimization recommendations
  - Risk prediction

- **Content Intelligence**:
  - Auto-categorization
  - Smart tagging
  - Quality scoring
  - SEO optimization

- **Competitive Analysis**:
  - Market intelligence
  - Competitor tracking
  - SERP analysis
  - Opportunity identification

#### Edge Functions Required
```typescript
// supabase/functions/ai-collaboration-assistant/index.ts
// supabase/functions/predictive-analytics-engine/index.ts
// supabase/functions/content-intelligence/index.ts
// supabase/functions/competitive-analyzer/index.ts
```

#### Implementation Components
- `src/components/ai/AIAssistantPanel.tsx`
- `src/components/ai/PredictiveInsights.tsx`
- `src/components/ai/ContentSuggestions.tsx`
- `src/hooks/ai/useAIAssistant.ts`
- `src/hooks/ai/usePredictiveAnalytics.ts`

---

### 7. Analytics & Reporting

#### Requirements
- **Real-Time Metrics**:
  - Content performance
  - Team productivity
  - System usage
  - Resource utilization

- **Custom Dashboards**:
  - Drag-and-drop widgets
  - Custom metrics
  - Saved views
  - Export options

- **Report Generation**:
  - Scheduled reports
  - Custom templates
  - PDF/Excel export
  - Email distribution

- **Business Intelligence**:
  - KPI tracking
  - ROI analysis
  - Trend analysis
  - Forecasting

#### Implementation Components
- `src/components/analytics/AnalyticsDashboard.tsx`
- `src/components/analytics/MetricsWidget.tsx`
- `src/components/analytics/ReportBuilder.tsx`
- `src/hooks/analytics/useAnalytics.ts`
- `src/hooks/analytics/useBusinessMetrics.ts`

---

## 🔒 Security Requirements

### 1. Row-Level Security (RLS)
- Enable RLS on ALL user-accessible tables
- Use Security Definer functions to avoid recursion
- Implement least-privilege access
- Test all policies thoroughly

### 2. Authentication & Authorization
- JWT validation on all protected routes
- Role-based access control (RBAC)
- API key management
- Session management with auto-refresh

### 3. Data Protection
- Input validation using Zod schemas
- SQL injection prevention
- XSS protection
- CSRF tokens

### 4. Rate Limiting
- API endpoint rate limits
- Upload rate limits
- Login attempt limiting
- DDoS protection

### 5. Audit & Compliance
- Complete audit trails
- GDPR compliance
- Data retention policies
- Export user data functionality

---

## 📊 Performance Requirements

### 1. Frontend Performance
- Initial load < 2 seconds
- Time to Interactive (TTI) < 3 seconds
- Lighthouse score > 90
- Core Web Vitals: Green

### 2. Backend Performance
- API response time < 200ms (p95)
- Database query optimization
- Edge function cold start < 1s
- Realtime latency < 100ms

### 3. Optimization Strategies
- Code splitting & lazy loading
- React Query caching
- Virtual scrolling for lists
- Image optimization (WebP, lazy load)
- CDN for static assets

---

## ✅ Quality Gates

### Must Pass Before Production:
1. **Security Audit**: All RLS policies tested, no vulnerabilities
2. **Performance**: Lighthouse > 90, TTI < 3s
3. **Accessibility**: WCAG 2.1 AA compliance
4. **Test Coverage**: > 80% coverage
5. **Mobile Experience**: Perfect responsive design, PWA ready
6. **Error Handling**: Comprehensive error boundaries
7. **Documentation**: Complete API docs, user guides

---

## 📈 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Project setup & tooling
- Authentication & user management
- Basic team management
- Database schema implementation

### Phase 2: Core CMS (Week 3-4)
- Content CRUD operations
- File upload & storage
- Basic processing pipeline
- Search & filtering

### Phase 3: Advanced CMS (Week 5-6)
- Advanced file processing
- Review workflow system
- Deduplication
- Batch operations

### Phase 4: Collaboration (Week 7-8)
- Real-time features
- Comments & discussions
- Activity feeds
- Team chat

### Phase 5: AI & Analytics (Week 9-10)
- AI assistant
- Predictive analytics
- Custom dashboards
- Report generation

### Phase 6: Polish & Production (Week 11-12)
- Performance optimization
- Security hardening
- Comprehensive testing
- Documentation
- Deployment

---

## 🎯 Success Criteria

### Production Readiness Score: 98%+

**Breakdown:**
- **Security**: 100% (All RLS policies, auth, encryption)
- **Performance**: 95%+ (Lighthouse, load times, optimization)
- **Functionality**: 100% (All features working flawlessly)
- **Testing**: 95%+ (>80% coverage, all critical paths tested)
- **Accessibility**: 95%+ (WCAG 2.1 AA compliance)
- **Documentation**: 95%+ (Complete API docs, user guides)
- **UX/UI**: 98%+ (Polished, responsive, intuitive)
- **Error Handling**: 100% (Comprehensive error management)
- **Monitoring**: 95%+ (Logging, analytics, alerting)

---

## 📝 Critical Implementation Notes

### 1. Design System
- Use semantic color tokens from `index.css`
- All colors in HSL format
- Dark/light mode support
- Consistent spacing and typography

### 2. State Management
- React Query for server state
- React Context for global UI state
- Local state with useState/useReducer
- Optimistic updates

### 3. Error Handling
- Error boundaries at route level
- Toast notifications for user errors
- Logging service for critical errors
- Retry mechanisms with exponential backoff

### 4. Testing Strategy
- Unit tests for utilities and hooks
- Component tests with Testing Library
- Integration tests for critical flows
- E2E tests with Playwright
- Visual regression tests

### 5. Documentation
- TSDoc comments for all functions
- README for each major module
- API documentation (auto-generated)
- User guides with screenshots
- Video tutorials for complex features

---

## 🚀 Deployment Checklist

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Edge functions deployed
- [ ] CDN configured
- [ ] Monitoring & alerting set up
- [ ] Backup & disaster recovery tested
- [ ] Load testing completed
- [ ] User acceptance testing done

---

## 📚 Additional Resources

### Edge Functions (35+ Total)
1. `ai-collaboration-assistant` - AI-powered writing assistance
2. `ai-content-analyzer` - Content analysis and tagging
3. `audio-transcriber` - Audio to text transcription
4. `batch-processor` - Batch file processing
5. `competitive-analyzer` - Competitor analysis
6. `content-analyzer` - Advanced content intelligence
7. `content-merger` - Merge duplicate content
8. `deduplication-scanner` - Duplicate detection
9. `document-processor` - PDF/DOCX processing
10. `image-optimizer` - Image compression and optimization
11. `predictive-analytics-engine` - AI predictions
12. `video-transcoder` - Video transcoding
13. `workflow-automator` - Workflow automation
... (and 22 more)

### Key Libraries
- `@supabase/supabase-js` - Supabase client
- `@tanstack/react-query` - Server state management
- `react-hook-form` + `zod` - Form validation
- `recharts` - Data visualization
- `date-fns` - Date utilities
- `sonner` - Toast notifications
- `lucide-react` - Icons

---

**This prompt represents a complete, production-ready specification for rebuilding ContentLab Nexus with 98%+ production readiness. Every feature has been detailed with database schemas, implementation requirements, and quality standards.**
