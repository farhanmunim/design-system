/* ═══════════════════════════════════════════════════════════════════════
   Shared utilities — pure, dependency-free helpers used across workspaces.
   ═══════════════════════════════════════════════════════════════════════ */

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function throttleRAF(fn) {
  let queued = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...lastArgs);
    });
  };
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export const round = (n, dp = 3) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Format a number for code output: round + strip trailing zeros. */
export function fmtNum(n, dp = 3) {
  if (typeof n !== 'number' || !isFinite(n)) return String(n);
  const s = round(n, dp).toString();
  return s;
}

/* ── Color parsing / interpolation ──────────────────────────────────── */

export function isColor(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return /^#([0-9a-f]{3,8})$/i.test(s)
    || /^rgba?\(/i.test(s)
    || /^hsla?\(/i.test(s);
}

/** Parse a hex/rgb(a) string to {r,g,b,a} (0-255, a 0-1). Returns null on failure. */
export function parseColor(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim();
  let m;
  if ((m = /^#([0-9a-f]{3})$/i.exec(s))) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  if ((m = /^#([0-9a-f]{6})$/i.exec(s))) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  if ((m = /^#([0-9a-f]{8})$/i.exec(s))) {
    const n = parseInt(m[1], 16);
    return { r: (n >>> 24) & 255, g: (n >> 16) & 255, b: (n >> 8) & 255, a: (n & 255) / 255 };
  }
  if ((m = /^rgba?\(([^)]+)\)$/i.exec(s))) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length >= 3) return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  return null;
}

export function colorToRGBA({ r, g, b, a }) {
  const R = Math.round(clamp(r, 0, 255));
  const G = Math.round(clamp(g, 0, 255));
  const B = Math.round(clamp(b, 0, 255));
  if (a >= 1) return `rgb(${R}, ${G}, ${B})`;
  return `rgba(${R}, ${G}, ${B}, ${round(a, 3)})`;
}

/** Interpolate two color strings; falls back to `a` if either can't be parsed. */
export function lerpColor(aStr, bStr, t) {
  const a = parseColor(aStr);
  const b = parseColor(bStr);
  if (!a || !b) return t < 0.5 ? aStr : bStr;
  return colorToRGBA({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a, b.a, t),
  });
}

/** Deep clone with structuredClone, JSON fallback. */
export function clone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

/** Download a text blob as a file. */
export function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
