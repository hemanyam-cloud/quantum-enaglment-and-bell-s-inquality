/**
 * Comprehensive Benchmark Suite for Quantum Bell Experiments & Optimization Algorithms.
 */
import { STATES } from '../core/states.js';
import { horodeckiMaxCHSH } from '../core/horodecki.js';
import { CHSHEngine } from '../simulation/chsh_engine.js';
import { gridSearchOptimize } from '../optimization/grid_search.js';
import { differentialEvolutionOptimize } from '../optimization/differential_evolution.js';
import { spsaOptimize } from '../optimization/spsa.js';
import { bayesianOptimize } from '../optimization/bayesian_opt.js';
import { NoiseAdaptiveOptimizer } from '../optimization/adaptive_na_uao.js';
import { MockQPU, HARDWARE_PRESETS } from '../hardware/mock_qpu.js';
import { NoiseChannels } from '../noise/channels.js';
import { wernerBoundaries } from '../core/entanglement.js';

export class BenchmarkRunner {
  /**
   * Runs side-by-side comparison of all 7 algorithms on a specified state and noise model.
   */
  static runAlgorithmComparison({
    state = STATES.rhoPhiPlus(),
    noisePreset = HARDWARE_PRESETS.ibmEagleTypical,
    shotBudget = 4096
  } = {}) {
    const qpu = new MockQPU(noisePreset);
    const noiseConfig = qpu.getNoiseConfig();
    const readoutModel = qpu.getReadoutNoiseModel();

    // 1. Horodecki Analytical Benchmark (Ground truth upper bound for noisy state)
    const noisyState = NoiseChannels.compositeNoise(state, noiseConfig);
    const horodecki = horodeckiMaxCHSH(noisyState);

    // 2. Fixed-angle Baseline (Canonical 0, pi/2, pi/4, -pi/4)
    const fixedRun = CHSHEngine.runExperiment({
      state,
      angles: {
        thetaA: 0,
        thetaAPrime: Math.PI / 2,
        thetaB: Math.PI / 4,
        thetaBPrime: -Math.PI / 4
      },
      shotsPerSetting: Math.floor(shotBudget / 4),
      noiseConfig,
      readoutNoiseModel: readoutModel
    });

    // 3. Exhaustive Grid Search
    const gridRes = gridSearchOptimize(noisyState, { numSteps: 12 });

    // 4. Differential Evolution
    const deRes = differentialEvolutionOptimize(noisyState, {
      populationSize: 15,
      maxGenerations: 20
    });

    // 5. SPSA (Noisy stochastic approximation)
    const spsaRes = spsaOptimize(noisyState, {
      maxIterations: 30,
      shotsPerEvaluation: 512
    });

    // 6. Bayesian Optimization (GP-UCB)
    const bayesRes = bayesianOptimize(noisyState, {
      numIterations: 15,
      initialPoints: 5
    });

    // 7. Proposed Contribution: Noise-Adaptive & Uncertainty-Aware Optimizer (NA-UAO)
    const nauaoRes = NoiseAdaptiveOptimizer.runAdaptiveOptimization({
      state,
      noiseConfig,
      readoutNoiseModel: readoutModel,
      totalShotBudget: shotBudget
    });

    const results = [
      {
        algorithm: '1. Horodecki Analytical (Ground Truth)',
        sValue: horodecki.sMax,
        stdErr: 0.0,
        zScore: Infinity,
        evaluationsOrShots: 0,
        note: 'Exact algebraic maximum from density matrix'
      },
      {
        algorithm: '2. Fixed-Angle CHSH Baseline',
        sValue: fixedRun.measuredS,
        stdErr: fixedRun.stdErr,
        zScore: fixedRun.zScore,
        evaluationsOrShots: shotBudget,
        note: 'Standard textbook angles (0, 90, 45, -45 deg)'
      },
      {
        algorithm: '3. Exhaustive Grid Search',
        sValue: gridRes.optimalS,
        stdErr: null,
        zScore: null,
        evaluationsOrShots: gridRes.evaluations,
        note: 'Coarse 4D hypercube sampling'
      },
      {
        algorithm: '4. Differential Evolution',
        sValue: deRes.optimalS,
        stdErr: null,
        zScore: null,
        evaluationsOrShots: deRes.evaluations,
        note: 'Global stochastic population search'
      },
      {
        algorithm: '5. SPSA Optimizer',
        sValue: spsaRes.optimalS,
        stdErr: null,
        zScore: null,
        evaluationsOrShots: spsaRes.evaluations,
        note: '2-measurement gradient-free stochastic approximation'
      },
      {
        algorithm: '6. Bayesian Optimization (GP)',
        sValue: bayesRes.optimalS,
        stdErr: null,
        zScore: null,
        evaluationsOrShots: bayesRes.evaluations,
        note: 'Gaussian Process surrogate with UCB acquisition'
      },
      {
        algorithm: '7. Proposed NA-UAO (Novel Contribution)',
        sValue: nauaoRes.finalS,
        stdErr: nauaoRes.stdErr,
        zScore: nauaoRes.zScore,
        evaluationsOrShots: nauaoRes.totalShotsUsed,
        varianceReductionPct: nauaoRes.varianceReductionPct,
        note: 'Noise-adaptive angles + Neyman-optimal dynamic shot allocation'
      }
    ];

    return {
      hardwarePreset: noisePreset.name,
      totalShotBudget: shotBudget,
      algorithms: results,
      nauaoSummary: nauaoRes
    };
  }

  /**
   * Sweeps depolarizing noise p in [0, 0.40] to map the transition across Tsirelson and Bell limits.
   */
  static runDepolarizingSweep(steps = 15) {
    const sweepData = [];
    const baseState = STATES.rhoPhiPlus();
    const boundaries = wernerBoundaries();

    for (let i = 0; i < steps; i++) {
      const p = (i / (steps - 1)) * 0.40;
      const werner = STATES.wernerState(p);
      const horodecki = horodeckiMaxCHSH(werner);
      const fixed = CHSHEngine.evaluateTheoretical(werner);

      sweepData.push({
        depolarizingP: p,
        theoreticalMaxS: horodecki.sMax,
        fixedAngleS: fixed.S,
        classicalBound: 2.0,
        tsirelsonBound: 2 * Math.SQRT2,
        isBellNonlocal: horodecki.sMax > 2.0,
        isEntangled: p < boundaries.criticalDepolarizingEntanglement
      });
    }

    return sweepData;
  }
}
