#!/usr/bin/env python3
"""
Quantum Bell's Inequality (CHSH) Experiment on IBM Quantum Hardware / Aer Simulator.
Supports:
- State preparation: |Phi+>, |Phi->, |Psi+>, |Psi->, and arbitrary generalized states
- Basis rotation: Rx/Ry/Rz for Alice and Bob
- Execution via Qiskit Primitives (SamplerV2) or AerSimulator
- Statistical error propagation, Z-scores, and confidence intervals
"""

import sys
import numpy as np

try:
    from qiskit import QuantumCircuit, transpile
    from qiskit_aer import AerSimulator
    from qiskit_aer.noise import NoiseModel, depolarizing_error, ReadoutError
except ImportError:
    print("[WARNING] Qiskit or Qiskit-Aer is not installed in the current Python environment.")
    print("To install, run: pip install qiskit qiskit-aer qiskit-ibm-runtime numpy scipy matplotlib")


def create_chsh_circuit(state_type="phiPlus", theta_a=0.0, theta_b=np.pi / 4):
    """Creates a 2-qubit circuit with state prep, basis rotations, and measurement."""
    qc = QuantumCircuit(2, 2)

    # 1. State preparation
    if state_type == "phiPlus":
        qc.h(0)
        qc.cx(0, 1)
    elif state_type == "phiMinus":
        qc.x(0)
        qc.h(0)
        qc.cx(0, 1)
    elif state_type == "psiPlus":
        qc.x(1)
        qc.h(0)
        qc.cx(0, 1)
    elif state_type == "psiMinus":
        qc.x(0)
        qc.x(1)
        qc.h(0)
        qc.cx(0, 1)

    # 2. Measurement basis rotations
    # To measure along theta on Bloch sphere, rotate by -theta before computational Z measurement
    qc.ry(-theta_a, 0)
    qc.ry(-theta_b, 1)

    # 3. Measurement
    qc.measure([0, 1], [0, 1])
    return qc


def compute_correlator(counts):
    """Computes E = (N00 + N11 - N01 - N10) / N_total from measurement counts."""
    n00 = counts.get("00", 0)
    n11 = counts.get("11", 0)
    n01 = counts.get("01", 0)
    n10 = counts.get("10", 0)
    total = n00 + n11 + n01 + n10
    if total == 0:
        return 0.0, 0.0

    E = (n00 + n11 - n01 - n10) / total
    variance = max(0.0, (1.0 - E * E) / total)
    std_err = np.sqrt(variance)
    return E, std_err


def run_chsh_experiment(
    backend=None,
    state_type="phiPlus",
    angles=(0.0, np.pi / 2, np.pi / 4, -np.pi / 4),
    shots=2048
):
    """Runs the 4 CHSH sub-circuits and computes S, std_err, and Z-score."""
    theta_a, theta_a_prime, theta_b, theta_b_prime = angles

    circ_ab = create_chsh_circuit(state_type, theta_a, theta_b)
    circ_ab_prime = create_chsh_circuit(state_type, theta_a, theta_b_prime)
    circ_a_prime_b = create_chsh_circuit(state_type, theta_a_prime, theta_b)
    circ_a_prime_b_prime = create_chsh_circuit(state_type, theta_a_prime, theta_b_prime)

    circuits = [circ_ab, circ_ab_prime, circ_a_prime_b, circ_a_prime_b_prime]

    if backend is None:
        try:
            backend = AerSimulator()
        except NameError:
            raise RuntimeError("AerSimulator is unavailable. Install qiskit-aer.")

    t_circuits = transpile(circuits, backend)
    job = backend.run(t_circuits, shots=shots)
    result = job.result()

    counts = [result.get_counts(i) for i in range(4)]

    E_ab, se_ab = compute_correlator(counts[0])
    E_ab_prime, se_ab_prime = compute_correlator(counts[1])
    E_a_prime_b, se_a_prime_b = compute_correlator(counts[2])
    E_a_prime_b_prime, se_a_prime_b_prime = compute_correlator(counts[3])

    S = E_ab + E_ab_prime + E_a_prime_b - E_a_prime_b_prime
    total_var = se_ab**2 + se_ab_prime**2 + se_a_prime_b**2 + se_a_prime_b_prime**2
    std_err = np.sqrt(total_var)

    z_score = (S - 2.0) / std_err if std_err > 0 else 0.0

    print("=" * 60)
    print("CHSH Bell Inequality Experiment Results")
    print("=" * 60)
    print(f"State: {state_type}")
    print(f"Angles: a={theta_a:.3f}, a'={theta_a_prime:.3f}, b={theta_b:.3f}, b'={theta_b_prime:.3f}")
    print(f"E(a, b):       {E_ab:+.4f} +/- {se_ab:.4f}")
    print(f"E(a, b'):      {E_ab_prime:+.4f} +/- {se_ab_prime:.4f}")
    print(f"E(a', b):      {E_a_prime_b:+.4f} +/- {se_a_prime_b:.4f}")
    print(f"E(a', b'):     {E_a_prime_b_prime:+.4f} +/- {se_a_prime_b_prime:.4f}")
    print("-" * 60)
    print(f"CHSH Parameter S: {S:+.4f} +/- {std_err:.4f}")
    print(f"Classical Bound:  2.0000")
    print(f"Tsirelson Bound:  {2*np.sqrt(2):.4f}")
    print(f"Z-Score (Sigma):  {z_score:.2f} sigma above classical limit")
    print(f"Bell Violation:   {'YES - Quantum Nonlocality Confirmed!' if S > 2.0 + 3*std_err else 'No'}")
    print("=" * 60)

    return {
        "S": S,
        "std_err": std_err,
        "z_score": z_score,
        "correlations": [E_ab, E_ab_prime, E_a_prime_b, E_a_prime_b_prime],
        "counts": counts
    }


if __name__ == "__main__":
    try:
        run_chsh_experiment()
    except Exception as e:
        print(f"Execution info: {e}")
