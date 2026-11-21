/**
 * Quantum gates, Bloch sphere observables, and measurement operators.
 */
import { Complex, c } from './complex.js';
import { Matrix } from './matrix.js';

export const PAULI = {
  I: new Matrix(2, 2, [
    [c(1), c(0)],
    [c(0), c(1)]
  ]),
  X: new Matrix(2, 2, [
    [c(0), c(1)],
    [c(1), c(0)]
  ]),
  Y: new Matrix(2, 2, [
    [c(0), c(0, -1)],
    [c(0, 1), c(0)]
  ]),
  Z: new Matrix(2, 2, [
    [c(1), c(0)],
    [c(0), c(-1)]
  ])
};

export const GATES = {
  // Hadamard gate
  H: new Matrix(2, 2, [
    [c(1 / Math.SQRT2), c(1 / Math.SQRT2)],
    [c(1 / Math.SQRT2), c(-1 / Math.SQRT2)]
  ]),

  // Rotation around Y axis: Ry(theta) = cos(theta/2) I - i*sin(theta/2) Y
  Ry: (theta) => {
    const c2 = Math.cos(theta / 2);
    const s2 = Math.sin(theta / 2);
    return new Matrix(2, 2, [
      [c(c2), c(-s2)],
      [c(s2), c(c2)]
    ]);
  },

  // Rotation around Z axis: Rz(phi) = diag(e^(-i*phi/2), e^(i*phi/2))
  Rz: (phi) => {
    return new Matrix(2, 2, [
      [Complex.fromPolar(1, -phi / 2), c(0)],
      [c(0), Complex.fromPolar(1, phi / 2)]
    ]);
  },

  // CNOT (controlled-X) gate on 2 qubits
  CNOT: new Matrix(4, 4, [
    [c(1), c(0), c(0), c(0)],
    [c(0), c(1), c(0), c(0)],
    [c(0), c(0), c(0), c(1)],
    [c(0), c(0), c(1), c(0)]
  ])
};

/**
 * Bloch sphere measurement observable:
 * M(theta, phi) = sin(theta)*cos(phi)*X + sin(theta)*sin(phi)*Y + cos(theta)*Z
 *
 * Matrix form:
 * [ cos(theta)                  sin(theta)*e^(-i*phi) ]
 * [ sin(theta)*e^(i*phi)       -cos(theta)            ]
 */
export function blochObservable(theta, phi = 0) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const offDiag = Complex.fromPolar(sinT, -phi);
  const offDiagConj = Complex.fromPolar(sinT, phi);

  return new Matrix(2, 2, [
    [c(cosT), offDiag],
    [offDiagConj, c(-cosT)]
  ]);
}

/**
 * Projectors for measurement outcome +/-1 along direction (theta, phi)
 * Pi_+ = (I + M) / 2
 * Pi_- = (I - M) / 2
 */
export function measurementProjectors(theta, phi = 0) {
  const M = blochObservable(theta, phi);
  const I = PAULI.I;
  const PiPlus = I.add(M).scale(0.5);
  const PiMinus = I.sub(M).scale(0.5);
  return { PiPlus, PiMinus };
}

/**
 * Theoretical expectation value Tr[rho * (A (x) B)]
 */
export function expectationValue(rho, obsA, obsB) {
  const jointObs = obsA.kron(obsB);
  const product = rho.mul(jointObs);
  return product.trace().re;
}

/**
 * Joint measurement probability distribution P(a, b) for outcomes (+, -)
 */
export function jointProbabilities(rho, thetaA, phiA, thetaB, phiB) {
  const projA = measurementProjectors(thetaA, phiA);
  const projB = measurementProjectors(thetaB, phiB);

  const P_pp = rho.mul(projA.PiPlus.kron(projB.PiPlus)).trace().re;
  const P_pm = rho.mul(projA.PiPlus.kron(projB.PiMinus)).trace().re;
  const P_mp = rho.mul(projA.PiMinus.kron(projB.PiPlus)).trace().re;
  const P_mm = rho.mul(projA.PiMinus.kron(projB.PiMinus)).trace().re;

  // Expected correlation E = P(++) + P(--) - P(+-) - P(-+)
  const E = P_pp + P_mm - P_pm - P_mp;

  return {
    P_pp: Math.max(0, Math.min(1, P_pp)),
    P_pm: Math.max(0, Math.min(1, P_pm)),
    P_mp: Math.max(0, Math.min(1, P_mp)),
    P_mm: Math.max(0, Math.min(1, P_mm)),
    correlation: E
  };
}
