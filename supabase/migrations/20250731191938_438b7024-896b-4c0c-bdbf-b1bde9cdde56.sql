-- Insert test content items for the existing project with valid workflow_status values
INSERT INTO public.content_items (
  id,
  user_id,
  project_id,
  title,
  description,
  content_type,
  status,
  file_path,
  thumbnail_path,
  mime_type,
  file_size,
  metadata,
  workflow_status,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  'Competitor Analysis Report - Q4 2024',
  'Comprehensive analysis of our main competitors in the authentication market, including feature comparison and market positioning.',
  'document',
  'published',
  'documents/competitor-analysis-q4-2024.pdf',
  'thumbnails/competitor-analysis-q4-2024-thumb.jpg',
  'application/pdf',
  2458112,
  '{"author": "Marketing Team", "pages": 24, "keywords": ["authentication", "security", "competition"]}',
  'approved',
  now() - interval '2 days',
  now() - interval '1 day'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  'Product Demo Video - Auth Flow',
  'Video demonstration of our authentication flow compared to competitor implementations.',
  'video',
  'published',
  'videos/auth-flow-demo.mp4',
  'thumbnails/auth-flow-demo-thumb.jpg',
  'video/mp4',
  15728640,
  '{"duration": "3:45", "resolution": "1920x1080", "format": "mp4"}',
  'approved',
  now() - interval '1 day',
  now() - interval '12 hours'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  'Market Research Infographic',
  'Visual representation of authentication market trends and user preferences.',
  'image',
  'draft',
  'images/market-research-infographic.png',
  'thumbnails/market-research-infographic-thumb.jpg',
  'image/png',
  1048576,
  '{"dimensions": "1200x800", "format": "png", "colors": ["#6366f1", "#8b5cf6"]}',
  'in_progress',
  now() - interval '6 hours',
  now() - interval '2 hours'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  'Blog Post: Future of Authentication',
  'Draft blog post discussing emerging trends in authentication technology and market predictions.',
  'blog_post',
  'draft',
  'documents/blog-future-auth.md',
  'thumbnails/blog-future-auth-thumb.jpg',
  'text/markdown',
  524288,
  '{"word_count": 1200, "reading_time": "5 min", "tags": ["authentication", "trends", "future"]}',
  'created',
  now() - interval '3 hours',
  now() - interval '1 hour'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  'Social Media Campaign Assets',
  'Collection of social media graphics and copy for our Q1 authentication awareness campaign.',
  'social',
  'published',
  'social/q1-campaign-assets.zip',
  'thumbnails/social-campaign-thumb.jpg',
  'application/zip',
  3145728,
  '{"asset_count": 12, "platforms": ["twitter", "linkedin", "facebook"], "campaign": "Q1_Auth_Awareness"}',
  'approved',
  now() - interval '5 days',
  now() - interval '4 days'
);

-- Insert content tags for the test items
INSERT INTO public.content_tags (content_id, tag, created_at)
SELECT 
  ci.id,
  unnest(ARRAY['authentication', 'security', 'competition', 'analysis']) as tag,
  now()
FROM public.content_items ci
WHERE ci.title = 'Competitor Analysis Report - Q4 2024';

INSERT INTO public.content_tags (content_id, tag, created_at)
SELECT 
  ci.id,
  unnest(ARRAY['video', 'demo', 'authentication', 'user-experience']) as tag,
  now()
FROM public.content_items ci
WHERE ci.title = 'Product Demo Video - Auth Flow';

INSERT INTO public.content_tags (content_id, tag, created_at)
SELECT 
  ci.id,
  unnest(ARRAY['infographic', 'market-research', 'trends', 'data']) as tag,
  now()
FROM public.content_items ci
WHERE ci.title = 'Market Research Infographic';

INSERT INTO public.content_tags (content_id, tag, created_at)
SELECT 
  ci.id,
  unnest(ARRAY['blog', 'future', 'authentication', 'trends']) as tag,
  now()
FROM public.content_items ci
WHERE ci.title = 'Blog Post: Future of Authentication';

INSERT INTO public.content_tags (content_id, tag, created_at)
SELECT 
  ci.id,
  unnest(ARRAY['social-media', 'campaign', 'marketing', 'awareness']) as tag,
  now()
FROM public.content_items ci
WHERE ci.title = 'Social Media Campaign Assets';

-- Insert sample analytics data
INSERT INTO public.content_analytics (
  content_id,
  views,
  likes,
  shares,
  comments,
  downloads,
  engagement_rate,
  performance_score,
  analytics_date,
  created_at,
  updated_at
)
SELECT 
  ci.id,
  floor(random() * 1000 + 50)::integer, -- views
  floor(random() * 100 + 5)::integer,   -- likes
  floor(random() * 50 + 2)::integer,    -- shares
  floor(random() * 25 + 1)::integer,    -- comments
  floor(random() * 200 + 10)::integer,  -- downloads
  (random() * 15 + 5)::numeric(5,2),    -- engagement_rate
  floor(random() * 40 + 60)::integer,   -- performance_score
  CURRENT_DATE,
  now(),
  now()
FROM public.content_items ci
WHERE ci.project_id = '1ccc475a-2fc5-4a11-8e24-191f3d36b06c';