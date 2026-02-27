const STORAGE_KEY = "netflex_recent_sns";
const MAX_RECENT = 6;

export function getRecentSns(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addRecentSn(sn: string): void {
  if (!sn || sn.trim().length !== 12) return;
  const normalized = sn.trim().toUpperCase();
  const current = getRecentSns();
  const filtered = current.filter((s) => s !== normalized);
  const updated = [normalized, ...filtered].slice(0, MAX_RECENT);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearRecentSns(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
