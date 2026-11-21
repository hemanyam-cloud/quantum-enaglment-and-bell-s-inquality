/**
 * Quantum noise channels:
 * - Depolarizing noise
 * - Amplitude damping (T1 relaxation)
 * - Phase damping (pure dephasing T2*)
 * - Bit-flip and Phase-flip channels
 * - Coherent over-rotation errors
 */
import { Complex, c } from '../core/complex.js';
import { Matrix } from '../core/matrix.js';
import { PAULI } from '../core/observables.js';

export class NoiseChannels {
  /**
   * Applies Kraus operators {K_k} to density matrix rho:
   * E(rho) = sum_k K_k * rho * K_k^dagger
   */
  static applyKraus(rho, krausOps) {
    let result = Matrix.zeros(rho.rows, rho.cols);
    for (const K of krausOps) {
      const term = K.mul(rho).mul(K.dagger());
      result = result.add(term);
    }
    return result;
  }

  /**
   * Global 2-qubit depolarizing channel:
   * E(rho) = (1 - p) * rho + (p / 4) * I_4
   */
  static depolarizing(rho, p) {
    if (p <= 0) return rho.clone();
    if (p >= 1) return Matrix.identity(4).scale(0.25);
    return rho.scale(1 - p).add(Matrix.identity(4).scale(p / 4));
  }

  /**
   * Single-qubit depolarizing applied independently to both qubits:
   * Each qubit undergoes: E_1(rho) = (1 - p)*rho + (p/3)*(X rho X + Y rho Y + Z rho Z)
   */
  static localDepolarizing(rho, p) {
    if (p <= 0) return rho.clone();
    const paulis = [PAULI.I, PAULI.X, PAULI.Y, PAULI.Z];
    // Weights: I has 1 - 3p/4, X,Y,Z each have p/4
    const kraus1 = [
      PAULI.I.scale(Math.sqrt(1 - 0.75 * p)),
      PAULI.X.scale(Math.sqrt(p / 4)),
      PAULI.Y.scale(Math.sqrt(p / 4)),
      PAULI.Z.scale(Math.sqrt(p / 4))
    ];

    // 2-qubit Kraus operators = K_A (x) K_B (16 operators)
    const kraus2 = [];
    for (const ka of kraus1) {
      for (const kb of kraus1) {
        kraus2.push(ka.kron(kb));
      }
    }
    return this.applyKraus(rho, kraus2);
  }

  /**
   * Amplitude damping channel (modeling energy decay from |1> to |0>):
   * Single qubit Kraus:
   * K0 = [[1, 0], [0, sqrt(1 - gamma)]]
   * K1 = [[0, sqrt(gamma)], [0, 0]]
   */
  static amplitudeDamping(rho, gammaA, gammaB = gammaA) {
    const k0A = new Matrix(2, 2, [
      [c(1), c(0)],
      [c(0), c(Math.sqrt(Math.max(0, 1 - gammaA)))]
    ]);
    const k1A = new Matrix(2, 2, [
      [c(0), c(Math.sqrt(gammaA))],
      [c(0), c(0)]
    ]);

    const k0B = new Matrix(2, 2, [
      [c(1), c(0)],
      [c(0), c(Math.sqrt(Math.max(0, 1 - gammaB)))]
    ]);
    const k1B = new Matrix(2, 2, [
      [c(0), c(Math.sqrt(gammaB))],
      [c(0), c(0)]
    ]);

    const kraus = [
      k0A.kron(k0B),
      k0A.kron(k1B),
      k1A.kron(k0B),
      k1A.kron(k1B)
    ];

    return this.applyKraus(rho, kraus);
  }

  /**
   * Phase damping channel (pure dephasing, destroying coherence):
   * Single qubit Kraus:
   * K0 = [[1, 0], [0, sqrt(1 - lambda)]]
   * K1 = [[0, 0], [0, sqrt(lambda)]]
   */
  static phaseDamping(rho, lambdaA, lambdaB = lambdaA) {
    const k0A = new Matrix(2, 2, [
      [c(1), c(0)],
      [c(0), c(Math.sqrt(Math.max(0, 1 - lambdaA)))]
    ]);
    const k1A = new Matrix(2, 2, [
      [c(0), c(0)],
      [c(0), c(Math.sqrt(lambdaA))]
    ]);

    const k0B = new Matrix(2, 2, [
      [c(1), c(0)],
      [c(0), c(Math.sqrt(Math.max(0, 1 - lambdaB)))]
    ]);
    const k1B = new Matrix(2, 2, [
      [c(0), c(0)],
      [c(0), c(Math.sqrt(lambdaB))]
    ]);

    const kraus = [
      k0A.kron(k0B),
      k0A.kron(k1B),
      k1A.kron(k0B),
      k1A.kron(k1B)
    ];

    return this.applyKraus(rho, kraus);
  }

  /**
   * Bit-flip and Phase-flip noise:
   */
  static bitFlip(rho, p) {
    const k0 = PAULI.I.scale(Math.sqrt(1 - p));
    const k1 = PAULI.X.scale(Math.sqrt(p));
    const kraus = [
      k0.kron(k0),
      k0.kron(k1),
      k1.kron(k0),
      k1.kron(k1)
    ];
    return this.applyKraus(rho, kraus);
  }

  static phaseFlip(rho, p) {
    const k0 = PAULI.I.scale(Math.sqrt(1 - p));
    const k1 = PAULI.Z.scale(Math.sqrt(p));
    const kraus = [
      k0.kron(k0),
      k0.kron(k1),
      k1.kron(k0),
      k1.kron(k1)
    ];
    return this.applyKraus(rho, kraus);
  }

  /**
   * Comprehensive realistic composite noise model:
   * Combines depolarizing, dephasing, amplitude damping, and coherent gate errors.
   */
  static compositeNoise(rho, {
    depolarizingP = 0,
    amplitudeDampingGamma = 0,
    phaseDampingLambda = 0,
    bitFlipP = 0
  } = {}) {
    let current = rho.clone();
    if (depolarizingP > 0) current = this.depolarizing(current, depolarizingP);
    if (amplitudeDampingGamma > 0) current = this.amplitudeDamping(current, amplitudeDampingGamma);
    if (phaseDampingLambda > 0) current = this.phaseDamping(current, phaseDampingLambda);
    if (bitFlipP > 0) current = this.bitFlip(current, bitFlipP);
    return current;
  }
}
