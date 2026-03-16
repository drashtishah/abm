import { writeFileSync, mkdirSync } from 'fs';
import '../models/index.js';
import { getModel } from '../framework/model-registry.js';
import { parseArgs } from './args.js';

const args = parseArgs(process.argv.slice(2));
const modelDef = getModel(args.model);

if (!modelDef) {
  console.error(`Model "${args.model}" not found`);
  process.exit(1);
  throw new Error('unreachable');
}

const userConfig: Record<string, number> = JSON.parse(args.config) as Record<string, number>;
const config = { ...modelDef.defaultConfig, ...userConfig };

function writeCSV(world: { populationHistory: Record<string, number>[]; tick: number }, path: string): void {
  const firstEntry = world.populationHistory[0];
  if (!firstEntry) return;

  const keys = Object.keys(firstEntry);
  const header = ['tick', ...keys].join(',');
  const rows = world.populationHistory.map((entry, i) =>
    [i, ...keys.map(k => entry[k] ?? 0)].join(',')
  );
  const csv = [header, ...rows].join('\n');
  writeFileSync(path, csv);
  console.log(`Wrote ${path}`);
}

if (args.batch > 0) {
  mkdirSync(args.outputDir, { recursive: true });
  for (let i = 0; i < args.batch; i++) {
    const world = modelDef.createWorld({ ...config });
    world.setup();
    for (let t = 0; t < args.ticks; t++) world.step();
    writeCSV(world, `${args.outputDir}/run-${i}.csv`);
  }
  console.log(`Completed ${args.batch} batch runs`);
} else {
  const world = modelDef.createWorld({ ...config });
  world.setup();
  for (let t = 0; t < args.ticks; t++) world.step();
  writeCSV(world, args.output);
}
