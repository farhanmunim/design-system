/* Tiny id helper — stable, collision-safe enough for client-side ids. */
export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
