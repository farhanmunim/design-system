/* ═══════════════════════════════════════════════════════════════════════
   createStore — generalized from the original TokenStore.

   state + history (undo/redo) + localStorage persistence + pub/sub.
   The load-bearing method is `commit(mutator, opts)`:
     - opts.history === false  → mutate + persist + notify, but DON'T snapshot
       (used for continuous drags: dozens of moves, then one snapshot on release)
     - opts.detail             → passed to subscribers for partial re-render
   ═══════════════════════════════════════════════════════════════════════ */

import { clone } from './util.js';

export function createStore({ storageKey, getDefaultState, migrate = (s) => s, maxHistory = 50 }) {
  let state = null;
  let history = [];
  let idx = -1;
  const listeners = new Set();

  const snapshot = () => clone(state);
  const notify = (detail) => listeners.forEach((fn) => fn(state, detail));

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // Quota or private-mode failures shouldn't crash the app, but surface once.
      console.warn(`[store:${storageKey}] persist failed`, e);
    }
  }

  function pushHistory() {
    history = history.slice(0, idx + 1);
    history.push(snapshot());
    if (history.length > maxHistory) history.shift();
    idx = history.length - 1;
  }

  function init() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) loaded = migrate(JSON.parse(raw));
    } catch { loaded = null; }
    state = loaded || getDefaultState();
    history = [snapshot()];
    idx = 0;
    notify(null);
    return state;
  }

  function commit(mutator, { history: keepHistory = true, detail = null } = {}) {
    mutator(state);
    if (keepHistory) pushHistory();
    persist();
    notify(detail);
  }

  function replace(next, { history: keepHistory = true } = {}) {
    state = migrate(next);
    if (keepHistory) pushHistory();
    persist();
    notify(null);
  }

  function reset() {
    state = getDefaultState();
    history = [snapshot()];
    idx = 0;
    persist();
    notify(null);
  }

  function undo() {
    if (idx <= 0) return;
    idx--;
    state = clone(history[idx]);
    persist();
    notify({ type: 'history' });
  }

  function redo() {
    if (idx >= history.length - 1) return;
    idx++;
    state = clone(history[idx]);
    persist();
    notify({ type: 'history' });
  }

  return {
    init,
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    commit,
    replace,
    reset,
    undo,
    redo,
    canUndo: () => idx > 0,
    canRedo: () => idx < history.length - 1,
    undoCount: () => idx,
    redoCount: () => history.length - 1 - idx,
  };
}
