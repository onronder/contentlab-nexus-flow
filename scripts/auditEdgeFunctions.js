#!/usr/bin/env node

/**
 * Phase 2: Edge Function Audit Script
 * Scans all edge functions to document patterns and inconsistencies
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = 'supabase/functions';
const OUTPUT_FILE = 'docs/EDGE_FUNCTION_AUDIT.md';

class EdgeFunctionAuditor {
  constructor() {
    this.auditResults = {
      totalFunctions: 0,
      patterns: {
        withSecurity: [],
        denoServe: [],
        exportDefault: [],
        manualCors: []
      },
      inconsistencies: [],
      missingDocumentation: [],
      consoleStatements: [],
      securityIssues: []
    };
  }

  async auditAllFunctions() {
    console.log('🔍 Starting Edge Function Audit...');
    
    if (!fs.existsSync(FUNCTIONS_DIR)) {
      console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
      return;
    }

    const functionDirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);

    this.auditResults.totalFunctions = functionDirs.length;

    for (const functionName of functionDirs) {
      await this.auditFunction(functionName);
    }

    await this.generateReport();
    console.log(`✅ Audit complete. Report saved to ${OUTPUT_FILE}`);
  }

  async auditFunction(functionName) {
    const indexPath = path.join(FUNCTIONS_DIR, functionName, 'index.ts');
    
    if (!fs.existsSync(indexPath)) {
      this.auditResults.inconsistencies.push({
        function: functionName,
        issue: 'Missing index.ts file',
        severity: 'high'
      });
      return;
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Analyze patterns
    this.analyzePatterns(functionName, content);
    
    // Check for security middleware
    this.checkSecurity(functionName, content);
    
    // Check for console statements
    this.checkConsoleStatements(functionName, content);
    
    // Check documentation
    this.checkDocumentation(functionName, content);
  }

  analyzePatterns(functionName, content) {
    // Check for withSecurity usage
    if (content.includes('withSecurity(')) {
      this.auditResults.patterns.withSecurity.push({
        function: functionName,
        hasExport: content.includes('export default withSecurity'),
        hasServe: content.includes('Deno.serve')
      });
    }
    
    // Check for Deno.serve
    if (content.includes('Deno.serve(')) {
      this.auditResults.patterns.denoServe.push({
        function: functionName,
        hasWithSecurity: content.includes('withSecurity')
      });
    }
    
    // Check for export default
    if (content.includes('export default')) {
      this.auditResults.patterns.exportDefault.push({
        function: functionName,
        exportsWithSecurity: content.includes('export default withSecurity')
      });
    }
    
    // Check for manual CORS
    if (content.includes('Access-Control-Allow-Origin') && !content.includes('withSecurity')) {
      this.auditResults.patterns.manualCors.push({
        function: functionName,
        hasManualCors: true
      });
    }
  }

  checkSecurity(functionName, content) {
    const issues = [];
    
    // Check if function has any security middleware
    if (!content.includes('withSecurity') && !content.includes('cors')) {
      issues.push('No security middleware detected');
    }
    
    // Check for hardcoded secrets
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
      /["'].*password.*["']\s*:\s*["'].*["']/gi,
      /["'].*secret.*["']\s*:\s*["'].*["']/gi
    ];
    
    secretPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push('Potential hardcoded secret detected');
      }
    });
    
    // Check for SQL injection risks
    if (content.includes('supabase.rpc') && content.includes('${')) {
      issues.push('Potential SQL injection risk with string interpolation');
    }
    
    if (issues.length > 0) {
      this.auditResults.securityIssues.push({
        function: functionName,
        issues
      });
    }
  }

  checkConsoleStatements(functionName, content) {
    const consoleMatches = content.match(/console\.(log|error|warn|info)\(/g);
    if (consoleMatches) {
      this.auditResults.consoleStatements.push({
        function: functionName,
        count: consoleMatches.length,
        types: [...new Set(consoleMatches.map(match => match.replace('console.', '').replace('(', '')))]
      });
    }
  }

  checkDocumentation(functionName, content) {
    const hasJSDoc = content.includes('/**');
    const hasTypeInterfaces = content.includes('interface ') || content.includes('type ');
    const hasComments = content.includes('//');
    
    if (!hasJSDoc && !hasComments) {
      this.auditResults.missingDocumentation.push({
        function: functionName,
        missing: ['documentation', 'comments'],
        hasTypeInterfaces
      });
    }
  }

  async generateReport() {
    const report = `# Edge Function Audit Report

**Generated:** ${new Date().toISOString()}
**Total Functions:** ${this.auditResults.totalFunctions}

## Summary

### Pattern Distribution
- **withSecurity Pattern:** ${this.auditResults.patterns.withSecurity.length} functions
- **Deno.serve Pattern:** ${this.auditResults.patterns.denoServe.length} functions  
- **Export Default:** ${this.auditResults.patterns.exportDefault.length} functions
- **Manual CORS:** ${this.auditResults.patterns.manualCors.length} functions

### Issues Found
- **Inconsistencies:** ${this.auditResults.inconsistencies.length}
- **Security Issues:** ${this.auditResults.securityIssues.length}
- **Console Statements:** ${this.auditResults.consoleStatements.length}
- **Missing Documentation:** ${this.auditResults.missingDocumentation.length}

## Detailed Analysis

### 1. Security Middleware Patterns

#### Functions Using withSecurity (Recommended)
${this.auditResults.patterns.withSecurity.map(f => `- \`${f.function}\``).join('\n')}

#### Functions Using Manual Pattern
${this.auditResults.patterns.denoServe.filter(f => !f.hasWithSecurity).map(f => `- \`${f.function}\` (needs standardization)`).join('\n')}

### 2. Security Issues

${this.auditResults.securityIssues.map(issue => `
#### \`${issue.function}\`
${issue.issues.map(i => `- ⚠️ ${i}`).join('\n')}
`).join('')}

### 3. Console Statement Usage

${this.auditResults.consoleStatements.map(item => `
#### \`${item.function}\`
- **Count:** ${item.count}
- **Types:** ${item.types.join(', ')}
`).join('')}

### 4. Documentation Gaps

${this.auditResults.missingDocumentation.map(item => `
#### \`${item.function}\`
- **Missing:** ${item.missing.join(', ')}
- **Has Type Interfaces:** ${item.hasTypeInterfaces ? '✅' : '❌'}
`).join('')}

### 5. Inconsistencies

${this.auditResults.inconsistencies.map(issue => `
#### \`${issue.function}\`
- **Issue:** ${issue.issue}
- **Severity:** ${issue.severity}
`).join('')}

## Recommendations

### High Priority
1. **Standardize Security Middleware**: All functions should use \`withSecurity\` wrapper
2. **Remove Console Statements**: Replace with structured logging
3. **Fix Security Issues**: Address hardcoded secrets and injection risks

### Medium Priority  
1. **Add Documentation**: JSDoc comments for all functions
2. **Consistent Export Pattern**: Use \`export default withSecurity\`
3. **Type Safety**: Add TypeScript interfaces for all requests/responses

### Low Priority
1. **Performance Optimization**: Review functions with high response times
2. **Error Handling**: Standardize error response formats

## Next Steps

1. Run \`scripts/standardizeEdgeFunctions.js\` to auto-fix patterns
2. Update documentation with \`scripts/generateApiDocs.js\`  
3. Add integration tests for all functions
4. Set up monitoring for production endpoints

---
*Generated by Phase 2 Edge Function Auditor*
`;

    fs.writeFileSync(OUTPUT_FILE, report);
  }
}

// Run audit if called directly
if (require.main === module) {
  const auditor = new EdgeFunctionAuditor();
  auditor.auditAllFunctions().catch(console.error);
}

module.exports = EdgeFunctionAuditor;