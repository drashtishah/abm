// Converts model context strings (with bullet syntax) to styled HTML.

export function renderContextHTML(context: string): string {
  const lines = context.split('\n');
  const parts: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('•')) {
      if (!inList) { parts.push('<ul>'); inList = true; }
      const text = trimmed.slice(1).trim();
      let cls = '';
      const lower = text.toLowerCase();
      if (lower.startsWith('wolf') || lower.startsWith('wolves')) cls = 'rule-wolf';
      else if (lower.startsWith('sheep')) cls = 'rule-sheep';
      else if (lower.startsWith('grass')) cls = 'rule-grass';
      parts.push(`<li class="${cls}">${text}</li>`);
      continue;
    }

    if (inList) { parts.push('</ul>'); inList = false; }

    if (trimmed.endsWith(':') && trimmed.length < 40) {
      parts.push(`<div class="context-heading">${trimmed}</div>`);
      continue;
    }

    if (/[~╱╲]/.test(trimmed)) continue;

    if (trimmed.length > 0) {
      if (trimmed.includes('→') || trimmed.includes('oscillat') || trimmed.includes('boom')) {
        parts.push(`<div class="context-summary">${trimmed}</div>`);
      } else {
        parts.push(`<div>${trimmed}</div>`);
      }
    }
  }

  if (inList) parts.push('</ul>');
  return parts.join('');
}
