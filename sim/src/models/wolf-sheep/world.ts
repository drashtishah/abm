import { BaseWorld } from '../../framework/base-world.js';
import type { Agent } from '../../framework/types.js';
import { log } from '../../framework/logger.js';
import { createWolf, createSheep, createGrassGrid, resetIdCounter } from './agent.js';
import type { GrassPatch } from './agent.js';
import {
  fleeFromNearest,
  chaseNearest,
  bounceOffWalls,
  checkCatch,
  tryReproduce,
  findGrassPatchAt,
} from './behaviors.js';

interface WolfSheepExtraState {
  grass: GrassPatch[];
}

function isWolfSheepState(s: unknown): s is WolfSheepExtraState {
  return s !== null && typeof s === 'object' && 'grass' in s;
}

export class WolfSheepWorld extends BaseWorld {
  private nextId = 0;

  setup(): void {
    resetIdCounter();
    this.agents = [];

    const numWolves = this.config['initialWolves'] ?? 50;
    const numSheep = this.config['initialSheep'] ?? 100;

    for (let i = 0; i < numWolves; i++) {
      this.agents.push(createWolf(this.config, this.random.bind(this)));
    }
    for (let i = 0; i < numSheep; i++) {
      this.agents.push(createSheep(this.config, this.random.bind(this)));
    }

    this.nextId = this.agents.length;
    const grass = createGrassGrid(this.config);
    this.extraState = { grass } satisfies WolfSheepExtraState;
  }

  step(): void {
    if (!isWolfSheepState(this.extraState)) return;

    const grass = this.extraState.grass;
    const width = this.config['width'] ?? 800;
    const height = this.config['height'] ?? 600;
    const moveCost = this.config['moveCost'] ?? 0.5;
    const wolfGainFromFood = this.config['wolfGainFromFood'] ?? 20;
    const sheepGainFromFood = this.config['sheepGainFromFood'] ?? 4;
    const catchRadius = this.config['catchRadius'] ?? 10;
    const grassRegrowthTime = this.config['grassRegrowthTime'] ?? 30;

    const aliveAgents = this.agents.filter(a => a.alive);
    const wolves = aliveAgents.filter(a => a.type === 'wolf');
    const sheep = aliveAgents.filter(a => a.type === 'sheep');

    const rng = this.random.bind(this);

    // 1. Move all agents
    for (const wolf of wolves) {
      const vel = chaseNearest(wolf, sheep, this.config, rng);
      wolf.vx = vel.vx;
      wolf.vy = vel.vy;
      wolf.x += wolf.vx;
      wolf.y += wolf.vy;
      wolf.energy -= moveCost;
      bounceOffWalls(wolf, width, height);
    }

    for (const s of sheep) {
      const vel = fleeFromNearest(s, wolves, grass, this.config, rng);
      s.vx = vel.vx;
      s.vy = vel.vy;
      s.x += s.vx;
      s.y += s.vy;
      s.energy -= moveCost;
      bounceOffWalls(s, width, height);
    }

    // 2. Sheep eat grass
    for (const s of sheep) {
      if (!s.alive) continue;
      const patch = findGrassPatchAt(s.x, s.y, grass, this.config);
      if (patch && patch.alive) {
        s.energy += sheepGainFromFood;
        patch.alive = false;
        patch.regrowthTimer = grassRegrowthTime;
        log({ level: 'info', category: 'eat', message: `Sheep ${s.id} ate grass` }, this.tick);
      }
    }

    // 3. Wolves eat sheep
    for (const wolf of wolves) {
      if (!wolf.alive) continue;
      for (const s of sheep) {
        if (!s.alive) continue;
        if (checkCatch(wolf, s, catchRadius)) {
          s.alive = false;
          wolf.energy += wolfGainFromFood;
          log({ level: 'info', category: 'eat', message: `Wolf ${wolf.id} ate sheep ${s.id}` }, this.tick);
          break; // One sheep per tick per wolf
        }
      }
    }

    // 4. Energy check
    for (const agent of aliveAgents) {
      if (agent.energy <= 0) {
        agent.alive = false;
        log({
          level: 'info',
          category: 'death',
          message: `${agent.type} ${agent.id} starved`,
          data: { energy: 0 },
        }, this.tick);
      }
    }

    // 5. Reproduction
    const newAgents: Agent[] = [];
    for (const agent of this.agents) {
      if (!agent.alive) continue;
      const offspring = tryReproduce(agent, this.config, rng);
      if (offspring) {
        offspring.id = this.nextId++;
        // Clamp offspring position
        offspring.x = Math.max(offspring.radius, Math.min(width - offspring.radius, offspring.x));
        offspring.y = Math.max(offspring.radius, Math.min(height - offspring.radius, offspring.y));
        newAgents.push(offspring);
        log({
          level: 'info',
          category: 'birth',
          message: `${agent.type} ${agent.id} reproduced`,
        }, this.tick);
      }
    }
    this.agents.push(...newAgents);

    // 6. Grass regrowth
    for (const patch of grass) {
      if (!patch.alive) {
        patch.regrowthTimer--;
        if (patch.regrowthTimer <= 0) {
          patch.alive = true;
        }
      }
    }

    // Warn if populations critical
    const aliveWolves = this.agents.filter(a => a.type === 'wolf' && a.alive).length;
    const aliveSheep = this.agents.filter(a => a.type === 'sheep' && a.alive).length;
    if (aliveWolves < 5) {
      log({ level: 'warn', category: 'population', message: `Wolf population critical: ${aliveWolves}` }, this.tick);
    }
    if (aliveSheep < 5) {
      log({ level: 'warn', category: 'population', message: `Sheep population critical: ${aliveSheep}` }, this.tick);
    }

    // 7. Compact dead agents
    this.agents = this.agents.filter(a => a.alive);

    // 8. Record population
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
