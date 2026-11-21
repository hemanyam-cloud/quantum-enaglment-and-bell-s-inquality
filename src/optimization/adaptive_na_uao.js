/**
 * Proposed Research Contribution:
 * Noise-Adaptive & Uncertainty-Aware Optimization (NA-UAO) with Neyman-Optimal Shot Allocation.
 *
 * Designed for resource-efficient detection of quantum nonlocality on noisy quantum hardware.
 */
import { CHSHEngine } from '../simulation/chsh_engine.js';
import { horodeckiMaxCHSH } from '../core/horodecki.js';

export class NoiseAdaptiveOptimizer {
  /**
   * Computes Neyman-optimal shot allocation given estimated correlators:
   * N_k = N_total * sqrt(1 - E_k^2) / sum_j sqrt(1 - E_j^2)
   */
  static computeNeymanShots(correlators, totalShots) {
    const stdDevs = correlators.map(E => Math.sqrt(Math.max(0.01, 1 - E * E)));
    const sumStd = stdDevs.reduce((a, b) => a + b, 0);

    const allocations = stdDevs.map(sd => Math.max(32, Math.round(totalShots * (sd / sumStd))));
    // Adjust remainder to ensure sum equals totalShots exactly
    const currentSum = allocations.reduce((a, b) => a + b, 0);
    allocations[0] += (totalShots - currentSum);

    return allocations;
  }

  /**
   * Runs the complete NA-UAO protocol:
   * Phase 1: Low-budget pilot exploration to profile noise and estimate gradient.
   * Phase 2: Adaptive measurement angle refinement under hardware noise.
   * Phase 3: Uncertainty-aware Neyman shot allocation and statistical verification.
   */
  static runAdaptiveOptimization({
    state,
    noiseConfig = null,
    readoutNoiseModel = null,
    totalShotBudget = 8192,
    pilotFraction = 0.15,
    targetSigma = 5.0, // 5-sigma discovery standard
    adaptationSteps = 8
  } = {}) {
    const pilotBudget = Math.floor(totalShotBudget * pilotFraction);
    const pilotShotsPerSetting = Math.max(32, Math.floor(pilotBudget / 4));
    let usedShots = 0;

    // Start with canonical Bell settings
    let angles = {
      thetaA: 0,
      thetaAPrime: Math.PI / 2,
      thetaB: Math.PI / 4,
      thetaBPrime: -Math.PI / 4
    };

    // --- Phase 1: Pilot profiling & initial correlation measurement ---
    const pilotRun = CHSHEngine.runExperiment({
      state,
      angles,
      shotsPerSetting: pilotShotsPerSetting,
      noiseConfig,
      readoutNoiseModel
    });
    usedShots += pilotRun.totalShots;

    let currentS = pilotRun.measuredS;
    let currentCorrs = [
      pilotRun.samples.ab.measuredCorrelation,
      pilotRun.samples.abPrime.measuredCorrelation,
      pilotRun.samples.aPrimeB.measuredCorrelation,
      pilotRun.samples.aPrimeBPrime.measuredCorrelation
    ];

    // --- Phase 2: Noise-Adaptive Angle Refinement ---
    // Fast coordinate ascent adjusting angles to compensate for asymmetric noise / phase drift
    const deltaTheta = 0.08; // Small angle perturbation
    const stepShots = Math.max(32, Math.floor((pilotBudget * 0.5) / (adaptationSteps * 2)));

    for (let step = 0; step < adaptationSteps; step++) {
      // Perturb thetaB and thetaBPrime to align with noisy Bloch state
      const candidateAngles = {
        ...angles,
        thetaB: angles.thetaB + (Math.random() - 0.5) * deltaTheta,
        thetaBPrime: angles.thetaBPrime + (Math.random() - 0.5) * deltaTheta
      };

      const testRun = CHSHEngine.runExperiment({
        state,
        angles: candidateAngles,
        shotsPerSetting: stepShots,
        noiseConfig,
        readoutNoiseModel
      });
      usedShots += testRun.totalShots;

      if (testRun.measuredS > currentS) {
        currentS = testRun.measuredS;
        angles = candidateAngles;
        currentCorrs = [
          testRun.samples.ab.measuredCorrelation,
          testRun.samples.abPrime.measuredCorrelation,
          testRun.samples.aPrimeB.measuredCorrelation,
          testRun.samples.aPrimeBPrime.measuredCorrelation
        ];
      }
    }

    // --- Phase 3: Neyman-Optimal Shot Allocation ---
    const remainingBudget = totalShotBudget - usedShots;
    const neymanAllocations = this.computeNeymanShots(currentCorrs, remainingBudget);

    const finalRun = CHSHEngine.runExperiment({
      state,
      angles,
      customShotAllocations: neymanAllocations,
      noiseConfig,
      readoutNoiseModel
    });
    usedShots += finalRun.totalShots;

    // Compare with what a standard uniform allocation would have achieved
    const uniformShotsPerSetting = Math.floor(totalShotBudget / 4);
    const uniformBaselineRun = CHSHEngine.runExperiment({
      state,
      angles: {
        thetaA: 0,
        thetaAPrime: Math.PI / 2,
        thetaB: Math.PI / 4,
        thetaBPrime: -Math.PI / 4
      },
      shotsPerSetting: uniformShotsPerSetting,
      noiseConfig,
      readoutNoiseModel
    });

    // Horodecki theoretical upper bound for benchmark
    const horodecki = horodeckiMaxCHSH(state);

    // Efficiency gain in variance reduction:
    const varianceReductionPct = Math.max(
      0,
      ((uniformBaselineRun.stdErr ** 2 - finalRun.stdErr ** 2) / (uniformBaselineRun.stdErr ** 2)) * 100
    );

    // Z-score improvement
    const zScoreImprovement = finalRun.zScore - uniformBaselineRun.zScore;

    return {
      method: 'Noise-Adaptive & Uncertainty-Aware Optimization (NA-UAO)',
      finalS: finalRun.measuredS,
      stdErr: finalRun.stdErr,
      zScore: finalRun.zScore,
      pValue: finalRun.pValue,
      ci95: finalRun.ci95,
      totalShotsUsed: usedShots,
      optimalAngles: angles,
      neymanAllocations,
      uniformBaseline: {
        s: uniformBaselineRun.measuredS,
        stdErr: uniformBaselineRun.stdErr,
        zScore: uniformBaselineRun.zScore,
        pValue: uniformBaselineRun.pValue
      },
      varianceReductionPct,
      zScoreImprovement,
      isFiveSigmaDiscovery: finalRun.zScore >= targetSigma,
      horodeckiSMax: horodecki.sMax
    };
  }
}
