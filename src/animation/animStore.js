/* Animation workspace store + scene mutation operations. */
import { createStore } from '../core/store.js';
import { defaultScene, migrateScene, makeElement, makeTrack, makeKeyframe, PROPERTIES } from './schema.js';
import { DEFAULT_EASE } from '../core/easing.js';

export const animStore = createStore({
  storageKey: 'dsb-anim-v1',
  getDefaultState: defaultScene,
  migrate: migrateScene,
});

const sortKfs = (kfs) => kfs.sort((a, b) => a.time - b.time);

export const sceneOps = {
  addElement(type) {
    let created;
    animStore.commit((s) => {
      const n = s.elements.length + 1;
      const el = makeElement({
        type,
        name: (type === 'text' ? 'Text' : 'Box') + ' ' + n,
        base: { left: 80 + n * 20, top: 80 + n * 20, background: type === 'text' ? 'transparent' : 'var(--accent)', color: type === 'text' ? 'var(--fg)' : '#ffffff' },
      });
      s.elements.push(el);
      created = el.id;
    });
    return created;
  },

  removeElement(elementId) {
    animStore.commit((s) => {
      s.elements = s.elements.filter((e) => e.id !== elementId);
      s.tracks = s.tracks.filter((t) => t.elementId !== elementId);
    });
  },

  updateElement(elementId, patch, opts) {
    animStore.commit((s) => {
      const el = s.elements.find((e) => e.id === elementId);
      if (!el) return;
      if (patch.base) Object.assign(el.base, patch.base);
      if (patch.initial) Object.assign(el.initial, patch.initial);
      for (const k of ['name', 'content', 'type']) if (k in patch) el[k] = patch[k];
    }, opts);
  },

  renameElement(elementId, name) {
    animStore.commit((s) => {
      const el = s.elements.find((e) => e.id === elementId);
      if (el) el.name = name;
    });
  },

  /** Ensure a track exists for (element, property); returns nothing, mutates. */
  ensureTrack(elementId, property) {
    animStore.commit((s) => {
      if (s.tracks.some((t) => t.elementId === elementId && t.property === property)) return;
      const el = s.elements.find((e) => e.id === elementId);
      const start = el?.initial?.[property] ?? PROPERTIES[property].default;
      s.tracks.push(makeTrack(elementId, property, [
        makeKeyframe(0, start, DEFAULT_EASE),
        makeKeyframe(600, PROPERTIES[property].default === start ? start : PROPERTIES[property].default),
      ]));
    });
  },

  removeTrack(trackId) {
    animStore.commit((s) => { s.tracks = s.tracks.filter((t) => t.id !== trackId); });
  },

  addKeyframe(trackId, time, value, ease) {
    animStore.commit((s) => {
      const t = s.tracks.find((x) => x.id === trackId);
      if (!t) return;
      t.keyframes.push(makeKeyframe(Math.max(0, Math.round(time)), value, ease || DEFAULT_EASE));
      sortKfs(t.keyframes);
    });
  },

  removeKeyframe(trackId, kfId) {
    animStore.commit((s) => {
      const t = s.tracks.find((x) => x.id === trackId);
      if (!t) return;
      if (t.keyframes.length <= 1) return;
      t.keyframes = t.keyframes.filter((k) => k.id !== kfId);
    });
  },

  updateKeyframe(trackId, kfId, patch, opts) {
    animStore.commit((s) => {
      const t = s.tracks.find((x) => x.id === trackId);
      if (!t) return;
      const kf = t.keyframes.find((k) => k.id === kfId);
      if (!kf) return;
      if ('time' in patch) kf.time = Math.max(0, Math.round(patch.time));
      if ('value' in patch) kf.value = patch.value;
      if ('ease' in patch) kf.ease = patch.ease;
      if ('time' in patch) sortKfs(t.keyframes);
    }, opts);
  },

  setSetting(key, value) {
    animStore.commit((s) => { s.settings[key] = value; });
  },

  rename(name) {
    animStore.commit((s) => { s.name = name; });
  },
};
