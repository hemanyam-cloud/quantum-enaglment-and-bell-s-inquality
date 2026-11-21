/**
 * Benchmark Runner Script:
 * Evaluates all 7 optimization algorithms and generates reproducible datasets.
 */
import fs from 'fs';
import path from 'path';
import { BenchmarkRunner } from '../src/benchmarks/benchmark_runner.js';
import { HARDWARE_PRESETS } from '../src/hardware/mock_qpu.js';
import { ReportGenerator } from '../src/report/report_generator.js';

console.log('='.repeat(70));
console.log('  RUNNING COMPLETE BENCHMARK SUITE (7 ALGORITHMS)');
console.log('='.repeat(70));

const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 1. Algorithm comparison under realistic IBM Eagle noise profile
console.log('\n[1/2] Comparing 7 Algorithms on IBM Eagle Hardware Preset...');
const benchResult = BenchmarkRunner.runAlgorithmComparison({
  noisePreset: HARDWARE_PRESETS.ibmEagleTypical,
  shotBudget: 4096
});

console.log('\nBenchmark Results Summary:');
for (const alg of benchResult.algorithms) {
  const sStr = typeof alg.sValue === 'number' ? alg.sValue.toFixed(4) : 'N/A';
  const seStr = alg.stdErr ? ` +/- ${alg.stdErr.toFixed(4)}` : '';
  const zStr = alg.zScore ? ` (Z: ${alg.zScore.toFixed(1)} sigma)` : '';
  console.log(`  * ${alg.algorithm.padEnd(42)}: S = ${sStr}${seStr}${zStr}`);
}

const summary = benchResult.nauaoSummary;
console.log(`\nProposed NA-UAO Highlights:`);
console.log(`  - Variance reduction vs uniform: ${summary.varianceReductionPct.toFixed(2)}%`);
console.log(`  - Optimal Neyman shot allocation: [${summary.neymanAllocations.join(', ')}]`);
console.log(`  - 5-Sigma Discovery Status:       ${summary.isFiveSigmaDiscovery ? 'YES' : 'NO'}`);

// 2. Depolarizing noise sweep
console.log('\n[2/2] Running Depolarizing Noise Sweep (p in [0, 0.40])...');
const sweepData = BenchmarkRunner.runDepolarizingSweep(21);

// Save datasets
fs.writeFileSync(
  path.join(dataDir, 'algorithms_comparison.json'),
  JSON.stringify(benchResult, null, 2),
  'utf-8'
);
fs.writeFileSync(
  path.join(dataDir, 'depolarizing_sweep.json'),
  JSON.stringify(sweepData, null, 2),
  'utf-8'
);
const sweepCsv = ReportGenerator.exportSweepCSV(sweepData);
fs.writeFileSync(path.join(dataDir, 'depolarizing_sweep.csv'), sweepCsv, 'utf-8');

console.log('\n' + '='.repeat(70));
console.log('Datasets successfully written to ./data/');
console.log('  - ./data/algorithms_comparison.json');
console.log('  - ./data/depolarizing_sweep.json');
console.log('  - ./data/depolarizing_sweep.csv');
console.log('='.repeat(70));
