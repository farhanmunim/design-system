/* ═══════════════════════════════════════════════════════════════════════
   Design System workspace store + token defaults + operations.

   Tokens are grouped by category. Each token: { id, name, value, dark?, desc }
   `name` is the CSS custom-property name without the leading `--`.
   Color tokens carry an optional `dark` value → emitted in a
   [data-theme="dark"] block. Everything the CSS engine prints traces back to
   a token here (no hardcoded leaks).
   ═══════════════════════════════════════════════════════════════════════ */
import { createStore } from '../core/store.js';
import { uid } from '../core/id.js';

let seq = 0;
const t = (name, value, dark, desc) => ({ id: `t${seq++}`, name, value, ...(dark ? { dark } : {}), desc: desc || '' });

export function defaultTokens() {
  seq = 0;
  return {
    version: 1,
    settings: { baseFontSize: 16, previewTheme: 'light' },
    categories: [
      {
        id: 'color', label: 'Color', kind: 'color',
        tokens: [
          t('accent', '#2563eb', '#3b82f6', 'Primary brand / action color'),
          t('accent-fg', '#ffffff', '#ffffff', 'Text on accent surfaces'),
          t('accent-hover', '#1d4ed8', '#60a5fa', 'Accent hover state'),
          t('bg', '#ffffff', '#0b0d10', 'Page background'),
          t('surface', '#f7f8fa', '#15181d', 'Raised surface / card'),
          t('surface-2', '#eef0f3', '#1d2128', 'Sunken / subtle surface'),
          t('fg', '#0b0d10', '#f2f4f7', 'Primary text'),
          t('fg-muted', '#5b6472', '#9aa4b2', 'Secondary text'),
          t('border', '#e3e6ea', '#282d35', 'Hairline borders'),
          t('success', '#16a34a', '#22c55e', 'Positive status'),
          t('warning', '#d97706', '#f59e0b', 'Caution status'),
          t('danger', '#dc2626', '#ef4444', 'Destructive / error'),
        ],
      },
      {
        id: 'typography', label: 'Typography', kind: 'text',
        tokens: [
          t('font-sans', "'Geist', system-ui, sans-serif", null, 'Primary UI font'),
          t('font-mono', "'Geist Mono', ui-monospace, monospace", null, 'Monospace font'),
          t('fs-sm', '0.8125rem', null, 'Small text'),
          t('fs-base', '0.9375rem', null, 'Body text'),
          t('fs-lg', '1.125rem', null, 'Large text'),
          t('fs-xl', '1.5rem', null, 'Heading'),
          t('fs-2xl', '2rem', null, 'Large heading'),
          t('fs-3xl', '2.75rem', null, 'Display'),
          t('lh-tight', '1.15', null, 'Tight line height'),
          t('lh-normal', '1.6', null, 'Body line height'),
          t('weight-normal', '400', null, ''),
          t('weight-medium', '540', null, ''),
          t('weight-bold', '680', null, ''),
        ],
      },
      {
        id: 'spacing', label: 'Spacing', kind: 'size',
        tokens: [
          t('sp-1', '0.25rem'), t('sp-2', '0.5rem'), t('sp-3', '0.75rem'),
          t('sp-4', '1rem'), t('sp-5', '1.5rem'), t('sp-6', '2rem'),
          t('sp-7', '3rem'), t('sp-8', '4rem'),
        ],
      },
      {
        id: 'radius', label: 'Radius', kind: 'size',
        tokens: [
          t('radius-sm', '6px'), t('radius-md', '10px'),
          t('radius-lg', '16px'), t('radius-full', '9999px'),
        ],
      },
      {
        id: 'shadow', label: 'Shadow', kind: 'shadow',
        tokens: [
          t('shadow-sm', '0 1px 2px rgba(16,24,40,0.06)', '0 1px 2px rgba(0,0,0,0.4)'),
          t('shadow-md', '0 4px 12px rgba(16,24,40,0.08)', '0 4px 14px rgba(0,0,0,0.5)'),
          t('shadow-lg', '0 12px 32px rgba(16,24,40,0.12)', '0 16px 40px rgba(0,0,0,0.6)'),
        ],
      },
    ],
  };
}

export function migrateTokens(saved) {
  if (!saved || !Array.isArray(saved.categories)) return defaultTokens();
  return saved;
}

export const designStore = createStore({
  storageKey: 'dsb-design-v2',
  getDefaultState: defaultTokens,
  migrate: migrateTokens,
});

export const tokenOps = {
  update(tokenId, patch, opts) {
    designStore.commit((s) => {
      for (const c of s.categories) {
        const tok = c.tokens.find((x) => x.id === tokenId);
        if (tok) { Object.assign(tok, patch); return; }
      }
    }, opts);
  },
  setSetting(key, value) {
    designStore.commit((s) => { s.settings[key] = value; });
  },
  addToken(categoryId) {
    let created;
    designStore.commit((s) => {
      const c = s.categories.find((x) => x.id === categoryId);
      if (!c) return;
      const tok = { id: uid('t'), name: 'custom-' + (c.tokens.length + 1), value: c.kind === 'color' ? '#000000' : '1rem', desc: '' };
      c.tokens.push(tok);
      created = tok.id;
    });
    return created;
  },
  removeToken(tokenId) {
    designStore.commit((s) => {
      for (const c of s.categories) c.tokens = c.tokens.filter((x) => x.id !== tokenId);
    });
  },
};

/** Flatten to { name: {value, dark} } for the CSS engine + live theming. */
export function flatTokens(state) {
  const map = {};
  for (const c of state.categories) for (const tok of c.tokens) map[tok.name] = tok;
  return map;
}
