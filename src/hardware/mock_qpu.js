/**
 * Mock QPU Hardware Emulator:
 * Calibrated against real superconducting transmon characteristics
 * (e.g. IBM Quantum Eagle / Falcon backends).
 */
import { ReadoutNoiseModel } from '../noise/readout.js';

export const HARDWARE_PRESETS = {
  // Near-ideal simulator
  idealSimulator: {
    name: 'Ideal Statevector Simulator',
    depolarizingP: 0.0,
    amplitudeDampingGamma: 0.0,
    phaseDampingLambda: 0.0,
    readoutP0given1: 0.0,
    readoutP1given0: 0.0,
    cnotError: 0.0
  },

  // State of the art NISQ device (e.g. IBM Eagle r3)
  ibmEagleTypical: {
    name: 'IBM Quantum Eagle (Calibrated Presets)',
    depolarizingP: 0.035,
    amplitudeDampingGamma: 0.020, // T1 ~ 180 us over circuit duration
    phaseDampingLambda: 0.025,   // T2 ~ 130 us
    readoutP0given1: 0.028,      // 2.8% readout error
    readoutP1given0: 0.012,      // 1.2% readout error
    cnotError: 0.008             // 0.8% 2-qubit gate error
  },

  // High-noise noisy hardware regime
  noisyNISQ: {
    name: 'High-Noise NISQ Processor',
    depolarizingP: 0.12,
    amplitudeDampingGamma: 0.08,
    phaseDampingLambda: 0.10,
    readoutP0given1: 0.065,
    readoutP1given0: 0.040,
    cnotError: 0.035
  }
};

export class MockQPU {
  constructor(preset = HARDWARE_PRESETS.ibmEagleTypical) {
    this.preset = preset;
    this.readoutModel = new ReadoutNoiseModel({
      p0given1_A: preset.readoutP0given1,
      p1given0_A: preset.readoutP1given0,
      p0given1_B: preset.readoutP0given1,
      p1given0_B: preset.readoutP1given0
    });
  }

  getNoiseConfig() {
    return {
      depolarizingP: this.preset.depolarizingP + this.preset.cnotError,
      amplitudeDampingGamma: this.preset.amplitudeDampingGamma,
      phaseDampingLambda: this.preset.phaseDampingLambda
    };
  }

  getReadoutNoiseModel() {
    return this.readoutModel;
  }
}
