import { describe, it, expect } from 'vitest';
import { renderContextHTML } from './context-renderer.js';

describe('renderContextHTML', () => {
  const colorMap = new Map([
    ['wolf', '#ff2daa'],
    ['sheep', '#affff7'],
    ['grass', '#66ff55'],
  ]);

  it('converts bullet lines to list items with color from colorMap', () => {
    const html = renderContextHTML('Agent rules:\n• Wolves chase sheep.', colorMap);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li');
    expect(html).toContain('--bullet-color: #ff2daa');
    expect(html).toContain('Wolves chase sheep.');
  });

  it('applies matching colors for wolf/sheep/grass via --bullet-color', () => {
    const html = renderContextHTML('• Wolves do X\n• Sheep do Y\n• Grass regrows', colorMap);
    expect(html).toContain('--bullet-color: #ff2daa');
    expect(html).toContain('--bullet-color: #affff7');
    expect(html).toContain('--bullet-color: #66ff55');
  });

  it('bullets without colorMap get no inline style', () => {
    const html = renderContextHTML('• Wolves do X\n• Sheep do Y');
    expect(html).not.toContain('--bullet-color');
    expect(html).toContain('<li>Wolves do X</li>');
  });

  it('unmatched bullet lines get no --bullet-color', () => {
    const html = renderContextHTML('• Energy depletes each step', colorMap);
    expect(html).not.toContain('--bullet-color');
    expect(html).toContain('<li>Energy depletes each step</li>');
  });

  it('handles plural forms (wolves matches wolf key)', () => {
    const html = renderContextHTML('• Wolves hunt in packs', colorMap);
    expect(html).toContain('--bullet-color: #ff2daa');
  });

  it('renders heading lines', () => {
    const html = renderContextHTML('Agent rules:');
    expect(html).toContain('context-heading');
  });

  it('skips ASCII art lines', () => {
    const html = renderContextHTML('~~~╱    ╱~~~');
    expect(html).toBe('');
  });

  it('renders summary lines with arrows', () => {
    const html = renderContextHTML('Sheep boom → wolves thrive');
    expect(html).toContain('context-summary');
  });
});
