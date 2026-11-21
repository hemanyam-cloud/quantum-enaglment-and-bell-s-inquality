# Quantum Bell Platform
## Computational & Experimental Investigation of Quantum Entanglement, Bell’s Inequality Violation, and Noise-Adaptive Measurement Optimization

A research-grade computational quantum experimentation and benchmarking platform for investigating quantum nonlocality, simulating local hidden-variable (LHV) models, evaluating realistic NISQ noise, optimizing measurement configurations, and executing experiments on quantum hardware.

---

## 1. Key Capabilities

1. **State Preparation & Quantum States**:
   - Supports all 4 Bell states ($|\Phi^+\rangle, |\Phi^-\rangle, |\Psi^+\rangle, |\Psi^-\rangle$).
   - Generalized partially entangled states $|\psi(\alpha, \phi)\rangle = \cos\alpha|00\rangle + e^{i\phi}\sin\alpha|11\rangle$.
   - Werner mixed states $\rho_W(p) = (1-p)|\Phi^+\rangle\langle\Phi^+| + \frac{p}{4} I_4$.

2. **Entanglement vs. Nonlocality Quantification**:
   - Wootters Concurrence $C(\rho)$ and Peres-Horodecki (PPT) Negativity $\mathcal{N}(\rho)$.
   - Horodecki Criterion (1995): Exact analytical maximum $S_{\max}(\rho) = 2\sqrt{u_1 + u_2}$ from eigenvalues of $T^T T$.
   - Rigorous demonstration of the Werner gap: entanglement persists up to $p = 66.67\%$, while Bell nonlocality is destroyed at $p_{\text{critical}} = 29.29\%$.

3. **Realistic Hardware Noise Channels**:
   - Depolarizing channel (global and local).
   - Amplitude damping ($T_1$ energy relaxation).
   - Phase damping ($T_2^*$ pure dephasing).
   - Bit-flip and phase-flip channels.
   - Asymmetric measurement readout noise ($M_{\text{readout}}$ confusion matrix) and simplex-projected readout error mitigation.

4. **Classical Local Hidden Variable (LHV) Simulator**:
   - Monte Carlo simulation of deterministic and stochastic hidden variable theories proving $|S_{\text{LHV}}| \le 2.000$.

5. **Suite of 7 Optimization Algorithms**:
   - `1. Horodecki Analytical Benchmark` (Exact algebraic maximum).
   - `2. Fixed-Angle Baseline` (Textbook canonical angles $0, \pi/2, \pi/4, -\pi/4$).
   - `3. Exhaustive Grid Search` (4D hypercube angle parameter sweep).
   - `4. Differential Evolution` (Global population-based stochastic optimization).
   - `5. SPSA Optimizer` (Simultaneous Perturbation Stochastic Approximation).
   - `6. Bayesian Optimization` (Gaussian Process surrogate with UCB acquisition).
   - `7. Proposed Contribution: NA-UAO` (Noise-Adaptive & Uncertainty-Aware Optimizer with Neyman-optimal dynamic shot allocation).

6. **Hardware & OpenQASM Interoperability**:
   - Export to OpenQASM 2.0 and OpenQASM 3.0 circuits.
   - Python Qiskit adapters for execution on IBM Quantum QPUs (`ibm_brisbane`, `ibm_kyoto`, etc.) and Aer simulators.

7. **Automated Reporting & Artifacts**:
   - Automated generation of Markdown research reports, JSON, and CSV datasets.
   - Interactive visualizer and simulator dashboard.

---

## 2. Directory Structure

