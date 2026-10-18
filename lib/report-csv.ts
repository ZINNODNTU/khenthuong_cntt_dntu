/**
 * Escape a CSV cell for human reports opened in spreadsheet applications.
 * Quoting is not sufficient to prevent formula injection; prefix risky cells.
 */
export function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? "").replace(/\r\n?/g, "\n");
  const safe = /^[\s\uFEFF\u200B]*[=+@-]/u.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
