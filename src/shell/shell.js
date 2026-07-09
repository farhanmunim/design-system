/* ═══════════════════════════════════════════════════════════════════════
   App shell — header, workspace switcher, and shared-control wiring.
   Header buttons (undo/redo/reset/import/export) dispatch to whichever
   workspace is active via its getStore()/getExportTargets() contract.
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear, mount } from '../core/dom.js';
import { theme } from './theme.js';
import { palette } from './commandPalette.js';
import { openExport } from './exportModal.js';
import { toast } from './toast.js';
import * as icons from './icons.js';

export function createShell({ root, workspaces, initialId }) {
  let active = null;
  let unsubStore = null;

  const stage = h('main.app-stage', { id: 'workspace-stage' });

  const undoBtn = iconBtn(icons.undo, 'Undo (⌘Z)', () => active?.getStore()?.undo());
  const redoBtn = iconBtn(icons.redo, 'Redo (⌘⇧Z)', () => active?.getStore()?.redo());
  const resetBtn = iconBtn(icons.reset, 'Reset workspace', () => {
    if (confirm('Reset this workspace to defaults? This cannot be undone.')) {
      active?.getStore()?.reset();
      toast('Workspace reset', { type: 'info' });
    }
  });

  const tabsWrap = h('div.ws-tabs', { role: 'tablist', 'aria-label': 'Workspaces' });

  const themeBtn = iconBtn(theme.get() === 'dark' ? icons.sun : icons.moon, 'Toggle theme', () => {
    theme.toggle();
  });
  theme.subscribe((t) => { themeBtn.innerHTML = t === 'dark' ? icons.sun : icons.moon; });

  const header = h('header.app-header', { role: 'banner' }, [
    h('a.app-brand', { href: './', title: 'Reload' }, [
      h('span.app-brand__logo', { html: icons.logo }),
      h('span.app-brand__name', {}, 'Studio'),
    ]),
    tabsWrap,
    h('div.app-header__spacer'),
    h('div.app-header__group', {}, [resetBtn, undoBtn, redoBtn]),
    h('div.app-header__sep'),
    h('div.app-header__group', {}, [
      textBtn(icons.import_, 'Import', () => active?.onImport?.()),
      textBtn(icons.export_, 'Export', openActiveExport),
    ]),
    h('div.app-header__sep'),
    h('div.app-header__group', {}, [
      iconBtn(icons.search, 'Command palette (⌘K)', () => palette.open()),
      themeBtn,
    ]),
  ]);

  clear(root);
  mount(root, header, stage);

  function renderTabs() {
    clear(tabsWrap);
    workspaces.forEach((ws) => {
      tabsWrap.appendChild(h('button.ws-tab', {
        role: 'tab',
        'aria-selected': String(ws.id === active?.id),
        class: ws.id === active?.id ? 'is-active' : '',
        onclick: () => switchTo(ws.id),
      }, [ws.icon ? h('span.ws-tab__icon', { html: ws.icon }) : null, ws.label]));
    });
  }

  function refreshHeader() {
    const store = active?.getStore?.();
    undoBtn.disabled = !store?.canUndo?.();
    redoBtn.disabled = !store?.canRedo?.();
    setBadge(undoBtn, store?.undoCount?.() || 0);
    setBadge(redoBtn, store?.redoCount?.() || 0);
  }

  function openActiveExport() {
    const targets = active?.getExportTargets?.() || [];
    if (!targets.length) { toast('Nothing to export here', { type: 'info' }); return; }
    openExport(`Export — ${active.label}`, targets);
  }

  function switchTo(id) {
    if (active?.id === id) return;
    if (active) { active.unmount?.(); }
    if (unsubStore) { unsubStore(); unsubStore = null; }
    active = workspaces.find((w) => w.id === id) || workspaces[0];
    clear(stage);
    active.mount(stage);
    const store = active.getStore?.();
    if (store?.subscribe) unsubStore = store.subscribe(() => refreshHeader());
    palette.setScopeProvider(() => active.getCommands?.() || []);
    try { localStorage.setItem('dsb-active-ws', active.id); } catch {}
    renderTabs();
    refreshHeader();
  }

  // Global shortcuts
  window.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open(); }
    else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); active?.getStore()?.undo(); }
    else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); active?.getStore()?.redo(); }
    else if (mod && e.key.toLowerCase() === 'e') { e.preventDefault(); openActiveExport(); }
  });

  palette.registerGlobal([
    { group: 'App', title: 'Toggle theme', run: () => theme.toggle() },
    { group: 'App', title: 'Export…', run: openActiveExport },
    ...workspaces.map((ws) => ({ group: 'Go to', title: ws.label, run: () => switchTo(ws.id) })),
  ]);

  switchTo(initialId || workspaces[0].id);

  return { switchTo, refreshHeader };
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function iconBtn(svg, label, onclick) {
  const b = h('button.app-btn.app-btn--ghost.app-btn--icon', { 'aria-label': label, title: label, onclick });
  b.innerHTML = svg;
  return b;
}
function textBtn(svg, label, onclick) {
  const b = h('button.app-btn.app-btn--ghost', { onclick });
  b.innerHTML = svg + `<span>${label}</span>`;
  return b;
}
function setBadge(btn, n) {
  let badge = btn.querySelector('.app-badge');
  if (n > 0) {
    if (!badge) { badge = h('span.app-badge'); btn.appendChild(badge); }
    badge.textContent = n > 99 ? '99+' : String(n);
  } else if (badge) {
    badge.remove();
  }
}
