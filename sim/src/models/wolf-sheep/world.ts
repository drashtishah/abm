import { BaseWorld } from '../../framework/base-world.js';
import type { Agent } from '../../framework/types.js';
import { log } from '../../framework/logger.js';
import { createWolf, createSheep, createGrassGrid, resetIdCounter } from './agent.js';
import type { GrassPatch } from './agent.js';
import {
  move,
  eatGrass,
  eatSheep,
  tryReproduce,
  death,
  growGrass,
} from './behaviors.js';

interface WolfSheepExtraState {
  grass: GrassPatch[];
}

function isWolfSheepState(s: unknown): s is WolfSheepExtraState {
  return s !== null && typeof s === 'object' && 'grass' in s;
}

// NetLogo Web uses 10000 as max-sheep cap
const MAX_SHEEP = 10000;

export class WolfSheepWorld extends BaseWorld {
  private nextId = 0;

  setup(): void {
    resetIdCounter();
    this.agents = [];

    const numWolves = this.config['initialWolves'] ?? 50;
    const numSheep = this.config['initialSheep'] ?? 100;
    const rng = this.random.bind(this);

    for (let i = 0; i < numWolves; i++) {
      this.agents.push(createWolf(this.config, rng));
    }
    for (let i = 0; i < numSheep; i++) {
      this.agents.push(createSheep(this.config, rng));
    }

    this.nextId = this.agents.length;
    const grass = createGrassGrid(this.config, rng);
    this.extraState = { grass } satisfies WolfSheepExtraState;
  }

  step(): void {
    if (!isWolfSheepState(this.extraState)) return;

    const grass = this.extraState.grass;
    const width = this.config['width'] ?? 800;
    const height = this.config['height'] ?? 600;
    const gridSize = this.config['grassGridSize'] ?? 20;
    // Step size: one grid cell (matches NetLogo fd 1 = one patch)
    const stepSize = Math.min(width / gridSize, height / gridSize);

    const rng = this.random.bind(this);

    // NetLogo: if not any? turtles [ stop ]
    const anyAlive = this.agents.some(a => a.alive);
    if (!anyAlive) {
      this.recordPopulation();
      return;
    }

    // NetLogo: if not any? wolves and count sheep > max-sheep [ stop ]
    const wolves = this.agents.filter(a => a.type === 'wolf' && a.alive);
    const sheepList = this.agents.filter(a => a.type === 'sheep' && a.alive);
    if (wolves.length === 0 && sheepList.length > MAX_SHEEP) {
      log({ level: 'warn', category: 'population', message: 'Sheep have inherited the earth' }, this.tick);
      this.recordPopulation();
      return;
    }

    const newAgents: Agent[] = [];

    // Process each sheep (NetLogo: ask sheep [...])
    for (const sheep of sheepList) {
      if (!sheep.alive) continue;

      // move
      move(sheep, width, height, stepSize, rng);

      // energy -= 1
      sheep.energy -= 1;
      // eat-grass
      eatGrass(sheep, grass, this.config);
      // death
      death(sheep);

      if (!sheep.alive) continue;

      // reproduce-sheep
      const offspring = tryReproduce(
        sheep,
        this.config['sheepReproduceRate'] ?? 4,
        stepSize,
        width,
        height,
        rng
      );
      if (offspring) {
        offspring.id = this.nextId++;
        newAgents.push(offspring);
      }
    }

    // Process each wolf (NetLogo: ask wolves [...])
    // Re-gather alive sheep for eat-sheep checks (some may have died from starvation above)
    const aliveSheep = this.agents.filter(a => a.type === 'sheep' && a.alive)
      .concat(newAgents.filter(a => a.type === 'sheep' && a.alive));

    for (const wolf of wolves) {
      if (!wolf.alive) continue;

      // move
      move(wolf, width, height, stepSize, rng);
      // energy -= 1
      wolf.energy -= 1;
      // eat-sheep
      eatSheep(wolf, aliveSheep, this.config, rng);
      // death
      death(wolf);

      if (!wolf.alive) continue;

      // reproduce-wolves
      const offspring = tryReproduce(
        wolf,
        this.config['wolfReproduceRate'] ?? 5,
        stepSize,
        width,
        height,
        rng
      );
      if (offspring) {
        offspring.id = this.nextId++;
        newAgents.push(offspring);
      }
    }

    // Grass regrowth (NetLogo: ask patches [ grow-grass ])
    for (const patch of grass) {
      growGrass(patch);
    }

    // Add new agents
    this.agents.push(...newAgents);

    // Compact dead agents
    this.agents = this.agents.filter(a => a.alive);

    // Record population
    this.recordPopulation();
  }

  getPopulationCounts(): Record<string, number> {
    const wolf = this.agents.filter(a => a.type === 'wolf' && a.alive).length;
    const sheep = this.agents.filter(a => a.type === 'sheep' && a.alive).length;
    let grassAlive = 0;
    if (isWolfSheepState(this.extraState)) {
      grassAlive = this.extraState.grass.filter(g => g.alive).length;
    }
    return { wolf, sheep, grass: grassAlive };
  }
}
