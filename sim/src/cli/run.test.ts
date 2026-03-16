import { describe, it, expect } from 'vitest';
import { parseArgs } from './args.js';

describe('CLI args', () => {
  it('parses --seed flag', () => {
    const args = parseArgs(['--seed', '42']);
    expect(args.seed).toBe(42);
  });

  it('seed defaults to undefined', () => {
    const args = parseArgs([]);
    expect(args.seed).toBeUndefined();
  });

  it('parses --dump-definition flag', () => {
    const args = parseArgs(['--dump-definition']);
    expect(args.dumpDefinition).toBe(true);
  });

  it('dumpDefinition defaults to false', () => {
    const args = parseArgs([]);
    expect(args.dumpDefinition).toBe(false);
  });
});
