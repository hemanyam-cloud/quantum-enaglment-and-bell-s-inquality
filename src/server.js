/**
 * Quantum Bell Platform - Backend HTTP Server & REST API
 * Zero external dependencies (uses Node.js native http, fs, and path modules).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Complex, c } from './core/complex.js';
import { Matrix } from './core/matrix.js';
import { STATES } from './core/states.js';
import { horodeckiMaxCHSH } from './core/horodecki.js';
import { pptNegativity, wernerBoundaries, wernerConcurrence } from './core/entanglement.js';
import { NoiseChannels } from './noise/channels.js';
import { ReadoutNoiseModel } from './noise/readout.js';
import { ClassicalLHVSimulator } from './classical/lhv_simulator.js';
import { CHSHEngine } from './simulation/chsh_engine.js';
import { QuantumCircuitSimulator } from './simulation/circuit_sim.js';
import { gridSearchOptimize } from './optimization/grid_search.js';
import { differentialEvolutionOptimize } from './optimization/differential_evolution.js';
import { spsaOptimize } from './optimization/spsa.js';
import { bayesianOptimize } from './optimization/bayesian_opt.js';
import { NoiseAdaptiveOptimizer } from './optimization/adaptive_na_uao.js';
import { BenchmarkRunner } from './benchmarks/benchmark_runner.js';
import { MockQPU, HARDWARE_PRESETS } from './hardware/mock_qpu.js';
import { ReportGenerator } from './report/report_generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Request entity too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload);
}

function resolveState(stateType, alpha = Math.PI / 4, phi = 0, depolarizingP = 0) {
  switch (stateType) {
    case 'phiMinus': return STATES.rhoPhiMinus();
    case 'psiPlus': return STATES.rhoPsiPlus();
    case 'psiMinus': return STATES.rhoPsiMinus();
    case 'werner': return STATES.wernerState(depolarizingP);
    case 'generalized': {
      const vec = STATES.generalizedAlphaPhi(alpha, phi);
      return Matrix.fromStateVector(vec);
    }
    case 'phiPlus':
    default:
      return STATES.rhoPhiPlus();
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res, reqPath) {
  let safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\' || safePath === '') safePath = '/index.html';

  let filePath = path.join(ROOT_DIR, safePath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${err.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // 1. Status API
    if (pathname === '/api/status' && req.method === 'GET') {
      return sendJSON(res, 200, {
        status: 'online',
        version: '1.0.0',
        nodeVersion: process.version,
        availableStates: ['phiPlus', 'phiMinus', 'psiPlus', 'psiMinus', 'werner', 'generalized'],
        algorithms: [
          'Horodecki Analytical',
          'Fixed-Angle Baseline',
          'Exhaustive Grid Search',
          'Differential Evolution',
          'SPSA Optimization',
          'Bayesian Optimization (GP)',
          'NA-UAO (Neyman Adaptive)'
        ],
        hardwarePresets: Object.keys(HARDWARE_PRESETS)
      });
    }

    // 2. Evaluate Experiment API
    if (pathname === '/api/evaluate' && req.method === 'POST') {
      const body = await parseBody(req);
      const stateType = body.stateType || 'phiPlus';
      const alpha = typeof body.alpha === 'number' ? body.alpha : Math.PI / 4;
      const phi = typeof body.phi === 'number' ? body.phi : 0;
      const depolarizingP = typeof body.depolarizingP === 'number' ? body.depolarizingP : 0;

      const baseRho = resolveState(stateType, alpha, phi, depolarizingP);

      const noiseConfig = {
        depolarizingP: stateType === 'werner' ? 0 : depolarizingP,
        amplitudeDampingGamma: typeof body.amplitudeDampingGamma === 'number' ? body.amplitudeDampingGamma : 0,
        phaseDampingLambda: typeof body.phaseDampingLambda === 'number' ? body.phaseDampingLambda : 0,
        bitFlipP: typeof body.bitFlipP === 'number' ? body.bitFlipP : 0
      };

      let readoutModel = null;
      if (body.readoutError && body.readoutError > 0) {
        readoutModel = new ReadoutNoiseModel({
          p0given1_A: body.readoutError,
          p1given0_A: body.readoutError * 0.5,
          p0given1_B: body.readoutError,
          p1given0_B: body.readoutError * 0.5
        });
      }

      const angles = {
        thetaA: typeof body.thetaA === 'number' ? body.thetaA : 0,
        thetaAPrime: typeof body.thetaAPrime === 'number' ? body.thetaAPrime : Math.PI / 2,
        thetaB: typeof body.thetaB === 'number' ? body.thetaB : Math.PI / 4,
        thetaBPrime: typeof body.thetaBPrime === 'number' ? body.thetaBPrime : -Math.PI / 4,
        phiA: body.phiA || 0,
        phiAPrime: body.phiAPrime || 0,
        phiB: body.phiB || 0,
        phiBPrime: body.phiBPrime || 0
      };

      const shots = typeof body.shots === 'number' ? body.shots : 2048;

      let result;
      if (shots === 0) {
        // Analytical calculation
        const noisyRho = NoiseChannels.compositeNoise(baseRho, noiseConfig);
        const theo = CHSHEngine.evaluateTheoretical(noisyRho, angles);
        result = {
          measuredS: theo.S,
          stdErr: 0,
          zScore: (theo.S - 2.0) > 0 ? Infinity : 0,
          pValue: (theo.S - 2.0) > 0 ? 0 : 0.5,
          ci95: [theo.S, theo.S],
          ci99: [theo.S, theo.S],
          totalShots: 0,
          violatesClassical: theo.S > 2.0,
          isFiveSigmaDiscovery: theo.S > 2.0,
          samples: {
            ab: { measuredCorrelation: theo.correlations.E_ab, counts: { countPP: 50, countPM: 0, countMP: 0, countMM: 50 } },
            abPrime: { measuredCorrelation: theo.correlations.E_abPrime, counts: { countPP: 50, countPM: 0, countMP: 0, countMM: 50 } },
            aPrimeB: { measuredCorrelation: theo.correlations.E_aPrimeB, counts: { countPP: 50, countPM: 0, countMP: 0, countMM: 50 } },
            aPrimeBPrime: { measuredCorrelation: theo.correlations.E_aPrimeBPrime, counts: { countPP: 0, countPM: 50, countMP: 50, countMM: 0 } }
          },
          theoreticalNoiseFreeS: CHSHEngine.evaluateTheoretical(baseRho, angles).S
        };
      } else {
        result = CHSHEngine.runExperiment({
          state: baseRho,
          angles,
          shotsPerSetting: Math.max(32, Math.floor(shots / 4)),
          noiseConfig,
          readoutNoiseModel: readoutModel
        });
      }

      // Density matrix metrics
      const noisyState = NoiseChannels.compositeNoise(baseRho, noiseConfig);
      const horodecki = horodeckiMaxCHSH(noisyState);
      const ppt = pptNegativity(noisyState);

      return sendJSON(res, 200, {
        experiment: result,
        horodecki: {
          sMax: horodecki.sMax,
          violatesCHSH: horodecki.violatesCHSH,
          eigenvalues: horodecki.eigenvalues
        },
        entanglement: {
          pptNegativity: ppt.negativity,
          logNegativity: ppt.logNegativity,
          isEntangled: ppt.isEntangled,
          wernerConcurrence: stateType === 'werner' ? wernerConcurrence(depolarizingP) : null
        },
        tsirelsonBound: 2 * Math.SQRT2,
        classicalBound: 2.0
      });
    }

    // 3. Classical Local Hidden Variable (LHV) Simulation API
    if (pathname === '/api/lhv' && req.method === 'POST') {
      const body = await parseBody(req);
      const trials = typeof body.trials === 'number' ? body.trials : 25000;
      const angles = {
        thetaA: typeof body.thetaA === 'number' ? body.thetaA : 0,
        thetaAPrime: typeof body.thetaAPrime === 'number' ? body.thetaAPrime : Math.PI / 2,
        thetaB: typeof body.thetaB === 'number' ? body.thetaB : Math.PI / 4,
        thetaBPrime: typeof body.thetaBPrime === 'number' ? body.thetaBPrime : -Math.PI / 4
      };

      const result = ClassicalLHVSimulator.simulateCHSH(angles, Math.floor(trials / 4));
      return sendJSON(res, 200, result);
    }

    // 4. Optimization API
    if (pathname === '/api/optimize' && req.method === 'POST') {
      const body = await parseBody(req);
      const method = body.method || 'nauao';
      const stateType = body.stateType || 'phiPlus';
      const depolarizingP = typeof body.depolarizingP === 'number' ? body.depolarizingP : 0.05;
      const shotBudget = typeof body.shotBudget === 'number' ? body.shotBudget : 4096;

      const baseRho = resolveState(stateType, Math.PI / 4, 0, depolarizingP);
      const noiseConfig = {
        depolarizingP,
        amplitudeDampingGamma: typeof body.amplitudeDampingGamma === 'number' ? body.amplitudeDampingGamma : 0.02,
        phaseDampingLambda: typeof body.phaseDampingLambda === 'number' ? body.phaseDampingLambda : 0.02
      };

      let optResult;
      const noisyRho = NoiseChannels.compositeNoise(baseRho, noiseConfig);

      if (method === 'grid') {
        optResult = gridSearchOptimize(noisyRho, { numSteps: 12 });
      } else if (method === 'de') {
        optResult = differentialEvolutionOptimize(noisyRho, { populationSize: 15, maxGenerations: 20 });
      } else if (method === 'spsa') {
        optResult = spsaOptimize(noisyRho, { maxIterations: 30, shotsPerEvaluation: 512 });
      } else if (method === 'bayes') {
        optResult = bayesianOptimize(noisyRho, { numIterations: 15, initialPoints: 5 });
      } else if (method === 'horodecki') {
        const h = horodeckiMaxCHSH(noisyRho);
        optResult = {
          method: 'Horodecki Analytical (Closed Form)',
          optimalS: h.sMax,
          evaluations: 0,
          eigenvalues: h.eigenvalues
        };
      } else {
        // Default: Proposed NA-UAO
        optResult = NoiseAdaptiveOptimizer.runAdaptiveOptimization({
          state: baseRho,
          noiseConfig,
          totalShotBudget: shotBudget
        });
      }

      return sendJSON(res, 200, optResult);
    }

    // 5. Benchmark Comparison API (All 7 Algorithms)
    if (pathname === '/api/benchmarks' && req.method === 'POST') {
      const body = await parseBody(req);
      const presetName = body.preset || 'ibmEagleTypical';
      const preset = HARDWARE_PRESETS[presetName] || HARDWARE_PRESETS.ibmEagleTypical;
      const shotBudget = body.shotBudget || 4096;

      const comparison = BenchmarkRunner.runAlgorithmComparison({
        noisePreset: preset,
        shotBudget
      });

      return sendJSON(res, 200, comparison);
    }

    // 6. Parameter Sweep API
    if (pathname === '/api/sweep' && req.method === 'POST') {
      const body = await parseBody(req);
      const steps = typeof body.steps === 'number' ? body.steps : 20;
      const sweep = BenchmarkRunner.runDepolarizingSweep(steps);
      const boundaries = wernerBoundaries();
      return sendJSON(res, 200, {
        sweep,
        boundaries
      });
    }

    // 7. OpenQASM Generator API
    if (pathname === '/api/openqasm' && req.method === 'POST') {
      const body = await parseBody(req);
      const qasm2 = QuantumCircuitSimulator.toOpenQASM2(body);
      const qasm3 = QuantumCircuitSimulator.toOpenQASM3(body);
      return sendJSON(res, 200, { qasm2, qasm3 });
    }

    // 8. Generate Report API
    if (pathname === '/api/report' && req.method === 'POST') {
      const body = await parseBody(req);
      const comparison = BenchmarkRunner.runAlgorithmComparison({
        noisePreset: HARDWARE_PRESETS.ibmEagleTypical,
        shotBudget: 4096
      });
      const sweep = BenchmarkRunner.runDepolarizingSweep(15);
      const md = ReportGenerator.generateMarkdownReport(comparison, sweep, null);
      return sendJSON(res, 200, { markdown: md });
    }

    // Fallback: Static File Server
    if (req.method === 'GET') {
      return serveStatic(req, res, pathname);
    }

    sendJSON(res, 404, { error: 'Endpoint not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJSON(res, 500, { error: err.message, stack: err.stack });
  }
});

server.listen(PORT, () => {
  console.log(`[QuantumBellPlatform] Backend server running on http://localhost:${PORT}`);
});

export { server };
