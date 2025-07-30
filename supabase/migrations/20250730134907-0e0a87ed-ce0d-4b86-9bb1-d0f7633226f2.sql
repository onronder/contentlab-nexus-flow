-- Create comprehensive test data for Content Library

-- First, let's insert realistic content items with proper metadata
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
    workflow_status,
    created_at,
    updated_at
) VALUES 
-- Competitive Analysis Documents
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Q4 2024 Competitive Analysis Report',
    'Comprehensive quarterly analysis of competitor strategies, market positioning, and growth metrics across key market segments.',
    'document',
    'published',
    2876543,
    'application/pdf',
    'content-files/' || auth.uid()::text || '/competitive-analysis-q4-2024.pdf',
    'content-thumbnails/' || auth.uid()::text || '/competitive-analysis-q4-2024-thumb.jpg',
    '{"pages": 28, "wordCount": 7240, "language": "en", "sections": ["Executive Summary", "Market Overview", "Competitor Profiles", "Strategic Recommendations"], "created_with": "Figma + Notion", "review_status": "approved"}',
    'approved',
    now() - interval '3 days',
    now() - interval '1 day'
),
-- Video Content
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Product Demo - Core Features Walkthrough',
    'Professional product demonstration showcasing key features, user workflows, and integration capabilities for stakeholder presentations.',
    'video',
    'published',
    67890123,
    'video/mp4',
    'content-files/' || auth.uid()::text || '/product-demo-walkthrough.mp4',
    'content-thumbnails/' || auth.uid()::text || '/product-demo-walkthrough-thumb.jpg',
    '{"duration": 420, "resolution": "1920x1080", "frameRate": 30, "codec": "H.264", "audio": "AAC", "chapters": ["Introduction", "Dashboard Overview", "Analytics Features", "Integration Setup"], "recorded_with": "Loom"}',
    'published',
    now() - interval '5 days',
    now() - interval '2 days'
),
-- Design Assets
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Brand Guidelines & Visual Identity',
    'Complete brand identity package including logo variations, color palettes, typography guidelines, and usage examples.',
    'image',
    'published',
    4567890,
    'image/png',
    'content-files/' || auth.uid()::text || '/brand-guidelines-complete.png',
    'content-thumbnails/' || auth.uid()::text || '/brand-guidelines-complete-thumb.jpg',
    '{"dimensions": {"width": 1920, "height": 1080}, "colorProfile": "sRGB", "format": "PNG", "layers": 15, "artboards": 8, "created_with": "Figma", "brand_colors": ["#6366f1", "#8b5cf6", "#06b6d4"]}',
    'approved',
    now() - interval '7 days',
    now() - interval '3 days'
),
-- Social Media Content
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Social Media Campaign - Launch Week',
    'Complete social media asset package for product launch including Instagram posts, LinkedIn carousels, and Twitter graphics.',
    'social',
    'published',
    3456789,
    'image/jpeg',
    'content-files/' || auth.uid()::text || '/social-campaign-launch.jpg',
    'content-thumbnails/' || auth.uid()::text || '/social-campaign-launch-thumb.jpg',
    '{"dimensions": {"width": 1080, "height": 1080}, "platform": "instagram", "post_count": 12, "formats": ["feed_post", "story", "carousel"], "engagement_goal": "awareness", "campaign_duration": "7_days"}',
    'published',
    now() - interval '4 days',
    now() - interval '1 day'
),
-- Blog Content
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'SEO Strategy Guide: Complete Implementation Roadmap',
    'In-depth guide covering technical SEO, content optimization, and performance measurement strategies for B2B SaaS companies.',
    'blog_post',
    'under_review',
    234567,
    'text/markdown',
    'content-files/' || auth.uid()::text || '/seo-strategy-guide.md',
    'content-thumbnails/' || auth.uid()::text || '/seo-strategy-guide-thumb.jpg',
    '{"wordCount": 3240, "readingTime": 16, "keywords": ["SEO", "content strategy", "B2B SaaS", "organic growth"], "outline": ["Introduction", "Technical SEO Foundation", "Content Optimization", "Measurement & Analytics"], "seo_score": 92}',
    'in_review',
    now() - interval '2 days',
    now() - interval '6 hours'
),
-- Presentation Materials
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Investor Pitch Deck - Series A',
    'Comprehensive investor presentation covering market opportunity, product strategy, financial projections, and funding requirements.',
    'document',
    'draft',
    5678901,
    'application/pdf',
    'content-files/' || auth.uid()::text || '/investor-pitch-deck-series-a.pdf',
    'content-thumbnails/' || auth.uid()::text || '/investor-pitch-deck-series-a-thumb.jpg',
    '{"pages": 18, "slides": 18, "sections": ["Problem & Solution", "Market Opportunity", "Product Demo", "Business Model", "Financial Projections", "Team", "Funding Ask"], "created_with": "Pitch"}',
    'draft',
    now() - interval '1 day',
    now() - interval '3 hours'
),
-- Technical Documentation
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'API Integration Documentation v2.1',
    'Technical documentation for API endpoints, authentication methods, and integration examples for developer partners.',
    'document',
    'published',
    1876543,
    'text/markdown',
    'content-files/' || auth.uid()::text || '/api-integration-docs-v2-1.md',
    'content-thumbnails/' || auth.uid()::text || '/api-integration-docs-v2-1-thumb.jpg',
    '{"wordCount": 4560, "codeExamples": 23, "endpoints": 15, "languages": ["JavaScript", "Python", "cURL"], "version": "2.1", "last_updated": "2024-01-20"}',
    'published',
    now() - interval '6 days',
    now() - interval '1 day'
),
-- Marketing Assets
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Email Newsletter Template Collection',
    'Set of responsive email templates for product updates, feature announcements, and customer success stories.',
    'email',
    'published',
    987654,
    'text/html',
    'content-files/' || auth.uid()::text || '/email-newsletter-templates.html',
    'content-thumbnails/' || auth.uid()::text || '/email-newsletter-templates-thumb.jpg',
    '{"templates": 6, "responsive": true, "tested_clients": ["Gmail", "Outlook", "Apple Mail"], "open_rate_target": "28%", "framework": "MJML"}',
    'approved',
    now() - interval '8 days',
    now() - interval '2 days'
),
-- Research Reports
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'User Research Report - Q4 Customer Interviews',
    'Comprehensive analysis of 25 customer interviews covering user experience, feature requests, and satisfaction metrics.',
    'document',
    'published',
    3987654,
    'application/pdf',
    'content-files/' || auth.uid()::text || '/user-research-q4-interviews.pdf',
    'content-thumbnails/' || auth.uid()::text || '/user-research-q4-interviews-thumb.jpg',
    '{"pages": 34, "interviews": 25, "insights": 12, "recommendations": 8, "methodology": "semi-structured interviews", "participants": {"roles": ["Product Manager", "Developer", "Designer"], "company_sizes": ["startup", "mid-market", "enterprise"]}}',
    'approved',
    now() - interval '9 days',
    now() - interval '4 days'
),
-- Video Tutorial Series
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Feature Tutorial Series - Advanced Analytics',
    'Step-by-step video tutorials covering advanced analytics features, dashboard customization, and data export workflows.',
    'video',
    'draft',
    89765432,
    'video/mp4',
    'content-files/' || auth.uid()::text || '/tutorial-series-advanced-analytics.mp4',
    'content-thumbnails/' || auth.uid()::text || '/tutorial-series-advanced-analytics-thumb.jpg',
    '{"duration": 1260, "episodes": 8, "total_length": "21 minutes", "resolution": "1920x1080", "captions": true, "chapters": ["Dashboard Setup", "Custom Metrics", "Data Filters", "Export Options"], "production_status": "editing"}',
    'in_progress',
    now() - interval '3 days',
    now() - interval '2 hours'
),
-- Case Studies
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Customer Success Case Study - TechCorp Implementation',
    'Detailed case study showcasing 40% efficiency improvement and ROI analysis from TechCorp''s platform implementation.',
    'document',
    'published',
    2345678,
    'application/pdf',
    'content-files/' || auth.uid()::text || '/case-study-techcorp-implementation.pdf',
    'content-thumbnails/' || auth.uid()::text || '/case-study-techcorp-implementation-thumb.jpg',
    '{"pages": 12, "customer": "TechCorp", "industry": "SaaS", "results": {"efficiency_improvement": "40%", "cost_savings": "$120k", "time_to_value": "6 weeks"}, "implementation_timeline": "3 months"}',
    'published',
    now() - interval '12 days',
    now() - interval '5 days'
),
-- Webinar Content
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Webinar Recording - Future of Content Analytics',
    'Industry expert panel discussion covering trends in content analytics, AI-powered insights, and measurement strategies.',
    'video',
    'published',
    134567890,
    'video/mp4',
    'content-files/' || auth.uid()::text || '/webinar-future-content-analytics.mp4',
    'content-thumbnails/' || auth.uid()::text || '/webinar-future-content-analytics-thumb.jpg',
    '{"duration": 3600, "attendees": 247, "speakers": 4, "topics": ["AI in Content", "Analytics Trends", "Measurement ROI"], "recording_quality": "HD", "Q&A_duration": 900}',
    'published',
    now() - interval '15 days',
    now() - interval '7 days'
),
-- Infographics
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Content Performance Metrics Infographic',
    'Visual representation of key content performance metrics, benchmarks, and industry comparison data for stakeholder presentations.',
    'image',
    'published',
    1987654,
    'image/svg+xml',
    'content-files/' || auth.uid()::text || '/content-metrics-infographic.svg',
    'content-thumbnails/' || auth.uid()::text || '/content-metrics-infographic-thumb.jpg',
    '{"dimensions": {"width": 1200, "height": 3600}, "format": "SVG", "sections": 6, "data_points": 15, "color_scheme": "brand_primary", "created_with": "Figma", "print_ready": true}',
    'approved',
    now() - interval '6 days',
    now() - interval '2 days'
),
-- White Papers
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Industry Report: Content Strategy Benchmarks 2024',
    'Comprehensive industry analysis based on 500+ company surveys covering content strategy effectiveness and ROI measurements.',
    'document',
    'under_review',
    4876543,
    'application/pdf',
    'content-files/' || auth.uid()::text || '/industry-report-content-benchmarks-2024.pdf',
    'content-thumbnails/' || auth.uid()::text || '/industry-report-content-benchmarks-2024-thumb.jpg',
    '{"pages": 42, "companies_surveyed": 527, "data_points": 89, "charts": 23, "key_findings": 12, "methodology": "mixed methods research", "publication_date": "Q1 2024"}',
    'in_review',
    now() - interval '4 days',
    now() - interval '8 hours'
),
-- Product Screenshots
(
    auth.uid(),
    (SELECT id FROM projects WHERE created_by = auth.uid() ORDER BY created_at DESC LIMIT 1),
    'Product Feature Screenshots - New Dashboard',
    'High-resolution screenshots showcasing the redesigned dashboard interface with new analytics widgets and customization options.',
    'image',
    'published',
    876543,
    'image/png',
    'content-files/' || auth.uid()::text || '/product-screenshots-new-dashboard.png',
    'content-thumbnails/' || auth.uid()::text || '/product-screenshots-new-dashboard-thumb.jpg',
    '{"dimensions": {"width": 2560, "height": 1440}, "screenshots": 12, "features_shown": ["Analytics Dashboard", "Custom Widgets", "Data Visualization", "User Settings"], "device": "desktop", "browser": "Chrome"}',
    'published',
    now() - interval '2 days',
    now() - interval '6 hours'
);

