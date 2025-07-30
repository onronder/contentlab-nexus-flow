-- Create content for the actual project from token
INSERT INTO content_items (
    user_id,
    project_id,
    title,
    description,
    content_type,
    status,
    file_size,
    mime_type,
    file_path,
    thumbnail_path,
    metadata,
    workflow_status
) 
SELECT 
    'i07XB9OTcNVLAuPplIpwCWqcqor1'::uuid,
    '2e56b6e9-875e-4e78-b518-4792b76006d6'::uuid,
    content_data.title,
    content_data.description,
    content_data.content_type,
    content_data.status,
    content_data.file_size,
    content_data.mime_type,
    content_data.file_path,
    content_data.thumbnail_path,
    content_data.metadata::jsonb,
    content_data.workflow_status
FROM (VALUES
    ('Q4 2024 Competitive Analysis Report', 'Comprehensive quarterly analysis of competitor strategies, market positioning, and growth metrics across key market segments.', 'document', 'published', 2876543, 'application/pdf', 'content-files/competitive-analysis-q4-2024.pdf', 'content-thumbnails/competitive-analysis-q4-2024-thumb.jpg', '{"pages": 28, "wordCount": 7240, "language": "en"}', 'published'),
    ('Product Demo Core Features Walkthrough', 'Professional product demonstration showcasing key features, user workflows, and integration capabilities.', 'video', 'published', 67890123, 'video/mp4', 'content-files/product-demo-walkthrough.mp4', 'content-thumbnails/product-demo-walkthrough-thumb.jpg', '{"duration": 420, "resolution": "1920x1080", "frameRate": 30}', 'published'),
    ('Brand Guidelines Visual Identity', 'Complete brand identity package including logo variations, color palettes, typography guidelines.', 'image', 'published', 4567890, 'image/png', 'content-files/brand-guidelines-complete.png', 'content-thumbnails/brand-guidelines-complete-thumb.jpg', '{"dimensions": {"width": 1920, "height": 1080}, "colorProfile": "sRGB"}', 'approved'),
    ('Social Media Campaign Launch Week', 'Complete social media asset package for product launch including Instagram posts and LinkedIn carousels.', 'social', 'published', 3456789, 'image/jpeg', 'content-files/social-campaign-launch.jpg', 'content-thumbnails/social-campaign-launch-thumb.jpg', '{"dimensions": {"width": 1080, "height": 1080}, "platform": "instagram"}', 'published'),
    ('SEO Strategy Guide Complete Implementation', 'In-depth guide covering technical SEO, content optimization, and performance measurement strategies for B2B SaaS companies.', 'blog_post', 'under_review', 234567, 'text/markdown', 'content-files/seo-strategy-guide.md', 'content-thumbnails/seo-strategy-guide-thumb.jpg', '{"wordCount": 3240, "readingTime": 16}', 'created'),
    ('Investor Pitch Deck Series A', 'Comprehensive investor presentation covering market opportunity, product strategy, and financial projections.', 'document', 'draft', 5678901, 'application/pdf', 'content-files/investor-pitch-deck-series-a.pdf', 'content-thumbnails/investor-pitch-deck-series-a-thumb.jpg', '{"pages": 18, "slides": 18}', 'created'),
    ('API Integration Documentation v2.1', 'Technical documentation for API endpoints, authentication methods, and integration examples for developer partners.', 'document', 'published', 1876543, 'text/markdown', 'content-files/api-integration-docs-v2-1.md', 'content-thumbnails/api-integration-docs-v2-1-thumb.jpg', '{"wordCount": 4560, "codeExamples": 23}', 'published'),
    ('User Research Report Q4 Customer Interviews', 'Comprehensive analysis of 25 customer interviews covering user experience, feature requests, and satisfaction metrics.', 'document', 'published', 3987654, 'application/pdf', 'content-files/user-research-q4-interviews.pdf', 'content-thumbnails/user-research-q4-interviews-thumb.jpg', '{"pages": 34, "interviews": 25}', 'approved'),
    ('Feature Tutorial Series Advanced Analytics', 'Step-by-step video tutorials covering advanced analytics features, dashboard customization, and data export workflows.', 'video', 'draft', 89765432, 'video/mp4', 'content-files/tutorial-series-advanced-analytics.mp4', 'content-thumbnails/tutorial-series-advanced-analytics-thumb.jpg', '{"duration": 1260, "episodes": 8}', 'created'),
    ('Customer Success Case Study TechCorp', 'Detailed case study showcasing 40% efficiency improvement and ROI analysis from TechCorp platform implementation.', 'document', 'published', 2345678, 'application/pdf', 'content-files/case-study-techcorp-implementation.pdf', 'content-thumbnails/case-study-techcorp-implementation-thumb.jpg', '{"pages": 12, "customer": "TechCorp"}', 'published'),
    ('Webinar Recording Future of Content Analytics', 'Industry expert panel discussion covering trends in content analytics, AI-powered insights, and measurement strategies.', 'video', 'published', 134567890, 'video/mp4', 'content-files/webinar-future-content-analytics.mp4', 'content-thumbnails/webinar-future-content-analytics-thumb.jpg', '{"duration": 3600, "attendees": 247}', 'published'),
    ('Content Performance Metrics Infographic', 'Visual representation of key content performance metrics, benchmarks, and industry comparison data for presentations.', 'image', 'published', 1987654, 'image/svg+xml', 'content-files/content-metrics-infographic.svg', 'content-thumbnails/content-metrics-infographic-thumb.jpg', '{"dimensions": {"width": 1200, "height": 3600}}', 'approved'),
    ('Industry Report Content Strategy Benchmarks', 'Comprehensive industry analysis based on 500+ company surveys covering content strategy effectiveness and ROI.', 'document', 'under_review', 4876543, 'application/pdf', 'content-files/industry-report-content-benchmarks-2024.pdf', 'content-thumbnails/industry-report-content-benchmarks-2024-thumb.jpg', '{"pages": 42, "companies_surveyed": 527}', 'created'),
    ('Product Feature Screenshots New Dashboard', 'High-resolution screenshots showcasing the redesigned dashboard interface with new analytics widgets.', 'image', 'published', 876543, 'image/png', 'content-files/product-screenshots-new-dashboard.png', 'content-thumbnails/product-screenshots-new-dashboard-thumb.jpg', '{"dimensions": {"width": 2560, "height": 1440}}', 'published')
) AS content_data(title, description, content_type, status, file_size, mime_type, file_path, thumbnail_path, metadata, workflow_status);