/**
 * Quantum CHSH Experiment Engine:
 * - Analytical evaluation
 * - Finite-shot Monte Carlo sampling
 * - Propagation of uncertainty & statistical hypothesis testing (Z-score, p-value)
 */
import { jointProbabilities } from '../core/observables.js';
import { STATES } from '../core/states.js';
import { NoiseChannels } from '../noise/channels.js';
import { ReadoutNoiseModel } from '../noise/readout.js';

// Standard error function approximation for p-value calculation
function erfc(x) {
  // Abramowitz and Stegun formula 7.1.26
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign === 1 ? 1 - y : 1 + y;
}

export function pValueFromZ(z) {
  if (z <= 0) return 0.5;
  if (z > 37) return 0.0; // numerical limit underflow
  return 0.5 * erfc(z / Math.SQRT2);
}

export class CHSHEngine {
  /**
   * Analytical evaluation of CHSH parameter S for given angles and density matrix.
   */
  static evaluateTheoretical(rho, angles = {
    thetaA: 0,
    thetaAPrime: Math.PI / 2,
    thetaB: Math.PI / 4,
    thetaBPrime: -Math.PI / 4,
    phiA: 0,
    phiAPrime: 0,
    phiB: 0,
    phiBPrime: 0
  }) {
    const phiA = angles.phiA || 0;
    const phiAPrime = angles.phiAPrime || 0;
    const phiB = angles.phiB || 0;
    const phiBPrime = angles.phiBPrime || 0;

    const res_ab = jointProbabilities(rho, angles.thetaA, phiA, angles.thetaB, phiB);
    const res_abPrime = jointProbabilities(rho, angles.thetaA, phiA, angles.thetaBPrime, phiBPrime);
    const res_aPrimeB = jointProbabilities(rho, angles.thetaAPrime, phiAPrime, angles.thetaB, phiB);
    const res_aPrimeBPrime = jointProbabilities(rho, angles.thetaAPrime, phiAPrime, angles.thetaBPrime, phiBPrime);

    const S = res_ab.correlation + res_abPrime.correlation + res_aPrimeB.correlation - res_aPrimeBPrime.correlation;

    return {
      S,
      correlations: {
        E_ab: res_ab.correlation,
        E_abPrime: res_abPrime.correlation,
        E_aPrimeB: res_aPrimeB.correlation,
        E_aPrimeBPrime: res_aPrimeBPrime.correlation
      },
      probabilities: {
        ab: res_ab,
        abPrime: res_abPrime,
        aPrimeB: res_aPrimeB,
        aPrimeBPrime: res_aPrimeBPrime
      },
      classicalBound: 2.0,
      tsirelsonBound: 2 * Math.SQRT2,
      violatesClassical: S > 2.0
    };
  }

  /**
   * Simulates finite-shot measurement of a single correlator using multinomial sampling.
   */
  static sampleCorrelator(probs, shots) {
    let countPP = 0, countPM = 0, countMP = 0, countMM = 0;

    const cdf1 = probs.P_pp;
    const cdf2 = cdf1 + probs.P_pm;
    const cdf3 = cdf2 + probs.P_mp;

    for (let i = 0; i < shots; i++) {
      const r = Math.random();
      if (r < cdf1) countPP++;
      else if (r < cdf2) countPM++;
      else if (r < cdf3) countMP++;
      else countMM++;
    }

    const nTotal = shots;
    const empCorr = (countPP + countMM - countPM - countMP) / nTotal;
    const variance = Math.max(0, (1 - empCorr * empCorr) / nTotal);
    const stdErr = Math.sqrt(variance);

    return {
      measuredCorrelation: empCorr,
      stdErr,
      variance,
      counts: { countPP, countPM, countMP, countMM },
      shots
    };
  }

