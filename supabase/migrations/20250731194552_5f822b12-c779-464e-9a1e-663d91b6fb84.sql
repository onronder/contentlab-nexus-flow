-- Insert test data for content management system

-- First, insert some content categories
INSERT INTO public.content_categories (id, name, description, icon, color) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Marketing Materials', 'Content for marketing campaigns and promotions', 'megaphone', '#3b82f6'),
('550e8400-e29b-41d4-a716-446655440002', 'Product Documentation', 'Technical documentation and user guides', 'book-open', '#10b981'),
('550e8400-e29b-41d4-a716-446655440003', 'Brand Assets', 'Logos, images, and brand guidelines', 'palette', '#f59e0b'),
('550e8400-e29b-41d4-a716-446655440004', 'Video Content', 'Promotional and educational videos', 'video', '#ef4444'),
('550e8400-e29b-41d4-a716-446655440005', 'Blog Posts', 'Articles and blog content', 'edit-3', '#8b5cf6');

-- Insert test content items
INSERT INTO public.content_items (
  id, title, description, content_type, status, workflow_status, 
  user_id, project_id, category_id, file_path, file_size, mime_type,
  metadata, thumbnail_path
) VALUES
(
  '650e8400-e29b-41d4-a716-446655440001',
  'Q4 Marketing Strategy Presentation',
  'Comprehensive presentation outlining our Q4 marketing initiatives and campaign strategies',
  'presentation',
  'published',
  'approved',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '550e8400-e29b-41d4-a716-446655440001',
  'presentations/q4-marketing-strategy.pptx',
  2458624,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '{"slides": 24, "author": "Marketing Team", "version": "1.2", "last_modified": "2024-01-15"}',
  'thumbnails/q4-marketing-strategy-thumb.jpg'
),
(
  '650e8400-e29b-41d4-a716-446655440002',
  'Product API Documentation',
  'Complete API reference documentation for our core product features',
  'document',
  'published',
  'approved',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '550e8400-e29b-41d4-a716-446655440002',
  'docs/api-documentation.pdf',
  1245890,
  'application/pdf',
  '{"pages": 45, "version": "2.1", "last_updated": "2024-01-10", "format": "pdf"}',
  'thumbnails/api-docs-thumb.jpg'
),
(
  '650e8400-e29b-41d4-a716-446655440003',
  'Brand Logo Collection',
  'High-resolution brand logos in various formats and color schemes',
  'image',
  'published',
  'approved',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '550e8400-e29b-41d4-a716-446655440003',
  'brand/logo-collection.zip',
  8945672,
  'application/zip',
  '{"files": 12, "formats": ["svg", "png", "eps"], "resolutions": ["72dpi", "300dpi"], "variations": ["color", "monochrome", "white"]}',
  'thumbnails/logo-collection-thumb.jpg'
),
(
  '650e8400-e29b-41d4-a716-446655440004',
  'Product Demo Video',
  'Interactive product demonstration showcasing key features and user workflows',
  'video',
  'draft',
  'in_review',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '550e8400-e29b-41d4-a716-446655440004',
  'videos/product-demo-v2.mp4',
  45698321,
  'video/mp4',
  '{"duration": "3:45", "resolution": "1920x1080", "fps": 30, "bitrate": "5000kbps", "format": "H.264"}',
  'thumbnails/product-demo-thumb.jpg'
),
(
  '650e8400-e29b-41d4-a716-446655440005',
  'Industry Trends Analysis Blog Post',
  'In-depth analysis of current industry trends and their impact on our market position',
  'blog_post',
  'published',
  'approved',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  '1ccc475a-2fc5-4a11-8e24-191f3d36b06c',
  '550e8400-e29b-41d4-a716-446655440005',
  'blog/industry-trends-2024.md',
  12456,
  'text/markdown',
  '{"word_count": 2340, "reading_time": "8 minutes", "author": "Content Team", "tags": ["industry", "trends", "analysis"]}',
  'thumbnails/industry-trends-thumb.jpg'
);

