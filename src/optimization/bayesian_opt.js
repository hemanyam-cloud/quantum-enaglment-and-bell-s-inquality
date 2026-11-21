/**
 * Bayesian Optimization with Gaussian Process (GP) Surrogate & UCB acquisition.
 * Efficient black-box optimization for finding optimal Bell measurement angles.
 */
import { CHSHEngine } from '../simulation/chsh_engine.js';

class SimpleGaussianProcess {
  constructor(lengthScale = 0.8, signalVariance = 1.0, noiseVariance = 0.01) {
    this.l = lengthScale;
    this.sigmaF2 = signalVariance;
    this.sigmaN2 = noiseVariance;
    this.X = [];
    this.y = [];
  }

  kernel(x1, x2) {
    let distSq = 0;
    for (let i = 0; i < x1.length; i++) {
      distSq += (x1[i] - x2[i]) ** 2;
    }
    return this.sigmaF2 * Math.exp(-distSq / (2 * this.l * this.l));
  }

  addObservation(x, yVal) {
    this.X.push(x);
    this.y.push(yVal);
  }

  predict(xNew) {
    const n = this.X.length;
    if (n === 0) return { mean: 2.0, std: 1.0 };

    // Compute K(X, X) + sigmaN2 * I
    const K = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => this.kernel(this.X[i], this.X[j]) + (i === j ? this.sigmaN2 : 0))
    );

    // K(X, xNew)
    const kStar = this.X.map(xi => this.kernel(xi, xNew));

    // Solve K * alpha = y (using simple Gaussian elimination with pivoting)
    const alpha = this._solveLinearSystem(K, this.y);

    // Mean = kStar^T * alpha
    let mean = 0;
    for (let i = 0; i < n; i++) {
      mean += kStar[i] * alpha[i];
    }

    // Variance = k(xNew, xNew) - kStar^T * K^-1 * kStar
    const v = this._solveLinearSystem(K, kStar);
    let varianceTerm = 0;
    for (let i = 0; i < n; i++) {
      varianceTerm += kStar[i] * v[i];
    }
    const variance = Math.max(1e-6, this.kernel(xNew, xNew) - varianceTerm);

    return { mean, std: Math.sqrt(variance) };
  }

  _solveLinearSystem(A_orig, b_orig) {
    const n = b_orig.length;
    const A = A_orig.map(row => [...row]);
    const b = [...b_orig];

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
      }
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
      [b[i], b[maxRow]] = [b[maxRow], b[i]];

      const diag = A[i][i] || 1e-9;
      for (let k = i + 1; k < n; k++) {
        const factor = A[k][i] / diag;
        for (let j = i; j < n; j++) {
          A[k][j] -= factor * A[i][j];
        }
        b[k] -= factor * b[i];
      }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = b[i];
      for (let j = i + 1; j < n; j++) {
        sum -= A[i][j] * x[j];
      }
      x[i] = sum / (A[i][i] || 1e-9);
    }
    return x;
  }
}

export function bayesianOptimize(rho, {
  numIterations = 25,
  initialPoints = 6,
  kappa = 2.0 // Exploration weight in UCB
} = {}) {
  const gp = new SimpleGaussianProcess(0.6, 1.0, 0.005);
  const bounds = [
    [-Math.PI / 2, Math.PI / 2],
    [0, Math.PI],
    [-Math.PI / 2, Math.PI / 2],
    [-Math.PI, 0]
  ];

  const evaluate = (vector) => {
    const angles = {
      thetaA: vector[0],
      thetaAPrime: vector[1],
      thetaB: vector[2],
      thetaBPrime: vector[3]
    };
    return CHSHEngine.evaluateTheoretical(rho, angles).S;
  };

  let bestS = -Infinity;
  let bestVector = null;
  let evaluations = 0;

  // Initial random / quasi-random sampling
  for (let i = 0; i < initialPoints; i++) {
    const pt = bounds.map(([min, max]) => min + Math.random() * (max - min));
    const sVal = evaluate(pt);
    evaluations++;
    gp.addObservation(pt, sVal);
    if (sVal > bestS) {
      bestS = sVal;
      bestVector = [...pt];
    }
  }

  // Active acquisition loop
  for (let iter = 0; iter < numIterations; iter++) {
    // Generate candidate points and evaluate UCB
    let bestUCB = -Infinity;
    let bestCandidate = null;

    const numCandidates = 40;
    for (let cIdx = 0; cIdx < numCandidates; cIdx++) {
      const candidate = bounds.map(([min, max]) => min + Math.random() * (max - min));
      const pred = gp.predict(candidate);
      const ucb = pred.mean + kappa * pred.std;
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestCandidate = candidate;
      }
    }

    const observedS = evaluate(bestCandidate);
    evaluations++;
    gp.addObservation(bestCandidate, observedS);

    if (observedS > bestS) {
      bestS = observedS;
      bestVector = [...bestCandidate];
    }
  }

  return {
    method: 'Bayesian Optimization (Gaussian Process)',
    optimalS: bestS,
    optimalAngles: {
      thetaA: bestVector[0],
      thetaAPrime: bestVector[1],
      thetaB: bestVector[2],
      thetaBPrime: bestVector[3]
    },
    evaluations,
    iterations: numIterations
  };
}
