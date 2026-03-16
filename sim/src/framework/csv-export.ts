import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

export function exportCSV(world: World, model: ModelDefinition): void {
  const firstEntry = world.populationHistory[0];
  if (!firstEntry) return;

  // Prepend run configuration as comment rows
  const metaLines: string[] = [];
  metaLines.push(`# Model: ${model.id}`);
  metaLines.push(`# Tick: ${world.tick}`);
  for (const [key, value] of Object.entries(world.config)) {
    metaLines.push(`# ${key}: ${value}`);
  }
  metaLines.push('#');

  const keys = Object.keys(firstEntry);
  const header = ['tick', ...keys].join(',');
  const rows = world.populationHistory.map((entry, i) =>
    [i, ...keys.map(k => entry[k] ?? 0)].join(',')
  );
  const csv = [...metaLines, header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${model.id}-tick${world.tick}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
