/* ═══════════════════════════════════════════════════════════════════════
   DOM helpers — a tiny hyperscript so workspaces build UI without a framework.
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * h('div.card', { onclick, dataFoo }, [children])
 * - tag supports `tag#id.class.class` shorthand
 * - props: on* => addEventListener, data* => data-attr, else attribute/property
 * - children: string | Node | array (nullish skipped)
 */
export function h(spec, props = {}, children = []) {
  const { tag, id, classes } = parseSpec(spec);
  const el = document.createElementNS(
    tag === 'svg' || tag === 'path' || tag === 'rect' || tag === 'circle' || tag === 'line' || tag === 'polyline'
      ? 'http://www.w3.org/2000/svg'
      : 'http://www.w3.org/1999/xhtml',
    tag
  );
  if (id) el.id = id;
  if (classes.length) el.setAttribute('class', classes.join(' '));

  for (const [key, val] of Object.entries(props || {})) {
    if (val == null || val === false) continue;
    if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'class') {
      el.setAttribute('class', [classes.join(' '), val].filter(Boolean).join(' '));
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (key === 'html') {
      el.innerHTML = val;
    } else if (key.startsWith('data') && key.length > 4) {
      const attr = 'data-' + key.slice(4).replace(/([A-Z])/g, '-$1').toLowerCase();
      el.setAttribute(attr, val === true ? '' : val);
    } else if (key in el && !(el instanceof SVGElement)) {
      try { el[key] = val; } catch { el.setAttribute(key, val); }
    } else {
      el.setAttribute(key, val === true ? '' : val);
    }
  }

  appendChildren(el, children);
  return el;
}

function parseSpec(spec) {
  const m = /^([a-zA-Z0-9]+)?(#[-\w]+)?((?:\.[-\w]+)*)$/.exec(spec) || [];
  return {
    tag: m[1] || 'div',
    id: m[2] ? m[2].slice(1) : null,
    classes: m[3] ? m[3].split('.').filter(Boolean) : [],
  };
}

function appendChildren(el, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const c of list) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c))
      : c);
  }
}

/** Build an inline SVG icon from a raw <svg>…</svg> string. */
export function icon(svg, cls) {
  const wrap = document.createElement('span');
  wrap.className = 'icon' + (cls ? ' ' + cls : '');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = svg;
  return wrap.firstElementChild || wrap;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function mount(parent, ...nodes) {
  for (const n of nodes) if (n) parent.appendChild(n);
  return parent;
}

/** Focus-trap a container while `active`. Returns a cleanup fn. */
export function trapFocus(container, { onEscape } = {}) {
  const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const prevFocus = document.activeElement;
  // Listen on document: the modal often rebuilds its inner controls (e.g. tab
  // switches clear focus to <body>), so a container-scoped listener would miss
  // Escape. Tab-cycling is still scoped to the container's focusables.
  function keydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); onEscape?.(); return; }
    if (e.key !== 'Tab') return;
    const nodes = $$(sel, container).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (!container.contains(active)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', keydown);
  const firstFocusable = $(sel, container);
  firstFocusable?.focus();
  return () => {
    document.removeEventListener('keydown', keydown);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  };
}
