export function truncateText(text: string, maxChars: number, suffix = '...<truncated>'): string {
  if (!text) return '';
  if (!Number.isFinite(maxChars) || maxChars <= 0) return suffix;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}${suffix}`;
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
