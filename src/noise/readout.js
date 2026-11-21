/**
 * Measurement Readout Noise (POVM / classical assignment matrix) and Readout Mitigation.
 */

export class ReadoutNoiseModel {
  constructor({
    p0given1_A = 0.03, // Prob Alice measures 0 when state is 1
    p1given0_A = 0.01, // Prob Alice measures 1 when state is 0
    p0given1_B = 0.03, // Prob Bob measures 0 when state is 1
    p1given0_B = 0.01  // Prob Bob measures 1 when state is 0
  } = {}) {
    this.mA = [
      [1 - p1given0_A, p0given1_A],
      [p1given0_A, 1 - p0given1_A]
    ];
    this.mB = [
      [1 - p1given0_B, p0given1_B],
      [p1given0_B, 1 - p0given1_B]
    ];
    this.m2Q = this._kron2x2(this.mA, this.mB);
  }

  _kron2x2(A, B) {
    const res = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let i1 = 0; i1 < 2; i1++) {
      for (let j1 = 0; j1 < 2; j1++) {
        for (let i2 = 0; i2 < 2; i2++) {
          for (let j2 = 0; j2 < 2; j2++) {
            res[i1 * 2 + i2][j1 * 2 + j2] = A[i1][j1] * B[i2][j2];
          }
        }
      }
    }
    return res;
  }

  /**
   * Transforms true probabilities [P_00, P_01, P_10, P_11] into noisy observed probabilities.
   */
  applyToProbabilities(probs) {
    const pVec = [probs.P_pp, probs.P_pm, probs.P_mp, probs.P_mm];
    const noisyVec = [0, 0, 0, 0];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        noisyVec[i] += this.m2Q[i][j] * pVec[j];
      }
    }

    const P_pp = Math.max(0, noisyVec[0]);
    const P_pm = Math.max(0, noisyVec[1]);
    const P_mp = Math.max(0, noisyVec[2]);
    const P_mm = Math.max(0, noisyVec[3]);

    const sum = P_pp + P_pm + P_mp + P_mm;
    const norm = sum > 0 ? sum : 1;

    const norm_pp = P_pp / norm;
    const norm_pm = P_pm / norm;
    const norm_mp = P_mp / norm;
    const norm_mm = P_mm / norm;

    return {
      P_pp: norm_pp,
      P_pm: norm_pm,
      P_mp: norm_mp,
      P_mm: norm_mm,
      correlation: norm_pp + norm_mm - norm_pm - norm_mp
    };
  }

  /**
   * Applies readout error mitigation (matrix inversion with projection to probability simplex).
   */
  mitigateProbabilities(noisyProbs) {
    // Invert the 4x4 matrix using cofactor/Cramer or 2x2 inverse tensor product
    const invA = this._invert2x2(this.mA);
    const invB = this._invert2x2(this.mB);
    const inv2Q = this._kron2x2(invA, invB);

    const noisyVec = [noisyProbs.P_pp, noisyProbs.P_pm, noisyProbs.P_mp, noisyProbs.P_mm];
    let corrected = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        corrected[i] += inv2Q[i][j] * noisyVec[j];
      }
    }

    // Project onto probability simplex (clip negatives, normalize)
    let nonNeg = corrected.map(v => Math.max(0, v));
    let sum = nonNeg.reduce((a, b) => a + b, 0);
    if (sum === 0) nonNeg = [0.25, 0.25, 0.25, 0.25];
    else nonNeg = nonNeg.map(v => v / sum);

    return {
      P_pp: nonNeg[0],
      P_pm: nonNeg[1],
      P_mp: nonNeg[2],
      P_mm: nonNeg[3],
      correlation: nonNeg[0] + nonNeg[3] - nonNeg[1] - nonNeg[2]
    };
  }

  _invert2x2(m) {
    const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (Math.abs(det) < 1e-12) throw new Error('Singular readout matrix');
    return [
      [m[1][1] / det, -m[0][1] / det],
      [-m[1][0] / det, m[0][0] / det]
    ];
  }
}
