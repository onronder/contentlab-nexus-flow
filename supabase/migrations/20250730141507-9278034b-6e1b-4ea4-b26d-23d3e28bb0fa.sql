-- Create test data with valid workflow status values (simplified version)
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
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Q4 2024 Competitive Analysis Report', 'Comprehensive quarterly analysis of competitor strategies, market positioning, and growth metrics across key market segments.', 'document', 'published', 2876543, 'application/pdf', 'content-files/competitive-analysis-q4-2024.pdf', 'content-thumbnails/competitive-analysis-q4-2024-thumb.jpg', '{"pages": 28, "wordCount": 7240, "language": "en", "sections": ["Executive Summary", "Market Overview", "Competitor Profiles", "Strategic Recommendations"], "created_with": "Figma + Notion", "review_status": "approved"}', 'published', now() - interval '3 days', now() - interval '1 day'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Product Demo - Core Features Walkthrough', 'Professional product demonstration showcasing key features, user workflows, and integration capabilities for stakeholder presentations.', 'video', 'published', 67890123, 'video/mp4', 'content-files/product-demo-walkthrough.mp4', 'content-thumbnails/product-demo-walkthrough-thumb.jpg', '{"duration": 420, "resolution": "1920x1080", "frameRate": 30, "codec": "H.264", "audio": "AAC", "chapters": ["Introduction", "Dashboard Overview", "Analytics Features", "Integration Setup"], "recorded_with": "Loom"}', 'published', now() - interval '5 days', now() - interval '2 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Brand Guidelines & Visual Identity', 'Complete brand identity package including logo variations, color palettes, typography guidelines, and usage examples.', 'image', 'published', 4567890, 'image/png', 'content-files/brand-guidelines-complete.png', 'content-thumbnails/brand-guidelines-complete-thumb.jpg', '{"dimensions": {"width": 1920, "height": 1080}, "colorProfile": "sRGB", "format": "PNG", "layers": 15, "artboards": 8, "created_with": "Figma", "brand_colors": ["#6366f1", "#8b5cf6", "#06b6d4"]}', 'approved', now() - interval '7 days', now() - interval '3 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Social Media Campaign - Launch Week', 'Complete social media asset package for product launch including Instagram posts, LinkedIn carousels, and Twitter graphics.', 'social', 'published', 3456789, 'image/jpeg', 'content-files/social-campaign-launch.jpg', 'content-thumbnails/social-campaign-launch-thumb.jpg', '{"dimensions": {"width": 1080, "height": 1080}, "platform": "instagram", "post_count": 12, "formats": ["feed_post", "story", "carousel"], "engagement_goal": "awareness", "campaign_duration": "7_days"}', 'published', now() - interval '4 days', now() - interval '1 day'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'SEO Strategy Guide: Complete Implementation Roadmap', 'In-depth guide covering technical SEO, content optimization, and performance measurement strategies for B2B SaaS companies.', 'blog_post', 'under_review', 234567, 'text/markdown', 'content-files/seo-strategy-guide.md', 'content-thumbnails/seo-strategy-guide-thumb.jpg', '{"wordCount": 3240, "readingTime": 16, "keywords": ["SEO", "content strategy", "B2B SaaS", "organic growth"], "outline": ["Introduction", "Technical SEO Foundation", "Content Optimization", "Measurement & Analytics"], "seo_score": 92}', 'in_progress', now() - interval '2 days', now() - interval '6 hours'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Investor Pitch Deck - Series A', 'Comprehensive investor presentation covering market opportunity, product strategy, financial projections, and funding requirements.', 'document', 'draft', 5678901, 'application/pdf', 'content-files/investor-pitch-deck-series-a.pdf', 'content-thumbnails/investor-pitch-deck-series-a-thumb.jpg', '{"pages": 18, "slides": 18, "sections": ["Problem & Solution", "Market Opportunity", "Product Demo", "Business Model", "Financial Projections", "Team", "Funding Ask"], "created_with": "Pitch"}', 'created', now() - interval '1 day', now() - interval '3 hours'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'API Integration Documentation v2.1', 'Technical documentation for API endpoints, authentication methods, and integration examples for developer partners.', 'document', 'published', 1876543, 'text/markdown', 'content-files/api-integration-docs-v2-1.md', 'content-thumbnails/api-integration-docs-v2-1-thumb.jpg', '{"wordCount": 4560, "codeExamples": 23, "endpoints": 15, "languages": ["JavaScript", "Python", "cURL"], "version": "2.1", "last_updated": "2024-01-20"}', 'published', now() - interval '6 days', now() - interval '1 day'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Email Newsletter Template Collection', 'Set of responsive email templates for product updates, feature announcements, and customer success stories.', 'email', 'published', 987654, 'text/html', 'content-files/email-newsletter-templates.html', 'content-thumbnails/email-newsletter-templates-thumb.jpg', '{"templates": 6, "responsive": true, "tested_clients": ["Gmail", "Outlook", "Apple Mail"], "open_rate_target": "28%", "framework": "MJML"}', 'approved', now() - interval '8 days', now() - interval '2 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'User Research Report - Q4 Customer Interviews', 'Comprehensive analysis of 25 customer interviews covering user experience, feature requests, and satisfaction metrics.', 'document', 'published', 3987654, 'application/pdf', 'content-files/user-research-q4-interviews.pdf', 'content-thumbnails/user-research-q4-interviews-thumb.jpg', '{"pages": 34, "interviews": 25, "insights": 12, "recommendations": 8, "methodology": "semi-structured interviews", "participants": {"roles": ["Product Manager", "Developer", "Designer"], "company_sizes": ["startup", "mid-market", "enterprise"]}}', 'approved', now() - interval '9 days', now() - interval '4 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Feature Tutorial Series - Advanced Analytics', 'Step-by-step video tutorials covering advanced analytics features, dashboard customization, and data export workflows.', 'video', 'draft', 89765432, 'video/mp4', 'content-files/tutorial-series-advanced-analytics.mp4', 'content-thumbnails/tutorial-series-advanced-analytics-thumb.jpg', '{"duration": 1260, "episodes": 8, "total_length": "21 minutes", "resolution": "1920x1080", "captions": true, "chapters": ["Dashboard Setup", "Custom Metrics", "Data Filters", "Export Options"], "production_status": "editing"}', 'in_progress', now() - interval '3 days', now() - interval '2 hours'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Customer Success Case Study - TechCorp Implementation', 'Detailed case study showcasing 40% efficiency improvement and ROI analysis from TechCorp platform implementation.', 'document', 'published', 2345678, 'application/pdf', 'content-files/case-study-techcorp-implementation.pdf', 'content-thumbnails/case-study-techcorp-implementation-thumb.jpg', '{"pages": 12, "customer": "TechCorp", "industry": "SaaS", "results": {"efficiency_improvement": "40%", "cost_savings": "$120k", "time_to_value": "6 weeks"}, "implementation_timeline": "3 months"}', 'published', now() - interval '12 days', now() - interval '5 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Webinar Recording - Future of Content Analytics', 'Industry expert panel discussion covering trends in content analytics, AI-powered insights, and measurement strategies.', 'video', 'published', 134567890, 'video/mp4', 'content-files/webinar-future-content-analytics.mp4', 'content-thumbnails/webinar-future-content-analytics-thumb.jpg', '{"duration": 3600, "attendees": 247, "speakers": 4, "topics": ["AI in Content", "Analytics Trends", "Measurement ROI"], "recording_quality": "HD", "Q&A_duration": 900}', 'published', now() - interval '15 days', now() - interval '7 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Content Performance Metrics Infographic', 'Visual representation of key content performance metrics, benchmarks, and industry comparison data for stakeholder presentations.', 'image', 'published', 1987654, 'image/svg+xml', 'content-files/content-metrics-infographic.svg', 'content-thumbnails/content-metrics-infographic-thumb.jpg', '{"dimensions": {"width": 1200, "height": 3600}, "format": "SVG", "sections": 6, "data_points": 15, "color_scheme": "brand_primary", "created_with": "Figma", "print_ready": true}', 'approved', now() - interval '6 days', now() - interval '2 days'),
('a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e', '1ccc475a-2fc5-4a11-8e24-191f3d36b06c', 'Industry Report: Content Strategy Benchmarks 2024', 'Comprehensive industry analysis based on 500+ company surveys covering content strategy effectiveness and ROI measurements.', 'document', 'under_review', 4876543, 'application/pdf', 'content-files/industry-report-content-benchmarks-2024.pdf', 'content-thumbnails/industry-report-content-benchmarks-2024-thumb.jpg', '{"pages": 42, "companies_surveyed": 527, "data_points": 89, "charts": 23, "key_findings": 12, "methodology": "mixed methods research", "publication_date": "Q1 2024"}', 'in_progress', now() - interval '4 days', now() - interval '8 hours');

