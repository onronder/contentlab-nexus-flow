// Execute production optimization
const { ProductionOptimizer } = require('./scripts/production-optimize.js');

console.log('🚀 Running Production Optimization...\n');

async function runOptimization() {
  try {
    const optimizer = new ProductionOptimizer();
    await optimizer.optimize();
    console.log('\n✅ Production optimization completed successfully!');
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

runOptimization();