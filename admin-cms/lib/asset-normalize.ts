// Resolve stale stored asset paths (e.g. `Pojects/Project 1/photo.jpg`) to the
// actual deployed files (space-free names after the asset cleanup). Leaves
// absolute / external URLs untouched.
export function normalizeAssetPath(path: string | null | undefined): string {
  if (!path) return '';
  const p = String(path).trim();
  if (/^(https?:|data:|blob:|\/\/)/i.test(p)) return p;
  return p.replace(/\s+/g, '_');
}