/* ═══════════════════════════════════════════════════════════════════════
   Easing registry — the linchpin for dual GSAP + Motion output.

   One named id resolves THREE ways:
     - bezier : cubic-bezier control points → drives the neutral preview
     - gsap   : GSAP ease string           → emitted by the GSAP generator
     - motion : Motion easing value         → emitted by the Motion generator

   Preview always uses `bezier`, so what you see is independent of the export
   target. Generators emit explicit eases so neither library falls back to a
   default the preview didn't apply.
   ═══════════════════════════════════════════════════════════════════════ */

export const EASING = {
  'linear':            { label: 'Linear',            gsap: 'none',            motion: 'linear',              bezier: [0, 0, 1, 1] },
  'ease-in-quad':      { label: 'Ease In',           gsap: 'power2.in',       motion: [0.55, 0.085, 0.68, 0.53], bezier: [0.55, 0.085, 0.68, 0.53] },
  'ease-out-quad':     { label: 'Ease Out',          gsap: 'power2.out',      motion: [0.25, 0.46, 0.45, 0.94], bezier: [0.25, 0.46, 0.45, 0.94] },
  'ease-in-out-quad':  { label: 'Ease In-Out',       gsap: 'power2.inOut',    motion: [0.455, 0.03, 0.515, 0.955], bezier: [0.455, 0.03, 0.515, 0.955] },
  'ease-out-cubic':    { label: 'Ease Out (Cubic)',  gsap: 'power3.out',      motion: [0.215, 0.61, 0.355, 1], bezier: [0.215, 0.61, 0.355, 1] },
  'ease-in-out-cubic': { label: 'Ease In-Out (Cubic)', gsap: 'power3.inOut',  motion: [0.65, 0, 0.35, 1],    bezier: [0.65, 0, 0.35, 1] },
  'ease-out-expo':     { label: 'Ease Out (Expo)',   gsap: 'expo.out',        motion: [0.19, 1, 0.22, 1],    bezier: [0.19, 1, 0.22, 1] },
  'back-out':          { label: 'Back Out',          gsap: 'back.out(1.7)',   motion: [0.34, 1.56, 0.64, 1], bezier: [0.34, 1.56, 0.64, 1] },
  'back-in-out':       { label: 'Back In-Out',       gsap: 'back.inOut(1.7)', motion: [0.68, -0.6, 0.32, 1.6], bezier: [0.68, -0.6, 0.32, 1.6] },
};

export const EASING_IDS = Object.keys(EASING);
export const DEFAULT_EASE = 'ease-out-quad';

/* ── Cubic-bezier solver (Newton-Raphson + bisection fallback) ────────── */

function bezierC(a1, a2) { return 1 + 3 * a1 - 3 * a2; }
function bezierB(a1, a2) { return 3 * a2 - 6 * a1; }
function bezierA(a1) { return 3 * a1; }
function calcBezier(t, a1, a2) { return ((bezierC(a1, a2) * t + bezierB(a1, a2)) * t + bezierA(a1)) * t; }
function slope(t, a1, a2) { return 3 * bezierC(a1, a2) * t * t + 2 * bezierB(a1, a2) * t + bezierA(a1); }

/**
 * cubicBezier([x1,y1,x2,y2], x) → eased y in [0,1] (may overshoot for back/spring-like)
 */
export function cubicBezier(points, x) {
  const [x1, y1, x2, y2] = points;
  if (x1 === y1 && x2 === y2) return x; // linear
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  let t = x;
  for (let i = 0; i < 8; i++) {
    const xEst = calcBezier(t, x1, x2) - x;
    const d = slope(t, x1, x2);
    if (Math.abs(xEst) < 1e-6) return calcBezier(t, y1, y2);
    if (Math.abs(d) < 1e-6) break;
    t -= xEst / d;
  }
  // Bisection fallback
  let lo = 0, hi = 1;
  t = x;
  while (lo < hi) {
    const xEst = calcBezier(t, x1, x2);
    if (Math.abs(xEst - x) < 1e-6) break;
    if (xEst < x) lo = t; else hi = t;
    t = (lo + hi) / 2;
  }
  return calcBezier(t, y1, y2);
}

export function easeValue(easeId, t) {
  const e = EASING[easeId] || EASING[DEFAULT_EASE];
  return cubicBezier(e.bezier, t);
}
