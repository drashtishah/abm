import { describe, it, expect } from 'vitest';
import { renderContextHTML } from './context-renderer.js';

describe('renderContextHTML', () => {
  it('converts bullet lines to list items', () => {
    const html = renderContextHTML('Agent rules:\n• Wolves chase sheep.');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li class="rule-wolf">');
    expect(html).toContain('Wolves chase sheep.');
  });

  it('applies wolf/sheep/grass CSS classes', () => {
    const html = renderContextHTML('• Wolves do X\n• Sheep do Y\n• Grass regrows');
    expect(html).toContain('rule-wolf');
    expect(html).toContain('rule-sheep');
    expect(html).toContain('rule-grass');
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
