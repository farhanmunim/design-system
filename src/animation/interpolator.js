/* ═══════════════════════════════════════════════════════════════════════
   Neutral interpolator — the single source of truth for the live preview.

   sampleSceneAt(scene, t) → Map<elementId, { x, y, opacity, scale, rotate }>
   Uses the shared cubic-bezier easing so the preview is identical regardless
   of whether the user exports GSAP or Motion.
   ═══════════════════════════════════════════════════════════════════════ */
import { cubicBezier, EASING, DEFAULT_EASE } from '../core/easing.js';
import { isColor, lerpColor, lerp } from '../core/util.js';
import { PROPERTIES } from './schema.js';

function segmentIndex(kfs, t) {
  // last i where kfs[i].time <= t
  let lo = 0, hi = kfs.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (kfs[mid].time <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

function sampleTrack(track, t) {
  const kfs = track.keyframes;
  if (!kfs.length) return PROPERTIES[track.property]?.default ?? 0;
  if (t <= kfs[0].time) return kfs[0].value;
  const last = kfs[kfs.length - 1];
  if (t >= last.time) return last.value;

  const i = segmentIndex(kfs, t);
  const a = kfs[i];
  const b = kfs[i + 1] || a;
  if (b.time === a.time) return b.value;
  const p = (t - a.time) / (b.time - a.time);
  const ease = EASING[a.ease] ? a.ease : DEFAULT_EASE;
  const eased = cubicBezier(EASING[ease].bezier, p);
  if (isColor(a.value) || isColor(b.value)) return lerpColor(a.value, b.value, eased);
  return lerp(Number(a.value), Number(b.value), eased);
}

export function sampleSceneAt(scene, t) {
  const out = new Map();
  for (const el of scene.elements) out.set(el.id, { ...el.initial });
  for (const track of scene.tracks) {
    const props = out.get(track.elementId);
    if (props) props[track.property] = sampleTrack(track, t);
  }
  return out;
}

/** Compose animatable props into inline styles, in the canonical order the
    generators emit (translate → rotate → scale). */
export function propsToStyle(p) {
  const parts = [];
  if (p.x || p.y) parts.push(`translate(${p.x || 0}px, ${p.y || 0}px)`);
  if (p.rotate) parts.push(`rotate(${p.rotate}deg)`);
  if (p.scale != null && p.scale !== 1) parts.push(`scale(${p.scale})`);
  return {
    transform: parts.length ? parts.join(' ') : 'none',
    opacity: p.opacity == null ? 1 : p.opacity,
  };
}