```
quantum-bell-platform/
├── package.json               # Platform configuration and npm scripts
├── README.md                  # Complete documentation and mathematical guide
├── index.html                 # Minimalist research dashboard frontend
├── src/
│   ├── index.js               # Library entry point
│   ├── server.js              # Native Node.js REST API & static file web server
│   ├── core/
│   │   ├── complex.js         # Complex number class and primitives
│   │   ├── matrix.js          # Kronecker product, partial trace/transpose, Jacobi eig
│   │   ├── states.js          # Bell states, generalized alpha-phi states, Werner states
│   │   ├── observables.js     # Bloch sphere Pauli measurement operators M(theta, phi)
│   │   ├── horodecki.js       # Horodecki analytical CHSH maximum & T-matrix eigenvalue solver
│   │   └── entanglement.js    # Concurrence, PPT negativity, Werner boundary analysis
│   ├── noise/
│   │   ├── channels.js        # Depolarizing, amplitude damping, phase damping channels
│   │   └── readout.js         # Readout assignment matrix & error mitigation
│   ├── classical/
│   │   └── lhv_simulator.js   # Local Hidden Variable simulation (proving |S| <= 2)
│   ├── simulation/
│   │   ├── chsh_engine.js     # Analytical & finite-shot sampling engine with Z-scores & p-values
│   │   └── circuit_sim.js     # Quantum circuit builder and OpenQASM 2.0/3.0 exporter
│   ├── optimization/
│   │   ├── grid_search.js     # Exhaustive 4D angle grid search
│   │   ├── differential_evolution.js # Population-based global search
│   │   ├── spsa.js            # Stochastic approximation for noisy functions
│   │   ├── bayesian_opt.js    # GP surrogate Bayesian optimization
│   │   └── adaptive_na_uao.js # Novel noise-adaptive & Neyman shot allocation optimizer
│   ├── hardware/
│   │   └── mock_qpu.js        # Superconducting transmon hardware presets (IBM Eagle)
│   ├── benchmarks/
│   │   └── benchmark_runner.js # Automated benchmark suite across algorithms & noise sweeps
│   └── report/
│       └── report_generator.js # Automated research report and CSV/JSON export
├── scripts/
│   ├── test_pipeline.js       # End-to-end 3-cycle pipeline verification test
│   ├── run_chsh_demo.js       # Basic demonstration and statistical validation
│   ├── run_classical_lhv.js   # 100,000 trials classical LHV simulation
│   ├── run_benchmarks.js      # Benchmarks comparing all 7 algorithms
│   └── generate_report.js     # Runs benchmarks and outputs Markdown research report
├── python/
│   ├── requirements.txt       # Dependencies: qiskit, qiskit-aer, numpy, scipy
│   ├── bell_chsh_qiskit.py    # Python Qiskit execution script for real QPU / Aer
│   └── adaptive_opt_qiskit.py # Python implementation of the adaptive shot allocation
├── data/                      # Generated experimental datasets (JSON & CSV)
└── reports/                   # Generated research reports (Markdown)
```

---

## 3. Quick Start & Execution

### Starting the Web Dashboard & REST API
```bash
# Starts the server on http://localhost:3000
npm start
```
Then navigate to `http://localhost:3000` in any web browser to interact with the full dashboard.

### Running End-to-End Pipeline Verification
```bash
# Executes 3 full verification cycles testing all API endpoints, physics bounds, and optimizations
npm run test:pipeline
```

### Running the Demonstrations (Node.js)
```bash
# Run the quantum Bell demonstration and statistical hypothesis testing
node scripts/run_chsh_demo.js

# Run the 100,000 trials classical Local Hidden Variable simulation
node scripts/run_classical_lhv.js

# Run the complete 7-algorithm benchmark suite and generate datasets
node scripts/run_benchmarks.js

# Generate the automated Markdown research report
node scripts/generate_report.js
```

### Running on IBM Quantum Hardware / Python
```bash
cd python
pip install -r requirements.txt
python bell_chsh_qiskit.py
```

---

## 4. Mathematical Summary

### CHSH Inequality
$$S = E(a, b) + E(a, b') + E(a', b) - E(a', b')$$

For ideal Bell state $|\Phi^+\rangle = \frac{|00\rangle + |11\rangle}{\sqrt{2}}$:
Using optimal Bloch angles:
- $\theta_a = 0$
- $\theta_{a'} = \frac{\pi}{2}$
- $\theta_b = \frac{\pi}{4}$
- $\theta_{b'} = -\frac{\pi}{4}$

$$S = \frac{1}{\sqrt{2}} + \frac{1}{\sqrt{2}} + \frac{1}{\sqrt{2}} - \left(-\frac{1}{\sqrt{2}}\right) = 2\sqrt{2} \approx 2.828427$$

### Proposed Novel Contribution: NA-UAO & Neyman Shot Allocation
Minimizes witness variance $\sigma_S^2 = \sum_{k=1}^4 \frac{1 - E_k^2}{N_k}$ subject to shot budget $\sum N_k = N_{\text{total}}$:

$$N_k^* = N_{\text{total}} \frac{\sqrt{1 - E_k^2}}{\sum_{j=1}^4 \sqrt{1 - E_j^2}}$$