-- Insert realistic analytics data for each content item
INSERT INTO content_analytics (content_id, views, likes, shares, comments, downloads, engagement_rate, performance_score, reach, impressions, click_through_rate, conversion_rate, analytics_date)
SELECT 
    ci.id,
    CASE ci.content_type
        WHEN 'video' THEN FLOOR(RANDOM() * 1500 + 200)::INTEGER
        WHEN 'document' THEN FLOOR(RANDOM() * 800 + 100)::INTEGER
        WHEN 'image' THEN FLOOR(RANDOM() * 1200 + 150)::INTEGER
        WHEN 'social' THEN FLOOR(RANDOM() * 2000 + 300)::INTEGER
        WHEN 'blog_post' THEN FLOOR(RANDOM() * 600 + 80)::INTEGER
        ELSE FLOOR(RANDOM() * 400 + 50)::INTEGER
    END as views,
    CASE ci.content_type
        WHEN 'video' THEN FLOOR(RANDOM() * 120 + 15)::INTEGER
        WHEN 'social' THEN FLOOR(RANDOM() * 200 + 25)::INTEGER
        ELSE FLOOR(RANDOM() * 60 + 8)::INTEGER
    END as likes,
    CASE ci.content_type
        WHEN 'social' THEN FLOOR(RANDOM() * 80 + 10)::INTEGER
        WHEN 'video' THEN FLOOR(RANDOM() * 45 + 5)::INTEGER
        ELSE FLOOR(RANDOM() * 25 + 3)::INTEGER
    END as shares,
    CASE ci.content_type
        WHEN 'blog_post' THEN FLOOR(RANDOM() * 35 + 5)::INTEGER
        WHEN 'video' THEN FLOOR(RANDOM() * 25 + 3)::INTEGER
        ELSE FLOOR(RANDOM() * 15 + 1)::INTEGER
    END as comments,
    CASE ci.content_type
        WHEN 'document' THEN FLOOR(RANDOM() * 150 + 20)::INTEGER
        WHEN 'video' THEN FLOOR(RANDOM() * 80 + 10)::INTEGER
        ELSE FLOOR(RANDOM() * 30 + 5)::INTEGER
    END as downloads,
    ROUND((RANDOM() * 12 + 3)::NUMERIC, 2) as engagement_rate,
    FLOOR(RANDOM() * 25 + 70)::INTEGER as performance_score,
    FLOOR(RANDOM() * 3000 + 500)::INTEGER as reach,
    FLOOR(RANDOM() * 5000 + 1000)::INTEGER as impressions,
    ROUND((RANDOM() * 8 + 2)::NUMERIC, 2) as click_through_rate,
    ROUND((RANDOM() * 5 + 1)::NUMERIC, 2) as conversion_rate,
    CURRENT_DATE - (RANDOM() * 30)::INTEGER as analytics_date
