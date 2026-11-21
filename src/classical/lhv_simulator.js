/**
 * Classical Local Hidden Variable (LHV) Simulation.
 * Demonstrates Bell's Theorem: Any local realist theory satisfies |S| <= 2.
 */

export class ClassicalLHVSimulator {
  /**
   * Deterministic local hidden variable model:
   * Particle pair shares a hidden polarization angle lambda ~ Uniform[0, 2*pi).
   * Local deterministic detector response functions:
   * A(theta_a, lambda) = sign(cos(theta_a - lambda))
   * B(theta_b, lambda) = sign(cos(theta_b - lambda))
   */
  static sampleTrial(thetaA, thetaB, lambda) {
    const valA = Math.cos(thetaA - lambda) >= 0 ? 1 : -1;
    const valB = Math.cos(thetaB - lambda) >= 0 ? 1 : -1;
    return { outcomeA: valA, outcomeB: valB, product: valA * valB };
  }

  /**
   * Analytical correlation for standard classical model:
   * E_classical(theta_a, theta_b) = 1 - (2 / pi) * |theta_a - theta_b|
   */
  static analyticalCorrelation(thetaA, thetaB) {
    let diff = Math.abs(thetaA - thetaB) % (2 * Math.PI);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    return 1 - (2 / Math.PI) * diff;
  }

  /**
   * Runs Monte Carlo simulation of N trials for a specific angle pair under LHV.
   */
  static simulateCorrelator(thetaA, thetaB, numTrials = 25000) {
    let sumProduct = 0;
    let countPP = 0, countPM = 0, countMP = 0, countMM = 0;

    for (let i = 0; i < numTrials; i++) {
      const lambda = Math.random() * 2 * Math.PI;
      const { outcomeA, outcomeB, product } = this.sampleTrial(thetaA, thetaB, lambda);
      sumProduct += product;

      if (outcomeA === 1 && outcomeB === 1) countPP++;
      else if (outcomeA === 1 && outcomeB === -1) countPM++;
      else if (outcomeA === -1 && outcomeB === 1) countMP++;
      else countMM++;
    }

    const correlation = sumProduct / numTrials;
    const variance = (1 - correlation * correlation) / numTrials;

    return {
      correlation,
      stdErr: Math.sqrt(variance),
      counts: { countPP, countPM, countMP, countMM },
      numTrials
    };
  }

  /**
   * Simulates complete CHSH experiment under Local Hidden Variables.
   */
  static simulateCHSH(angles = {
    thetaA: 0,
    thetaAPrime: Math.PI / 2,
    thetaB: Math.PI / 4,
    thetaBPrime: -Math.PI / 4
  }, numTrialsPerSetting = 25000) {
    const res_ab = this.simulateCorrelator(angles.thetaA, angles.thetaB, numTrialsPerSetting);
    const res_abPrime = this.simulateCorrelator(angles.thetaA, angles.thetaBPrime, numTrialsPerSetting);
    const res_aPrimeB = this.simulateCorrelator(angles.thetaAPrime, angles.thetaB, numTrialsPerSetting);
    const res_aPrimeBPrime = this.simulateCorrelator(angles.thetaAPrime, angles.thetaBPrime, numTrialsPerSetting);

    // CHSH parameter S = E(a, b) + E(a, b') + E(a', b) - E(a', b')
    const S = res_ab.correlation + res_abPrime.correlation + res_aPrimeB.correlation - res_aPrimeBPrime.correlation;
    const stdErr = Math.sqrt(
      res_ab.stdErr ** 2 +
      res_abPrime.stdErr ** 2 +
      res_aPrimeB.stdErr ** 2 +
      res_aPrimeBPrime.stdErr ** 2
    );

    // Analytical LHV value
    const sAnalytical =
      this.analyticalCorrelation(angles.thetaA, angles.thetaB) +
      this.analyticalCorrelation(angles.thetaA, angles.thetaBPrime) +
      this.analyticalCorrelation(angles.thetaAPrime, angles.thetaB) -
      this.analyticalCorrelation(angles.thetaAPrime, angles.thetaBPrime);

    return {
      type: 'Classical Local Hidden Variable (LHV)',
      measuredS: S,
      stdErr,
      analyticalS: sAnalytical,
      classicalBound: 2.0,
      violatesClassicalBound: S > 2.0,
      totalTrials: numTrialsPerSetting * 4,
      settings: {
        E_ab: res_ab.correlation,
        E_abPrime: res_abPrime.correlation,
        E_aPrimeB: res_aPrimeB.correlation,
        E_aPrimeBPrime: res_aPrimeBPrime.correlation
      }
    };
  }
}
