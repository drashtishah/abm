/**
 * Golden baseline checker — deterministic seed runs compared against stored CSVs.
 * Auto-discovers all registered models via listModels().
 *
 * Usage:
 *   npx tsx src/cli/golden-check.ts          # compare against baselines
 *   npx tsx src/cli/golden-check.ts --update  # regenerate baselines
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import '../models/index.js';
import { listModels } from '../framework/model-registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINES_DIR = resolve(__dirname, '../../test/golden/baselines');
const SEEDS = [7, 42, 123];
const TICKS = 200;

const updateMode = process.argv.includes('--update');

function runModel(modelId: string, seed: number, ticks: number): string {
  const models = listModels();
  const def = models.find(m => m.id === modelId);
  if (!def) throw new Error(`Model "${modelId}" not found`);

  const config = { ...def.defaultConfig, seed, historyLimit: Infinity };
  const world = def.createWorld(config);
  world.setup();
  for (let t = 0; t < ticks; t++) {
    world.step();
  }

  const firstEntry = world.populationHistory[0];
  if (!firstEntry) return 'tick\n';

  const keys = Object.keys(firstEntry);
  const header = ['tick', ...keys].join(',');
  const rows = world.populationHistory.map((entry, i) =>
    [i, ...keys.map(k => entry[k] ?? 0)].join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

function main(): void {
  mkdirSync(BASELINES_DIR, { recursive: true });

  const models = listModels();
  let failures = 0;
  let updated = 0;
  let passed = 0;

  for (const def of models) {
    for (const seed of SEEDS) {
      const filename = `${def.id}-seed${seed}.csv`;
      const filepath = resolve(BASELINES_DIR, filename);
      const csv = runModel(def.id, seed, TICKS);

      if (updateMode) {
        writeFileSync(filepath, csv);
        updated++;
        console.log(`  updated: ${filename}`);
      } else {
        if (!existsSync(filepath)) {
          console.error(`  MISSING: ${filename} — run with --update to generate`);
          failures++;
          continue;
        }

        const baseline = readFileSync(filepath, 'utf-8');
        if (csv === baseline) {
          passed++;
          console.log(`  pass: ${filename}`);
        } else {
          failures++;
          console.error(`  FAIL: ${filename} — output differs from baseline`);
          // Show first differing line
          const csvLines = csv.split('\n');
          const baseLines = baseline.split('\n');
          for (let i = 0; i < Math.max(csvLines.length, baseLines.length); i++) {
            if (csvLines[i] !== baseLines[i]) {
              console.error(`    line ${i + 1}:`);
              console.error(`      expected: ${baseLines[i]}`);
              console.error(`      got:      ${csvLines[i]}`);
              break;
            }
          }
        }
      }
    }
  }

  if (updateMode) {
    console.log(`\nUpdated ${updated} golden baselines.`);
  } else {
    console.log(`\n${passed} passed, ${failures} failed.`);
    if (failures > 0) {
      console.error('\nGolden baselines do not match. If changes are intentional, run:');
      console.error('  npm run test:golden:update');
      process.exit(1);
    }
  }
}

main();