FROM content_items ci
WHERE ci.user_id = auth.uid();

-- Insert comprehensive tags for better organization
INSERT INTO content_tags (content_id, tag)
SELECT ci.id, unnest(
    CASE ci.content_type
        WHEN 'document' THEN CASE 
            WHEN ci.title ILIKE '%competitive%' THEN ARRAY['competitive-analysis', 'market-research', 'Q4-2024', 'strategy', 'pdf']
            WHEN ci.title ILIKE '%pitch%' THEN ARRAY['investor-relations', 'series-a', 'funding', 'presentation', 'strategy']
            WHEN ci.title ILIKE '%api%' THEN ARRAY['technical-documentation', 'developer-resources', 'integration', 'v2.1']
            WHEN ci.title ILIKE '%research%' THEN ARRAY['user-research', 'customer-insights', 'interviews', 'Q4-2024']
            WHEN ci.title ILIKE '%case study%' THEN ARRAY['case-study', 'customer-success', 'ROI', 'implementation']
            WHEN ci.title ILIKE '%industry%' THEN ARRAY['industry-report', 'benchmarks', '2024', 'research', 'white-paper']
            ELSE ARRAY['document', 'content']
        END
        WHEN 'video' THEN CASE
            WHEN ci.title ILIKE '%demo%' THEN ARRAY['product-demo', 'feature-walkthrough', 'stakeholder', 'presentation']
            WHEN ci.title ILIKE '%tutorial%' THEN ARRAY['tutorial-series', 'advanced-analytics', 'how-to', 'education']
            WHEN ci.title ILIKE '%webinar%' THEN ARRAY['webinar', 'industry-expert', 'content-analytics', 'trends']
            ELSE ARRAY['video-content', 'media']
        END
        WHEN 'image' THEN CASE
            WHEN ci.title ILIKE '%brand%' THEN ARRAY['brand-guidelines', 'visual-identity', 'design-system', 'figma']
            WHEN ci.title ILIKE '%infographic%' THEN ARRAY['infographic', 'data-visualization', 'metrics', 'stakeholder']
            WHEN ci.title ILIKE '%screenshot%' THEN ARRAY['product-screenshots', 'dashboard', 'UI-UX', 'feature-showcase']
            ELSE ARRAY['design', 'visual-content']
        END
        WHEN 'social' THEN ARRAY['social-media', 'campaign', 'launch-week', 'instagram', 'engagement']
        WHEN 'blog_post' THEN ARRAY['SEO', 'content-strategy', 'B2B-SaaS', 'organic-growth', 'blog']
        WHEN 'email' THEN ARRAY['email-marketing', 'newsletters', 'templates', 'responsive', 'mjml']
        ELSE ARRAY['content', 'general']
    END
)
FROM content_items ci
WHERE ci.user_id = auth.uid();

