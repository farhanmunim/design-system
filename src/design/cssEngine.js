/* ═══════════════════════════════════════════════════════════════════════
   CSS generator for the design workspace. Two outputs:
     - 'tokens'    → :root {…} + [data-theme="dark"] {…} custom properties
     - 'framework' → reset + component classes wired to those tokens
   Every emitted value references a token — no hardcoded leaks.
   ═══════════════════════════════════════════════════════════════════════ */

export function generateTokensCSS(state) {
  const out = [];
  out.push(':root {');
  for (const c of state.categories) {
    out.push(`  /* ${c.label} */`);
    for (const tok of c.tokens) out.push(`  --${tok.name}: ${tok.value};`);
  }
  out.push('}');

  const darks = [];
  for (const c of state.categories) for (const tok of c.tokens) if (tok.dark) darks.push(tok);
  if (darks.length) {
    out.push('');
    out.push('[data-theme="dark"] {');
    for (const tok of darks) out.push(`  --${tok.name}: ${tok.dark};`);
    out.push('}');
  }
  return out.join('\n');
}

export function generateFrameworkCSS(state) {
  const out = [];
  out.push('/* Reset */');
  out.push('*,*::before,*::after { box-sizing: border-box; }');
  out.push('body { margin: 0; font-family: var(--font-sans); font-size: var(--fs-base); line-height: var(--lh-normal); color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }');
  out.push('');
  out.push('/* Typography */');
  out.push('h1 { font-size: var(--fs-3xl); line-height: var(--lh-tight); font-weight: var(--weight-bold); margin: 0 0 var(--sp-4); }');
  out.push('h2 { font-size: var(--fs-2xl); line-height: var(--lh-tight); font-weight: var(--weight-bold); margin: 0 0 var(--sp-3); }');
  out.push('h3 { font-size: var(--fs-xl); line-height: var(--lh-tight); font-weight: var(--weight-medium); margin: 0 0 var(--sp-2); }');
  out.push('p  { margin: 0 0 var(--sp-4); color: var(--fg); }');
  out.push('a  { color: var(--accent); text-underline-offset: 2px; }');
  out.push('code { font-family: var(--font-mono); font-size: 0.9em; background: var(--surface-2); padding: 0.1em 0.35em; border-radius: var(--radius-sm); }');
  out.push('');
  out.push('/* Buttons */');
  out.push('.btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2); padding: var(--sp-2) var(--sp-4); font: inherit; font-weight: var(--weight-medium); border-radius: var(--radius-md); border: 1px solid transparent; cursor: pointer; transition: background .15s, border-color .15s, opacity .15s; }');
  out.push('.btn--primary { background: var(--accent); color: var(--accent-fg); }');
  out.push('.btn--primary:hover { background: var(--accent-hover); }');
  out.push('.btn--secondary { background: var(--surface); color: var(--fg); border-color: var(--border); }');
  out.push('.btn--secondary:hover { background: var(--surface-2); }');
  out.push('.btn--ghost { background: transparent; color: var(--fg); }');
  out.push('.btn--ghost:hover { background: var(--surface); }');
  out.push('.btn--danger { background: var(--danger); color: var(--accent-fg); }');
  out.push('.btn:disabled { opacity: 0.5; cursor: not-allowed; }');
  out.push('');
  out.push('/* Badge */');
  out.push('.badge { display: inline-flex; align-items: center; padding: 0.15em var(--sp-2); font-size: var(--fs-sm); font-weight: var(--weight-medium); border-radius: var(--radius-full); background: var(--surface-2); color: var(--fg-muted); }');
  out.push('.badge--accent  { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); }');
  out.push('.badge--success { background: color-mix(in srgb, var(--success) 16%, transparent); color: var(--success); }');
  out.push('.badge--danger  { background: color-mix(in srgb, var(--danger) 16%, transparent); color: var(--danger); }');
  out.push('');
  out.push('/* Input */');
  out.push('.input { width: 100%; padding: var(--sp-2) var(--sp-3); font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-md); transition: border-color .15s, box-shadow .15s; }');
  out.push('.input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent); }');
  out.push('');
  out.push('/* Card */');
  out.push('.card { padding: var(--sp-5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }');
  out.push('');
  out.push('/* Alert */');
  out.push('.alert { padding: var(--sp-3) var(--sp-4); border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); color: var(--fg); }');
  out.push('.alert--success { border-color: color-mix(in srgb, var(--success) 40%, transparent); background: color-mix(in srgb, var(--success) 10%, transparent); }');
  out.push('.alert--danger  { border-color: color-mix(in srgb, var(--danger) 40%, transparent); background: color-mix(in srgb, var(--danger) 10%, transparent); }');
  return out.join('\n');
}

export function generateCSS(state, tab) {
  if (tab === 'framework') {
    return generateTokensCSS(state) + '\n\n' + generateFrameworkCSS(state);
  }
  return generateTokensCSS(state);
}
