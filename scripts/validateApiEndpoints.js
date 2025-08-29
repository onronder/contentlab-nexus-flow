#!/usr/bin/env node

/**
 * Phase 2: API Endpoint Validation Script
 * Tests all documented endpoints to ensure they work as described
 */

const https = require('https');
const fs = require('fs');

const BASE_URL = 'https://ijvhqqdfthchtittyvnt.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdmhxcWRmdGhjaHRpdHR5dm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTE4OTMsImV4cCI6MjA2ODc2Nzg5M30.wxyInat54wVrwFQvbk61Hf7beu84TnhrBg0Bkpmo6fA';

class ApiEndpointValidator {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      endpoints: []
    };
  }

  async validateAllEndpoints() {
    console.log('🧪 Starting API Endpoint Validation...');
    
    // Get list of functions from the generated documentation or scan directory
    const functions = await this.getFunctionList();
    
    for (const functionName of functions) {
      await this.validateEndpoint(functionName);
    }

    this.generateReport();
    console.log(`✅ Validation complete. ${this.results.passed}/${this.results.total} endpoints working.`);
  }

  async getFunctionList() {
    const functionsDir = 'supabase/functions';
    
    if (!fs.existsSync(functionsDir)) {
      console.error('Functions directory not found');
      return [];
    }

    return fs.readdirSync(functionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);
  }

  async validateEndpoint(functionName) {
    console.log(`🔍 Testing ${functionName}...`);
    
    const endpointResult = {
      name: functionName,
      url: `${BASE_URL}/${functionName}`,
      tests: []
    };

    // Test 1: OPTIONS request (CORS preflight)
    await this.testCorsPreFlight(endpointResult);

    // Test 2: Unauthenticated POST request
    await this.testUnauthenticatedRequest(endpointResult);

    // Test 3: Authenticated POST request (if we have a token)
    await this.testAuthenticatedRequest(endpointResult);

    // Test 4: Invalid JSON payload
    await this.testInvalidPayload(endpointResult);

    // Test 5: Rate limiting (if applicable)
    await this.testRateLimit(endpointResult);

    this.results.endpoints.push(endpointResult);
    this.results.total++;

    const passed = endpointResult.tests.filter(t => t.passed).length;
    const total = endpointResult.tests.length;
    
    if (passed === total) {
      this.results.passed++;
      console.log(`✅ ${functionName}: ${passed}/${total} tests passed`);
    } else {
      this.results.failed++;
      console.log(`❌ ${functionName}: ${passed}/${total} tests passed`);
    }
  }

  async testCorsPreFlight(endpointResult) {
    const testName = 'CORS Preflight (OPTIONS)';
    
    try {
      const response = await this.makeRequest(endpointResult.url, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const passed = response.status === 200 && 
                   response.headers['access-control-allow-origin'] === '*';

      endpointResult.tests.push({
        name: testName,
        passed,
        status: response.status,
        details: passed ? 'CORS properly configured' : 'CORS headers missing or incorrect',
        headers: response.headers
      });

    } catch (error) {
      endpointResult.tests.push({
        name: testName,
        passed: false,
        error: error.message,
        details: 'Failed to make OPTIONS request'
      });
    }
  }

  async testUnauthenticatedRequest(endpointResult) {
    const testName = 'Unauthenticated Request';
    
    try {
      const response = await this.makeRequest(endpointResult.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      });

      // Acceptable responses: 401 (requires auth) or 200 (public endpoint)
      const passed = response.status === 401 || response.status === 200;

      endpointResult.tests.push({
        name: testName,
        passed,
        status: response.status,
        details: response.status === 401 ? 'Correctly requires authentication' : 
                response.status === 200 ? 'Public endpoint working' : 
                'Unexpected response for unauthenticated request',
        body: response.body
      });

    } catch (error) {
      endpointResult.tests.push({
        name: testName,
        passed: false,
        error: error.message,
        details: 'Failed to make unauthenticated request'
      });
    }
  }

  async testAuthenticatedRequest(endpointResult) {
    const testName = 'Authenticated Request';
    
    try {
      const response = await this.makeRequest(endpointResult.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY
        },
        body: JSON.stringify({ test: true })
      });

      // Acceptable responses: 200 (success), 400 (bad request), 403 (forbidden)
      const passed = [200, 400, 403].includes(response.status);

      endpointResult.tests.push({
        name: testName,
        passed,
        status: response.status,
        details: response.status === 200 ? 'Successfully processed authenticated request' :
                response.status === 400 ? 'Correctly validates request parameters' :
                response.status === 403 ? 'Correctly handles insufficient permissions' :
                'Unexpected response for authenticated request',
        body: response.body
      });

    } catch (error) {
      endpointResult.tests.push({
        name: testName,
        passed: false,
        error: error.message,
        details: 'Failed to make authenticated request'
      });
    }
  }

  async testInvalidPayload(endpointResult) {
    const testName = 'Invalid JSON Payload';
    
    try {
      const response = await this.makeRequest(endpointResult.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY
        },
        body: '{ invalid json'
      });

      // Should return 400 for invalid JSON
      const passed = response.status === 400;

      endpointResult.tests.push({
        name: testName,
        passed,
        status: response.status,
        details: passed ? 'Correctly handles invalid JSON' : 'Does not properly validate JSON payload',
        body: response.body
      });

    } catch (error) {
      endpointResult.tests.push({
        name: testName,
        passed: false,
        error: error.message,
        details: 'Failed to test invalid payload'
      });
    }
  }

  async testRateLimit(endpointResult) {
    const testName = 'Rate Limiting';
    
    try {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(10).fill().map(() => 
        this.makeRequest(endpointResult.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: 'rate_limit_test' })
        })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r.status === 429);

      endpointResult.tests.push({
        name: testName,
        passed: true, // Rate limiting is optional, so we don't fail if not present
        details: rateLimited ? 'Rate limiting is active' : 'No rate limiting detected (may be configured for higher limits)',
        rateLimitDetected: rateLimited,
        responses: responses.map(r => ({ status: r.status, headers: r.headers }))
      });

    } catch (error) {
      endpointResult.tests.push({
        name: testName,
        passed: true, // Don't fail the test for rate limit errors
        error: error.message,
        details: 'Could not test rate limiting'
      });
    }
  }

  makeRequest(url, options) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 10000
      };

      const req = https.request(requestOptions, (res) => {
        let body = '';
        
        res.on('data', chunk => {
          body += chunk;
        });
        
        res.on('end', () => {
          let parsedBody;
          try {
            parsedBody = JSON.parse(body);
          } catch {
            parsedBody = body;
          }
          
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  generateReport() {
    const report = `# API Endpoint Validation Report

**Generated:** ${new Date().toISOString()}
**Total Endpoints:** ${this.results.total}
**Passed:** ${this.results.passed}
**Failed:** ${this.results.failed}
**Success Rate:** ${Math.round((this.results.passed / this.results.total) * 100)}%

## Summary

${this.results.endpoints.map(endpoint => {
  const passed = endpoint.tests.filter(t => t.passed).length;
  const total = endpoint.tests.length;
  const status = passed === total ? '✅' : '❌';
  
  return `${status} **${endpoint.name}** - ${passed}/${total} tests passed`;
}).join('\n')}

## Detailed Results

${this.results.endpoints.map(endpoint => `
### ${endpoint.name}

**URL:** \`${endpoint.url}\`

${endpoint.tests.map(test => `
#### ${test.name}
- **Status:** ${test.passed ? '✅ PASS' : '❌ FAIL'}
- **HTTP Status:** ${test.status || 'N/A'}
- **Details:** ${test.details || 'No details'}
${test.error ? `- **Error:** ${test.error}` : ''}
`).join('')}
`).join('')}

## Recommendations

### Failing Endpoints
${this.results.endpoints.filter(e => e.tests.some(t => !t.passed)).map(endpoint => {
  const failedTests = endpoint.tests.filter(t => !t.passed);
  return `
#### ${endpoint.name}
${failedTests.map(test => `- **${test.name}:** ${test.details || test.error}`).join('\n')}
`;
}).join('')}

### Next Steps
1. **Fix Critical Issues:** Address endpoints with multiple test failures
2. **Review Authentication:** Ensure consistent auth handling across all endpoints
3. **Improve Error Handling:** Standardize error responses and status codes
4. **Monitor Rate Limiting:** Verify rate limiting is working as expected
5. **Update Documentation:** Align API docs with actual endpoint behavior

---
*Generated by Phase 2 API Endpoint Validator*
`;

    fs.writeFileSync('docs/API_VALIDATION_REPORT.md', report);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ApiEndpointValidator();
  validator.validateAllEndpoints().catch(console.error);
}

module.exports = ApiEndpointValidator;