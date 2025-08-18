-- Seed some sample analytics data to populate dashboard with real data
-- This will only insert data if tables are empty to avoid duplicates

DO $$
DECLARE
  sample_project_id UUID;
  sample_content_id UUID;
  sample_competitor_id UUID;
BEGIN
  -- Check if we have any existing data - if so, skip seeding
  IF EXISTS (SELECT 1 FROM public.content_analytics LIMIT 1) THEN
    RETURN;
  END IF;

  -- Get a sample project to work with (or create one if none exists)
  SELECT id INTO sample_project_id FROM public.projects LIMIT 1;
  
  IF sample_project_id IS NULL THEN
    -- Create a sample project for demo purposes
    INSERT INTO public.projects (name, description, industry, created_by)
    VALUES ('Demo Project', 'Sample project for analytics demo', 'Technology', 
            (SELECT id FROM auth.users LIMIT 1))
    RETURNING id INTO sample_project_id;
  END IF;

  -- Get or create sample content
  SELECT id INTO sample_content_id FROM public.content_items WHERE project_id = sample_project_id LIMIT 1;
  
  IF sample_content_id IS NULL THEN
    INSERT INTO public.content_items (title, content_type, project_id, user_id, status)
    VALUES ('Sample Content', 'blog-post', sample_project_id, 
            (SELECT id FROM auth.users LIMIT 1), 'published')
    RETURNING id INTO sample_content_id;
  END IF;

  -- Insert sample analytics data for the last 30 days
  INSERT INTO public.content_analytics (
    content_id, 
    analytics_date, 
    views, 
    likes, 
    shares, 
    comments,
    impressions,
    reach,
    engagement_rate,
    click_through_rate,
    conversion_rate,
    performance_score
  )
  SELECT 
    sample_content_id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    FLOOR(RANDOM() * 1000 + 100)::INTEGER, -- views
    FLOOR(RANDOM() * 50 + 5)::INTEGER,     -- likes  
    FLOOR(RANDOM() * 20 + 1)::INTEGER,     -- shares
    FLOOR(RANDOM() * 30 + 2)::INTEGER,     -- comments
    FLOOR(RANDOM() * 5000 + 500)::INTEGER, -- impressions
    FLOOR(RANDOM() * 2000 + 200)::INTEGER, -- reach
    ROUND((RANDOM() * 15 + 5)::NUMERIC, 2), -- engagement_rate (5-20%)
    ROUND((RANDOM() * 5 + 1)::NUMERIC, 2),  -- click_through_rate (1-6%)
    ROUND((RANDOM() * 3 + 0.5)::NUMERIC, 2), -- conversion_rate (0.5-3.5%)
    FLOOR(RANDOM() * 40 + 60)::INTEGER      -- performance_score (60-100)
  FROM generate_series(0, 29);

  -- Get or create sample competitor
  SELECT id INTO sample_competitor_id FROM public.project_competitors WHERE project_id = sample_project_id LIMIT 1;
  
  IF sample_competitor_id IS NULL THEN
    INSERT INTO public.project_competitors (project_id, company_name, domain, created_by)
    VALUES (sample_project_id, 'Sample Competitor', 'competitor.com', 
            (SELECT id FROM auth.users LIMIT 1))
    RETURNING id INTO sample_competitor_id;
  END IF;

  -- Insert sample business metrics
  INSERT INTO public.business_metrics (
    project_id,
    metric_date,
    time_period,
    metric_category,
    metric_name,
    metric_value,
    target_value,
    previous_period_value,
    change_percentage
  )
  SELECT 
    sample_project_id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    'daily',
    'performance',
    'content_performance_score',
    ROUND((RANDOM() * 30 + 70)::NUMERIC, 1), -- metric_value (70-100)
    85.0, -- target_value
    ROUND((RANDOM() * 30 + 70)::NUMERIC, 1), -- previous_period_value
    ROUND((RANDOM() * 20 - 10)::NUMERIC, 1)  -- change_percentage (-10 to +10)
  FROM generate_series(0, 29);

  -- Insert market coverage metrics
  INSERT INTO public.business_metrics (
    project_id,
    metric_date,
    time_period,
    metric_category,
    metric_name,
    metric_value,
    target_value,
    previous_period_value,
    change_percentage
  )
  SELECT 
    sample_project_id,
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29),
    'daily',
    'market',
    'market_coverage',
    ROUND((RANDOM() * 40 + 60)::NUMERIC, 1), -- metric_value (60-100%)
    90.0, -- target_value
    ROUND((RANDOM() * 40 + 60)::NUMERIC, 1), -- previous_period_value
    ROUND((RANDOM() * 15 - 7)::NUMERIC, 1)   -- change_percentage (-7 to +8)
  FROM generate_series(0, 29);

  -- Insert sample activity logs for recent activity
  INSERT INTO public.activity_logs (
    team_id,
    user_id,
    project_id,
    activity_type,
    action,
    description,
    created_at
  )
  SELECT 
    (SELECT team_id FROM public.projects WHERE id = sample_project_id),
    (SELECT id FROM auth.users LIMIT 1),
    sample_project_id,
    CASE (RANDOM() * 4)::INTEGER
      WHEN 0 THEN 'project_management'
      WHEN 1 THEN 'content_management'
      WHEN 2 THEN 'team_collaboration'
      ELSE 'competitive_analysis'
    END,
    CASE (RANDOM() * 5)::INTEGER
      WHEN 0 THEN 'created'
      WHEN 1 THEN 'updated'
      WHEN 2 THEN 'published'
      WHEN 3 THEN 'analyzed'
      ELSE 'reviewed'
    END,
    CASE (RANDOM() * 4)::INTEGER
      WHEN 0 THEN 'New content published successfully'
      WHEN 1 THEN 'Competitor analysis completed'
      WHEN 2 THEN 'Project milestone reached'
      ELSE 'Team member added to project'
    END,
    NOW() - INTERVAL '1 hour' * FLOOR(RANDOM() * 168) -- Random time in last week
  FROM generate_series(1, 20);

END $$;