# ContentLab Developer Guide

## Overview

ContentLab is a comprehensive content management and analytics platform built with React, TypeScript, Supabase, and Vite. This guide provides internal developers with everything needed to understand, maintain, and extend the platform.

## Architecture Overview

### Frontend Stack
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling with semantic design tokens
- **Shadcn/UI** - High-quality component library
- **React Query** - Server state management and caching
- **React Router** - Client-side routing
- **Vite** - Fast development server and build tool

### Backend Stack
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Edge Functions** - Serverless functions for business logic
- **Row Level Security** - Database-level authorization
- **Supabase Auth** - User authentication and management

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # Base components (buttons, inputs, etc.)
│   └── ...           # Feature-specific components
├── pages/            # Route components
├── hooks/            # Custom React hooks
│   ├── queries/      # React Query hooks
│   └── ...           # Other custom hooks
├── services/         # API service layers
├── utils/            # Utility functions
├── integrations/     # Third-party integrations
│   └── supabase/     # Supabase client and types
├── test/             # Test utilities and setup
└── types/            # TypeScript type definitions

supabase/
├── functions/        # Edge functions
│   ├── _shared/      # Shared utilities and middleware
│   └── */            # Individual function directories
├── migrations/       # Database migration files
└── config.toml      # Supabase configuration
```

## Edge Functions Architecture

ContentLab uses 30+ edge functions organized by functionality:

### Core Functions

#### AI & Analytics
- `ai-collaboration-assistant` - Real-time AI collaboration features
- `analytics-processor` - Process and aggregate analytics data
- `predictive-analytics-engine` - ML-powered predictions
- `content-analyzer` - AI content analysis and optimization
- `insights-generator` - Generate business insights

#### Content Management
- `document-processor` - Process uploaded documents (PDFs, images)
- `advanced-media-processor` - Advanced media processing pipeline
- `search-indexer` - Full-text search indexing
- `storage-lifecycle` - Manage file storage lifecycle
- `cdn-manager` - CDN cache management

#### System & Monitoring
- `health-check` - System health monitoring
- `security-monitor` - Security event monitoring
- `performance-collector` - Performance metrics collection
- `log-processor` - Centralized log processing
- `cache-manager` - Application cache management

#### Team & Communication
- `team-performance-report` - Generate team performance reports
- `mobile-push-notifications` - Push notification service
- `enhanced-session-sync` - Real-time session synchronization

### Shared Utilities (`supabase/functions/_shared/`)

All edge functions use shared utilities for consistency:

```typescript
// utils.ts - Core utilities
import { corsHeaders, handleCors, errorResponse, successResponse } from './_shared/utils';
import { CircuitBreaker, RateLimiter, Logger, withRetry } from './_shared/utils';

// security.ts - Security middleware
import { SecurityMiddleware, validateRequest, sanitizeInput } from './_shared/security';

// monitoring.ts - Monitoring utilities
import { collectMetrics, trackPerformance, logError } from './_shared/monitoring';
```

## Database Schema

### Key Tables

#### Teams & Users
- `teams` - Organization/team information
- `team_members` - Team membership with roles
- `profiles` - Extended user profile data
- `user_roles` - Role-based permissions system

#### Content Management
- `content_items` - All content with metadata and versioning
- `content_categories` - Hierarchical content categorization
- `content_analytics` - Content performance metrics
- `file_processing_jobs` - Async file processing queue

#### Analytics & Insights
- `business_metrics` - Key business performance indicators
- `analytics_insights` - AI-generated insights
- `analytics_predictions` - Predictive analytics results
- `competitive_analysis` - Competitor tracking data

#### Security & Audit
- `security_audit_logs` - Security event logging
- `activity_logs` - User activity tracking
- `api_keys` - API key management
- `usage_tracking` - Feature usage analytics

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone [repository]
   cd contentlab
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Configure Supabase credentials
   ```

3. **Database Setup**
   ```bash
   npx supabase start
   npx supabase db reset
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode  
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run coverage

# Type checking
npm run type-check
```

### Code Quality

```bash
# Lint code
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Design System

ContentLab uses a semantic token-based design system defined in `src/index.css` and `tailwind.config.ts`:

### Color Tokens
```css
:root {
  --primary: 221 83% 53%;        /* Brand primary */
  --primary-glow: 221 83% 60%;   /* Primary variant */
  --secondary: 210 40% 98%;      /* Secondary surfaces */
  --accent: 142 76% 36%;         /* Accent color */
  --muted: 210 40% 96%;          /* Muted backgrounds */
}
```

### Component Usage
```tsx
// ❌ Don't use direct colors
<Button className="bg-blue-500 text-white">

// ✅ Use semantic tokens
<Button variant="primary">

// ❌ Don't use arbitrary values
<div className="p-4 bg-gray-100">

