/* ═══════════════════════════════════════════════════════════════════════
   Shared export modal. Each workspace supplies "targets":
     { id, label, filename, mime, language, generate() → string, help? → html }
   The modal renders a tab per target, a copy/download bar, and optional
   collapsible install instructions (help).
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear, trapFocus } from '../core/dom.js';
import { copyText, downloadText } from '../core/util.js';
import { toast } from './toast.js';
import { highlight } from './highlight.js';

let overlay = null;
let releaseTrap = null;

export function openExport(title, targets) {
  if (!targets || !targets.length) return;
  close();

  let activeId = targets[0].id;
  const codeEl = h('code.export-code');
  const preEl = h('pre.export-pre', {}, [codeEl]);
  const helpWrap = h('div.export-help');
  const tabsWrap = h('div.export-tabs', { role: 'tablist' });

  function render() {
    const target = targets.find((t) => t.id === activeId);
    clear(tabsWrap);
    targets.forEach((t) => {
      tabsWrap.appendChild(h('button.export-tab', {
        role: 'tab',
        'aria-selected': String(t.id === activeId),
        class: t.id === activeId ? 'is-active' : '',
        onclick: () => { activeId = t.id; render(); },
      }, t.label));
    });

    let code = '';
    try { code = target.generate(); } catch (e) { code = `/* generation error: ${e.message} */`; }
    codeEl.innerHTML = highlight(code, target.language);
    codeEl.dataset.raw = code;

    clear(helpWrap);
    if (target.help) {
      const details = h('details.export-install');
      details.appendChild(h('summary', {}, `How to add ${target.label} to your project`));
      const body = h('div.export-install__body');
      body.innerHTML = target.help;
      details.appendChild(body);
      helpWrap.appendChild(details);
    }
  }

  const bar = h('div.export-bar', {}, [
    h('button.app-btn.app-btn--ghost', {
      onclick: async () => {
        const ok = await copyText(codeEl.dataset.raw || '');
        toast(ok ? 'Copied to clipboard' : 'Copy failed', { type: ok ? 'success' : 'error' });
      },
    }, 'Copy'),
    h('button.app-btn.app-btn--primary', {
      onclick: () => {
        const target = targets.find((t) => t.id === activeId);
        downloadText(target.filename, codeEl.dataset.raw || '', target.mime || 'text/plain');
        toast(`Downloaded ${target.filename}`, { type: 'success' });
      },
    }, 'Download'),
  ]);

  const panel = h('div.export-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    h('header.export-modal__head', {}, [
      h('h2.export-modal__title', {}, title),
      h('button.app-btn.app-btn--ghost.app-btn--icon', { 'aria-label': 'Close', onclick: close }, '✕'),
    ]),
    tabsWrap,
    preEl,
    helpWrap,
    bar,
  ]);

  overlay = h('div.modal-overlay', { onclick: (e) => { if (e.target === overlay) close(); } }, [panel]);
  document.body.appendChild(overlay);
  render();
  releaseTrap = trapFocus(panel, { onEscape: close });
}

export function close() {
  if (releaseTrap) { releaseTrap(); releaseTrap = null; }
  if (overlay) { overlay.remove(); overlay = null; }
}
