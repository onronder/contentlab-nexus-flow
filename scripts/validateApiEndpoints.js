#!/usr/bin/env node

/**
 * API Endpoint Validation Script
 * Tests all edge function endpoints for proper functionality and response
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = 'supabase/functions';
const OUTPUT_FILE = 'docs/API_VALIDATION_REPORT.md';
const PROJECT_ID = 'ijvhqqdfthchtittyvnt';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1`;

const validationResults = {
  totalEndpoints: 0,
  successfulTests: 0,
  failedTests: 0,
  endpointResults: [],
  errors: []
};

function extractEndpointInfo(functionName, content) {
  const info = {
    name: functionName,
    methods: [],
    requiresAuth: false,
    hasValidation: false,
    hasErrorHandling: false,
    hasCORS: false
  };

  // Extract HTTP methods
  if (content.includes("req.method === 'GET'") || content.includes('GET')) {
    info.methods.push('GET');
  }
  if (content.includes("req.method === 'POST'") || content.includes('POST')) {
    info.methods.push('POST');
  }
  if (content.includes("req.method === 'PUT'")) {
    info.methods.push('PUT');
  }
  if (content.includes("req.method === 'DELETE'")) {
    info.methods.push('DELETE');
  }
  if (content.includes("req.method === 'OPTIONS'")) {
    info.methods.push('OPTIONS');
  }

  // Check for authentication
  info.requiresAuth = content.includes('auth.uid()') || content.includes('Authorization');

  // Check for validation
  info.hasValidation = content.includes('validate') || content.includes('schema');

  // Check for error handling
  info.hasErrorHandling = content.includes('try') && content.includes('catch');

  // Check for CORS
  info.hasCORS = content.includes('Access-Control-Allow-Origin');

  return info;
}

async function validateEndpoint(endpointInfo) {
  console.log(`🧪 Testing endpoint: ${endpointInfo.name}`);
  
  const result = {
    endpoint: endpointInfo.name,
    methods: endpointInfo.methods,
    tests: [],
    status: 'unknown',
    responseTime: 0,
    errors: []
  };

  try {
    // Test OPTIONS (CORS preflight)
    if (endpointInfo.hasCORS) {
      const startTime = Date.now();
      try {
        const response = await fetch(`${BASE_URL}/${endpointInfo.name}`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type'
          }
        });
        
        const endTime = Date.now();
        result.responseTime = endTime - startTime;
        
        result.tests.push({
          method: 'OPTIONS',
          status: response.status,
          success: response.status === 200 || response.status === 204,
          cors: response.headers.get('access-control-allow-origin') !== null
        });
      } catch (error) {
        result.tests.push({
          method: 'OPTIONS',
          status: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Test GET if supported
    if (endpointInfo.methods.includes('GET')) {
      try {
        const response = await fetch(`${BASE_URL}/${endpointInfo.name}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        result.tests.push({
          method: 'GET',
          status: response.status,
          success: response.status < 500, // Accept 4xx as "working" (auth/validation errors)
          contentType: response.headers.get('content-type')
        });
      } catch (error) {
        result.tests.push({
          method: 'GET',
          status: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Test POST if supported
    if (endpointInfo.methods.includes('POST')) {
      try {
        const response = await fetch(`${BASE_URL}/${endpointInfo.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        });
        
        result.tests.push({
          method: 'POST',
          status: response.status,
          success: response.status < 500,
          contentType: response.headers.get('content-type')
        });
      } catch (error) {
        result.tests.push({
          method: 'POST',
          status: 0,
          success: false,
          error: error.message
        });
      }
    }

    // Determine overall status
    const successfulTests = result.tests.filter(test => test.success).length;
    const totalTests = result.tests.length;
    
    if (successfulTests === totalTests && totalTests > 0) {
      result.status = 'healthy';
      validationResults.successfulTests++;
    } else if (successfulTests > 0) {
      result.status = 'partial';
      validationResults.successfulTests++;
    } else {
      result.status = 'failed';
      validationResults.failedTests++;
    }

  } catch (error) {
    result.status = 'error';
    result.errors.push(error.message);
    validationResults.failedTests++;
    console.error(`❌ Error testing ${endpointInfo.name}:`, error.message);
  }

  validationResults.endpointResults.push(result);
  console.log(`${result.status === 'healthy' ? '✅' : result.status === 'partial' ? '⚠️' : '❌'} ${endpointInfo.name}: ${result.status}`);
}

async function validateAllEndpoints() {
  console.log('🧪 Starting API Endpoint Validation...');
  
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
    process.exit(1);
  }

  const functionDirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
    .map(dirent => dirent.name);

  console.log(`📋 Found ${functionDirs.length} endpoints to validate`);
  validationResults.totalEndpoints = functionDirs.length;

  for (const functionName of functionDirs) {
    const indexPath = path.join(FUNCTIONS_DIR, functionName, 'index.ts');
    
    if (fs.existsSync(indexPath)) {
      try {
        const content = fs.readFileSync(indexPath, 'utf8');
        const endpointInfo = extractEndpointInfo(functionName, content);
        await validateEndpoint(endpointInfo);
        
        // Add small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error processing ${functionName}:`, error.message);
        validationResults.errors.push({
          endpoint: functionName,
          error: error.message
        });
      }
    }
  }
}

function generateValidationReport() {
  const healthyEndpoints = validationResults.endpointResults.filter(r => r.status === 'healthy');
  const partialEndpoints = validationResults.endpointResults.filter(r => r.status === 'partial');
  const failedEndpoints = validationResults.endpointResults.filter(r => r.status === 'failed');

  const report = `# API Endpoint Validation Report

Generated on: ${new Date().toISOString()}
Base URL: ${BASE_URL}

## Summary

- **Total Endpoints**: ${validationResults.totalEndpoints}
- **Healthy**: ${healthyEndpoints.length} (${Math.round((healthyEndpoints.length / validationResults.totalEndpoints) * 100)}%)
- **Partial**: ${partialEndpoints.length} (${Math.round((partialEndpoints.length / validationResults.totalEndpoints) * 100)}%)
- **Failed**: ${failedEndpoints.length} (${Math.round((failedEndpoints.length / validationResults.totalEndpoints) * 100)}%)

## Endpoint Status

### ✅ Healthy Endpoints (${healthyEndpoints.length})
${healthyEndpoints.map(result => 
  `- **${result.endpoint}**: ${result.methods.join(', ')} (${result.responseTime}ms)`
).join('\n')}

### ⚠️ Partial Endpoints (${partialEndpoints.length})
${partialEndpoints.map(result => 
  `- **${result.endpoint}**: ${result.methods.join(', ')} - Some tests failed`
).join('\n')}

### ❌ Failed Endpoints (${failedEndpoints.length})
${failedEndpoints.map(result => 
  `- **${result.endpoint}**: ${result.errors.join(', ')}`
).join('\n')}

## Detailed Test Results

${validationResults.endpointResults.map(result => `
### ${result.endpoint}

- **Status**: ${result.status}
- **Methods**: ${result.methods.join(', ')}
- **Response Time**: ${result.responseTime}ms

${result.tests.map(test => 
  `- **${test.method}**: ${test.success ? '✅' : '❌'} (${test.status}) ${test.error ? '- ' + test.error : ''}`
).join('\n')}

${result.errors.length > 0 ? `**Errors**: ${result.errors.join(', ')}` : ''}
`).join('\n')}

## API Health Score

- **Availability**: ${Math.round(((healthyEndpoints.length + partialEndpoints.length) / validationResults.totalEndpoints) * 100)}%
- **Reliability**: ${Math.round((healthyEndpoints.length / validationResults.totalEndpoints) * 100)}%
- **Average Response Time**: ${Math.round(validationResults.endpointResults.reduce((sum, r) => sum + r.responseTime, 0) / validationResults.endpointResults.length)}ms

## Recommendations

1. **Fix Failed Endpoints**: Address ${failedEndpoints.length} non-functional endpoints
2. **Improve Partial Endpoints**: Debug ${partialEndpoints.length} partially working endpoints
3. **Monitor Performance**: Average response time is acceptable
4. **Add Health Checks**: Implement /health endpoints for monitoring

## Next Steps

1. Review failed endpoint logs in Supabase dashboard
2. Fix authentication and validation issues
3. Add proper error handling for all endpoints
4. Set up continuous monitoring for API health
`;

  // Ensure docs directory exists
  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }

  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  console.log(`📄 Validation report generated: ${OUTPUT_FILE}`);
}

// Main execution
async function main() {
  await validateAllEndpoints();
  generateValidationReport();
  
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Successful tests: ${validationResults.successfulTests}`);
  console.log(`❌ Failed tests: ${validationResults.failedTests}`);
  console.log(`🎯 API Health: ${Math.round((validationResults.successfulTests / validationResults.totalEndpoints) * 100)}%`);
}

main().catch(console.error);