-- Insert content tags
INSERT INTO public.content_tags (content_id, tag) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'marketing'),
('650e8400-e29b-41d4-a716-446655440001', 'strategy'),
('650e8400-e29b-41d4-a716-446655440001', 'Q4'),
('650e8400-e29b-41d4-a716-446655440001', 'presentation'),
('650e8400-e29b-41d4-a716-446655440002', 'documentation'),
('650e8400-e29b-41d4-a716-446655440002', 'API'),
('650e8400-e29b-41d4-a716-446655440002', 'technical'),
('650e8400-e29b-41d4-a716-446655440002', 'reference'),
('650e8400-e29b-41d4-a716-446655440003', 'brand'),
('650e8400-e29b-41d4-a716-446655440003', 'logo'),
('650e8400-e29b-41d4-a716-446655440003', 'assets'),
('650e8400-e29b-41d4-a716-446655440003', 'design'),
('650e8400-e29b-41d4-a716-446655440004', 'video'),
('650e8400-e29b-41d4-a716-446655440004', 'demo'),
('650e8400-e29b-41d4-a716-446655440004', 'product'),
('650e8400-e29b-41d4-a716-446655440004', 'tutorial'),
('650e8400-e29b-41d4-a716-446655440005', 'blog'),
('650e8400-e29b-41d4-a716-446655440005', 'analysis'),
('650e8400-e29b-41d4-a716-446655440005', 'trends'),
('650e8400-e29b-41d4-a716-446655440005', 'industry');

-- Insert content analytics data
INSERT INTO public.content_analytics (
  content_id, views, likes, shares, comments, downloads, reach, impressions,
  click_through_rate, conversion_rate, engagement_rate, performance_score
) VALUES
('650e8400-e29b-41d4-a716-446655440001', 1247, 89, 34, 12, 156, 2340, 3450, 15.2, 8.7, 12.8, 78),
('650e8400-e29b-41d4-a716-446655440002', 892, 145, 67, 23, 234, 1890, 2670, 22.1, 12.3, 18.9, 85),
('650e8400-e29b-41d4-a716-446655440003', 567, 234, 45, 8, 89, 1245, 1890, 18.7, 6.2, 14.5, 72),
('650e8400-e29b-41d4-a716-446655440004', 234, 67, 12, 5, 45, 567, 890, 12.4, 4.1, 9.8, 58),
('650e8400-e29b-41d4-a716-446655440005', 1456, 198, 78, 34, 123, 2890, 4230, 24.8, 15.6, 21.2, 92);

-- Insert some content versions to show version history
INSERT INTO public.content_versions (
  content_id, version_number, title, description, file_path, 
  created_by, changes_summary, file_size
) VALUES
(
  '650e8400-e29b-41d4-a716-446655440001',
  1,
  'Q4 Marketing Strategy Presentation v1.0',
  'Initial version of Q4 marketing strategy presentation',
  'presentations/q4-marketing-strategy-v1.pptx',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  'Initial creation with basic strategy outline',
  2234567
),
(
  '650e8400-e29b-41d4-a716-446655440002',
  1,
  'Product API Documentation v2.0',
  'Updated API documentation with new endpoints',
  'docs/api-documentation-v2.pdf',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  'Added new authentication endpoints and updated examples',
  1189456
),
(
  '650e8400-e29b-41d4-a716-446655440004',
  1,
  'Product Demo Video v1.0',
  'First draft of product demo video',
  'videos/product-demo-v1.mp4',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  'Initial recording with basic feature walkthrough',
  42567890
);

-- Insert some content collaborators
INSERT INTO public.content_collaborators (
  content_id, user_id, role, invited_by, accepted_at, permissions
) VALUES
(
  '650e8400-e29b-41d4-a716-446655440001',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  'admin',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  now(),
  '{"read": true, "write": true, "delete": true, "share": true}'
),
(
  '650e8400-e29b-41d4-a716-446655440002',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  'admin',
  '3350f8cb-b173-4181-a067-3b6515e092cb',
  now(),
  '{"read": true, "write": true, "delete": true, "share": true}'
);