/* ═══════════════════════════════════════════════════════════════════════
   Motion (motion.dev) code generator.

   Emits a sequence array for animate([...]). Per track:
     - 2 keyframes → { prop: [from, to] } with { duration, at, ease }
     - 3+ keyframes → { prop: [...values] } with normalized `offset` + a
       per-segment `ease` array.
   Notes:
     - Motion uses `rotate`, not `rotation` (mapped via PROPERTIES).
     - `at` positions each entry (absolute seconds here).
     - API changed across versions; this targets animate([...]) sequences.
   ═══════════════════════════════════════════════════════════════════════ */
import { EASING, DEFAULT_EASE } from '../../core/easing.js';
import { PROPERTIES } from '../schema.js';
import { s, fmtValue, groupByElement, LIB_VERSIONS } from './shared.js';
import { round } from '../../core/util.js';

const easeVal = (id) => {
  const m = (EASING[id] || EASING[DEFAULT_EASE]).motion;
  return Array.isArray(m) ? `[${m.join(', ')}]` : JSON.stringify(m);
};

export function toMotion(scene) {
  const groups = groupByElement(scene);
  const out = [];
  out.push(`// Animation: ${scene.name || 'scene'}`);
  out.push(`// Generated for Motion ${LIB_VERSIONS.motion} — https://motion.dev`);
  out.push(`import { animate } from "motion";`);
  out.push('');
  out.push('const controls = animate([');

  const entries = [];
  for (const g of groups) {
    for (const track of g.tracks) {
      const prop = PROPERTIES[track.property];
      const key = prop.motion;
      const kfs = track.keyframes;
      const at = s(kfs[0].time);
      const total = kfs[kfs.length - 1].time - kfs[0].time;

      if (kfs.length === 2) {
        const a = kfs[0], b = kfs[1];
        entries.push(
          `  [${JSON.stringify(g.selector)}, { ${key}: [${fmtValue(track.property, a.value)}, ${fmtValue(track.property, b.value)}] }, ` +
          `{ duration: ${s(b.time - a.time)}, at: ${at}, ease: ${easeVal(a.ease)} }]`
        );
      } else {
        const values = kfs.map((k) => fmtValue(track.property, k.value)).join(', ');
        const offsets = kfs.map((k) => round((k.time - kfs[0].time) / (total || 1), 4)).join(', ');
        const eases = kfs.slice(0, -1).map((k) => easeVal(k.ease)).join(', ');
        entries.push(
          `  [${JSON.stringify(g.selector)}, { ${key}: [${values}] }, ` +
          `{ duration: ${s(total)}, at: ${at}, offset: [${offsets}], ease: [${eases}] }]`
        );
      }
    }
  }

  out.push(entries.join(',\n'));
  out.push(`]${scene.settings.loop ? ', { repeat: Infinity }' : ''});`);
  out.push('');
  out.push('controls.play();');
  return out.join('\n');
}
