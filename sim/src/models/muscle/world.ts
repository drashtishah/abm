/** MuscleWorld — grid-based muscle development simulation with hormone diffusion. */
import { BaseWorld } from '../../framework/base-world.js';
import { createFiber, createHormoneGrid, resetIdCounter } from './agent.js';
import type { HormonePatch } from './agent.js';
import {
  performDailyActivity,
  liftWeights,
  sleepRecover,
  grow,
  regulateFiber,
  regulateHormones,
  computeMuscleMass,
  averageHormone,
} from './behaviors.js';

interface MuscleExtraState {
  hormones: HormonePatch[];
  /** Paired [anabolicRatio, catabolicRatio] per patch for two-channel rendering */
  patchRatios: Array<[number, number]>;
  patchGridSize: number;
}

function isMuscleState(s: unknown): s is MuscleExtraState {
  return s !== null && typeof s === 'object' && 'hormones' in s && 'patchRatios' in s;
}

export class MuscleWorld extends BaseWorld {
  setup(): void {
    resetIdCounter();
    this.agents = [];
    this.tick = 0;
    this.populationHistory = [];

    const gridSize = this.config['gridSize'] ?? 33;
    const width = this.config['width'] ?? 800;
    const height = this.config['height'] ?? 600;
    const slowTwitchPercent = this.config['slowTwitchPercent'] ?? 50;
    const rng = this.random.bind(this);

    // One fiber per grid cell (NetLogo: ask patches [ sprout-muscle-fibers 1 ])
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const fiber = createFiber(gx, gy, width, height, gridSize, slowTwitchPercent, rng);
        regulateFiber(fiber);
        this.agents.push(fiber);
      }
    }

    // Initialize hormone grid
    const hormones = createHormoneGrid(gridSize);

    // NetLogo: regulate-hormones during setup
    const patchRatios = regulateHormones(hormones, gridSize);

    this.extraState = {
      hormones,
      patchRatios,
      patchGridSize: gridSize,
    } satisfies MuscleExtraState;
  }

  step(): void {
    if (!isMuscleState(this.extraState)) return;

    const { hormones } = this.extraState;
    const gridSize = this.config['gridSize'] ?? 33;
    const intensity = this.config['intensity'] ?? 95;
    const hoursOfSleep = this.config['hoursOfSleep'] ?? 8;
    const daysBetweenWorkouts = this.config['daysBetweenWorkouts'] ?? 5;
    const lift = (this.config['lift'] ?? 1) === 1;
    const rng = this.random.bind(this);

    const alive = this.agents.filter(a => a.alive);

    // NetLogo go procedure order:
    // 1. perform-daily-activity
    performDailyActivity(alive, hormones, gridSize);

    // 2. if lift? and (ticks mod days-between-workouts = 0) [ lift-weights ]
    if (lift && this.tick % daysBetweenWorkouts === 0) {
      liftWeights(alive, hormones, gridSize, intensity, rng);
    }

    // 3. sleep
    sleepRecover(hormones, hoursOfSleep);

    // 4. regulate-hormones (diffuse + clamp)
    const patchRatios = regulateHormones(hormones, gridSize);

    // 5. develop-muscle (grow + regulate for each fiber)
    for (const fiber of alive) {
      grow(fiber, hormones, gridSize);
      regulateFiber(fiber);
    }

    // Update extra state with new ratios
    this.extraState.patchRatios = patchRatios;

    this.recordPopulation();
  }

  getPopulationCounts(): Record<string, number> {
    const muscleMass = computeMuscleMass(this.agents);
    if (isMuscleState(this.extraState)) {
      return {
        muscleMass,
        avgAnabolic: averageHormone(this.extraState.hormones, 'anabolic'),
        avgCatabolic: averageHormone(this.extraState.hormones, 'catabolic'),
      };
    }
    return { muscleMass, avgAnabolic: 0, avgCatabolic: 0 };
  }
}
