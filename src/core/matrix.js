/**
 * Matrix operations for quantum state vectors and density matrices.
 */
import { Complex, c } from './complex.js';

export class Matrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    if (data) {
      this.data = data.map(row => row.map(v => (v instanceof Complex ? v : c(v))));
    } else {
      this.data = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Complex.zero())
      );
    }
  }

  static identity(n) {
    const m = new Matrix(n, n);
    for (let i = 0; i < n; i++) {
      m.data[i][i] = Complex.one();
    }
    return m;
  }

  static zeros(rows, cols) {
    return new Matrix(rows, cols);
  }

  get(r, cIdx) {
    return this.data[r][cIdx];
  }

  set(r, cIdx, val) {
    this.data[r][cIdx] = val instanceof Complex ? val : c(val);
  }

  clone() {
    const copy = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        copy.data[i][j] = this.data[i][j].clone();
      }
    }
    return copy;
  }

  add(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error(`Matrix dimension mismatch in add: (${this.rows}x${this.cols}) vs (${other.rows}x${other.cols})`);
    }
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j].add(other.data[i][j]);
      }
    }
    return res;
  }

  sub(other) {
    if (this.rows !== other.rows || this.cols !== other.cols) {
      throw new Error(`Matrix dimension mismatch in sub`);
    }
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j].sub(other.data[i][j]);
      }
    }
    return res;
  }

  scale(factor) {
    const comp = factor instanceof Complex ? factor : c(factor);
    const res = new Matrix(this.rows, this.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[i][j] = this.data[i][j].mul(comp);
      }
    }
    return res;
  }

  mul(other) {
    if (this.cols !== other.rows) {
      throw new Error(`Matrix dimension mismatch in mul: ${this.cols} !== ${other.rows}`);
    }
    const res = new Matrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = Complex.zero();
        for (let k = 0; k < this.cols; k++) {
          sum = sum.add(this.data[i][k].mul(other.data[k][j]));
        }
        res.data[i][j] = sum;
      }
    }
    return res;
  }

  dagger() {
    // Conjugate transpose
    const res = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[j][i] = this.data[i][j].conj();
      }
    }
    return res;
  }

  transpose() {
    const res = new Matrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        res.data[j][i] = this.data[i][j].clone();
      }
    }
    return res;
  }

  trace() {
    if (this.rows !== this.cols) throw new Error('Trace requires square matrix');
    let sum = Complex.zero();
    for (let i = 0; i < this.rows; i++) {
      sum = sum.add(this.data[i][i]);
    }
    return sum;
  }

  // Kronecker / Tensor product: A (x) B
  kron(other) {
    const res = new Matrix(this.rows * other.rows, this.cols * other.cols);
    for (let i1 = 0; i1 < this.rows; i1++) {
      for (let j1 = 0; j1 < this.cols; j1++) {
        const val1 = this.data[i1][j1];
        for (let i2 = 0; i2 < other.rows; i2++) {
          for (let j2 = 0; j2 < other.cols; j2++) {
            const val2 = other.data[i2][j2];
            res.data[i1 * other.rows + i2][j1 * other.cols + j2] = val1.mul(val2);
          }
        }
      }
    }
    return res;
  }

  // Partial trace over subsystem B for a 4x4 density matrix (qubits A and B, 2x2 each)
  partialTraceB() {
    if (this.rows !== 4 || this.cols !== 4) throw new Error('Requires 4x4 matrix');
    const res = new Matrix(2, 2);
    for (let a = 0; a < 2; a++) {
      for (let ap = 0; ap < 2; ap++) {
        let sum = Complex.zero();
        for (let b = 0; b < 2; b++) {
          const row = a * 2 + b;
          const col = ap * 2 + b;
          sum = sum.add(this.data[row][col]);
        }
        res.data[a][ap] = sum;
      }
    }
    return res;
  }

  // Partial transpose over subsystem B (for Peres-Horodecki PPT criterion)
  partialTransposeB() {
    if (this.rows !== 4 || this.cols !== 4) throw new Error('Requires 4x4 matrix');
    const res = new Matrix(4, 4);
    for (let a1 = 0; a1 < 2; a1++) {
      for (let b1 = 0; b1 < 2; b1++) {
        for (let a2 = 0; a2 < 2; a2++) {
          for (let b2 = 0; b2 < 2; b2++) {
            // (a1, b1; a2, b2) -> (a1, b2; a2, b1)
            const rowIn = a1 * 2 + b1;
            const colIn = a2 * 2 + b2;
            const rowOut = a1 * 2 + b2;
            const colOut = a2 * 2 + b1;
            res.data[rowOut][colOut] = this.data[rowIn][colIn].clone();
          }
        }
      }
    }
    return res;
  }

  // Helper to construct density matrix from state vector |psi> <psi|
  static fromStateVector(vec) {
    const dim = vec.length;
    const rho = new Matrix(dim, dim);
    for (let i = 0; i < dim; i++) {
      const vi = vec[i] instanceof Complex ? vec[i] : c(vec[i]);
      for (let j = 0; j < dim; j++) {
        const vj = vec[j] instanceof Complex ? vec[j] : c(vec[j]);
        rho.data[i][j] = vi.mul(vj.conj());
      }
    }
    return rho;
  }
}

/**
 * Real symmetric matrix diagonalization (Jacobi eigenvalue algorithm).
 * Suitable for 3x3 and 4x4 symmetric/Hermitian matrices.
 */
export function eigRealSymmetric(matData, maxIter = 100, tol = 1e-12) {
  const n = matData.length;
  // Deep copy into real array
  const A = matData.map(r => r.map(v => (v instanceof Complex ? v.re : Number(v))));
  const V = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let iter = 0; iter < maxIter; iter++) {
    // Find maximum off-diagonal element
    let maxOff = 0;
    let p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const absVal = Math.abs(A[i][j]);
        if (absVal > maxOff) {
          maxOff = absVal;
          p = i;
          q = j;
        }
      }
    }

    if (maxOff < tol) break;

    const diff = A[q][q] - A[p][p];
    let t;
    if (Math.abs(A[p][q]) < Math.abs(diff) * 1e-15) {
      t = A[p][q] / diff;
    } else {
      const phi = diff / (2 * A[p][q]);
      t = 1 / (Math.abs(phi) + Math.sqrt(phi * phi + 1));
      if (phi < 0) t = -t;
    }

    const cRot = 1 / Math.sqrt(t * t + 1);
    const sRot = t * cRot;
    const tau = sRot / (1 + cRot);

    const Apq = A[p][q];
    A[p][q] = 0;
    A[q][p] = 0;
    A[p][p] -= t * Apq;
    A[q][q] += t * Apq;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Aip = A[i][p];
        const Aiq = A[i][q];
        A[i][p] = Aip - sRot * (Aiq + tau * Aip);
        A[p][i] = A[i][p];
        A[i][q] = Aiq + sRot * (Aip - tau * Aiq);
        A[q][i] = A[i][q];
      }
    }

    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = Vip - sRot * (Viq + tau * Vip);
      V[i][q] = Viq + sRot * (Vip - tau * Viq);
    }
  }

  const eigenvalues = [];
  for (let i = 0; i < n; i++) {
    eigenvalues.push(A[i][i]);
  }

  // Sort descending
  const indices = eigenvalues.map((_, i) => i);
  indices.sort((a, b) => eigenvalues[b] - eigenvalues[a]);

  const sortedValues = indices.map(i => eigenvalues[i]);
  const sortedVectors = indices.map(col => V.map(row => row[col]));

  return { eigenvalues: sortedValues, eigenvectors: sortedVectors };
}