-- Insert analytics for each content item with realistic data
INSERT INTO content_analytics (content_id, views, likes, shares, comments, downloads, engagement_rate, performance_score, reach, impressions, click_through_rate, conversion_rate)
SELECT 
    ci.id,
    CASE ci.content_type
        WHEN 'video' THEN FLOOR(RANDOM() * 1500 + 200)::INTEGER
        WHEN 'document' THEN FLOOR(RANDOM() * 800 + 100)::INTEGER
        WHEN 'image' THEN FLOOR(RANDOM() * 1200 + 150)::INTEGER
        WHEN 'social' THEN FLOOR(RANDOM() * 2000 + 300)::INTEGER
        WHEN 'blog_post' THEN FLOOR(RANDOM() * 600 + 80)::INTEGER
        ELSE FLOOR(RANDOM() * 400 + 50)::INTEGER
    END,
    CASE ci.content_type
        WHEN 'video' THEN FLOOR(RANDOM() * 120 + 15)::INTEGER
        WHEN 'social' THEN FLOOR(RANDOM() * 200 + 25)::INTEGER
        ELSE FLOOR(RANDOM() * 60 + 8)::INTEGER
    END,
    CASE ci.content_type
        WHEN 'social' THEN FLOOR(RANDOM() * 80 + 10)::INTEGER
        WHEN 'video' THEN FLOOR(RANDOM() * 45 + 5)::INTEGER
        ELSE FLOOR(RANDOM() * 25 + 3)::INTEGER
    END,
    CASE ci.content_type
        WHEN 'blog_post' THEN FLOOR(RANDOM() * 35 + 5)::INTEGER
        WHEN 'video' THEN FLOOR(RANDOM() * 25 + 3)::INTEGER
        ELSE FLOOR(RANDOM() * 15 + 1)::INTEGER
    END,
    CASE ci.content_type
        WHEN 'document' THEN FLOOR(RANDOM() * 150 + 20)::INTEGER
        WHEN 'video' THEN FLOOR(RANDOM() * 80 + 10)::INTEGER
        ELSE FLOOR(RANDOM() * 30 + 5)::INTEGER
    END,
    ROUND((RANDOM() * 12 + 3)::NUMERIC, 2),
    FLOOR(RANDOM() * 25 + 70)::INTEGER,
    FLOOR(RANDOM() * 3000 + 500)::INTEGER,
    FLOOR(RANDOM() * 5000 + 1000)::INTEGER,
    ROUND((RANDOM() * 8 + 2)::NUMERIC, 2),
    ROUND((RANDOM() * 5 + 1)::NUMERIC, 2)
FROM content_items ci 
WHERE ci.user_id = 'a0e68a9e-8d1e-418c-8e2b-7b2a8c5d6f4e';