/**
 * Automated Research Report Generator Script
 */
import fs from 'fs';
import path from 'path';
import { BenchmarkRunner } from '../src/benchmarks/benchmark_runner.js';
import { HARDWARE_PRESETS } from '../src/hardware/mock_qpu.js';
import { ReportGenerator } from '../src/report/report_generator.js';

console.log('='.repeat(70));
console.log('  GENERATING AUTOMATED RESEARCH REPORT');
console.log('='.repeat(70));

const reportsDir = path.resolve('./reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

console.log('Running benchmark analysis...');
const benchResult = BenchmarkRunner.runAlgorithmComparison({
  noisePreset: HARDWARE_PRESETS.ibmEagleTypical,
  shotBudget: 8192
});

const sweepData = BenchmarkRunner.runDepolarizingSweep(25);

const reportPath = path.join(reportsDir, 'quantum_bell_research_report.md');
const md = ReportGenerator.generateMarkdownReport(benchResult, sweepData);
fs.writeFileSync(reportPath, md, 'utf-8');

console.log(`\nReport successfully generated at: ${reportPath}`);
console.log('='.repeat(70));
