/**

 * Trim and lowercase an email for API payloads.

 * Preserves dots in the local part (matches edaCleaner-server rules).

 * Gmail alias matching (dots/+tags) is handled server-side at lookup time only.

 */

export function normalizeEmailInput(email: string): string {

  return String(email).trim().toLowerCase();

}



/** Same rules as normalizeEmailInput — use before persisting or sending to the API. */

export function normalizeEmailForStorage(email: string): string {

  return normalizeEmailInput(email);

}



/** Basic format check — allows dots and plus-tags in the local part. */

export function isPlausibleEmail(email: string): boolean {

  const normalized = normalizeEmailInput(email);

  if (!normalized || normalized.length > 254) return false;

  const at = normalized.lastIndexOf('@');

  if (at < 1 || at === normalized.length - 1) return false;

  const domain = normalized.slice(at + 1);

  if (!domain.includes('.')) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

}

