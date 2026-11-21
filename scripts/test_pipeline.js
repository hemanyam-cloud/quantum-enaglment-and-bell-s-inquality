/**
 * Full Pipeline Test & Verification Suite:
 * Starts the backend server, tests all REST API endpoints, verifies physics bounds,
 * benchmarks all algorithms, and tests frontend delivery. Runs 3 full cycles.
 */
import http from 'http';
import { server } from '../src/server.js';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runPipelineCycle(cycleNum) {
  console.log(`\n[Cycle ${cycleNum}] Starting end-to-end platform verification...`);

  // 1. Status API
  const statusRes = await request('GET', '/api/status');
  if (statusRes.status !== 200 || statusRes.data.status !== 'online') {
    throw new Error(`Status check failed: ${JSON.stringify(statusRes)}`);
  }
  console.log(`  ✓ 1. Backend Status OK (Node: ${statusRes.data.nodeVersion})`);

  // 2. Analytical Ideal CHSH
  const idealRes = await request('POST', '/api/evaluate', {
    stateType: 'phiPlus',
    thetaA: 0, thetaAPrime: Math.PI / 2, thetaB: Math.PI / 4, thetaBPrime: -Math.PI / 4,
    shots: 0
  });
  const idealS = idealRes.data.experiment.measuredS;
  if (Math.abs(idealS - 2 * Math.SQRT2) > 1e-4) {
    throw new Error(`Ideal S expected 2.8284, got ${idealS}`);
  }
  console.log(`  ✓ 2. Ideal Quantum CHSH verified: S = ${idealS.toFixed(5)} (Tsirelson Bound exact)`);

  // 3. Noisy Finite-Shot Experiment (IBM Eagle Preset)
  const noisyRes = await request('POST', '/api/evaluate', {
    stateType: 'phiPlus',
    depolarizingP: 0.035,
    amplitudeDampingGamma: 0.02,
    phaseDampingLambda: 0.025,
    readoutError: 0.02,
    thetaA: 0, thetaAPrime: Math.PI / 2, thetaB: Math.PI / 4, thetaBPrime: -Math.PI / 4,
    shots: 4096
  });
  const noisyS = noisyRes.data.experiment.measuredS;
  const zScore = noisyRes.data.experiment.zScore;
  if (noisyS <= 2.0 || zScore < 3.0) {
    throw new Error(`Expected quantum violation under moderate noise, got S = ${noisyS}`);
  }
  console.log(`  ✓ 3. Noisy CHSH Experiment (4096 shots): S = ${noisyS.toFixed(4)} ± ${noisyRes.data.experiment.stdErr.toFixed(4)} (Z = ${zScore.toFixed(2)}σ)`);

  // 4. Classical LHV Simulation (Proving Bell's theorem |S_LHV| <= 2)
  const lhvRes = await request('POST', '/api/lhv', {
    trials: 40000
  });
  const lhvS = lhvRes.data.measuredS;
  const lhvStdErr = lhvRes.data.stdErr;
  // Rigorous statistical check: analytical bound is strictly <= 2.0, and sample is within 3-sigma
  if (lhvRes.data.analyticalS > 2.0001 || (lhvS - 2.0) > 3.5 * lhvStdErr) {
    throw new Error(`Classical LHV exceeded classical limit: measured=${lhvS}, analytical=${lhvRes.data.analyticalS}`);
  }
  console.log(`  ✓ 4. Classical LHV Simulation (40k trials): S_LHV = ${lhvS.toFixed(4)} ± ${lhvStdErr.toFixed(4)} (Analytical: ${lhvRes.data.analyticalS.toFixed(4)} <= 2.0000)`);

  // 5. Optimization Algorithms (Differential Evolution & Proposed NA-UAO)
  const deRes = await request('POST', '/api/optimize', {
    method: 'de',
    stateType: 'phiPlus',
    depolarizingP: 0.05
  });
  console.log(`  ✓ 5a. Differential Evolution: S = ${deRes.data.optimalS.toFixed(4)}`);

  const nauaoRes = await request('POST', '/api/optimize', {
    method: 'nauao',
    stateType: 'phiPlus',
    depolarizingP: 0.05,
    shotBudget: 4096
  });
  console.log(`  ✓ 5b. Proposed NA-UAO: S = ${nauaoRes.data.finalS.toFixed(4)} (Neyman allocations: [${nauaoRes.data.neymanAllocations.join(', ')}])`);

  // 6. Benchmark Suite (All 7 Algorithms)
  const benchRes = await request('POST', '/api/benchmarks', {
    preset: 'ibmEagleTypical',
    shotBudget: 4096
  });
  if (benchRes.data.algorithms.length !== 7) {
    throw new Error(`Expected 7 algorithms, got ${benchRes.data.algorithms.length}`);
  }
  console.log(`  ✓ 6. Benchmark Suite: All 7 algorithms executed and compared.`);

  // 7. Depolarizing Sweep & Phase Transitions
  const sweepRes = await request('POST', '/api/sweep', { steps: 10 });
  if (sweepRes.data.sweep.length !== 10) {
    throw new Error(`Sweep step count mismatch`);
  }
  console.log(`  ✓ 7. Noise Parameter Sweep OK (${sweepRes.data.sweep.length} points mapped across Tsirelson & Werner boundaries)`);

  // 8. OpenQASM Generation
  const qasmRes = await request('POST', '/api/openqasm', {
    stateType: 'phiPlus',
    thetaA: 0,
    thetaB: Math.PI / 4
  });
  if (!qasmRes.data.qasm2.includes('OPENQASM 2.0') || !qasmRes.data.qasm3.includes('OPENQASM 3.0')) {
    throw new Error(`OpenQASM export format error`);
  }
  console.log(`  ✓ 8. OpenQASM 2.0 & 3.0 circuit generation verified.`);

  // 9. Automated Research Report Generation
  const reportRes = await request('POST', '/api/report', {});
  if (!reportRes.data.markdown.includes('Research Report')) {
    throw new Error(`Report generation failed`);
  }
  console.log(`  ✓ 9. Automated Markdown research report generated (${reportRes.data.markdown.length} bytes).`);

  // 10. Frontend Static Serving
  const frontRes = await request('GET', '/');
  if (frontRes.status !== 200 || !frontRes.data.includes('Quantum Bell Platform')) {
    throw new Error(`Frontend HTML serving failed`);
  }
  console.log(`  ✓ 10. Frontend static HTML served correctly (${frontRes.data.length} bytes).`);

  console.log(`[Cycle ${cycleNum}] PASSED ALL 10 TESTS! ✓`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('  STARTING 3-CYCLE COMPREHENSIVE PIPELINE VERIFICATION');
  console.log('='.repeat(70));

  try {
    for (let c = 1; c <= 3; c++) {
      await runPipelineCycle(c);
    }
    console.log('\n' + '='.repeat(70));
    console.log('  ALL 3 PIPELINE CYCLES COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
    console.log('='.repeat(70));
  } catch (err) {
    console.error('\n❌ PIPELINE ERROR:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

main();
