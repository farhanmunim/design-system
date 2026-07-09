/* ═══════════════════════════════════════════════════════════════════════
   Design System workspace — token editor + live preview + CSS output.
   Implements the shell workspace contract.
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear } from '../core/dom.js';
import { toast } from '../shell/toast.js';
import * as icons from '../shell/icons.js';
import { highlight } from '../shell/highlight.js';
import { designStore, tokenOps, defaultTokens } from './designStore.js';
import { generateCSS, generateTokensCSS, generateFrameworkCSS } from './cssEngine.js';
import { renderPreview } from './preview.js';

let container, unsub;
let cssTab = 'tokens';

function applyVars(previewEl, state) {
  const dark = state.settings.previewTheme === 'dark';
  for (const c of state.categories) {
    for (const tok of c.tokens) {
      const val = dark && tok.dark ? tok.dark : tok.value;
      previewEl.style.setProperty('--' + tok.name, val);
    }
  }
  previewEl.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function mount(root) {
  container = root;
  designStore.init();

  const previewInner = h('div.ds-preview');
  const previewPane = h('div.ds-preview-pane', {}, [previewInner]);

  const previewThemeBtn = h('button.app-btn.app-btn--ghost.app-btn--icon', { 'aria-label': 'Toggle preview theme', title: 'Preview light/dark' });
  const setThemeIcon = () => { previewThemeBtn.innerHTML = designStore.getState().settings.previewTheme === 'dark' ? icons.sun : icons.moon; };
  previewThemeBtn.addEventListener('click', () => {
    const cur = designStore.getState().settings.previewTheme;
    tokenOps.setSetting('previewTheme', cur === 'dark' ? 'light' : 'dark');
  });

  const previewHeader = h('div.ds-pane-head', {}, [
    h('span.ds-pane-title', {}, 'Preview'),
    h('div.app-header__spacer'),
    previewThemeBtn,
  ]);

  const editorList = h('div.ds-editor__list');
  const editorPane = h('aside.ds-editor', {}, [
    h('div.ds-pane-head', {}, [h('span.ds-pane-title', {}, 'Tokens')]),
    editorList,
  ]);

  const cssCode = h('code.ds-css__code');
  const cssTabs = h('div.ds-css__tabs');
  const cssPanel = h('div.ds-css', {}, [
    h('div.ds-css__head', {}, [
      cssTabs,
      h('div.app-header__spacer'),
      h('button.app-btn.app-btn--ghost.app-btn--icon', { title: 'Copy CSS', 'aria-label': 'Copy CSS', onclick: copyCSS }, '⧉'),
    ]),
    h('pre.ds-css__pre', {}, [cssCode]),
  ]);

  const layout = h('div.ds', {}, [
    h('div.ds__main', {}, [previewHeader, previewPane]),
    h('div.ds__side', {}, [editorPane, cssPanel]),
  ]);
  clear(root);
  root.appendChild(layout);

  function renderCSSTabs() {
    clear(cssTabs);
    [['tokens', 'Tokens'], ['framework', 'Framework']].forEach(([id, label]) => {
      cssTabs.appendChild(h('button.ds-css__tab', {
        class: id === cssTab ? 'is-active' : '',
        onclick: () => { cssTab = id; renderAll(); },
      }, label));
    });
  }

  let editorSig = '';
  function editorSignature(state) {
    return state.categories.map((c) => c.id + ':' + c.tokens.map((t) => t.id + t.name).join(',')).join('|');
  }

  function renderEditor(force) {
    const state = designStore.getState();
    const sig = editorSignature(state);
    // Only rebuild the editor on structural change (add/remove/rename) so live
    // value edits (e.g. dragging a color picker) don't detach the input.
    if (!force && sig === editorSig) return;
    editorSig = sig;
    clear(editorList);
    for (const cat of state.categories) {
      const group = h('div.tk-group', {}, [
        h('div.tk-group__head', {}, [
          h('span.tk-group__label', {}, cat.label),
          h('button.tk-add', { title: 'Add token', 'aria-label': 'Add token', onclick: () => tokenOps.addToken(cat.id) }, '+'),
        ]),
      ]);
      for (const tok of cat.tokens) group.appendChild(tokenRow(cat, tok));
      editorList.appendChild(group);
    }
  }

  function tokenRow(cat, tok) {
    const isColor = cat.kind === 'color';
    const nameInput = h('input.tk-name', { type: 'text', value: tok.name, 'aria-label': 'Token name' });
    nameInput.addEventListener('change', () => tokenOps.update(tok.id, { name: nameInput.value.trim().replace(/^--/, '') }));

    const valInput = h('input.tk-val', { type: 'text', value: tok.value, 'aria-label': 'Value' });
    valInput.addEventListener('change', () => tokenOps.update(tok.id, { value: valInput.value }));

    const controls = [nameInput];
    if (isColor) {
      const sw = h('input.tk-swatch', { type: 'color', value: hex(tok.value), 'aria-label': 'Pick color' });
      sw.addEventListener('input', () => { valInput.value = sw.value; tokenOps.update(tok.id, { value: sw.value }, { history: false }); });
      sw.addEventListener('change', () => tokenOps.update(tok.id, { value: sw.value }));
      controls.push(h('div.tk-valwrap', {}, [sw, valInput]));
    } else {
      controls.push(valInput);
    }

    const rows = [h('div.tk-row', {}, controls)];
    if (isColor) {
      const darkVal = h('input.tk-val', { type: 'text', value: tok.dark || '', placeholder: 'dark value', 'aria-label': 'Dark value' });
      darkVal.addEventListener('change', () => tokenOps.update(tok.id, { dark: darkVal.value || undefined }));
      const darkSw = h('input.tk-swatch', { type: 'color', value: hex(tok.dark || tok.value), 'aria-label': 'Pick dark color' });
      darkSw.addEventListener('input', () => { darkVal.value = darkSw.value; tokenOps.update(tok.id, { dark: darkSw.value }, { history: false }); });
      darkSw.addEventListener('change', () => tokenOps.update(tok.id, { dark: darkSw.value }));
      rows.push(h('div.tk-row.tk-row--dark', {}, [h('span.tk-moon', { html: icons.moon }), h('div.tk-valwrap', {}, [darkSw, darkVal])]));
    }
    if (tok.desc) rows.push(h('span.tk-desc', {}, tok.desc));
    return h('div.tk', {}, rows);
  }

  function renderAll() {
    const state = designStore.getState();
    renderCSSTabs();
    renderEditor();
    applyVars(previewInner, state);
    renderPreview(previewInner, state);
    const css = generateCSS(state, cssTab);
    cssCode.innerHTML = highlight(css, 'css');
    cssCode.dataset.raw = css;
    setThemeIcon();
  }

  async function copyCSS() {
    const ok = await navigator.clipboard.writeText(cssCode.dataset.raw || '').then(() => true).catch(() => false);
    toast(ok ? 'CSS copied' : 'Copy failed', { type: ok ? 'success' : 'error' });
  }

  unsub = designStore.subscribe(() => renderAll());
  renderAll();
}

function unmount() { unsub?.(); if (container) clear(container); }

function exportTargets() {
  return [
    { id: 'tokens', label: 'Tokens CSS', filename: 'tokens.css', mime: 'text/css', language: 'css', generate: () => generateTokensCSS(designStore.getState()) },
    { id: 'framework', label: 'Framework CSS', filename: 'style.css', mime: 'text/css', language: 'css', generate: () => generateTokensCSS(designStore.getState()) + '\n\n' + generateFrameworkCSS(designStore.getState()) },
    { id: 'json', label: 'Tokens JSON', filename: 'design-tokens.json', mime: 'application/json', language: 'plain', generate: () => JSON.stringify(designStore.getState(), null, 2) },
  ];
}

function onImport() {
  const input = h('input', { type: 'file', accept: 'application/json', style: { display: 'none' } });
  document.body.appendChild(input);
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) { input.remove(); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.categories)) throw new Error('bad');
        designStore.replace(data);
        toast('Tokens imported', { type: 'success' });
      } catch { toast('Invalid tokens JSON', { type: 'error' }); }
      input.remove();
    };
    reader.readAsText(file);
  });
  input.click();
}

function getCommands() {
  return [
    { group: 'Design', title: 'Reset tokens to defaults', run: () => { designStore.replace(defaultTokens()); } },
    { group: 'Design', title: 'Toggle preview theme', run: () => { const c = designStore.getState().settings.previewTheme; tokenOps.setSetting('previewTheme', c === 'dark' ? 'light' : 'dark'); } },
  ];
}

function hex(v) {
  const s = (v || '').trim();
  return /^#[0-9a-f]{6}$/i.test(s) ? s : '#000000';
}

export default {
  id: 'design',
  label: 'Design System',
  icon: icons.box,
  mount,
  unmount,
  getStore: () => designStore,
  getExportTargets: exportTargets,
  getCommands,
  onImport,
};
