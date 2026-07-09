/* App-level light/dark theme (distinct from the tokens the user is editing). */

const KEY = 'dsb-app-theme';
let current = 'light';
const listeners = new Set();

export const theme = {
  init() {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    current = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    apply();
  },
  get() { return current; },
  set(next) {
    current = next === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, current); } catch {}
    apply();
  },
  toggle() { this.set(current === 'dark' ? 'light' : 'dark'); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

function apply() {
  document.documentElement.setAttribute('data-theme', current);
  listeners.forEach((fn) => fn(current));
}
