/**
 * Exhaustive Grid Search Optimizer for CHSH measurement angles.
 */
import { CHSHEngine } from '../simulation/chsh_engine.js';

export function gridSearchOptimize(rho, {
  numSteps = 16,
  thetaMin = 0,
  thetaMax = Math.PI
} = {}) {
  const stepSize = (thetaMax - thetaMin) / (numSteps - 1);
  let bestS = -Infinity;
  let bestAngles = null;
  let evaluations = 0;

  // Search over theta_a, theta_aPrime, theta_b, theta_bPrime
  // In typical CHSH, theta_a can be anchored at 0 without loss of generality
  const thetaA = 0;

  for (let i2 = 0; i2 < numSteps; i2++) {
    const thetaAPrime = thetaMin + i2 * stepSize;
    for (let i3 = 0; i3 < numSteps; i3++) {
      const thetaB = thetaMin + i3 * stepSize;
      for (let i4 = 0; i4 < numSteps; i4++) {
        const thetaBPrime = thetaMin + i4 * stepSize;
        evaluations++;

        const angles = { thetaA, thetaAPrime, thetaB, thetaBPrime };
        const res = CHSHEngine.evaluateTheoretical(rho, angles);

        if (res.S > bestS) {
          bestS = res.S;
          bestAngles = { ...angles };
        }
      }
    }
  }

  return {
    method: 'Exhaustive Grid Search',
    optimalS: bestS,
    optimalAngles: bestAngles,
    evaluations,
    stepSize
  };
}
