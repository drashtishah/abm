/**
 * Headless model validation — runs each registered model with its default config,
 * collects population time series, and checks baseline sanity + model-specific validators.
 *
 * Run: npx tsx test/e2e/model-validation.ts
 * Output: structured JSON per model, exit code 0 if all pass, 1 if any fail.
 */

// Import all models to trigger registration
import '../../src/models/index.js';
import { listModels } from '../../src/framework/model-registry.js';
import type { ModelDefinition, ValidationResult } from '../../src/framework/model-registry.js';

const STEPS = 500;

interface ModelReport {
  modelId: string;
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
  populationSummary: Record<string, { min: number; max: number; mean: number; final: number }>;
}

function baselineSanityChecks(
  populationHistory: Record<string, number>[],
  def: ModelDefinition,
): ValidationResult {
  const checks: ValidationResult['checks'] = [];
  const ticks = populationHistory.length;

  // Check: simulation completed expected number of steps
  checks.push({
    name: 'simulation-completed',
    passed: ticks >= STEPS,
    detail: `Ran for ${ticks} ticks (expected ${STEPS})`,
  });

  // Check: no NaN values in any population field
  const agentTypeKeys = def.agentTypes.map(a => a.type);
  let hasNaN = false;
  for (const record of populationHistory) {
    for (const key of Object.keys(record)) {
      if (isNaN(record[key]!)) {
        hasNaN = true;
        break;
      }
    }
    if (hasNaN) break;
  }
  checks.push({
    name: 'no-nan-values',
    passed: !hasNaN,
    detail: hasNaN ? 'Found NaN in population data' : 'All population values are numeric',
  });

  // Check: no negative population counts
  let hasNegative = false;
  for (const record of populationHistory) {
    for (const val of Object.values(record)) {
      if (val < 0) { hasNegative = true; break; }
    }
    if (hasNegative) break;
  }
  checks.push({
    name: 'no-negative-counts',
    passed: !hasNegative,
    detail: hasNegative ? 'Found negative population count' : 'All counts non-negative',
  });

  // Check: not instant total extinction of all agent types before tick 20
  const allExtinctBefore20 = agentTypeKeys.length > 0 && populationHistory.length >= 20 &&
    agentTypeKeys.every(type => {
      const series = populationHistory.slice(0, 20).map(h => h[type] ?? h[type + 's'] ?? 0);
      return series.every(n => n === 0);
    });
  checks.push({
    name: 'no-instant-total-extinction',
    passed: !allExtinctBefore20,
    detail: allExtinctBefore20
      ? 'All agent types went extinct within first 20 ticks'
      : 'At least one agent type survived past tick 20',
  });

  return {
    passed: checks.every(c => c.passed),
    checks,
  };
}

function computeSummary(
  populationHistory: Record<string, number>[],
): Record<string, { min: number; max: number; mean: number; final: number }> {
  if (populationHistory.length === 0) return {};

  const keys = Object.keys(populationHistory[0]!);
  const summary: Record<string, { min: number; max: number; mean: number; final: number }> = {};

  for (const key of keys) {
    const values = populationHistory.map(h => h[key] ?? 0);
    summary[key] = {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      final: values[values.length - 1]!,
    };
  }

  return summary;
}

function runModel(def: ModelDefinition): ModelReport {
  const world = def.createWorld({ ...def.defaultConfig });
  world.setup();

  for (let i = 0; i < STEPS; i++) {
    world.step();
  }

  const history = world.populationHistory;
  const allChecks: Array<{ name: string; passed: boolean; detail: string }> = [];

  // Baseline sanity checks
  const baseline = baselineSanityChecks(history, def);
  allChecks.push(...baseline.checks);

  // Model-specific validator
  if (def.validate) {
    const modelResult = def.validate(history, def.defaultConfig);
    // Avoid duplicate simulation-completed checks
    for (const check of modelResult.checks) {
      if (!allChecks.some(c => c.name === check.name)) {
        allChecks.push(check);
      }
    }
  }

  return {
    modelId: def.id,
    passed: allChecks.every(c => c.passed),
    checks: allChecks,
    populationSummary: computeSummary(history),
  };
}

// Main
const models = listModels();
console.log(`Discovered ${models.length} model(s): ${models.map(m => m.id).join(', ')}\n`);

const reports: ModelReport[] = [];
let anyFailed = false;

for (const def of models) {
  console.log(`Running ${def.id} (${STEPS} steps)...`);
  const report = runModel(def);
  reports.push(report);

  if (!report.passed) anyFailed = true;

  // Print per-model results
  const status = report.passed ? 'PASS' : 'FAIL';
  console.log(`  ${status}: ${def.id}`);
  for (const check of report.checks) {
    const icon = check.passed ? '  ✓' : '  ✗';
    console.log(`    ${icon} ${check.name}: ${check.detail}`);
  }
  console.log(`  Population summary:`);
  for (const [key, stats] of Object.entries(report.populationSummary)) {
    console.log(`    ${key}: min=${stats.min} max=${stats.max} mean=${stats.mean.toFixed(1)} final=${stats.final}`);
  }
  console.log('');
}

// Output structured JSON for programmatic consumption
console.log('--- JSON OUTPUT ---');
console.log(JSON.stringify(reports, null, 2));

process.exit(anyFailed ? 1 : 0);
