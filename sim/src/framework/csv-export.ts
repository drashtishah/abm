import type { World } from './types.js';
import type { ModelDefinition } from './model-registry.js';

export function exportCSV(world: World, model: ModelDefinition): void {
  const firstEntry = world.populationHistory[0];
  if (!firstEntry) return;

  const keys = Object.keys(firstEntry);
  const header = ['tick', ...keys].join(',');
  const rows = world.populationHistory.map((entry, i) =>
    [i, ...keys.map(k => entry[k] ?? 0)].join(',')
  );
  const csv = [header, ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${model.id}-tick${world.tick}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
