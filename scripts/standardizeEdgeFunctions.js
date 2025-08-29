#!/usr/bin/env node

/**
 * Edge Function Standardization Script
 * Applies consistent patterns to all edge functions for production readiness
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = 'supabase/functions';
const OUTPUT_FILE = 'docs/STANDARDIZATION_REPORT.md';

const standardizationResults = {
  totalFunctions: 0,
  functionsUpdated: 0,
  functionsSkipped: 0,
  changes: [],
  errors: []
};

// Standard patterns to apply
const STANDARD_CORS_HEADERS = `const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};`;

const STANDARD_LOGGER = `class Logger {
  info(message: string, data?: any) {
    console.log(\`[INFO] \${message}\`, data);
  }
  
  warn(message: string, data?: any) {
    console.warn(\`[WARN] \${message}\`, data);
  }
  
  error(message: string, error?: any) {
    console.error(\`[ERROR] \${message}\`, error);
  }
}

const logger = new Logger();`;

function standardizeFunction(functionName) {
  const indexPath = path.join(FUNCTIONS_DIR, functionName, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    standardizationResults.functionsSkipped++;
    return;
  }

  try {
    let content = fs.readFileSync(indexPath, 'utf8');
    let hasChanges = false;
    const changes = [];

    standardizationResults.totalFunctions++;

    // Add CORS headers if missing
    if (!content.includes('Access-Control-Allow-Origin')) {
      content = STANDARD_CORS_HEADERS + '\n\n' + content;
      changes.push('Added CORS headers');
      hasChanges = true;
    }

    // Add OPTIONS handler if missing
    if (!content.includes("req.method === 'OPTIONS'")) {
      const optionsHandler = `
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
`;
      
      // Insert after serve function declaration
      content = content.replace(
        /Deno\.serve\(.*?\{/,
        (match) => match + optionsHandler
      );
      changes.push('Added OPTIONS handler');
      hasChanges = true;
    }

    // Add structured logger if missing
    if (!content.includes('class Logger') && !content.includes('logger')) {
      content = STANDARD_LOGGER + '\n\n' + content;
      changes.push('Added structured logger');
      hasChanges = true;
    }

    // Replace console statements with logger
    const consoleRegex = /console\.(log|error|warn|info|debug)\s*\(/g;
    const consoleMatches = content.match(consoleRegex);
    
    if (consoleMatches && !content.includes('logger.')) {
      content = content.replace(/console\.log\s*\(/g, 'logger.info(');
      content = content.replace(/console\.error\s*\(/g, 'logger.error(');
      content = content.replace(/console\.warn\s*\(/g, 'logger.warn(');
      content = content.replace(/console\.info\s*\(/g, 'logger.info(');
      content = content.replace(/console\.debug\s*\(/g, 'logger.info(');
      changes.push(`Replaced ${consoleMatches.length} console statements`);
      hasChanges = true;
    }

    // Add error handling wrapper if missing
    if (!content.includes('try') && !content.includes('catch')) {
      // Wrap the main handler in try/catch
      content = content.replace(
        /return new Response\(/g,
        (match, offset) => {
          const beforeMatch = content.substring(0, offset);
          if (!beforeMatch.includes('try {')) {
            return `try {\n    ${match}`;
          }
          return match;
        }
      );
      
      // Add catch block before the final closing brace
      if (!content.includes('} catch')) {
        content = content.replace(/}\s*$/, `  } catch (error) {
    logger.error('Function error', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}`);
        changes.push('Added error handling wrapper');
        hasChanges = true;
      }
    }

    // Ensure all responses include CORS headers
    const responseRegex = /new Response\([^,)]+(?:,\s*{[^}]*})?/g;
    content = content.replace(responseRegex, (match) => {
      if (!match.includes('headers') || !match.includes('corsHeaders')) {
        if (match.includes('headers:')) {
          return match.replace('headers:', 'headers: { ...corsHeaders,');
        } else if (match.includes('{')) {
          return match.replace('{', '{ headers: corsHeaders,');
        } else {
          return match.replace(')', ', { headers: corsHeaders })');
        }
      }
      return match;
    });

    if (hasChanges) {
      fs.writeFileSync(indexPath, content, 'utf8');
      standardizationResults.functionsUpdated++;
      standardizationResults.changes.push({
        function: functionName,
        changes: changes
      });
      console.log(`✅ Standardized: ${functionName} (${changes.length} changes)`);
    } else {
      console.log(`⚪ No changes needed: ${functionName}`);
    }

  } catch (error) {
    console.error(`❌ Error standardizing ${functionName}:`, error.message);
    standardizationResults.errors.push({
      function: functionName,
      error: error.message
    });
  }
}

function generateStandardizationReport() {
  const report = `# Edge Function Standardization Report

Generated on: ${new Date().toISOString()}

## Summary

- **Total Functions**: ${standardizationResults.totalFunctions}
- **Functions Updated**: ${standardizationResults.functionsUpdated}
- **Functions Skipped**: ${standardizationResults.functionsSkipped}
- **Errors**: ${standardizationResults.errors.length}

## Changes Applied

${standardizationResults.changes.map(item => 
  `### ${item.function}\n${item.changes.map(change => `- ${change}`).join('\n')}\n`
).join('\n')}

## Errors Encountered

${standardizationResults.errors.map(item => 
  `### ${item.function}\n- Error: ${item.error}\n`
).join('\n')}

## Standards Applied

1. **CORS Headers**: Consistent Access-Control headers across all functions
2. **OPTIONS Handler**: Proper preflight request handling
3. **Structured Logging**: Logger class with info/warn/error methods
4. **Console Replacement**: All console.* statements replaced with logger
5. **Error Handling**: Try/catch wrappers for robust error handling
6. **Response Headers**: CORS headers included in all responses

## Production Readiness Score

- **Standardization Coverage**: ${Math.round((standardizationResults.functionsUpdated / standardizationResults.totalFunctions) * 100)}%
- **Error Rate**: ${Math.round((standardizationResults.errors.length / standardizationResults.totalFunctions) * 100)}%

## Next Steps

1. Review and test all updated functions
2. Run API documentation generation
3. Validate all endpoints work correctly
4. Deploy and monitor function performance
`;

  // Ensure docs directory exists
  if (!fs.existsSync('docs')) {
    fs.mkdirSync('docs');
  }

  fs.writeFileSync(OUTPUT_FILE, report, 'utf8');
  console.log(`📄 Standardization report generated: ${OUTPUT_FILE}`);
}

// Main execution
console.log('🔧 Starting Edge Function Standardization...');

if (!fs.existsSync(FUNCTIONS_DIR)) {
  console.error(`❌ Functions directory not found: ${FUNCTIONS_DIR}`);
  process.exit(1);
}

const functionDirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
  .map(dirent => dirent.name);

console.log(`📋 Found ${functionDirs.length} functions to standardize`);

functionDirs.forEach(standardizeFunction);
generateStandardizationReport();

console.log('\n📊 Standardization Summary:');
console.log(`✅ Functions updated: ${standardizationResults.functionsUpdated}`);
console.log(`⚠️  Errors: ${standardizationResults.errors.length}`);
console.log(`🎯 Success rate: ${Math.round((standardizationResults.functionsUpdated / standardizationResults.totalFunctions) * 100)}%`);