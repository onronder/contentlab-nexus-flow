-- Insert test content items with valid workflow_status values
INSERT INTO content_items (
  id,
  user_id,
  project_id,
  category_id,
  title,
  description,
  content_type,
  status,
  workflow_status,
  file_path,
  file_size,
  mime_type,
  metadata,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '226fae71-3fed-4e50-b953-9758c6442d35', -- Marketing category
  'Q4 2024 Marketing Campaign Strategy',
  'Comprehensive marketing strategy document outlining our Q4 campaign objectives, target audiences, and key performance indicators.',
  'document',
  'published',
  'approved',
  '/content/marketing/q4-strategy.pdf',
  2456789,
  'application/pdf',
  '{"author": "Marketing Team", "version": "2.1", "keywords": ["strategy", "Q4", "campaign"]}',
  now() - interval '15 days',
  now() - interval '2 days'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '84f9a1b6-219b-49ad-9a77-649439023976', -- Social Media category
  'Instagram Content Calendar - December',
  'Monthly content calendar featuring 31 days of engaging Instagram posts, stories, and reels targeting our key demographics.',
  'image',
  'draft',
  'created',
  '/content/social/instagram-calendar-dec.png',
  1234567,
  'image/png',
  '{"dimensions": "1080x1080", "format": "PNG", "posts_count": 31}',
  now() - interval '8 days',
  now() - interval '1 day'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '78b0556b-0ccb-46ac-bd29-7346eaa0bf60', -- Videos category
  'Product Demo Tutorial Series',
  'Five-part video series demonstrating key features of our flagship product, designed for new user onboarding.',
  'video',
  'under_review',
  'reviewed',
  '/content/videos/product-demo-series.mp4',
  156789123,
  'video/mp4',
  '{"duration": "15:42", "resolution": "1920x1080", "episodes": 5}',
  now() - interval '12 days',
  now() - interval '3 days'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  'c80a9a19-dc71-420f-a3ab-a8b73ed4bade', -- Blog Posts category
  'The Future of AI in Customer Service',
  'In-depth analysis of how artificial intelligence is transforming customer service operations and what businesses need to know.',
  'article',
  'published',
  'published',
  '/content/blog/ai-customer-service.md',
  45678,
  'text/markdown',
  '{"word_count": 2847, "reading_time": "12 min", "tags": ["AI", "customer service", "technology"]}',
  now() - interval '20 days',
  now() - interval '18 days'
),
(
  gen_random_uuid(),
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '25c94add-e21c-47b9-a011-3ecf2bc8a9b4', -- Presentations category
  'Q1 2025 Board Presentation',
  'Quarterly board presentation covering financial performance, strategic initiatives, and market outlook for the upcoming quarter.',
  'presentation',
  'archived',
  'approved',
  '/content/presentations/q1-2025-board.pptx',
  8923456,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '{"slides": 42, "presenter": "CEO", "meeting_date": "2024-12-15"}',
  now() - interval '25 days',
  now() - interval '20 days'
);

-- Insert content tags for the test content
INSERT INTO content_tags (content_id, tag)
SELECT 
  ci.id,
  unnest(ARRAY['strategy', 'marketing', 'Q4']) as tag
FROM content_items ci 
WHERE ci.title = 'Q4 2024 Marketing Campaign Strategy'
AND ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb';

INSERT INTO content_tags (content_id, tag)
SELECT 
  ci.id,
  unnest(ARRAY['social media', 'instagram', 'content calendar']) as tag
FROM content_items ci 
WHERE ci.title = 'Instagram Content Calendar - December'
AND ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb';

INSERT INTO content_tags (content_id, tag)
SELECT 
  ci.id,
  unnest(ARRAY['tutorial', 'product demo', 'onboarding']) as tag
FROM content_items ci 
WHERE ci.title = 'Product Demo Tutorial Series'
AND ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb';

INSERT INTO content_tags (content_id, tag)
SELECT 
  ci.id,
  unnest(ARRAY['AI', 'customer service', 'technology', 'blog']) as tag
FROM content_items ci 
WHERE ci.title = 'The Future of AI in Customer Service'
AND ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb';

INSERT INTO content_tags (content_id, tag)
SELECT 
  ci.id,
  unnest(ARRAY['presentation', 'board', 'quarterly', 'financial']) as tag
FROM content_items ci 
WHERE ci.title = 'Q1 2025 Board Presentation'
AND ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb';

-- Insert sample analytics data
INSERT INTO content_analytics (content_id, views, likes, shares, comments, downloads, impressions, reach, engagement_rate, click_through_rate, conversion_rate, performance_score, analytics_date)
SELECT 
  ci.id,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 245
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 89
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 512
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 1247
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 67
  END as views,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 23
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 12
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 89
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 156
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 8
  END as likes,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 15
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 7
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 34
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 89
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 12
  END as shares,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 8
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 3
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 22
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 45
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 2
  END as comments,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 78
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 0
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 234
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 0
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 34
  END as downloads,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 1200
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 450
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 2800
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 5600
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 340
  END as impressions,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 890
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 320
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 1950
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 3200
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 180
  END as reach,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 18.7
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 24.5
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 28.2
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 23.1
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 12.2
  END as engagement_rate,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 20.4
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 19.8
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 18.3
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 22.3
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 19.7
  END as click_through_rate,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 3.2
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 1.5
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 6.7
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 4.1
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 2.8
  END as conversion_rate,
  CASE 
    WHEN ci.title = 'Q4 2024 Marketing Campaign Strategy' THEN 76
    WHEN ci.title = 'Instagram Content Calendar - December' THEN 58
    WHEN ci.title = 'Product Demo Tutorial Series' THEN 82
    WHEN ci.title = 'The Future of AI in Customer Service' THEN 89
    WHEN ci.title = 'Q1 2025 Board Presentation' THEN 45
  END as performance_score,
  CURRENT_DATE as analytics_date
FROM content_items ci 
WHERE ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb'
AND ci.project_id = '1ccc475a-2fc5-4a11-8e24-191f3d36b06c';

-- Insert content versions for published items
INSERT INTO content_versions (content_id, version_number, title, description, file_path, file_size, created_by, changes_summary)
SELECT 
  ci.id,
  1,
  ci.title || ' - Version 1.0',
  'Initial version of ' || ci.title,
  ci.file_path,
  ci.file_size,
  ci.user_id,
  'Initial content creation and upload'
FROM content_items ci 
WHERE ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb'
AND ci.project_id = '1ccc475a-2fc5-4a11-8e24-191f3d36b06c'
AND ci.status IN ('published', 'under_review');

-- Insert a second version for the published blog post
INSERT INTO content_versions (content_id, version_number, title, description, file_path, file_size, created_by, changes_summary)
SELECT 
  ci.id,
  2,
  ci.title || ' - Version 2.0',
  'Updated version with SEO optimizations and additional examples',
  ci.file_path,
  ci.file_size + 5000,
  ci.user_id,
  'Added SEO keywords, improved readability, included 3 case studies'
FROM content_items ci 
WHERE ci.title = 'The Future of AI in Customer Service'
AND ci.user_id = '3350f8cb-b173-4181-a067-3b6515e092cb';