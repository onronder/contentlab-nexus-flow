#!/usr/bin/env node

/**
 * Edge Function Audit Script
 * Analyzes all edge functions for consistency, patterns, and production readiness
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = 'supabase/functions';
const OUTPUT_FILE = 'docs/EDGE_FUNCTION_AUDIT.md';

const auditResults = {
  totalFunctions: 0,
  functionsWithErrors: [],
  functionsWithConsole: [],
  functionsWithoutCORS: [],
  functionsWithoutAuth: [],
  functionsWithoutErrorHandling: [],
  patterns: {
    hasLogger: 0,
    hasErrorHandling: 0,
    hasCORS: 0,
    hasAuth: 0,
    hasValidation: 0
  }
};

function auditFunction(functionName) {
  const indexPath = path.join(FUNCTIONS_DIR, functionName, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    console.log(`⚠️  No index.ts found for ${functionName}`);
    return;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    auditResults.totalFunctions++;

    // Check for console statements
    if (content.includes('console.')) {
      auditResults.functionsWithConsole.push(functionName);
    }

    // Check for CORS headers
    if (!content.includes('Access-Control-Allow-Origin')) {
      auditResults.functionsWithoutCORS.push(functionName);
    } else {
      auditResults.patterns.hasCORS++;
    }

    // Check for authentication
    if (!content.includes('auth.uid()') && !content.includes('Authorization')) {
      auditResults.functionsWithoutAuth.push(functionName);
    } else {
      auditResults.patterns.hasAuth++;
    }

    // Check for error handling
    if (!content.includes('try') && !content.includes('catch')) {
      auditResults.functionsWithoutErrorHandling.push(functionName);
    } else {
      auditResults.patterns.hasErrorHandling++;
    }

    // Check for structured logging
    if (content.includes('logger') || content.includes('Logger')) {
      auditResults.patterns.hasLogger++;
    }

    // Check for validation
    if (content.includes('validate') || content.includes('schema')) {
      auditResults.patterns.hasValidation++;
    }

    console.log(`✅ Audited: ${functionName}`);
  } catch (error) {
    console.error(`❌ Error auditing ${functionName}:`, error.message);
    auditResults.functionsWithErrors.push({
      name: functionName,
      error: error.message
    });
  }
}

function generateAuditReport() {
  const report = `# Edge Function Audit Report

Generated on: ${new Date().toISOString()}

## Summary

- **Total Functions**: ${auditResults.totalFunctions}
- **Functions with Issues**: ${auditResults.functionsWithErrors.length}

## Pattern Analysis

| Pattern | Count | Percentage |
|---------|-------|------------|
| Structured Logging | ${auditResults.patterns.hasLogger} | ${Math.round((auditResults.patterns.hasLogger / auditResults.totalFunctions) * 100)}% |
| Error Handling | ${auditResults.patterns.hasErrorHandling} | ${Math.round((auditResults.patterns.hasErrorHandling / auditResults.totalFunctions) * 100)}% |
| CORS Headers | ${auditResults.patterns.hasCORS} | ${Math.round((auditResults.patterns.hasCORS / auditResults.totalFunctions) * 100)}% |
| Authentication | ${auditResults.patterns.hasAuth} | ${Math.round((auditResults.patterns.hasAuth / auditResults.totalFunctions) * 100)}% |
| Input Validation | ${auditResults.patterns.hasValidation} | ${Math.round((auditResults.patterns.hasValidation / auditResults.totalFunctions) * 100)}% |

## Issues Found

### Functions with Console Statements (${auditResults.functionsWithConsole.length})
${auditResults.functionsWithConsole.map(name => `- ${name}`).join('\n')}

### Functions without CORS (${auditResults.functionsWithoutCORS.length})
${auditResults.functionsWithoutCORS.map(name => `- ${name}`).join('\n')}

### Functions without Authentication (${auditResults.functionsWithoutAuth.length})
${auditResults.functionsWithoutAuth.map(name => `- ${name}`).join('\n')}

### Functions without Error Handling (${auditResults.functionsWithoutErrorHandling.length})
${auditResults.functionsWithoutErrorHandling.map(name => `- ${name}`).join('\n')}

### Functions with Errors (${auditResults.functionsWithErrors.length})
${auditResults.functionsWithErrors.map(item => `- ${item.name}: ${item.error}`).join('\n')}

## Recommendations

1. **Add Structured Logging**: ${auditResults.totalFunctions - auditResults.patterns.hasLogger} functions need logger implementation
2. **Implement Error Handling**: ${auditResults.totalFunctions - auditResults.patterns.hasErrorHandling} functions need try/catch blocks
3. **Add CORS Headers**: ${auditResults.functionsWithoutCORS.length} functions need CORS configuration
4. **Implement Authentication**: ${auditResults.functionsWithoutAuth.length} functions may need auth checks
5. **Add Input Validation**: ${auditResults.totalFunctions - auditResults.patterns.hasValidation} functions need input validation

## Next Steps

1. Run standardization script to fix identified issues
2. Update functions to use consistent patterns
3. Add missing error handling and logging
4. Verify CORS and authentication requirements
`;

  // Ensure docs directory exists
  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }

  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  console.log(`📄 Audit report generated: ${OUTPUT_FILE}`);
}

// Main execution
console.log('🔍 Starting Edge Function Audit...');

if (!fs.existsSync(FUNCTIONS_DIR)) {
  console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
  process.exit(1);
}

const functionDirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
  .map(dirent => dirent.name);

console.log(`📋 Found ${functionDirs.length} functions to audit`);

functionDirs.forEach(auditFunction);
generateAuditReport();

console.log('\n📊 Audit Summary:');
console.log(`✅ Functions audited: ${auditResults.totalFunctions}`);
console.log(`⚠️  Issues found: ${auditResults.functionsWithConsole.length + auditResults.functionsWithoutCORS.length + auditResults.functionsWithoutErrorHandling.length}`);
console.log(`🎯 Production readiness: ${Math.round(((auditResults.patterns.hasLogger + auditResults.patterns.hasErrorHandling + auditResults.patterns.hasCORS) / (auditResults.totalFunctions * 3)) * 100)}%`);