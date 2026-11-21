/**
 * Simultaneous Perturbation Stochastic Approximation (SPSA) Optimizer.
 * Standard quantum optimizer for noisy cost landscapes (Spall 1998).
 */
import { CHSHEngine } from '../simulation/chsh_engine.js';

export function spsaOptimize(rho, {
  maxIterations = 60,
  initialAngles = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4],
  a = 0.2, // Step magnitude
  cParam = 0.15, // Perturbation magnitude
  alpha = 0.602,
  gamma = 0.101,
  A = 10,
  noiseConfig = null,
  shotsPerEvaluation = 1024
} = {}) {
  let theta = [...initialAngles];
  let evaluations = 0;

  const cost = (vec) => {
    evaluations++;
    const angles = {
      thetaA: vec[0],
      thetaAPrime: vec[1],
      thetaB: vec[2],
      thetaBPrime: vec[3]
    };
    if (shotsPerEvaluation) {
      // Evaluate with finite-shot noise
      const res = CHSHEngine.runExperiment({
        state: rho,
        angles,
        shotsPerSetting: Math.floor(shotsPerEvaluation / 4),
        noiseConfig
      });
      return res.measuredS;
    }
    // Theoretical noise-free or analytical
    return CHSHEngine.evaluateTheoretical(rho, angles).S;
  };

  let bestS = cost(theta);
  let bestAngles = [...theta];
  const history = [{ iteration: 0, s: bestS }];

  for (let k = 0; k < maxIterations; k++) {
    const ak = a / Math.pow(k + 1 + A, alpha);
    const ck = cParam / Math.pow(k + 1, gamma);

    // Bernoulli perturbation vector: Delta_i in {-1, +1}
    const delta = theta.map(() => (Math.random() < 0.5 ? -1 : 1));

    const thetaPlus = theta.map((val, i) => val + ck * delta[i]);
    const thetaMinus = theta.map((val, i) => val - ck * delta[i]);

    const yPlus = cost(thetaPlus);
    const yMinus = cost(thetaMinus);

    // Stochastic gradient estimation (maximizing S)
    const gHat = delta.map((del) => (yPlus - yMinus) / (2 * ck * del));

    // Gradient ascent update
    theta = theta.map((val, i) => val + ak * gHat[i]);

    const currentS = cost(theta);
    if (currentS > bestS) {
      bestS = currentS;
      bestAngles = [...theta];
    }
    history.push({ iteration: k + 1, s: currentS });
  }

  return {
    method: 'SPSA Optimization',
    optimalS: bestS,
    optimalAngles: {
      thetaA: bestAngles[0],
      thetaAPrime: bestAngles[1],
      thetaB: bestAngles[2],
      thetaBPrime: bestAngles[3]
    },
    evaluations,
    iterations: maxIterations,
    history
  };
}
