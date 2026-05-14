const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(input: unknown): string {
  if (input == null) return '';
  return String(input).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
