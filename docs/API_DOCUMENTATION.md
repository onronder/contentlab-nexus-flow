# ContentLab API Documentation

## Overview

ContentLab provides a comprehensive set of APIs through Supabase Edge Functions for content management, analytics, AI-powered features, and team collaboration.

## Base URL

```
https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/
```

## Authentication

All API endpoints require authentication unless otherwise specified. Include the Authorization header with a valid JWT token:

```http
Authorization: Bearer <JWT_TOKEN>
```

## Standard Response Format

### Success Response
```json
{
  "status": "success",
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "status": "error",
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

## AI & Analytics APIs

### AI Collaboration Assistant

Generate AI-powered suggestions and insights for collaborative content creation.

**Endpoint:** `POST /ai-collaboration-assistant`

**Request Body:**
```json
{
  "sessionId": "uuid",
  "action": "get_suggestions|analyze_content|generate_insights",
  "content": "Content to analyze",
  "preferences": {
    "tone": "professional|casual|technical",
    "length": "short|medium|long",
    "focus": "seo|readability|engagement"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "suggestions": [
      {
        "type": "improvement",
        "content": "Suggested improvement",
        "confidence": 0.85,
        "reasoning": "Why this suggestion is helpful"
      }
    ],
    "insights": {
      "readabilityScore": 75,
      "seoScore": 82,
      "engagementPrediction": 68
    },
    "metadata": {
      "processingTime": 1250,
      "modelVersion": "gpt-4"
    }
  }
}
```

### Content Analyzer

Analyze content for SEO, readability, and optimization opportunities.

**Endpoint:** `POST /content-analyzer`

**Request Body:**
```json
{
  "contentId": "uuid",
  "content": "Content to analyze",
  "analysisType": "basic|full|seo|readability",
  "options": {
    "includeKeywords": true,
    "includeSentiment": true,
    "includeStructure": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "contentType": "article|blog|product|landing",
    "readabilityScore": 75,
    "seoScore": 82,
    "sentimentScore": 0.65,
    "keywords": [
      {
        "term": "content marketing",
        "frequency": 5,
        "relevance": 0.9
      }
    ],
    "structure": {
      "wordCount": 1250,
      "paragraphs": 8,
      "headings": {
        "h1": 1,
        "h2": 3,
        "h3": 2
      }
    },
    "suggestions": [
      {
        "type": "seo",
        "priority": "high",
        "message": "Add more internal links",
        "action": "Add 2-3 internal links to related content"
      }
    ]
  }
}
```

### Analytics Processor

Process and aggregate analytics data with real-time insights.

**Endpoint:** `POST /analytics-processor`

**Request Body:**
```json
{
  "eventType": "page_view|user_action|conversion",
  "timeframe": "1h|24h|7d|30d",
  "aggregationType": "count|sum|avg|unique",
  "filters": {
    "teamId": "uuid",
    "projectId": "uuid",
    "userId": "uuid"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalEvents": 1500,
    "processed": true,
    "timeframe": "24h",
    "metrics": {
      "uniqueUsers": 450,
      "totalSessions": 675,
      "averageSessionDuration": 180,
      "conversionRate": 0.045
    },
    "trends": [
      {
        "period": "2024-01-15T00:00:00Z",
        "value": 125,
        "change": 0.15
      }
    ]
  }
}
```

### Insights Generator

Generate business insights from analytics data using AI.

**Endpoint:** `POST /insights-generator`

**Request Body:**
```json
{
  "dataSource": "analytics|content|competitive",
  "timeframe": "7d|30d|90d",
  "insightTypes": ["performance", "trends", "opportunities"],
  "context": {
    "teamId": "uuid",
    "goals": ["increase_engagement", "improve_conversion"]
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "insights": [
      {
        "id": "insight-001",
        "type": "opportunity",
        "title": "Content Engagement Opportunity",
        "description": "Video content shows 3x higher engagement",
        "confidence": 0.89,
        "impact": "high",
        "actionable": true,
        "recommendations": [
          "Create 2-3 video tutorials per week",
          "Convert top blog posts to video format"
        ],
        "expectedOutcome": {
          "metric": "engagement_rate",
          "improvement": 0.35
        }
      }
    ],
    "summary": {
      "totalInsights": 5,
      "actionableInsights": 3,
      "highImpactInsights": 2
    }
  }
}
```

## Content Management APIs

### Document Processor

Process uploaded documents with AI-powered extraction and analysis.

**Endpoint:** `POST /document-processor`

**Request Body:**
```json
{
  "filePath": "/uploads/document.pdf",
  "contentId": "uuid",
  "options": {
    "extractText": true,
    "generateThumbnail": true,
    "analyzeStructure": true,
    "detectLanguage": true,
    "extractMetadata": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "processed": true,
    "extractedText": "Full document text content...",
    "metadata": {
      "pageCount": 12,
      "wordCount": 2500,
      "language": "en",
      "title": "Document Title",
      "author": "Author Name",
      "createdDate": "2024-01-15T10:30:00Z"
    },
    "structure": {
      "headings": [
        {
          "level": 1,
          "text": "Introduction",
          "page": 1
        }
      ],
      "tables": 3,
      "images": 5
    },
    "thumbnailPath": "/thumbnails/document-thumb.jpg",
    "processingTime": 3500
  }
}
```

### Search Indexer

Index content for full-text search with semantic understanding.

**Endpoint:** `POST /search-indexer`

**Request Body:**
```json
{
  "action": "index|update|delete",
  "contentId": "uuid",
  "content": {
    "title": "Content Title",
    "body": "Full content text",
    "tags": ["tag1", "tag2"],
    "category": "blog"
  },
  "options": {
    "includeSemanticSearch": true,
    "generateEmbeddings": true,
    "extractKeywords": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "indexed": true,
    "documentId": "search-doc-123",
    "keywords": ["content", "marketing", "strategy"],
    "semanticEmbeddings": true,
    "searchScore": 0.92,
    "processingTime": 850
  }
}
```

### Advanced Media Processor

Process images, videos, and other media files with AI enhancement.

**Endpoint:** `POST /advanced-media-processor`

**Request Body:**
```json
{
  "filePath": "/uploads/image.jpg",
  "contentId": "uuid",
  "operations": {
    "resize": {
      "width": 1200,
      "height": 800,
      "quality": 85
    },
    "optimize": true,
    "generateAltText": true,
    "extractMetadata": true,
    "createThumbnails": [
      { "size": "small", "width": 150, "height": 150 },
      { "size": "medium", "width": 400, "height": 400 }
    ]
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "processed": true,
    "originalSize": 2048576,
    "optimizedSize": 512384,
    "compressionRatio": 0.75,
    "generatedAltText": "A professional meeting room with people collaborating",
    "metadata": {
      "width": 1200,
      "height": 800,
      "format": "JPEG",
      "colorSpace": "sRGB",
      "exif": {}
    },
    "thumbnails": [
      {
        "size": "small",
        "path": "/thumbnails/image-150x150.jpg"
      }
    ],
    "processingTime": 2100
  }
}
```

## Team & Collaboration APIs

### Team Performance Report

Generate comprehensive team performance reports.

**Endpoint:** `POST /team-performance-report`

**Request Body:**
```json
{
  "teamId": "uuid",
  "reportType": "weekly|monthly|quarterly",
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "metrics": ["productivity", "collaboration", "content_quality"],
  "includeRecommendations": true
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "reportId": "report-uuid",
    "teamId": "uuid",
    "period": "January 2024",
    "metrics": {
      "productivity": {
        "score": 85,
        "trend": "up",
        "details": {
          "contentCreated": 24,
          "projectsCompleted": 8,
          "averageCompletionTime": "3.2 days"
        }
      },
      "collaboration": {
        "score": 92,
        "trend": "stable",
        "details": {
          "collaborativeSessions": 15,
          "commentsExchanged": 145,
          "averageResponseTime": "2.1 hours"
        }
      }
    },
    "recommendations": [
      {
        "category": "productivity",
        "priority": "medium",
        "suggestion": "Consider implementing content templates for faster creation"
      }
    ],
    "generatedAt": "2024-02-01T10:00:00Z"
  }
}
```

### Mobile Push Notifications

Send targeted push notifications to mobile users.

**Endpoint:** `POST /mobile-push-notifications`

**Request Body:**
```json
{
  "recipients": {
    "type": "user|team|role",
    "ids": ["uuid1", "uuid2"]
  },
  "notification": {
    "title": "New Content Available",
    "body": "Check out the latest team updates",
    "icon": "/icons/notification.png",
    "badge": 1,
    "data": {
      "action": "navigate",
      "url": "/content/new-post"
    }
  },
  "options": {
    "priority": "normal|high",
    "schedule": "immediate|scheduled",
    "scheduledTime": "2024-01-15T14:00:00Z"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "notificationId": "notif-uuid",
    "sent": 45,
    "failed": 2,
    "scheduled": false,
    "deliveryRate": 0.96,
    "estimatedDeliveryTime": "2-5 minutes"
  }
}
```

## System & Monitoring APIs

### Health Check

Check system health and service availability.

**Endpoint:** `GET /health-check`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00Z",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 45,
      "connections": 12
    },
    "storage": {
      "status": "up",
      "responseTime": 23,
      "usage": "68%"
    },
    "ai": {
      "status": "up",
      "responseTime": 120,
      "quota": "75% used"
    }
  },
  "uptime": "99.97%",
  "version": "2.1.0"
}
```

