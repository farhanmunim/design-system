/* ═══════════════════════════════════════════════════════════════════════
   Command palette. Workspaces register commands; the active workspace's
   commands (plus global ones) are searchable. Fuzzy substring match,
   arrow-key navigation, Enter to run.
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear, trapFocus } from '../core/dom.js';

let globalCommands = [];
let scopedProvider = () => [];
let overlay = null;
let releaseTrap = null;

export const palette = {
  registerGlobal(cmds) { globalCommands = globalCommands.concat(cmds); },
  setScopeProvider(fn) { scopedProvider = fn; },
  open,
  close,
};

function allCommands() {
  return [...scopedProvider(), ...globalCommands];
}

function score(cmd, q) {
  const hay = (cmd.title + ' ' + (cmd.group || '')).toLowerCase();
  if (!q) return 1;
  const needle = q.toLowerCase();
  if (hay.includes(needle)) return 2;
  // subsequence match
  let i = 0;
  for (const ch of needle) {
    i = hay.indexOf(ch, i);
    if (i === -1) return 0;
    i++;
  }
  return 1;
}

function open() {
  close();
  let sel = 0;
  let items = [];

  const input = h('input.cmd-input', {
    type: 'text', placeholder: 'Search commands…', 'aria-label': 'Search commands',
    autocomplete: 'off', spellcheck: 'false',
  });
  const list = h('ul.cmd-list', { role: 'listbox' });

  function refresh() {
    const q = input.value.trim();
    items = allCommands()
      .map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.c)
      .slice(0, 40);
    sel = 0;
    draw();
  }

  function draw() {
    clear(list);
    if (!items.length) {
      list.appendChild(h('li.cmd-empty', {}, 'No matching commands'));
      return;
    }
    items.forEach((c, i) => {
      list.appendChild(h('li.cmd-item', {
        role: 'option',
        class: i === sel ? 'is-active' : '',
        'aria-selected': String(i === sel),
        onclick: () => run(c),
        onmousemove: () => { if (sel !== i) { sel = i; draw(); } },
      }, [
        c.group ? h('span.cmd-item__group', {}, c.group) : null,
        h('span.cmd-item__title', {}, c.title),
      ]));
    });
  }

  function run(cmd) { close(); cmd.run(); }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); draw(); scrollSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); scrollSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) run(items[sel]); }
  });

  function scrollSel() {
    const active = list.querySelector('.is-active');
    active?.scrollIntoView({ block: 'nearest' });
  }

  const panel = h('div.cmd-panel', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command palette' }, [
    h('div.cmd-search', {}, [input]),
    list,
  ]);
  overlay = h('div.modal-overlay.modal-overlay--top', { onclick: (e) => { if (e.target === overlay) close(); } }, [panel]);
  document.body.appendChild(overlay);
  refresh();
  releaseTrap = trapFocus(panel, { onEscape: close });
  input.focus();
}

function close() {
  if (releaseTrap) { releaseTrap(); releaseTrap = null; }
  if (overlay) { overlay.remove(); overlay = null; }
}
