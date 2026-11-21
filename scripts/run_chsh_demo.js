/**
 * Quick Demonstration Runner:
 * Tests Bell states, Horodecki analytical calculations, noise channels, and statistical hypothesis testing.
 */
import { STATES } from '../src/core/states.js';
import { horodeckiMaxCHSH } from '../src/core/horodecki.js';
import { CHSHEngine } from '../src/simulation/chsh_engine.js';
import { NoiseChannels } from '../src/noise/channels.js';
import { MockQPU, HARDWARE_PRESETS } from '../src/hardware/mock_qpu.js';
import { pptNegativity, wernerBoundaries } from '../src/core/entanglement.js';

console.log('='.repeat(70));
console.log('  QUANTUM BELL INEQUALITY & ENTANGLEMENT RESEARCH PLATFORM');
console.log('='.repeat(70));

// 1. Ideal Bell State |Phi+>
const rhoPhiPlus = STATES.rhoPhiPlus();
const theoIdeal = CHSHEngine.evaluateTheoretical(rhoPhiPlus);
const horoIdeal = horodeckiMaxCHSH(rhoPhiPlus);
const pptIdeal = pptNegativity(rhoPhiPlus);

console.log('\n[1] IDEAL QUANTUM BELL STATE |Phi+>');
console.log(`    Theoretical CHSH S: ${theoIdeal.S.toFixed(5)}`);
console.log(`    Horodecki S_max:     ${horoIdeal.sMax.toFixed(5)}`);
console.log(`    Tsirelson's Bound:   ${(2 * Math.SQRT2).toFixed(5)} (2 * sqrt(2))`);
console.log(`    Classical Limit:     2.00000`);
console.log(`    Violation %:         +${(((theoIdeal.S - 2.0) / 2.0) * 100).toFixed(2)}% above classical`);
console.log(`    PPT Negativity:      ${pptIdeal.negativity.toFixed(4)} (Entangled: ${pptIdeal.isEntangled})`);

// 2. Finite-Shot Monte Carlo Experiment (8192 shots)
console.log('\n[2] MONTE CARLO EXPERIMENT (N = 8192 shots)');
const expIdeal = CHSHEngine.runExperiment({
  state: rhoPhiPlus,
  shotsPerSetting: 2048
});
console.log(`    Measured S:          ${expIdeal.measuredS.toFixed(4)} +/- ${expIdeal.stdErr.toFixed(4)}`);
console.log(`    95% Conf. Interval:  [${expIdeal.ci95[0].toFixed(4)}, ${expIdeal.ci95[1].toFixed(4)}]`);
console.log(`    Z-Score (Sigma):     ${expIdeal.zScore.toFixed(2)} sigma above classical bound`);
console.log(`    p-value:             ${expIdeal.pValue.toExponential(3)}`);
console.log(`    5-Sigma Discovery:   ${expIdeal.isFiveSigmaDiscovery ? 'YES (Confirmed)' : 'No'}`);

// 3. Noisy Superconducting Hardware Simulation (IBM Eagle calibrated)
console.log('\n[3] NOISY REALISTIC HARDWARE (Calibrated IBM Eagle Transmon)');
const qpu = new MockQPU(HARDWARE_PRESETS.ibmEagleTypical);
const expNoisy = CHSHEngine.runExperiment({
  state: rhoPhiPlus,
  shotsPerSetting: 2048,
  noiseConfig: qpu.getNoiseConfig(),
  readoutNoiseModel: qpu.getReadoutNoiseModel()
});
console.log(`    Noisy Measured S:    ${expNoisy.measuredS.toFixed(4)} +/- ${expNoisy.stdErr.toFixed(4)}`);
console.log(`    Z-Score (Sigma):     ${expNoisy.zScore.toFixed(2)} sigma`);
console.log(`    Classical Violation: ${expNoisy.violatesClassical ? 'YES (Definitive Nonlocality)' : 'No'}`);

// 4. Werner State & Critical Depolarizing Threshold
console.log('\n[4] WERNER STATE DEPOLARIZING THRESHOLD ANALYSIS');
const boundaries = wernerBoundaries();
console.log(`    Critical Nonlocality p:   ${(boundaries.criticalDepolarizingNonlocality * 100).toFixed(3)}% (1 - 1/sqrt(2))`);
console.log(`    Critical Entanglement p:  ${(boundaries.criticalDepolarizingEntanglement * 100).toFixed(3)}% (2/3)`);
console.log(`    Observation: ${boundaries.gapRegionDescription}`);

console.log('\n' + '='.repeat(70));
console.log('Demo completed successfully.');
console.log('='.repeat(70));
