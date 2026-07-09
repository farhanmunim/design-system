/* ═══════════════════════════════════════════════════════════════════════
   GSAP code generator.

   One master timeline (paused). Per element, per property track we emit a
   .fromTo (2 keyframes) or a keyframes:[] tween (3+), positioned by the
   track's first keyframe time (absolute seconds). Notes:
     - GSAP uses `rotation`, not `rotate` (mapped via PROPERTIES).
     - Time in seconds; ease always explicit so it matches the preview.
   ═══════════════════════════════════════════════════════════════════════ */
import { EASING, DEFAULT_EASE } from '../../core/easing.js';
import { PROPERTIES } from '../schema.js';
import { s, fmtValue, groupByElement, LIB_VERSIONS } from './shared.js';

const ease = (id) => JSON.stringify(EASING[id]?.gsap || EASING[DEFAULT_EASE].gsap);

export function toGSAP(scene) {
  const groups = groupByElement(scene);
  const out = [];
  out.push(`// Animation: ${scene.name || 'scene'}`);
  out.push(`// Generated for GSAP ${LIB_VERSIONS.gsap} — https://gsap.com`);
  out.push(`import { gsap } from "gsap";`);
  out.push('');
  out.push(`const tl = gsap.timeline({ paused: true${scene.settings.loop ? ', repeat: -1' : ''} });`);
  out.push('');

  for (const g of groups) {
    for (const track of g.tracks) {
      const prop = PROPERTIES[track.property];
      const key = prop.gsap;
      const kfs = track.keyframes;
      const at = s(kfs[0].time);

      if (kfs.length === 2) {
        const a = kfs[0], b = kfs[1];
        out.push(
          `tl.fromTo(${JSON.stringify(g.selector)}, ` +
          `{ ${key}: ${fmtValue(track.property, a.value)} }, ` +
          `{ ${key}: ${fmtValue(track.property, b.value)}, duration: ${s(b.time - a.time)}, ease: ${ease(a.ease)} }, ${at});`
        );
      } else {
        // 3+ keyframes → set the start, then a keyframes array
        const first = kfs[0];
        const frames = kfs.slice(1).map((kf, i) => {
          const prev = kfs[i];
          return `    { ${key}: ${fmtValue(track.property, kf.value)}, duration: ${s(kf.time - prev.time)}, ease: ${ease(prev.ease)} }`;
        });
        out.push(`tl.set(${JSON.stringify(g.selector)}, { ${key}: ${fmtValue(track.property, first.value)} }, ${at});`);
        out.push(`tl.to(${JSON.stringify(g.selector)}, { keyframes: [`);
        out.push(frames.join(',\n'));
        out.push(`  ] }, ${at});`);
      }
    }
    out.push('');
  }

  out.push('tl.play();');
  return out.join('\n');
}