  /**
   * Full experimental simulation with finite shots, noise channels, readout errors,
   * and statistical significance tests.
   */
  static runExperiment({
    state = STATES.rhoPhiPlus(),
    angles = {
      thetaA: 0,
      thetaAPrime: Math.PI / 2,
      thetaB: Math.PI / 4,
      thetaBPrime: -Math.PI / 4,
      phiA: 0,
      phiAPrime: 0,
      phiB: 0,
      phiBPrime: 0
    },
    shotsPerSetting = 2048,
    customShotAllocations = null, // e.g. [shots_ab, shots_abPrime, shots_aPrimeB, shots_aPrimeBPrime]
    noiseConfig = null,
    readoutNoiseModel = null
  } = {}) {
    // 1. Apply physical noise to state
    let noisyRho = state;
    if (noiseConfig) {
      noisyRho = NoiseChannels.compositeNoise(state, noiseConfig);
    }

    const phiA = angles.phiA || 0;
    const phiAPrime = angles.phiAPrime || 0;
    const phiB = angles.phiB || 0;
    const phiBPrime = angles.phiBPrime || 0;

    // 2. Compute true quantum probabilities
    let p_ab = jointProbabilities(noisyRho, angles.thetaA, phiA, angles.thetaB, phiB);
    let p_abPrime = jointProbabilities(noisyRho, angles.thetaA, phiA, angles.thetaBPrime, phiBPrime);
    let p_aPrimeB = jointProbabilities(noisyRho, angles.thetaAPrime, phiAPrime, angles.thetaB, phiB);
    let p_aPrimeBPrime = jointProbabilities(noisyRho, angles.thetaAPrime, phiAPrime, angles.thetaBPrime, phiBPrime);

    // 3. Apply readout noise if enabled
    if (readoutNoiseModel) {
      p_ab = readoutNoiseModel.applyToProbabilities(p_ab);
      p_abPrime = readoutNoiseModel.applyToProbabilities(p_abPrime);
      p_aPrimeB = readoutNoiseModel.applyToProbabilities(p_aPrimeB);
      p_aPrimeBPrime = readoutNoiseModel.applyToProbabilities(p_aPrimeBPrime);
    }

    // 4. Determine shot allocation
    const shots = customShotAllocations || [
      shotsPerSetting,
      shotsPerSetting,
      shotsPerSetting,
      shotsPerSetting
    ];

    // 5. Sample finite shots
    const sample_ab = this.sampleCorrelator(p_ab, shots[0]);
    const sample_abPrime = this.sampleCorrelator(p_abPrime, shots[1]);
    const sample_aPrimeB = this.sampleCorrelator(p_aPrimeB, shots[2]);
    const sample_aPrimeBPrime = this.sampleCorrelator(p_aPrimeBPrime, shots[3]);

    const measuredS =
      sample_ab.measuredCorrelation +
      sample_abPrime.measuredCorrelation +
      sample_aPrimeB.measuredCorrelation -
      sample_aPrimeBPrime.measuredCorrelation;

    const totalVariance =
      sample_ab.variance +
      sample_abPrime.variance +
      sample_aPrimeB.variance +
      sample_aPrimeBPrime.variance;

    const stdErr = Math.sqrt(totalVariance);

    // Statistical significance vs classical bound 2.0
    const zScore = (measuredS - 2.0) / (stdErr > 0 ? stdErr : 1e-9);
    const pValue = pValueFromZ(zScore);

    // Confidence intervals
    const ci95 = [measuredS - 1.96 * stdErr, measuredS + 1.96 * stdErr];
    const ci99 = [measuredS - 2.576 * stdErr, measuredS + 2.576 * stdErr];

    // Theoretical noise-free target for comparison
    const theoretical = this.evaluateTheoretical(state, angles);

    return {
      measuredS,
      stdErr,
      zScore,
      pValue,
      ci95,
      ci99,
      totalShots: shots.reduce((a, b) => a + b, 0),
      shotAllocations: shots,
      violatesClassical: measuredS - 2.0 > 3.0 * stdErr, // 3-sigma standard
      isFiveSigmaDiscovery: zScore >= 5.0,
      samples: {
        ab: sample_ab,
        abPrime: sample_abPrime,
        aPrimeB: sample_aPrimeB,
        aPrimeBPrime: sample_aPrimeBPrime
      },
      theoreticalNoiseFreeS: theoretical.S
    };
  }
}
