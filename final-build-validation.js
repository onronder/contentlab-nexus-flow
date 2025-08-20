#!/usr/bin/env node

/**
 * Final Build Validation Script
 * Performs comprehensive validation before production deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 Starting Final Build Validation...\n');

const validationSteps = [
  {
    name: 'TypeScript Compilation',
    command: 'npx tsc --noEmit',
    description: 'Checking TypeScript types and syntax'
  },
  {
    name: 'Production Build',
    command: 'npm run build',
    description: 'Creating optimized production build'
  },
  {
    name: 'ESLint Check',
    command: 'npm run lint',
    description: 'Running code quality checks'
  }
];

const results = [];

for (const step of validationSteps) {
  console.log(`📋 ${step.name}: ${step.description}`);
  
  try {
    const startTime = Date.now();
    execSync(step.command, { stdio: 'inherit' });
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${step.name} completed in ${duration}ms\n`);
    results.push({ ...step, status: 'passed', duration });
  } catch (error) {
    console.log(`❌ ${step.name} failed\n`);
    results.push({ ...step, status: 'failed', error: error.message });
  }
}

// Summary
console.log('🎯 Build Validation Summary:');
console.log('=' .repeat(50));

let passedCount = 0;
results.forEach(result => {
  const status = result.status === 'passed' ? '✅ PASSED' : '❌ FAILED';
  console.log(`${result.name}: ${status}`);
  if (result.status === 'passed') passedCount++;
});

console.log('=' .repeat(50));
console.log(`Results: ${passedCount}/${results.length} tests passed`);

if (passedCount === results.length) {
  console.log('\n🎉 All validation checks passed! Ready for production deployment.');
  process.exit(0);
} else {
  console.log('\n⚠️ Some validation checks failed. Please review and fix before deployment.');
  process.exit(1);
}