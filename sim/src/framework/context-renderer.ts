// Converts model context strings (with bullet syntax) to styled HTML.
// Accepts an optional colorMap to color bullet points by agent/population type.

export function renderContextHTML(context: string, colorMap?: Map<string, string>): string {
  const lines = context.split('\n');
  const parts: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('•')) {
      if (!inList) { parts.push('<ul>'); inList = true; }
      const text = trimmed.slice(1).trim();
      const lower = text.toLowerCase();

      // Match bullet color from colorMap keys (supports plurals like wolves→wolf)
      let bulletStyle = '';
      if (colorMap) {
        for (const [key, color] of colorMap) {
          const k = key.toLowerCase();
          if (lower.startsWith(k) || lower.startsWith(k + 's') || lower.startsWith(k + 'es')
            || lower.startsWith(k.replace(/f$/, 'ves'))) {
            bulletStyle = ` style="--bullet-color: ${color}"`;
            break;
          }
        }
      }

      parts.push(`<li${bulletStyle}>${text}</li>`);
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
