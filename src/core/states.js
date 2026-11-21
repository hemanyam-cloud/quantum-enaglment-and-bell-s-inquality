/**
 * Pure and mixed quantum states: Bell states, generalized alpha-phi states, Werner states.
 */
import { Complex, c } from './complex.js';
import { Matrix } from './matrix.js';

export const BASIS = {
  K00: [c(1), c(0), c(0), c(0)],
  K01: [c(0), c(1), c(0), c(0)],
  K10: [c(0), c(0), c(1), c(0)],
  K11: [c(0), c(0), c(0), c(1)]
};

const INV_SQRT2 = 1 / Math.SQRT2;

export const STATES = {
  // Bell state |Phi+> = (|00> + |11>) / sqrt(2)
  phiPlus: () => [c(INV_SQRT2), c(0), c(0), c(INV_SQRT2)],

  // Bell state |Phi-> = (|00> - |11>) / sqrt(2)
  phiMinus: () => [c(INV_SQRT2), c(0), c(0), c(-INV_SQRT2)],

  // Bell state |Psi+> = (|01> + |10>) / sqrt(2)
  psiPlus: () => [c(0), c(INV_SQRT2), c(INV_SQRT2), c(0)],

  // Bell state |Psi-> = (|01> - |10>) / sqrt(2)
  psiMinus: () => [c(0), c(INV_SQRT2), c(-INV_SQRT2), c(0)],

  // Generalized pure state: cos(alpha)|00> + e^(i*phi) * sin(alpha)|11>
  generalizedAlphaPhi: (alpha, phi = 0) => {
    return [
      c(Math.cos(alpha)),
      c(0),
      c(0),
      Complex.fromPolar(Math.sin(alpha), phi)
    ];
  },

  // Density matrix for Bell state |Phi+>
  rhoPhiPlus: () => Matrix.fromStateVector(STATES.phiPlus()),
  rhoPhiMinus: () => Matrix.fromStateVector(STATES.phiMinus()),
  rhoPsiPlus: () => Matrix.fromStateVector(STATES.psiPlus()),
  rhoPsiMinus: () => Matrix.fromStateVector(STATES.psiMinus()),

  // Werner state rho_W(p) = (1 - p)|Phi+><Phi+| + (p / 4) * I_4
  // p is depolarizing fraction: p in [0, 1]
  wernerState: (p = 0) => {
    const rhoPure = Matrix.fromStateVector(STATES.phiPlus());
    const identity = Matrix.identity(4);
    return rhoPure.scale(1 - p).add(identity.scale(p / 4));
  },

  // Generalized Werner-like state with any base state |psi>
  generalizedWerner: (psiVec, p = 0) => {
    const rhoPure = Matrix.fromStateVector(psiVec);
    const identity = Matrix.identity(4);
    return rhoPure.scale(1 - p).add(identity.scale(p / 4));
  }
};