// ✅ Use design system spacing
<Card className="p-content bg-card">
```

## API Services

### Service Layer Pattern

All API interactions go through service layers in `src/services/`:

```typescript
// src/services/contentService.ts
export const contentService = {
  async getContent(id: string) {
    const { data, error } = await supabase
      .from('content_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Usage in components
const { data, isLoading } = useQuery({
  queryKey: ['content', id],
  queryFn: () => contentService.getContent(id)
});
```

### Edge Function Integration

```typescript
// Calling edge functions
const { data, error } = await supabase.functions.invoke('content-analyzer', {
  body: {
    contentId: 'uuid',
    analysisType: 'full'
  }
});
```

## Security Guidelines

### Row Level Security (RLS)

All database tables use RLS policies:

```sql
-- Example: Users can only access their team's content
CREATE POLICY "Users can view team content" ON content_items
FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### Edge Function Security

```typescript
// Always validate authentication
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) return errorResponse('Unauthorized', 401);

// Use security definer functions for complex queries
const { data } = await supabase.rpc('get_user_accessible_content', {
  user_id: user.id
});
```

### Input Validation

```typescript
import { z } from 'zod';

const RequestSchema = z.object({
  contentId: z.string().uuid(),
  analysisType: z.enum(['basic', 'full']),
});

const validatedInput = RequestSchema.parse(request);
```

## Performance Guidelines

### React Query Patterns

```typescript
// Cache data appropriately
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

useQuery({
  queryKey: ['analytics', teamId, dateRange],
  queryFn: () => analyticsService.getAnalytics(teamId, dateRange),
  staleTime: STALE_TIME,
  gcTime: 10 * 60 * 1000, // 10 minutes
});
```

### Database Optimization

- Use indexes on frequently queried columns
- Implement pagination for large datasets
- Use database functions for complex aggregations
- Cache expensive queries with React Query

### Edge Function Performance

```typescript
// Use circuit breakers for external APIs
const circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 60s timeout

// Implement rate limiting
const rateLimiter = new RateLimiter();
if (!rateLimiter.isAllowed(userId, 100, 60000)) {
  return errorResponse('Rate limit exceeded', 429);
}
```

## Deployment

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

1. **Testing** - Run all tests and type checking
2. **Security Scanning** - Automated security audits
3. **Build** - Create optimized production build
4. **Deploy** - Deploy to production environment

### Environment Management

- **Development** - Local Supabase instance
- **Staging** - Staging Supabase project
- **Production** - Production Supabase project

## Monitoring & Observability

### Health Checks

```typescript
// Edge function health monitoring
await supabase.functions.invoke('health-check');

// Database health
await supabase.from('health_check').select('status').single();
```

### Error Tracking

```typescript
// Centralized error logging
await supabase.functions.invoke('error-tracker', {
  body: {
    error: error.message,
    stack: error.stack,
    context: { userId, action }
  }
});
```

### Performance Monitoring

```typescript
// Track function performance
const startTime = Date.now();
// ... operation
await supabase.functions.invoke('performance-collector', {
  body: {
    operation: 'content-analysis',
    duration: Date.now() - startTime,
    success: true
  }
});
```

## Common Patterns

### Error Handling

```typescript
try {
  const result = await riskyOperation();
  return successResponse(result);
} catch (error) {
  Logger.error('Operation failed', { error, context });
  return errorResponse('Operation failed', 500);
}
```

### Data Validation

```typescript
const validateTeamAccess = async (teamId: string, userId: string) => {
  const { data } = await supabase.rpc('is_user_team_member_safe', {
    p_team_id: teamId,
    p_user_id: userId
  });
  return !!data;
};
```

### Async Processing

```typescript
// Queue background jobs
await supabase.from('ai_job_queue').insert({
  job_type: 'content_analysis',
  input_data: { contentId, options },
  user_id: userId
});
```

## Troubleshooting

### Common Issues

1. **RLS Policy Conflicts**
   - Check policy conditions
   - Use security definer functions to avoid recursion

2. **Edge Function Timeouts**
   - Implement proper error handling
   - Use async processing for long operations

3. **Type Errors**
   - Regenerate Supabase types: `npx supabase gen types typescript`
   - Check for null/undefined values

4. **Performance Issues**
   - Check database query performance
   - Implement proper caching
   - Use React Query devtools

### Debugging Tools

- **Supabase Dashboard** - Monitor database and functions
- **React Query Devtools** - Debug query cache
- **Browser DevTools** - Network and performance analysis
- **Vitest UI** - Interactive test debugging

## Contributing

### Code Standards

- Use TypeScript for all new code
- Follow semantic token design patterns  
- Write tests for critical functionality
- Document complex business logic
- Use proper error handling patterns

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run full test suite
4. Update documentation if needed
5. Submit PR with clear description
6. Address review feedback
7. Merge after approval

This guide provides the foundation for working with ContentLab. For specific implementation details, refer to the code comments and inline documentation.