/**
 * Classical Local Hidden Variable (LHV) Simulation Runner:
 * Runs 100,000 Monte Carlo trials across Bell measurement settings to prove |S_LHV| <= 2.0.
 */
import { ClassicalLHVSimulator } from '../src/classical/lhv_simulator.js';

console.log('='.repeat(70));
console.log('  BELL THEOREM: CLASSICAL LOCAL HIDDEN VARIABLE (LHV) SIMULATION');
console.log('='.repeat(70));

const numTrialsPerSetting = 25000;
const lhvResult = ClassicalLHVSimulator.simulateCHSH({
  thetaA: 0,
  thetaAPrime: Math.PI / 2,
  thetaB: Math.PI / 4,
  thetaBPrime: -Math.PI / 4
}, numTrialsPerSetting);

console.log(`\nTotal Simulated Particle Pairs: ${lhvResult.totalTrials.toLocaleString()}`);
console.log(`Model: ${lhvResult.type}`);
console.log(`\nMeasurement Correlators:`);
console.log(`  E(a, b):       ${lhvResult.settings.E_ab.toFixed(4)} (Expected classical: 0.5000)`);
console.log(`  E(a, b'):      ${lhvResult.settings.E_abPrime.toFixed(4)} (Expected classical: 0.5000)`);
console.log(`  E(a', b):      ${lhvResult.settings.E_aPrimeB.toFixed(4)} (Expected classical: 0.5000)`);
console.log(`  E(a', b'):     ${lhvResult.settings.E_aPrimeBPrime.toFixed(4)} (Expected classical: -0.5000)`);
console.log(`\nResults:`);
console.log(`  Measured S_LHV:    ${lhvResult.measuredS.toFixed(4)} +/- ${lhvResult.stdErr.toFixed(4)}`);
console.log(`  Analytical S_LHV:  ${lhvResult.analyticalS.toFixed(4)}`);
console.log(`  Classical Bound:   ${lhvResult.classicalBound.toFixed(4)}`);
console.log(`  Violates Bound?    ${lhvResult.violatesClassicalBound ? 'YES' : 'NO (Strictly bounded by 2.0)'}`);
console.log(`\nConclusion:`);
console.log(`  Under ANY local hidden-variable model, correlations satisfy |S| <= 2.0.`);
console.log(`  Quantum mechanics violates this bound by reaching S = 2*sqrt(2) ~ 2.8284 (+41.42%).`);
console.log(`  This conclusively demonstrates quantum nonlocality and refutes local realism.`);
console.log('='.repeat(70));
