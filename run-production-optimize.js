#!/usr/bin/env node

/**
 * Production Optimization Runner
 * Executes the production optimization script and provides real-time feedback
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Production Optimization Process...\n');

try {
  // Run the production optimization script
  const scriptPath = path.join(__dirname, 'execute-optimization.js');
  
  console.log('📊 Executing production optimization...');
  const result = execSync(`node "${scriptPath}"`, { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ Production optimization completed successfully!');
  console.log('\n📋 Next Steps:');
  console.log('1. Run build validation: npm run build');
  console.log('2. Test preview: npm run preview');  
  console.log('3. Run final linting: npm run lint');
  console.log('4. Deploy to production');
  
} catch (error) {
  console.error('\n❌ Production optimization failed:');
  console.error(error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('- Check file permissions');
  console.log('- Verify Node.js version compatibility');
  console.log('- Review error details above');
  process.exit(1);
}