### Security Monitor

Monitor security events and threats.

**Endpoint:** `POST /security-monitor`

**Request Body:**
```json
{
  "scanType": "quick|full|targeted",
  "options": {
    "includeRecommendations": true,
    "checkCompliance": true,
    "analyzeTraffic": true
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "threatLevel": "low|medium|high",
    "lastScan": "2024-01-15T11:30:00Z",
    "events": [
      {
        "id": "event-001",
        "type": "failed_login",
        "severity": "medium",
        "timestamp": "2024-01-15T11:25:00Z",
        "details": {
          "ip": "192.168.1.100",
          "attempts": 3,
          "blocked": true
        }
      }
    ],
    "recommendations": [
      "Enable two-factor authentication for all users",
      "Review API key permissions"
    ],
    "compliance": {
      "gdpr": "compliant",
      "ccpa": "compliant",
      "iso27001": "partial"
    }
  }
}
```

### Performance Collector

Collect and analyze system performance metrics.

**Endpoint:** `POST /performance-collector`

**Request Body:**
```json
{
  "operation": "content-analysis|data-processing|user-action",
  "startTime": 1705312800000,
  "endTime": 1705312850000,
  "metadata": {
    "userId": "uuid",
    "teamId": "uuid",
    "resource": "content-item-123"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "recorded": true,
    "metrics": {
      "duration": 2500,
      "memoryUsed": "45MB",
      "cpuUsage": "12%",
      "dbQueries": 3,
      "cacheHits": 8,
      "cacheMisses": 2
    },
    "performance": {
      "rating": "good",
      "bottlenecks": [],
      "optimizationSuggestions": []
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Authentication is required |
| `INVALID_TOKEN` | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `QUOTA_EXCEEDED` | Usage quota exceeded |

## Rate Limits

- **Default:** 100 requests per minute per user
- **AI Functions:** 20 requests per minute per user
- **Analytics:** 50 requests per minute per user
- **File Processing:** 10 requests per minute per user

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312920
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ijvhqqdfthchtittyvnt.supabase.co',
  'your-anon-key'
);

// Analyze content
const { data, error } = await supabase.functions.invoke('content-analyzer', {
  body: {
    contentId: 'uuid',
    content: 'Your content here',
    analysisType: 'full'
  }
});
```

### Python

```python
import requests

headers = {
    'Authorization': 'Bearer <your-token>',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/content-analyzer',
    headers=headers,
    json={
        'contentId': 'uuid',
        'content': 'Your content here',
        'analysisType': 'full'
    }
)

data = response.json()
```

### cURL

```bash
curl -X POST \
  https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/content-analyzer \
  -H 'Authorization: Bearer <your-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "contentId": "uuid",
    "content": "Your content here",
    "analysisType": "full"
  }'
```

## Webhooks

ContentLab supports webhooks for real-time event notifications:

### Webhook Events
- `content.created`
- `content.updated` 
- `content.analyzed`
- `team.member_added`
- `analytics.report_generated`
- `security.threat_detected`

### Webhook Payload
```json
{
  "event": "content.analyzed",
  "timestamp": "2024-01-15T12:00:00Z",
  "data": {
    "contentId": "uuid",
    "analysisResults": {},
    "teamId": "uuid"
  },
  "signature": "sha256=..."
}
```

## Support

For API support and questions:
- **Documentation:** [https://docs.contentlab.dev](https://docs.contentlab.dev)
- **Status Page:** [https://status.contentlab.dev](https://status.contentlab.dev)
- **Contact:** developers@contentlab.dev