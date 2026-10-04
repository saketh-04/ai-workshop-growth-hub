/** Browser storage can be blocked (private mode, strict settings). Every access is guarded and failure-safe. */
type Kind = 'local' | 'session';
const store = (k: Kind) => (k === 'local' ? window.localStorage : window.sessionStorage);

export function readJson<T>(kind: Kind, key: string): T | null {
  try {
    const raw = store(kind).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function writeJson(kind: Kind, key: string, value: unknown): void {
  try { store(kind).setItem(key, JSON.stringify(value)); } catch { /* storage unavailable: degrade silently */ }
}
export function removeKey(kind: Kind, key: string): void {
  try { store(kind).removeItem(key); } catch { /* ignore */ }
}
