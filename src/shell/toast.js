/* Minimal toast notifications. */
import { h } from '../core/dom.js';

let container = null;

function ensure() {
  if (!container) {
    container = h('div.toast-stack', { role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, { type = 'info', duration = 2400 } = {}) {
  const el = h(`div.toast.toast--${type}`, {}, message);
  ensure().appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => el.remove(), 250);
  }, duration);
}
