#!/usr/bin/env node

/**
 * Script to systematically replace all console.* statements with structured logging
 * This script helps complete Phase 1 by achieving 100% console statement replacement
 */

const fs = require('fs');
const path = require('path');

// Logger import statement to add to files
const LOGGER_IMPORT = "import { logger } from '@/utils/consoleReplacement';";

// Mapping of console statements to logger equivalents
const CONSOLE_REPLACEMENTS = {
  'console.log': 'logger.log',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.info': 'logger.log',
  'console.debug': 'logger.log'
};

// Context-specific patterns for better logging categorization
const CONTEXT_PATTERNS = {
  'team': /team|member|collaboration/i,
  'auth': /auth|login|signup|session/i,
  'analytics': /analytic|metric|insight|performance/i,
  'content': /content|document|file|upload/i,
  'project': /project|workspace/i,
  'billing': /billing|subscription|payment/i,
  'storage': /storage|bucket|file/i,
  'mobile': /mobile|touch|swipe|gesture/i,
  'api': /api|request|response|endpoint/i,
  'ui': /component|render|display|interface/i
};

function detectContext(filePath, content) {
  const fileName = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  
  // Check file and directory names first
  for (const [context, pattern] of Object.entries(CONTEXT_PATTERNS)) {
    if (pattern.test(fileName) || pattern.test(dirName)) {
      return context;
    }
  }
  
  // Check content patterns
  for (const [context, pattern] of Object.entries(CONTEXT_PATTERNS)) {
    if (pattern.test(content)) {
      return context;
    }
  }
  
  return 'ui'; // Default context
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let hasChanges = false;
    let needsImport = false;

    // Check if file already has logger import
    const hasLoggerImport = content.includes("from '@/utils/consoleReplacement'");

    // Detect context for this file
    const context = detectContext(filePath, content);

    // Replace console statements with appropriate logger calls
    const consoleRegex = /console\.(log|error|warn|info|debug)\s*\([^)]*\)/g;
    
    updatedContent = updatedContent.replace(consoleRegex, (match) => {
      hasChanges = true;
      needsImport = true;

      // Extract the console method and arguments
      const methodMatch = match.match(/console\.(\w+)\s*\((.+)\)/);
      if (!methodMatch) return match;

      const [, method, args] = methodMatch;
      
      // For error statements, use logger.error with context
      if (method === 'error') {
        // Try to extract error message and error object
        const argParts = args.split(',').map(arg => arg.trim());
        if (argParts.length >= 2) {
          const message = argParts[0];
          const errorObj = argParts.slice(1).join(', ');
          return `logger.error(${message}, '${context}', { error: ${errorObj} })`;
        } else {
          return `logger.error(${args}, '${context}')`;
        }
      }
      
      // For other methods, use context-specific logger
      if (context !== 'ui') {
        return `logger.${context}(${args})`;
      } else {
        return `logger.${CONSOLE_REPLACEMENTS[`console.${method}`].split('.')[1]}(${args})`;
      }
    });

    // Add logger import if needed and not already present
    if (needsImport && !hasLoggerImport) {
      // Find the last import statement
      const lines = updatedContent.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && !lines[i].includes('type ')) {
          lastImportIndex = i;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('import ') && !lines[i].trim().startsWith('//')) {
          break;
        }
      }
      
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT);
        updatedContent = lines.join('\n');
      } else {
        // Add import at the beginning
        updatedContent = LOGGER_IMPORT + '\n' + updatedContent;
      }
    }

    // Write back if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return 1;
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function processDirectory(dirPath, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let filesProcessed = 0;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, and other system directories
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          filesProcessed += processDirectory(fullPath, extensions);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          filesProcessed += processFile(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dirPath}:`, error.message);
  }
  
  return filesProcessed;
}

// Main execution
console.log('🔄 Starting systematic console statement replacement...');
console.log('📋 This will replace all console.* statements with structured logging');

const srcDir = path.join(process.cwd(), 'src');
const filesUpdated = processDirectory(srcDir);

console.log(`\n✅ Console replacement complete!`);
console.log(`📊 Files updated: ${filesUpdated}`);
console.log(`🎯 Phase 1 production readiness: Moving toward 100%`);

if (filesUpdated > 0) {
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes for any compilation errors');
  console.log('2. Test the application to ensure logging works correctly');
  console.log('3. Update Phase 1 completion status to 100%');
}