-- Add additional categorization tags
INSERT INTO content_tags (content_id, tag)
SELECT ci.id, unnest(ARRAY['high-priority', 'featured'])
FROM content_items ci
WHERE ci.user_id = auth.uid() AND ci.status = 'published' AND ci.created_at > now() - interval '7 days'
UNION ALL
SELECT ci.id, unnest(ARRAY['needs-review', 'pending'])
FROM content_items ci
WHERE ci.user_id = auth.uid() AND ci.status IN ('draft', 'under_review')
UNION ALL
SELECT ci.id, unnest(ARRAY['external-facing', 'public'])
FROM content_items ci
WHERE ci.user_id = auth.uid() AND ci.title ILIKE ANY(ARRAY['%demo%', '%case study%', '%webinar%', '%blog%']);

-- Create content categories for better organization
INSERT INTO content_categories (name, description, icon, color) VALUES
('Marketing Materials', 'Sales presentations, brochures, and promotional content', 'megaphone', '#10b981'),
('Product Documentation', 'Technical docs, API guides, and feature specifications', 'book-open', '#3b82f6'),
('Research & Analytics', 'Market research, user studies, and data analysis reports', 'bar-chart', '#8b5cf6'),
('Brand Assets', 'Logo files, brand guidelines, and visual identity materials', 'palette', '#f59e0b'),
('Educational Content', 'Tutorials, webinars, and training materials', 'graduation-cap', '#ef4444'),
('Social Media', 'Social posts, campaign assets, and community content', 'share-2', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

-- Update content items with appropriate categories
UPDATE content_items SET category_id = (
    SELECT id FROM content_categories 
    WHERE name = CASE 
        WHEN content_items.title ILIKE ANY(ARRAY['%social%', '%campaign%', '%instagram%']) THEN 'Social Media'
        WHEN content_items.title ILIKE ANY(ARRAY['%brand%', '%guidelines%', '%visual%', '%infographic%']) THEN 'Brand Assets'
        WHEN content_items.title ILIKE ANY(ARRAY['%api%', '%documentation%', '%technical%']) THEN 'Product Documentation'
        WHEN content_items.title ILIKE ANY(ARRAY['%research%', '%analysis%', '%report%', '%benchmark%']) THEN 'Research & Analytics'
        WHEN content_items.title ILIKE ANY(ARRAY['%tutorial%', '%webinar%', '%demo%', '%guide%']) THEN 'Educational Content'
        ELSE 'Marketing Materials'
    END
)
WHERE user_id = auth.uid();