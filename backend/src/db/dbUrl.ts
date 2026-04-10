/**
 * Normalizes DB_URL when copy-pasted with extra wrappers (e.g. psql'...').
 */
export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) {
    return undefined;
  }
  let s = raw.trim();
  if (s.startsWith("psql'")) {
    s = s.slice(5);
  }
  if (s.startsWith('psql"')) {
    s = s.slice(5);
  }
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1);
  }
  return s;
}
