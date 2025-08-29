#!/usr/bin/env node

/**
 * Phase 2: API Documentation Generator
 * Automatically generates accurate API documentation from edge function code
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = 'supabase/functions';
const OUTPUT_FILE = 'docs/API_DOCUMENTATION_GENERATED.md';

class ApiDocumentationGenerator {
  constructor() {
    this.functions = [];
    this.categories = {
      'ai': ['ai-collaboration-assistant', 'content-analyzer', 'generate-insights'],
      'analytics': ['analytics-processor', 'analytics-aggregator', 'insights-generator', 'metrics'],
      'content': ['document-processor', 'search-indexer', 'content-analyzer'],
      'security': ['security-monitor', 'enhanced-security-monitor', 'audit-logger'],
      'notifications': ['send-notification-email', 'send-sms-alert', 'send-push-notification'],
      'monitoring': ['health-check', 'system-health-monitor', 'performance-collector'],
      'collaboration': ['realtime-collaboration', 'enhanced-session-sync'],
      'reports': ['team-performance-report', 'process-scheduled-reports', 'send-report-email']
    };
  }

  async generateDocumentation() {
    console.log('📝 Generating API Documentation...');
    
    if (!fs.existsSync(FUNCTIONS_DIR)) {
      console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
      return;
    }

    const functionDirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);

    for (const functionName of functionDirs) {
      await this.analyzeFunction(functionName);
    }

    await this.generateMarkdown();
    console.log(`✅ Documentation generated: ${OUTPUT_FILE}`);
  }

  async analyzeFunction(functionName) {
    const indexPath = path.join(FUNCTIONS_DIR, functionName, 'index.ts');
    
    if (!fs.existsSync(indexPath)) {
      return;
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    
    const functionInfo = {
      name: functionName,
      category: this.categorizeFunction(functionName),
      endpoint: `/functions/v1/${functionName}`,
      methods: this.extractMethods(content),
      authentication: this.extractAuthRequirement(content),
      rateLimit: this.extractRateLimit(content),
      description: this.extractDescription(content),
      parameters: this.extractParameters(content),
      responses: this.extractResponses(content),
      examples: this.generateExamples(functionName, content),
      security: this.extractSecurity(content)
    };

    this.functions.push(functionInfo);
  }

  categorizeFunction(functionName) {
    for (const [category, functions] of Object.entries(this.categories)) {
      if (functions.includes(functionName)) {
        return category;
      }
    }
    return 'other';
  }

  extractMethods(content) {
    const methods = [];
    
    if (content.includes("req.method === 'GET'") || content.includes('GET')) {
      methods.push('GET');
    }
    if (content.includes("req.method === 'POST'") || content.includes('POST')) {
      methods.push('POST');
    }
    if (content.includes("req.method === 'PUT'") || content.includes('PUT')) {
      methods.push('PUT');
    }
    if (content.includes("req.method === 'DELETE'") || content.includes('DELETE')) {
      methods.push('DELETE');
    }
    
    return methods.length > 0 ? methods : ['POST']; // Default to POST
  }

  extractAuthRequirement(content) {
    if (content.includes('requireAuth: false')) {
      return {
        required: false,
        note: 'Public endpoint'
      };
    }
    
    if (content.includes('requireAuth: true') || content.includes('withSecurity')) {
      return {
        required: true,
        type: 'Bearer Token',
        note: 'Requires valid JWT token in Authorization header'
      };
    }
    
    return {
      required: true,
      type: 'Bearer Token',
      note: 'Authentication requirement unclear - review needed'
    };
  }

  extractRateLimit(content) {
    const rateLimitMatch = content.match(/rateLimitRequests:\s*(\d+)/);
    const windowMatch = content.match(/rateLimitWindow:\s*(\d+)/);
    
    if (rateLimitMatch && windowMatch) {
      const requests = parseInt(rateLimitMatch[1]);
      const window = parseInt(windowMatch[1]);
      const windowMinutes = Math.round(window / 60000);
      
      return {
        requests,
        window: windowMinutes,
        description: `${requests} requests per ${windowMinutes} minute(s)`
      };
    }
    
    return {
      requests: 100,
      window: 1,
      description: '100 requests per minute (default)'
    };
  }

  extractDescription(content) {
    // Try to extract from JSDoc comments
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\n/);
    if (jsdocMatch) {
      return jsdocMatch[1];
    }
    
    // Try to extract from single-line comments
    const commentMatch = content.match(/\/\/\s*(.+?)(?:\n|$)/);
    if (commentMatch) {
      return commentMatch[1];
    }
    
    // Generate description from function name
    return this.generateDescriptionFromName(content);
  }

  generateDescriptionFromName(functionName) {
    const descriptions = {
      'ai-collaboration-assistant': 'Provides AI-powered suggestions for collaborative content editing',
      'analytics-processor': 'Processes and aggregates analytics events in real-time',
      'content-analyzer': 'Analyzes content for sentiment, topics, quality, and SEO optimization',
      'health-check': 'Monitors system health and service availability',
      'security-monitor': 'Tracks and analyzes security events and threats',
      'document-processor': 'Processes uploaded documents, extracts text and generates thumbnails',
      'team-performance-report': 'Generates comprehensive team performance analytics reports'
    };
    
    return descriptions[functionName] || `Handles ${functionName.replace(/-/g, ' ')} operations`;
  }

  extractParameters(content) {
    const parameters = [];
    
    // Look for interface definitions
    const interfaceMatches = content.match(/interface\s+(\w+)\s*{([^}]+)}/g);
    if (interfaceMatches) {
      interfaceMatches.forEach(match => {
        const fields = match.match(/(\w+)(\??):\s*([^;]+);/g);
        if (fields) {
          fields.forEach(field => {
            const fieldMatch = field.match(/(\w+)(\??):\s*([^;]+);/);
            if (fieldMatch) {
              parameters.push({
                name: fieldMatch[1],
                type: fieldMatch[3].trim(),
                required: !fieldMatch[2],
                description: `${fieldMatch[1]} parameter`
              });
            }
          });
        }
      });
    }
    
    // Look for common parameter patterns
    const commonParams = [
      { pattern: /contentId|content_id/, name: 'contentId', type: 'string', required: true, description: 'Unique content identifier' },
      { pattern: /userId|user_id/, name: 'userId', type: 'string', required: true, description: 'User identifier' },
      { pattern: /teamId|team_id/, name: 'teamId', type: 'string', required: false, description: 'Team identifier' },
      { pattern: /sessionId|session_id/, name: 'sessionId', type: 'string', required: false, description: 'Session identifier' }
    ];
    
    commonParams.forEach(param => {
      if (param.pattern.test(content) && !parameters.find(p => p.name === param.name)) {
        parameters.push(param);
      }
    });
    
    return parameters;
  }

  extractResponses(content) {
    const responses = [];
    
    // Success response (200)
    responses.push({
      status: 200,
      description: 'Success',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object', description: 'Response data' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    });
    
    // Error responses
    if (content.includes('status: 400')) {
      responses.push({
        status: 400,
        description: 'Bad Request - Invalid input parameters',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Invalid parameters' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      });
    }
    
    if (content.includes('status: 401')) {
      responses.push({
        status: 401,
        description: 'Unauthorized - Authentication required',
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Authentication required' }
          }
        }
      });
    }
    
    if (content.includes('status: 429')) {
      responses.push({
        status: 429,
        description: 'Too Many Requests - Rate limit exceeded',
        schema: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Rate limit exceeded' },
            retryAfter: { type: 'number', example: 60 }
          }
        }
      });
    }
    
    responses.push({
      status: 500,
      description: 'Internal Server Error',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Internal server error' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      }
    });
    
    return responses;
  }

  generateExamples(functionName, content) {
    const baseUrl = 'https://ijvhqqdfthchtittyvnt.supabase.co';
    const endpoint = `${baseUrl}/functions/v1/${functionName}`;
    
    const examples = {
      curl: this.generateCurlExample(endpoint, functionName),
      javascript: this.generateJavaScriptExample(functionName),
      python: this.generatePythonExample(endpoint, functionName)
    };
    
    return examples;
  }

  generateCurlExample(endpoint, functionName) {
    return `curl -X POST '${endpoint}' \\
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "exampleParam": "value"
  }'`;
  }

  generateJavaScriptExample(functionName) {
    return `const { data, error } = await supabase.functions.invoke('${functionName}', {
  body: {
    exampleParam: 'value'
  }
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}`;
  }

  generatePythonExample(endpoint, functionName) {
    return `import requests

headers = {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
}

data = {
    'exampleParam': 'value'
}

response = requests.post('${endpoint}', headers=headers, json=data)
result = response.json()

if response.status_code == 200:
    print('Success:', result)
else:
    print('Error:', result)`;
  }

  extractSecurity(content) {
    const security = {
      cors: content.includes('enableCORS: true') || content.includes('Access-Control-Allow-Origin'),
      rateLimit: content.includes('rateLimitRequests'),
      inputValidation: content.includes('validateInput') || content.includes('validation'),
      securityHeaders: content.includes('withSecurity') || content.includes('SECURITY_HEADERS')
    };
    
    return security;
  }

  async generateMarkdown() {
    const categorizedFunctions = {};
    this.functions.forEach(func => {
      if (!categorizedFunctions[func.category]) {
        categorizedFunctions[func.category] = [];
      }
      categorizedFunctions[func.category].push(func);
    });

    const markdown = `# ContentLab API Documentation (Generated)

**Generated:** ${new Date().toISOString()}
**Base URL:** \`https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/\`
**Total Endpoints:** ${this.functions.length}

## Authentication

All API endpoints require authentication unless specifically marked as public. Include your JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <YOUR_JWT_TOKEN>
\`\`\`

## Rate Limiting

API endpoints have rate limiting applied. Default limits are 100 requests per minute per IP address, but specific endpoints may have different limits.

## Response Format

All endpoints return JSON responses with consistent structure:

**Success Response:**
\`\`\`json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

**Error Response:**
\`\`\`json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

${Object.entries(categorizedFunctions).map(([category, functions]) => this.generateCategorySection(category, functions)).join('\n\n')}

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## SDK Examples

### JavaScript (Supabase)
\`\`\`javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ijvhqqdfthchtittyvnt.supabase.co',
  'YOUR_ANON_KEY'
);

// Call any function
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { /* parameters */ }
});
\`\`\`

### Python
\`\`\`python
import requests

def call_edge_function(function_name, data, token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(
        f'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1/{function_name}',
        headers=headers,
        json=data
    )
    
    return response.json()
\`\`\`

---
*This documentation was automatically generated from the edge function source code.*
*Last updated: ${new Date().toISOString()}*
`;

    fs.writeFileSync(OUTPUT_FILE, markdown);
  }

  generateCategorySection(category, functions) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    return `## ${categoryName} APIs

${functions.map(func => this.generateFunctionSection(func)).join('\n\n')}`;
  }

  generateFunctionSection(func) {
    return `### ${func.name}

**Endpoint:** \`${func.endpoint}\`  
**Methods:** ${func.methods.join(', ')}  
**Authentication:** ${func.authentication.required ? '✅ Required' : '❌ Not Required'}  
**Rate Limit:** ${func.rateLimit.description}

#### Description
${func.description}

#### Parameters

${func.parameters.length > 0 ? `
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
${func.parameters.map(param => `| \`${param.name}\` | ${param.type} | ${param.required ? '✅ Yes' : '❌ No'} | ${param.description} |`).join('\n')}
` : '_No parameters documented_'}

#### Response Codes

${func.responses.map(resp => `**${resp.status}** - ${resp.description}`).join('  \n')}

#### Example Request

**cURL:**
\`\`\`bash
${func.examples.curl}
\`\`\`

**JavaScript:**
\`\`\`javascript
${func.examples.javascript}
\`\`\`

#### Security Features
- **CORS:** ${func.security.cors ? '✅ Enabled' : '❌ Disabled'}
- **Rate Limiting:** ${func.security.rateLimit ? '✅ Enabled' : '❌ Disabled'}
- **Input Validation:** ${func.security.inputValidation ? '✅ Enabled' : '❌ Disabled'}
- **Security Headers:** ${func.security.securityHeaders ? '✅ Enabled' : '❌ Disabled'}`;
  }
}

// Run documentation generation if called directly
if (require.main === module) {
  const generator = new ApiDocumentationGenerator();
  generator.generateDocumentation().catch(console.error);
}

module.exports = ApiDocumentationGenerator;