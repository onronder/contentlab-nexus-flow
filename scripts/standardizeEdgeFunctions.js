#!/usr/bin/env node

/**
 * Phase 2: Edge Function Standardization Script
 * Automatically standardizes edge function patterns for consistency
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = 'supabase/functions';

class EdgeFunctionStandardizer {
  constructor() {
    this.standardizedCount = 0;
    this.errorCount = 0;
    this.changes = [];
  }

  async standardizeAllFunctions() {
    console.log('🔧 Starting Edge Function Standardization...');
    
    if (!fs.existsSync(FUNCTIONS_DIR)) {
      console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
      return;
    }

    const functionDirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);

    for (const functionName of functionDirs) {
      await this.standardizeFunction(functionName);
    }

    this.generateReport();
    console.log(`✅ Standardization complete. ${this.standardizedCount} functions updated, ${this.errorCount} errors.`);
  }

  async standardizeFunction(functionName) {
    const indexPath = path.join(FUNCTIONS_DIR, functionName, 'index.ts');
    
    if (!fs.existsSync(indexPath)) {
      console.warn(`⚠️ Skipping ${functionName}: index.ts not found`);
      return;
    }

    try {
      const originalContent = fs.readFileSync(indexPath, 'utf8');
      let content = originalContent;
      const changes = [];

      // 1. Replace console statements with structured logging
      content = this.replaceConsoleStatements(content, changes);

      // 2. Standardize security middleware pattern
      content = this.standardizeSecurityPattern(content, changes, functionName);

      // 3. Add missing imports if needed
      content = this.addMissingImports(content, changes);

      // 4. Standardize error responses
      content = this.standardizeErrorResponses(content, changes);

      // 5. Add function documentation if missing
      content = this.addDocumentation(content, changes, functionName);

      if (content !== originalContent) {
        // Create backup
        fs.writeFileSync(`${indexPath}.backup`, originalContent);
        
        // Write standardized version
        fs.writeFileSync(indexPath, content);
        
        this.standardizedCount++;
        this.changes.push({
          function: functionName,
          changes: changes
        });
        
        console.log(`✅ Standardized ${functionName} (${changes.length} changes)`);
      } else {
        console.log(`ℹ️ ${functionName} already standardized`);
      }

    } catch (error) {
      console.error(`❌ Error standardizing ${functionName}:`, error.message);
      this.errorCount++;
    }
  }

  replaceConsoleStatements(content, changes) {
    // Replace console.log/error/warn with structured logging
    const replacements = [
      {
        pattern: /console\.log\((.*?)\);/g,
        replacement: "logger.info('Log message', { data: $1 });",
        description: "Replaced console.log with structured logging"
      },
      {
        pattern: /console\.error\((.*?)\);/g,
        replacement: "logger.error('Error occurred', new Error($1));",
        description: "Replaced console.error with structured logging"
      },
      {
        pattern: /console\.warn\((.*?)\);/g,
        replacement: "logger.warn('Warning', { data: $1 });",
        description: "Replaced console.warn with structured logging"
      },
      {
        pattern: /console\.info\((.*?)\);/g,
        replacement: "logger.info('Information', { data: $1 });",
        description: "Replaced console.info with structured logging"
      }
    ];

    let newContent = content;
    replacements.forEach(({ pattern, replacement, description }) => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(description);
      }
    });

    return newContent;
  }

  standardizeSecurityPattern(content, changes, functionName) {
    // If function uses Deno.serve without withSecurity, convert it
    if (content.includes('Deno.serve(') && !content.includes('withSecurity')) {
      
      // Extract handler function
      const denoServeMatch = content.match(/Deno\.serve\((.*?)\)/s);
      if (denoServeMatch) {
        const handlerCode = denoServeMatch[1];
        
        // Create new pattern
        const newPattern = `
const handler = withSecurity(async (req, logger) => {
  ${this.extractHandlerBody(handlerCode)}
}, {
  requireAuth: true,
  rateLimitRequests: 100,
  rateLimitWindow: 60000,
  enableCORS: true
});

Deno.serve(handler);`;

        content = content.replace(denoServeMatch[0], newPattern);
        changes.push('Converted to withSecurity pattern');
      }
    }

    // If function uses export default but not withSecurity
    if (content.includes('export default') && !content.includes('withSecurity')) {
      // This needs manual review, just flag it
      changes.push('Manual review needed: export default without withSecurity');
    }

    return content;
  }

  extractHandlerBody(handlerCode) {
    // Simple extraction - in real implementation, would need proper AST parsing
    if (handlerCode.includes('async (req)')) {
      return handlerCode.replace('async (req)', '').replace(/^\s*=>\s*\{/, '').replace(/\}\s*$/, '');
    }
    return '// Manual conversion needed';
  }

  addMissingImports(content, changes) {
    const imports = [];
    
    // Check if withSecurity is used but not imported
    if (content.includes('withSecurity') && !content.includes("import { withSecurity")) {
      imports.push("import { withSecurity } from '../_shared/security.ts';");
    }

    // Check if logger is used but withSecurity import doesn't include SecurityLogger
    if (content.includes('logger.') && !content.includes('SecurityLogger')) {
      // Update existing import or add new one
      if (content.includes("import { withSecurity }")) {
        content = content.replace(
          "import { withSecurity }",
          "import { withSecurity, SecurityLogger }"
        );
        changes.push('Added SecurityLogger import');
      }
    }

    if (imports.length > 0) {
      const importStatements = imports.join('\n');
      content = importStatements + '\n' + content;
      changes.push(`Added imports: ${imports.join(', ')}`);
    }

    return content;
  }

  standardizeErrorResponses(content, changes) {
    // Standardize error response format
    const errorPatterns = [
      {
        pattern: /return new Response\(JSON\.stringify\(\{\s*error:\s*([^}]+)\s*\}\)/g,
        replacement: `return new Response(JSON.stringify({
  success: false,
  error: $1,
  timestamp: new Date().toISOString()
})`,
        description: 'Standardized error response format'
      }
    ];

    let newContent = content;
    errorPatterns.forEach(({ pattern, replacement, description }) => {
      if (pattern.test(newContent)) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(description);
      }
    });

    return newContent;
  }

  addDocumentation(content, changes, functionName) {
    // Add basic JSDoc if missing
    if (!content.includes('/**') && !content.startsWith('/**')) {
      const documentation = `/**
 * ${functionName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Function
 * 
 * @description Handles ${functionName} operations
 * @param {Request} req - The incoming request
 * @param {SecurityLogger} logger - Structured logger instance
 * @returns {Promise<Response>} JSON response
 */

