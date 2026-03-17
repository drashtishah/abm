/**
 * Append-only TSV experiment logger for the tight feedback loop.
 * Logs to reports/experiments/<model>-log.tsv at the workspace root.
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export interface ExperimentEntry {
  model: string;
  seed: number;
  ticks: number;
  paramChanged: string;
  oldValue: string;
  newValue: string;
  score: number;
  passed: boolean;
  description: string;
}

const HEADER = 'timestamp\tmodel\tseed\tticks\tparam_changed\told_value\tnew_value\tscore\tpassed\tdescription';

/** Resolve the TSV log path for a given model. Creates directories if needed. */
function logPath(model: string): string {
  // Navigate from sim/ up to workspace root
  const reportsDir = resolve(__dirname, '..', '..', '..', 'reports', 'experiments');
  mkdirSync(reportsDir, { recursive: true });
  return resolve(reportsDir, `${model}-log.tsv`);
}

/** Append one experiment result to the model's TSV log. */
export function appendExperimentLog(entry: ExperimentEntry): string {
  const path = logPath(entry.model);

  // Write header if file doesn't exist
  if (!existsSync(path)) {
    writeFileSync(path, HEADER + '\n');
  }

  const timestamp = new Date().toISOString();
  const row = [
    timestamp,
    entry.model,
    entry.seed,
    entry.ticks,
    entry.paramChanged,
    entry.oldValue,
    entry.newValue,
    entry.score,
    entry.passed,
    entry.description,
  ].join('\t');

  appendFileSync(path, row + '\n');
  return path;
}
