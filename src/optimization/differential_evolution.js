/**
 * Differential Evolution (DE) optimizer for CHSH measurement angles.
 * Population-based stochastic global optimization algorithm.
 */
import { CHSHEngine } from '../simulation/chsh_engine.js';

export function differentialEvolutionOptimize(rho, {
  populationSize = 25,
  maxGenerations = 40,
  mutationFactor = 0.8,
  crossoverRate = 0.7,
  bounds = [
    [-Math.PI, Math.PI], // thetaA
    [-Math.PI, Math.PI], // thetaAPrime
    [-Math.PI, Math.PI], // thetaB
    [-Math.PI, Math.PI]  // thetaBPrime
  ]
} = {}) {
  const dim = bounds.length;

  // Initialize random population
  const population = Array.from({ length: populationSize }, () => {
    return bounds.map(([min, max]) => min + Math.random() * (max - min));
  });

  const evaluate = (vector) => {
    const angles = {
      thetaA: vector[0],
      thetaAPrime: vector[1],
      thetaB: vector[2],
      thetaBPrime: vector[3]
    };
    return CHSHEngine.evaluateTheoretical(rho, angles).S;
  };

  const fitness = population.map(v => evaluate(v));
  let evaluations = populationSize;

  let bestIndex = 0;
  for (let i = 1; i < populationSize; i++) {
    if (fitness[i] > fitness[bestIndex]) bestIndex = i;
  }

  let bestS = fitness[bestIndex];
  let bestVector = [...population[bestIndex]];

  for (let gen = 0; gen < maxGenerations; gen++) {
    for (let i = 0; i < populationSize; i++) {
      // Select 3 distinct individuals different from i
      const indices = [];
      while (indices.length < 3) {
        const randIdx = Math.floor(Math.random() * populationSize);
        if (randIdx !== i && !indices.includes(randIdx)) {
          indices.push(randIdx);
        }
      }
      const [r1, r2, r3] = indices;

      // Mutation: mutant = x_r1 + F * (x_r2 - x_r3)
      const mutant = [];
      const randJ = Math.floor(Math.random() * dim);
      for (let j = 0; j < dim; j++) {
        // Crossover
        if (Math.random() < crossoverRate || j === randJ) {
          let val = population[r1][j] + mutationFactor * (population[r2][j] - population[r3][j]);
          // Clip to bounds
          val = Math.max(bounds[j][0], Math.min(bounds[j][1], val));
          mutant.push(val);
        } else {
          mutant.push(population[i][j]);
        }
      }

      // Selection
      evaluations++;
      const mutantFitness = evaluate(mutant);
      if (mutantFitness > fitness[i]) {
        population[i] = mutant;
        fitness[i] = mutantFitness;
        if (mutantFitness > bestS) {
          bestS = mutantFitness;
          bestVector = [...mutant];
        }
      }
    }
  }

  return {
    method: 'Differential Evolution',
    optimalS: bestS,
    optimalAngles: {
      thetaA: bestVector[0],
      thetaAPrime: bestVector[1],
      thetaB: bestVector[2],
      thetaBPrime: bestVector[3]
    },
    evaluations,
    generations: maxGenerations
  };
}