`;
      content = documentation + content;
      changes.push('Added function documentation');
    }

    return content;
  }

  generateReport() {
    const report = `# Edge Function Standardization Report

**Generated:** ${new Date().toISOString()}
**Functions Processed:** ${this.standardizedCount + this.errorCount}
**Successfully Standardized:** ${this.standardizedCount}
**Errors:** ${this.errorCount}

## Changes Made

${this.changes.map(change => `
### \`${change.function}\`
${change.changes.map(c => `- ${c}`).join('\n')}
`).join('')}

## Manual Review Needed

Functions that require manual attention:
${this.changes
  .filter(change => change.changes.some(c => c.includes('Manual review needed')))
  .map(change => `- \`${change.function}\``)
  .join('\n')}

## Backup Files

Backup files have been created with \`.backup\` extension for all modified functions.
To restore a function: \`cp function-name/index.ts.backup function-name/index.ts\`

---
*Generated by Phase 2 Edge Function Standardizer*
`;

    fs.writeFileSync('docs/STANDARDIZATION_REPORT.md', report);
  }
}

// Run standardization if called directly
if (require.main === module) {
  const standardizer = new EdgeFunctionStandardizer();
  standardizer.standardizeAllFunctions().catch(console.error);
}

module.exports = EdgeFunctionStandardizer;