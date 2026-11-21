/**
 * Horodecki Criterion (1995) for maximum CHSH violation of arbitrary 2-qubit states.
 * R. Horodecki, P. Horodecki, M. Horodecki, Phys. Lett. A 200, 340 (1995).
 */
import { PAULI } from './observables.js';
import { Matrix, eigRealSymmetric } from './matrix.js';

export function computeTMatrix(rho) {
  const paulis = [PAULI.X, PAULI.Y, PAULI.Z];
  const T = Array.from({ length: 3 }, () => Array(3).fill(0));

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const joint = paulis[i].kron(paulis[j]);
      const val = rho.mul(joint).trace().re;
      T[i][j] = val;
    }
  }

  return T;
}

/**
 * Computes the analytical maximum CHSH Bell parameter for any 2-qubit density matrix:
 * S_max = 2 * sqrt(u1 + u2) where u1, u2 are the two largest eigenvalues of T^T * T.
 */
export function horodeckiMaxCHSH(rho) {
  const T = computeTMatrix(rho);

  // Compute U = T^T * T (3x3 real symmetric)
  const U = Array.from({ length: 3 }, () => Array(3).fill(0));
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += T[k][i] * T[k][j]; // T^T * T
      }
      U[i][j] = sum;
    }
  }

  const { eigenvalues } = eigRealSymmetric(U);
  // Sort descending
  eigenvalues.sort((a, b) => b - a);

  const u1 = Math.max(0, eigenvalues[0]);
  const u2 = Math.max(0, eigenvalues[1]);
  const u3 = Math.max(0, eigenvalues[2]);

  const sMax = 2 * Math.sqrt(u1 + u2);
  const violatesCHSH = sMax > 2.0;

  return {
    TMatrix: T,
    eigenvalues: [u1, u2, u3],
    sMax,
    violatesCHSH,
    mQuantity: u1 + u2 // M(rho) = u1 + u2; Bell violation iff M(rho) > 1
  };
}
