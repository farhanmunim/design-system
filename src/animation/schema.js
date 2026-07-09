/* ═══════════════════════════════════════════════════════════════════════
   Animation scene schema + defaults + property model.

   scene → elements[] → tracks[] (one property each) → keyframes[]
   A keyframe's `ease` governs the segment LEAVING it (kf → next kf).
   ═══════════════════════════════════════════════════════════════════════ */
import { uid } from '../core/id.js';
import { DEFAULT_EASE } from '../core/easing.js';

export const SCHEMA_VERSION = 1;

/* Canonical animatable properties (MVP set). Single source of truth for the
   interpolator, the inspector, and both generators. */
export const PROPERTIES = {
  x:        { label: 'X',        unit: 'px',  kind: 'number', default: 0,   gsap: 'x',        motion: 'x' },
  y:        { label: 'Y',        unit: 'px',  kind: 'number', default: 0,   gsap: 'y',        motion: 'y' },
  opacity:  { label: 'Opacity',  unit: '',    kind: 'number', default: 1,   gsap: 'opacity',  motion: 'opacity', min: 0, max: 1, step: 0.01 },
  scale:    { label: 'Scale',    unit: '',    kind: 'number', default: 1,   gsap: 'scale',    motion: 'scale', min: 0, step: 0.01 },
  rotate:   { label: 'Rotate',   unit: 'deg', kind: 'number', default: 0,   gsap: 'rotation', motion: 'rotate' },
};
export const PROPERTY_IDS = Object.keys(PROPERTIES);

export function makeElement(partial = {}) {
  return {
    id: uid('el'),
    name: partial.name || 'Element',
    type: partial.type || 'box',
    content: partial.content ?? (partial.type === 'text' ? 'Text' : ''),
    base: Object.assign({
      left: 60, top: 60, width: 160, height: 96,
      background: 'var(--accent)', color: '#ffffff',
      borderRadius: 12, fontSize: 18, fontWeight: 600,
    }, partial.base || {}),
    initial: Object.assign({ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }, partial.initial || {}),
  };
}

export function makeKeyframe(time, value, ease = DEFAULT_EASE) {
  return { id: uid('kf'), time, value, ease };
}

export function makeTrack(elementId, property, keyframes) {
  return { id: uid('trk'), elementId, property, keyframes: keyframes || [] };
}

export function defaultScene() {
  const card = makeElement({
    name: 'Card', type: 'box',
    base: { left: 120, top: 150, width: 200, height: 120, background: 'var(--accent)', borderRadius: 16 },
  });
  const label = makeElement({
    name: 'Label', type: 'text', content: 'Motion',
    base: { left: 150, top: 300, width: 240, height: 40, background: 'transparent', color: 'var(--fg)', fontSize: 34, fontWeight: 700 },
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('scene'),
    name: 'Untitled scene',
    settings: { width: 640, height: 440, background: 'var(--surface)', fps: 60, duration: 1600, loop: true },
    elements: [card, label],
    tracks: [
      makeTrack(card.id, 'y', [makeKeyframe(0, 40, 'back-out'), makeKeyframe(700, 0)]),
      makeTrack(card.id, 'opacity', [makeKeyframe(0, 0, 'ease-out-quad'), makeKeyframe(500, 1)]),
      makeTrack(card.id, 'scale', [makeKeyframe(0, 0.8, 'back-out'), makeKeyframe(700, 1)]),
      makeTrack(label.id, 'y', [makeKeyframe(250, 20, 'ease-out-cubic'), makeKeyframe(900, 0)]),
      makeTrack(label.id, 'opacity', [makeKeyframe(250, 0, 'ease-out-quad'), makeKeyframe(750, 1)]),
    ],
  };
}

export function migrateScene(saved) {
  if (!saved || typeof saved !== 'object' || !Array.isArray(saved.elements)) return defaultScene();
  // Future migrations keyed on saved.schemaVersion go here.
  return saved;
}

/* Derived helpers */
export function sceneDuration(scene) {
  let max = 0;
  for (const t of scene.tracks) for (const k of t.keyframes) if (k.time > max) max = k.time;
  return Math.max(max, scene.settings.duration || 0, 200);
}

export function tracksForElement(scene, elementId) {
  return scene.tracks.filter((t) => t.elementId === elementId);
}
