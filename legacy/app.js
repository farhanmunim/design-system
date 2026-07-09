/**
 * Design System Builder v4
 * Modules: TokenStore → CSSEngine → ThemeEngine → PreviewEngine → UI
 * No frameworks, no build step, vanilla ES6+
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */

function uuid() {
  return 'id-' + Math.random().toString(36).slice(2, 11);
}

function clamp(min, max, minVw, maxVw) {
  // clamp(min, calc(min + (max - min) * ((100vw - minVw) / (maxVw - minVw))), max)
  const slope = (max - min) / (maxVw - minVw);
  const intercept = min - slope * minVw;
  const sign = intercept >= 0 ? '+' : '-';
  const absIntercept = Math.abs(intercept).toFixed(4);
  return `clamp(${min.toFixed(4)}rem, calc(${(slope * 100).toFixed(4)}vw ${sign} ${absIntercept}rem), ${max.toFixed(4)}rem)`;
}

function remToPx(rem, base) {
  return parseFloat(rem) * base;
}

function pxToRem(px, base) {
  return parseFloat(px) / base;
}

/**
 * Convert a user-typed value back to a stored rem string.
 * - If inputUnit is 'rem': pass through as-is.
 * - If inputUnit is 'px': convert numeric/px-suffixed values to rem,
 *   but only when the stored value was rem (not a var(), hex, keyword…).
 *   Values that were originally px (like 9999px) stay as px.
 */
function pxInputToRem(typed, settings, storedValue) {
  if (settings.inputUnit !== 'px') return typed;
  // Pass through non-numeric values: var(), #hex, keywords, etc.
  if (!typed || typed.startsWith('var(') || typed.startsWith('#') || /^[a-z]/.test(typed)) return typed;
  // Only convert when the stored token value was rem-based (preserve intentional px like 9999px)
  const storedIsRem = typeof storedValue === 'string' && storedValue.endsWith('rem');
  if (!storedIsRem) return typed;
  const num = parseFloat(typed);
  if (isNaN(num)) return typed;
  const rem = num / settings.baseFontSize;
  return (rem === 0 ? '0' : rem.toFixed(4).replace(/\.?0+$/, '')) + 'rem';
}


function looksLikeColor(v) {
  const s = (v || '').trim();
  return /^#([0-9a-f]{3,8})$/i.test(s)
    || /^rgba?\(/.test(s)
    || /^hsla?\(/.test(s)
    || /^oklch\(|^oklab\(|^color\(/.test(s)
    || /^var\(--neutral-|^var\(--brand-|^var\(--success|^var\(--warning|^var\(--error|^var\(--info|^var\(--bg-|^var\(--fg-|^var\(--accent|^var\(--border|^var\(--status/.test(s);
}

function isColorCategory(cat) {
  return cat === 'color-primitives' || cat === 'color-semantic';
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   DEFAULT TOKEN DATA
   ═══════════════════════════════════════════════════════════════════════ */

function buildDefaultTokens() {
  function tok(name, value, darkValue, description, extra) {
    return {
      id: uuid(),
      name,
      value,
      darkValue: darkValue || '',
      description: description || '',
      category: '',
      locked: false,
      isCustom: false,
      defaultValue: value,
      defaultDarkValue: darkValue || '',
      ...extra,
    };
  }

  const colorPrimitives = [
    // Neutral gray scale (light / dark)
    tok('neutral-0',   '#ffffff', '#000000', 'Pure white / black'),
    tok('neutral-50',  '#fafafa', '#0a0a0a', 'Background secondary'),
    tok('neutral-100', '#f2f2f2', '#1a1a1a', 'Gray 100'),
    tok('neutral-200', '#ebebeb', '#1f1f1f', 'Gray 200'),
    tok('neutral-300', '#e6e6e6', '#292929', 'Gray 300'),
    tok('neutral-400', '#c9c9c9', '#2e2e2e', 'Gray 400'),
    tok('neutral-500', '#a8a8a8', '#454545', 'Gray 500'),
    tok('neutral-600', '#8f8f8f', '#878787', 'Gray 600'),
    tok('neutral-700', '#7d7d7d', '#7d7d7d', 'Gray 700'),
    tok('neutral-800', '#666666', '#a1a1a1', 'Gray 800'),
    tok('neutral-900', '#171717', '#ededed', 'Gray 900 — near black / near white'),
    // Brand blue
    tok('brand-50',  '#ebf5ff', '#06193a', 'Blue 50'),
    tok('brand-100', '#d1e9ff', '#0a2d6b', 'Blue 100'),
    tok('brand-200', '#a8d4ff', '#0d42a0', 'Blue 200'),
    tok('brand-300', '#72b7ff', '#1058cc', 'Blue 300'),
    tok('brand-400', '#3898ff', '#1a76f5', 'Blue 400'),
    tok('brand-500', '#0070f3', '#3291ff', 'Blue 500'),
    tok('brand-600', '#005cc7', '#52a8ff', 'Blue 600'),
    tok('brand-700', '#004499', '#7ec2ff', 'Blue 700'),
    tok('brand-800', '#002b6b', '#a8d8ff', 'Blue 800'),
    tok('brand-900', '#001533', '#d6edff', 'Blue 900'),
    // Green — full scale
    tok('green-100', '#e3f9e5', '#0d2b12', 'Green 100'),
    tok('green-200', '#c6f4cb', '#103d18', 'Green 200'),
    tok('green-300', '#97e9a0', '#155220', 'Green 300'),
    tok('green-400', '#4cc38a', '#1a6b3a', 'Green 400'),
    tok('green-500', '#1a9e4a', '#23a455', 'Green 500 — success'),
    tok('green-600', '#117a35', '#3dc26e', 'Green 600'),
    tok('green-700', '#0d5c28', '#62d584', 'Green 700'),
    tok('green-800', '#063d1a', '#96e8a7', 'Green 800'),
    tok('green-900', '#022610', '#c6f4cb', 'Green 900'),
    // Red — full scale
    tok('red-100', '#ffebec', '#3b0a0a', 'Red 100'),
    tok('red-200', '#ffdcde', '#550e0e', 'Red 200'),
    tok('red-300', '#ffbfc2', '#7a1515', 'Red 300'),
    tok('red-400', '#ff6166', '#cc2929', 'Red 400'),
    tok('red-500', '#e5484d', '#e5484d', 'Red 500 — error'),
    tok('red-600', '#cc2929', '#ff6166', 'Red 600'),
    tok('red-700', '#a51c1c', '#ff8084', 'Red 700'),
    tok('red-800', '#7a1111', '#ffbfc2', 'Red 800'),
    tok('red-900', '#4c0519', '#ffdcde', 'Red 900'),
    // Amber — full scale
    tok('amber-100', '#fff8eb', '#3b1e00', 'Amber 100'),
    tok('amber-200', '#ffefc2', '#562c00', 'Amber 200'),
    tok('amber-300', '#ffd97d', '#7a4000', 'Amber 300'),
    tok('amber-400', '#ffb224', '#b76e00', 'Amber 400'),
    tok('amber-500', '#f5a623', '#f5a623', 'Amber 500 — warning'),
    tok('amber-600', '#b76e00', '#ffb224', 'Amber 600'),
    tok('amber-700', '#8a5100', '#ffd97d', 'Amber 700'),
    tok('amber-800', '#603600', '#ffefc2', 'Amber 800'),
    tok('amber-900', '#4e2009', '#fff8eb', 'Amber 900'),
    // Purple — full scale
    tok('purple-100', '#f5f0ff', '#1c1033', 'Purple 100'),
    tok('purple-200', '#ede0ff', '#261447', 'Purple 200'),
    tok('purple-300', '#ddc7ff', '#31195e', 'Purple 300'),
    tok('purple-400', '#c4a0ff', '#432078', 'Purple 400'),
    tok('purple-500', '#a480ff', '#5c2d9e', 'Purple 500'),
    tok('purple-600', '#7c53f5', '#7c53f5', 'Purple 600'),
    tok('purple-700', '#6031d9', '#9d75ff', 'Purple 700'),
    tok('purple-800', '#4720b7', '#bca0ff', 'Purple 800'),
    tok('purple-900', '#2f1394', '#d9c7ff', 'Purple 900'),
    // Pink — full scale
    tok('pink-100', '#ffe8f5', '#3b0022', 'Pink 100'),
    tok('pink-200', '#ffd1eb', '#5c0034', 'Pink 200'),
    tok('pink-300', '#ffb3de', '#870050', 'Pink 300'),
    tok('pink-400', '#ff85c8', '#b5006e', 'Pink 400'),
    tok('pink-500', '#f94aa4', '#e0007a', 'Pink 500'),
    tok('pink-600', '#d4148d', '#f94aa4', 'Pink 600'),
    tok('pink-700', '#a6007a', '#ff85c8', 'Pink 700'),
    tok('pink-800', '#7a0060', '#ffb3de', 'Pink 800'),
    tok('pink-900', '#4f003e', '#ffd1eb', 'Pink 900'),
    // Teal — full scale
    tok('teal-100', '#e0fdf9', '#021b18', 'Teal 100'),
    tok('teal-200', '#b2f5ee', '#052d27', 'Teal 200'),
    tok('teal-300', '#78ece0', '#0a4237', 'Teal 300'),
    tok('teal-400', '#3dd8c8', '#0f5c4e', 'Teal 400'),
    tok('teal-500', '#00bfa9', '#00a896', 'Teal 500'),
    tok('teal-600', '#009688', '#00bfa9', 'Teal 600'),
    tok('teal-700', '#007a6e', '#3dd8c8', 'Teal 700'),
    tok('teal-800', '#006058', '#78ece0', 'Teal 800'),
    tok('teal-900', '#00403b', '#b2f5ee', 'Teal 900'),
    // Cyan — full scale
    tok('cyan-100', '#e0f7ff', '#021b24', 'Cyan 100'),
    tok('cyan-200', '#b8edff', '#042d3b', 'Cyan 200'),
    tok('cyan-300', '#7ddeff', '#064355', 'Cyan 300'),
    tok('cyan-400', '#36cbff', '#0a6070', 'Cyan 400'),
    tok('cyan-500', '#00b6e8', '#009fce', 'Cyan 500'),
    tok('cyan-600', '#0090ba', '#00b6e8', 'Cyan 600'),
    tok('cyan-700', '#007096', '#36cbff', 'Cyan 700'),
    tok('cyan-800', '#005475', '#7ddeff', 'Cyan 800'),
    tok('cyan-900', '#003451', '#b8edff', 'Cyan 900'),
    // Orange — full scale
    tok('orange-100', '#fff4e5', '#3b1400', 'Orange 100'),
    tok('orange-200', '#ffe8c0', '#5c2100', 'Orange 200'),
    tok('orange-300', '#ffd28a', '#853100', 'Orange 300'),
    tok('orange-400', '#ffb540', '#b04500', 'Orange 400'),
    tok('orange-500', '#f09000', '#d95c00', 'Orange 500'),
    tok('orange-600', '#c27200', '#f09000', 'Orange 600'),
    tok('orange-700', '#965600', '#ffb540', 'Orange 700'),
    tok('orange-800', '#6e3c00', '#ffd28a', 'Orange 800'),
    tok('orange-900', '#4a2500', '#ffe8c0', 'Orange 900'),
    // Yellow — full scale
    tok('yellow-100', '#fffce0', '#2b2500', 'Yellow 100'),
    tok('yellow-200', '#fff8b8', '#463d00', 'Yellow 200'),
    tok('yellow-300', '#fff080', '#635800', 'Yellow 300'),
    tok('yellow-400', '#ffe52e', '#877600', 'Yellow 400'),
    tok('yellow-500', '#f5c800', '#b09c00', 'Yellow 500'),
    tok('yellow-600', '#c4a000', '#f5c800', 'Yellow 600'),
    tok('yellow-700', '#967800', '#ffe52e', 'Yellow 700'),
    tok('yellow-800', '#6e5700', '#fff080', 'Yellow 800'),
    tok('yellow-900', '#473700', '#fff8b8', 'Yellow 900'),
    // Status raw values (used by semantic tokens)
    tok('success',    '#1a9e4a', '#3dc26e', 'Success green'),
    tok('warning',    '#f5a623', '#f5a623', 'Warning amber'),
    tok('error',      '#e5484d', '#e5484d', 'Error red'),
    tok('info',       '#0070f3', '#3291ff', 'Info blue'),
    tok('success-bg', '#e3f9e5', '#0d2b12', 'Success background'),
    tok('warning-bg', '#fff8eb', '#3b1e00', 'Warning background'),
    tok('error-bg',   '#ffebec', '#3b0a0a', 'Error background'),
    tok('info-bg',    '#ebf5ff', '#06193a', 'Info background'),
  ];

  const colorSemantic = [
    // Semantic colours — pure white/black hierarchy
    tok('bg-base',        'var(--neutral-0)',   '#0a0a0a', 'Page background',        { locked: true }),
    tok('bg-surface',     'var(--neutral-50)',  '#111111', 'Elevated surface',       { locked: true }),
    tok('bg-elevated',    'var(--neutral-100)', '#1a1a1a', 'Floating element bg',    { locked: true }),
    tok('bg-hover',       'var(--neutral-200)', '#1f1f1f', 'Hover state bg',         { locked: true }),
    tok('fg-base',        'var(--neutral-900)', '#ededed', 'Primary text',           { locked: true }),
    tok('fg-muted',       'var(--neutral-800)', '#a1a1a1', 'Secondary text',         { locked: true }),
    tok('fg-subtle',      'var(--neutral-600)', '#8f8f8f', 'Placeholder / disabled', { locked: true }),
    tok('fg-inverted',    'var(--neutral-0)',   '#000000', 'Text on dark bg',        { locked: true }),
    tok('border-base',    'var(--neutral-300)', '#292929', 'Default border',         { locked: true }),
    tok('border-strong',  'var(--neutral-500)', '#454545', 'Focused border',         { locked: true }),
    tok('accent',         'var(--brand-500)',   '#3291ff', 'Primary accent', { locked: true }),
    tok('accent-fg',      'var(--neutral-0)',   '#ffffff', 'Text on accent bg',      { locked: true }),
    tok('accent-bg',      'var(--brand-50)',    '#06193a', 'Tinted accent bg',       { locked: true }),
    tok('status-success', 'var(--success)',     '#3dc26e', 'Success',                { locked: true }),
    tok('status-warning', 'var(--warning)',     '#f5a623', 'Warning',                { locked: true }),
    tok('status-error',   'var(--error)',       '#e5484d', 'Error',                  { locked: true }),
    tok('status-info',    'var(--info)',        '#3291ff', 'Info',                   { locked: true }),
    tok('status-success-bg', 'var(--success-bg)', '#0d2b12', 'Success bg',           { locked: true }),
    tok('status-warning-bg', 'var(--warning-bg)', '#3b1e00', 'Warning bg',           { locked: true }),
    tok('status-error-bg',   'var(--error-bg)',   '#3b0a0a', 'Error bg',             { locked: true }),
    tok('status-info-bg',    'var(--info-bg)',    '#06193a', 'Info bg',              { locked: true }),
  ];

  const typeScale = [
    // Font families — referenced by component ff- tokens
    tok('ff-sans',    '"Geist", system-ui, sans-serif',                        '', 'Sans-serif — body & UI'),
    tok('ff-display', '"Geist", Georgia, serif',                               '', 'Display — headings'),
    tok('ff-mono',    '"Geist Mono", "Fira Code", "Cascadia Code", monospace', '', 'Monospace — code'),
    // Font sizes — 6 most useful steps
    tok('fs-xs',   '0.75rem',  '', 'XSmall — badges, labels'),
    tok('fs-sm',   '0.875rem', '', 'Small — captions, labels'),
    tok('fs-base', '1rem',     '', 'Base — body copy'),
    tok('fs-lg',   '1.125rem', '', 'Large — lead paragraph'),
    tok('fs-xl',   '1.25rem',  '', 'XL — small heading'),
    tok('fs-2xl',  '1.5rem',   '', '2XL — section heading'),
    tok('fs-4xl',  '2.25rem',  '', '4XL — page heading'),
    // Line heights
    tok('leading-tight',   '1.1',  '', 'Tight — display headings'),
    tok('leading-snug',    '1.3',  '', 'Snug — subheadings'),
    tok('leading-normal',  '1.5',  '', 'Normal — UI labels'),
    tok('leading-relaxed', '1.6',  '', 'Relaxed — body copy'),
    // Letter spacing
    tok('tracking-tight',   '-0.04em',  '', 'Tight — large display headings'),
    tok('tracking-normal',  '0em',      '', 'Normal'),
    tok('tracking-wide',    '0.04em',   '', 'Wide — small caps / labels'),
    // Font weights
    tok('font-normal',   '400', '', 'Normal'),
    tok('font-medium',   '500', '', 'Medium'),
    tok('font-semibold', '600', '', 'Semibold'),
    tok('font-bold',     '700', '', 'Bold'),
  ];

  const typeFluid = [
    { name: 'fluid-sm',   min: 'fs-sm',   max: 'fs-base' },
    { name: 'fluid-base', min: 'fs-base', max: 'fs-lg'   },
    { name: 'fluid-lg',   min: 'fs-lg',   max: 'fs-xl'   },
    { name: 'fluid-xl',   min: 'fs-xl',   max: 'fs-2xl'  },
    { name: 'fluid-2xl',  min: 'fs-lg',   max: 'fs-2xl'  },
    { name: 'fluid-4xl',  min: 'fs-2xl',  max: 'fs-4xl'  },
  ].map(({ name, min, max }) => ({
    ...tok(name, '', '', `Fluid type ${name}`),
    fluidMin: min,
    fluidMax: max,
  }));

  const spacing = [
    ['s-0',   '0rem'],
    ['s-px',  '0.0625rem'],
    ['s-0-5', '0.125rem'],
    ['s-1',   '0.25rem'],
    ['s-1-5', '0.375rem'],
    ['s-2',   '0.5rem'],
    ['s-2-5', '0.625rem'],
    ['s-3',   '0.75rem'],
    ['s-3-5', '0.875rem'],
    ['s-4',   '1rem'],
    ['s-5',   '1.25rem'],
    ['s-6',   '1.5rem'],
    ['s-7',   '1.75rem'],
    ['s-8',   '2rem'],
    ['s-10',  '2.5rem'],
    ['s-12',  '3rem'],
    ['s-16',  '4rem'],
    ['s-20',  '5rem'],
    ['s-24',  '6rem'],
    ['s-32',  '8rem'],
  ].map(([n, v]) => tok(n, v, '', `Spacing ${n}`));

  const spacingFluid = [
    { name: 'fluid-s-xs',  min: 0.5, max: 1 },
    { name: 'fluid-s-sm',  min: 0.75, max: 1.5 },
    { name: 'fluid-s-md',  min: 1, max: 2 },
    { name: 'fluid-s-lg',  min: 1.5, max: 3 },
    { name: 'fluid-s-xl',  min: 2, max: 4 },
    { name: 'fluid-s-2xl', min: 3, max: 6 },
    { name: 'fluid-s-3xl', min: 4, max: 8 },
  ].map(({ name, min, max }) => ({
    ...tok(name, '', '', `Fluid spacing ${name}`),
    fluidMin: min,
    fluidMax: max,
  }));

  const radius = [
    tok('r-none', '0rem',     '', 'No radius'),
    tok('r-sm',   '0.25rem',  '', 'Small — 4px'),
    tok('r-base', '0.25rem',  '', 'Base — 4px'),
    tok('r-md',   '0.375rem', '', 'Medium — 6px'),
    tok('r-lg',   '0.5rem',   '', 'Large — 8px'),
    tok('r-xl',   '0.75rem',  '', 'Extra large — 12px'),
    tok('r-2xl',  '1rem',     '', '2x large — 16px'),
    tok('r-3xl',  '1.5rem',   '', '3x large — 24px'),
    tok('r-full', '9999px',   '', 'Full/pill radius'),
  ];

  const shadow = [
    tok('shadow-sm',    '0 2px 4px rgba(0,0,0,0.12)', '', 'Shadow small'),
    tok('shadow-base',  '0 4px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.08)', '', 'Shadow base'),
    tok('shadow-md',    '0 8px 30px rgba(0,0,0,0.12)', '', 'Shadow medium'),
    tok('shadow-lg',    '0 30px 60px rgba(0,0,0,0.12)', '', 'Shadow large'),
    tok('shadow-xl',    '0 30px 60px rgba(0,0,0,0.18)', '', 'Shadow extra large'),
    tok('shadow-2xl',   '0 50px 100px rgba(0,0,0,0.25)', '', 'Shadow 2x large'),
    tok('shadow-inner', 'inset 0 2px 4px rgba(0,0,0,0.06)', '', 'Inner shadow'),
    tok('shadow-none',  'none', '', 'No shadow'),
  ];

  const motion = [
    tok('duration-75',  '75ms',  '', 'Duration 75ms'),
    tok('duration-100', '100ms', '', 'Duration 100ms'),
    tok('duration-150', '150ms', '', 'Duration 150ms'),
    tok('duration-200', '200ms', '', 'Duration 200ms'),
    tok('duration-300', '300ms', '', 'Duration 300ms'),
    tok('duration-500', '500ms', '', 'Duration 500ms'),
    tok('duration-700', '700ms', '', 'Duration 700ms'),
    tok('ease-linear',  'linear',                         '', 'Linear easing'),
    tok('ease-in',      'cubic-bezier(0.4,0,1,1)',        '', 'Ease in'),
    tok('ease-out',     'cubic-bezier(0,0,0.2,1)',        '', 'Ease out'),
    tok('ease-in-out',  'cubic-bezier(0.4,0,0.2,1)',      '', 'Ease in-out'),
    tok('ease-spring',  'cubic-bezier(0.34,1.56,0.64,1)', '', 'Spring easing'),
    tok('ease-bounce',  'cubic-bezier(0.68,-0.55,0.265,1.55)', '', 'Bounce easing'),
  ];

  // Component design tokens — all default to semantic tokens
  const components = [
    // ── Button
    tok('btn-bg',             'var(--fg-base)',      'var(--fg-base)',      'Button primary background'),
    tok('btn-fg',             'var(--bg-base)',      'var(--bg-base)',      'Button primary text colour'),
    tok('btn-bd',             'var(--fg-base)',      'var(--fg-base)',      'Button primary border'),
    tok('btn-br',             'var(--r-md)',    '',    'Button border radius'),
    tok('btn-px',             'var(--s-3)',      '',      'Button horizontal padding'),
    tok('btn-py',             'var(--s-1-5)',    '',      'Button vertical padding'),
    tok('btn-fs',             'var(--fs-sm)',    '',      'Button font size'),
    tok('btn-fw',             'var(--font-medium)', '',   'Button font weight'),
    // ── Button secondary
    tok('btn-sec-bg',     'var(--bg-base)',      'var(--bg-base)',      'Secondary button background'),
    tok('btn-sec-fg',     'var(--fg-base)',      'var(--fg-base)',      'Secondary button text'),
    tok('btn-sec-bd',     'var(--border-base)',  'var(--border-base)',  'Secondary button border'),
    // ── Input
    tok('input-bg',           'var(--bg-base)',      'var(--bg-base)',      'Input background'),
    tok('input-fg',        'var(--fg-base)',      'var(--fg-base)',      'Input text colour'),
    tok('input-ph',  'var(--fg-subtle)',    'var(--fg-subtle)',    'Input placeholder colour'),
    tok('input-bd',       'var(--border-base)',  'var(--border-base)',  'Input border'),
    tok('input-bd-focus', 'var(--fg-base)',      'var(--fg-base)',      'Input focused border'),
    tok('input-br',       'var(--r-md)',    '',    'Input border radius'),
    tok('input-px',           'var(--s-3)',      '',      'Input horizontal padding'),
    tok('input-py',           'var(--s-2)',      '',      'Input vertical padding'),
    tok('input-fs',    'var(--fs-sm)',      '',      'Input font size'),
    // ── Card
    tok('card-bg',            'var(--bg-surface)',   'var(--bg-surface)',   'Card background'),
    tok('card-bd',        'var(--border-base)',  'var(--border-base)',  'Card border'),
    tok('card-br',        'var(--r-lg)',    '',    'Card border radius'),
    tok('card-p',       'var(--s-4)',      '',      'Card inner padding'),
    tok('card-shadow',        'none',               'none',               'Card box shadow'),
    // ── Badge
    tok('badge-br',       'var(--r-base)',  '',  'Badge border radius'),
    tok('badge-px',       'var(--s-1-5)',   '',  'Badge horizontal padding'),
    tok('badge-py',       'var(--s-0-5)',   '',  'Badge vertical padding'),
    tok('badge-fs',       'var(--fs-xs)',   '',  'Badge font size'),
    // ── Alert
    tok('alert-br',       'var(--r-lg)',    '',    'Alert border radius'),
    tok('alert-px',           'var(--s-4)',      '',      'Alert horizontal padding'),
    tok('alert-py',           'var(--s-3)',      '',      'Alert vertical padding'),
    tok('alert-fs',    'var(--fs-sm)',      '',      'Alert font size'),
    // ── Toggle
    tok('toggle-bg-off',      'var(--border-base)',  'var(--border-base)',  'Toggle track colour (off)'),
    tok('toggle-bg-on',       'var(--accent)',       'var(--accent)',       'Toggle track colour (on)'),
    tok('toggle-thumb',       '#ffffff',             '#ffffff',             'Toggle thumb colour'),
    // ── Avatar
    tok('avatar-bg',          'var(--accent-bg)',    'var(--accent-bg)',    'Avatar background'),
    tok('avatar-fg',       'var(--accent)',       'var(--accent)',       'Avatar initials colour'),
    tok('avatar-br',      'var(--r-full)',  '',  'Avatar border radius'),
    // ── Table
    tok('table-header-bg',    'var(--bg-elevated)',  'var(--bg-elevated)',  'Table header background'),
    tok('table-header-fg', 'var(--fg-muted)',     'var(--fg-muted)',     'Table header text'),
    tok('table-cell-fg',   'var(--fg-base)',      'var(--fg-base)',      'Table cell text'),
    tok('table-bd',       'var(--border-base)',  'var(--border-base)',  'Table border'),
    tok('table-stripe-bg',    'var(--bg-elevated)',  'var(--bg-elevated)',  'Table striped row bg'),
    tok('table-hover-bg',     'var(--bg-hover)',     'var(--bg-hover)',     'Table row hover bg'),
    // ── Tabs
    tok('tab-fg',          'var(--fg-muted)',     'var(--fg-muted)',     'Tab default text'),
    tok('tab-active-fg',   'var(--fg-base)',      'var(--fg-base)',      'Tab active text'),
    tok('tab-active-bd',  'var(--fg-base)',      'var(--fg-base)',      'Tab active indicator'),
    tok('tab-hover-fg',    'var(--fg-base)',      'var(--fg-base)',      'Tab hover text'),
    // ── Tooltip
    tok('tooltip-bg',         'var(--bg-elevated)',  'var(--bg-elevated)',  'Tooltip background'),
    tok('tooltip-fg',      'var(--fg-base)',      'var(--fg-base)',      'Tooltip text'),
    tok('tooltip-br',     'var(--r-md)',    '',    'Tooltip border radius'),
    tok('tooltip-fs',  'var(--fs-sm)',      '',      'Tooltip font size'),
    // ── Headings — font-family
    tok('h-ff', 'var(--ff-display)', '', 'Heading font family'),
    // ── Headings
    // ── Headings
    tok('h1-fs',  '3rem',                    '',                  'H1 font size'),
    tok('h1-fg',  'var(--fg-base)',           'var(--fg-base)',    'H1 colour'),
    tok('h1-fw',  'var(--font-semibold)',     '',                  'H1 font weight'),
    tok('h1-lh',  'var(--leading-tight)',     '',                  'H1 line height'),
    tok('h1-ls',  '-0.04em',                 '',                  'H1 letter spacing'),
    tok('h2-fs',  'var(--fs-4xl)',            '',                  'H2 font size'),
    tok('h2-fg',  'var(--fg-base)',           'var(--fg-base)',    'H2 colour'),
    tok('h2-fw',  'var(--font-semibold)',     '',                  'H2 font weight'),
    tok('h2-lh',  'var(--leading-tight)',     '',                  'H2 line height'),
    tok('h2-ls',  '-0.032em',                '',                  'H2 letter spacing'),
    tok('h3-fs',  '1.875rem',                '',                  'H3 font size'),
    tok('h3-fg',  'var(--fg-base)',           'var(--fg-base)',    'H3 colour'),
    tok('h3-fw',  'var(--font-semibold)',     '',                  'H3 font weight'),
    tok('h3-lh',  'var(--leading-snug)',      '',                  'H3 line height'),
    tok('h3-ls',  '-0.024em',                '',                  'H3 letter spacing'),
    tok('h4-fs',  'var(--fs-2xl)',            '',                  'H4 font size'),
    tok('h4-fg',  'var(--fg-base)',           'var(--fg-base)',    'H4 colour'),
    tok('h4-fw',  'var(--font-semibold)',     '',                  'H4 font weight'),
    tok('h4-ls',  '-0.02em',                 '',                  'H4 letter spacing'),
    tok('h5-fs',  'var(--fs-xl)',             '',                  'H5 font size'),
    tok('h5-fg',  'var(--fg-base)',           'var(--fg-base)',    'H5 colour'),
    tok('h5-fw',  'var(--font-semibold)',     '',                  'H5 font weight'),
    tok('h6-fs',  'var(--fs-lg)',             '',                  'H6 font size'),
    tok('h6-fg',  'var(--fg-muted)',          'var(--fg-muted)',   'H6 colour'),
    tok('h6-fw',  'var(--font-semibold)',     '',                  'H6 font weight'),
    // ── Body text — font-family
    tok('body-ff', 'var(--ff-sans)',         '',         'Body font family'),
    // ── Body text
    tok('body-fs',        'var(--fs-base)',            '',           'Body font size'),
    tok('body-fg',        'var(--fg-base)',            'var(--fg-base)',           'Body text colour'),
    tok('body-lh',        'var(--leading-relaxed)',    '',   'Body line height'),
    tok('body-muted-fg',  'var(--fg-muted)',           'var(--fg-muted)',          'Secondary / muted text colour'),
    tok('body-muted-fs',  'var(--fs-sm)',              '',             'Muted text font size'),
    // ── Links
    tok('link-fg',        'var(--accent)',             'var(--accent)',            'Link colour'),
    tok('link-hover-fg',  'var(--fg-base)',            'var(--fg-base)',           'Link hover colour'),
    // ── Lists
    tok('list-fs',        'var(--fs-base)',            '',           'List item font size'),
    tok('list-fg',        'var(--fg-base)',            'var(--fg-base)',           'List item text colour'),
    tok('list-lh',        'var(--leading-relaxed)',    '',   'List item line height'),
    tok('list-marker-fg', 'var(--accent)',             'var(--accent)',            'List marker / bullet colour'),
    // ── Steps marker
    tok('step-list-bg',   'var(--accent)',             'var(--accent)',            'Steps marker background'),
    tok('step-list-fg',   '#ffffff',                  '#ffffff',                  'Steps marker text colour'),
    tok('step-list-br',   'var(--r-full)',             '',                         'Steps marker border radius'),
    tok('step-list-p',    'var(--s-1-5)',              '',                         'Steps marker padding (sizes the circle)'),
    tok('step-list-fs',   'var(--fs-xs)',              '',                         'Steps marker font size'),
    tok('step-list-line', 'var(--border-base)',        'var(--border-base)',       'Steps connecting line colour'),
    // ── Code — font-family
    tok('code-ff',            'var(--ff-mono)',           '',                  'Shared code font family'),
    tok('code-inline-fg',    'var(--fg-base)',            'var(--fg-base)',     'Inline code text colour'),
    tok('code-inline-fs',    'var(--fs-sm)',              '',                  'Inline code font size'),
    tok('code-inline-bg',    'var(--bg-elevated)',        'var(--bg-elevated)', 'Inline code background'),
    tok('code-inline-bd',    'var(--border-base)',        'var(--border-base)', 'Inline code border'),
    tok('code-inline-br',    'var(--r-base)',             '',                  'Inline code border radius'),
    tok('code-inline-px',    'var(--s-1)',                '',                  'Inline code horizontal padding'),
    tok('code-inline-py',    'var(--s-px)',               '',                  'Inline code vertical padding'),
    tok('code-block-fg',     'var(--code-inline-fg)',     'var(--code-inline-fg)', 'Code block text colour'),
    tok('code-block-fs',     'var(--fs-sm)',              '',                  'Code block font size'),
    tok('code-block-lh',     'var(--leading-relaxed)',    '',                  'Code block line height'),
    tok('code-block-bg',     'var(--bg-elevated)',        'var(--bg-elevated)', 'Code block background'),
    tok('code-block-bd',     'var(--border-base)',        'var(--border-base)', 'Code block border'),
    tok('code-block-br',     'var(--r-lg)',               '',                  'Code block border radius'),
    tok('code-block-px',     'var(--s-4)',                '',                  'Code block horizontal padding'),
    tok('code-block-py',     'var(--s-4)',                '',                  'Code block vertical padding'),
    // ── Blockquote
    tok('blockquote-bg',  'var(--accent-bg)', 'var(--accent-bg)',   'Blockquote background'),
    tok('blockquote-bd',  'var(--accent)',    'var(--accent)',       'Blockquote border colour'),
  ];

  // Assign categories
  const assign = (arr, cat) => arr.map(t => ({ ...t, category: cat }));

  return {
    'color-primitives': assign(colorPrimitives, 'color-primitives'),
    'color-semantic':   assign(colorSemantic,   'color-semantic'),
    'type-scale':       assign(typeScale,        'type-scale'),
    'type-fluid':       assign(typeFluid,        'type-fluid'),
    'spacing':          assign(spacing,          'spacing'),
    'spacing-fluid':    assign(spacingFluid,     'spacing-fluid'),
    'radius':           assign(radius,           'radius'),
    'shadow':           assign(shadow,           'shadow'),
    'motion':           assign(motion,           'motion'),
    'components':       assign(components,       'components'),
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   TOKEN STORE
   ═══════════════════════════════════════════════════════════════════════ */

const TokenStore = (() => {
  const MAX_HISTORY = 50;
  let state = null;
  let history = [];
  let historyIndex = -1;
  const listeners = new Set();

  function getDefaultState() {
    return {
      settings: {
        baseFontSize: 16,
        inputUnit: 'rem',
        minViewport: 360,
        maxViewport: 900,
        cssHideComments: false,
        cssHideFramework: false,
        appTheme: 'dark',
      },
      tokens: buildDefaultTokens(),
    };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify(changedTokenId) {
    listeners.forEach(fn => fn(changedTokenId));
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function pushHistory(s) {
    // Trim forward history
    history = history.slice(0, historyIndex + 1);
    history.push(s);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
  }

  function init() {
    const saved = localStorage.getItem('dsb-v4-state-v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate basic structure
        if (parsed.settings && parsed.tokens) {
          state = parsed;
        } else {
          state = getDefaultState();
        }
      } catch {
        state = getDefaultState();
      }
    } else {
      state = getDefaultState();
    }
    pushHistory(snapshot());
  }

  function persist() {
    try {
      localStorage.setItem('dsb-v4-state-v1', JSON.stringify(state));
    } catch { /* storage full */ }
  }

  function getState() { return state; }

  function getSettings() { return state.settings; }

  function getAllTokens() {
    return Object.values(state.tokens).flat();
  }

  function getTokensByCategory(cat) {
    return state.tokens[cat] || [];
  }

  function getTokenById(id) {
    return getAllTokens().find(t => t.id === id);
  }

  function updateToken(id, changes, skipHistory) {
    let found = false;
    for (const cat of Object.keys(state.tokens)) {
      const idx = state.tokens[cat].findIndex(t => t.id === id);
      if (idx !== -1) {
        state.tokens[cat][idx] = { ...state.tokens[cat][idx], ...changes };
        found = true;
        break;
      }
    }
    if (!found) return;
    if (!skipHistory) pushHistory(snapshot());
    persist();
    notify(id);
  }

  function addToken(category, tokenData) {
    if (!state.tokens[category]) state.tokens[category] = [];
    const token = {
      id: uuid(),
      name: tokenData.name || 'new-token',
      value: tokenData.value || '',
      darkValue: tokenData.darkValue || '',
      description: tokenData.description || '',
      category,
      locked: false,
      isCustom: true,
      defaultValue: tokenData.value || '',
      defaultDarkValue: tokenData.darkValue || '',
    };
    state.tokens[category].push(token);
    pushHistory(snapshot());
    persist();
    notify(token.id);
    return token.id;
  }

  function deleteToken(id) {
    for (const cat of Object.keys(state.tokens)) {
      const idx = state.tokens[cat].findIndex(t => t.id === id);
      if (idx !== -1) {
        state.tokens[cat].splice(idx, 1);
        pushHistory(snapshot());
        persist();
        notify(null);
        return true;
      }
    }
    return false;
  }

  function resetToken(id) {
    const t = getTokenById(id);
    if (!t) return;
    updateToken(id, { value: t.defaultValue, darkValue: t.defaultDarkValue });
  }

  // silent=true for UI-only prefs (theme, hide flags) that shouldn't pollute undo history
  function updateSettings(changes, silent = false) {
    state.settings = { ...state.settings, ...changes };
    if (!silent) pushHistory(snapshot());
    persist();
    notify(null);
  }

  function undo() {
    if (historyIndex <= 0) return false;
    historyIndex--;
    state = JSON.parse(JSON.stringify(history[historyIndex]));
    persist();
    notify(null);
    return true;
  }

  function redo() {
    if (historyIndex >= history.length - 1) return false;
    historyIndex++;
    state = JSON.parse(JSON.stringify(history[historyIndex]));
    persist();
    notify(null);
    return true;
  }

  function canUndo() { return historyIndex > 0; }
  function canRedo() { return historyIndex < history.length - 1; }
  function undoCount() { return historyIndex; }
  function redoCount() { return history.length - 1 - historyIndex; }

  function importState(newState) {
    state = newState;
    pushHistory(snapshot());
    persist();
    notify(null);
  }

  function resetAll() {
    state = getDefaultState();
    // Clear history entirely — there is nothing to undo after a full reset
    history = [JSON.parse(JSON.stringify(state))];
    historyIndex = 0;
    persist();
    notify(null);
  }

  return {
    init,
    subscribe,
    getState,
    getSettings,
    getAllTokens,
    getTokensByCategory,
    getTokenById,
    updateToken,
    addToken,
    deleteToken,
    resetToken,
    updateSettings,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    importState,
    resetAll,
  };
})();

/* ═══════════════════════════════════════════════════════════════════════
   CSS ENGINE
   ═══════════════════════════════════════════════════════════════════════ */

const CSSEngine = (() => {
  // Resolve a fluidMin/fluidMax value: may be a rem number or a token name like 'fs-sm'
  function resolveFluidEndpoint(val, allTokens) {
    if (typeof val === 'number') return val;
    if (typeof val !== 'string') return 0;
    if (!allTokens) return 0;
    // Look up by token name in all categories
    for (const toks of Object.values(allTokens)) {
      const t = toks.find(t => t.name === val);
      if (t && t.value) {
        const rem = parseFloat(t.value);
        if (!isNaN(rem)) return rem;
      }
    }
    return 0;
  }

  function computeFluidValue(token, settings, allTokens) {
    if (token.fluidMin == null || token.fluidMax == null) return token.value;
    const { minViewport, maxViewport, baseFontSize } = settings;
    const minVwRem = minViewport / baseFontSize;
    const maxVwRem = maxViewport / baseFontSize;
    const minRem = resolveFluidEndpoint(token.fluidMin, allTokens);
    const maxRem = resolveFluidEndpoint(token.fluidMax, allTokens);
    return clamp(minRem, maxRem, minVwRem, maxVwRem);
  }

  function getTokenValue(token, isDark, settings, allTokens) {
    const useFluid = (token.fluidMin != null);
    if (useFluid) return computeFluidValue(token, settings, allTokens);
    return (isDark && token.darkValue) ? token.darkValue : token.value;
  }

  function generateRootBlock(tokens, settings, isDark) {
    const lines = [];
    for (const [cat, toks] of Object.entries(tokens)) {
      lines.push(`  /* ${cat} */`);
      for (const t of toks) {
        const val = getTokenValue(t, isDark, settings, tokens);
        if (val !== '') lines.push(`  --${t.name}: ${val};`);
      }
    }
    return `:root {\n${lines.join('\n')}\n}`;
  }

  function generateDarkBlock(tokens) {
    const lines = [];
    for (const toks of Object.values(tokens)) {
      for (const t of toks) {
        // Fluid tokens compute their dark value at runtime via clamp(); skip them here.
        // All other tokens with a darkValue get an override entry.
        if (t.darkValue && t.fluidMin == null) {
          lines.push(`  --${t.name}: ${t.darkValue};`);
        }
      }
    }
    if (!lines.length) return '';
    return `[data-theme="dark"] {\n${lines.join('\n')}\n}`;
  }

  function generateResetCSS() {
    return `@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
}

body {
  font-family: var(--ff-sans, 'Geist', system-ui, -apple-system, sans-serif);
  font-size: var(--body-fs, 0.875rem);
  color: var(--fg-base);
  background: var(--bg-base);
  line-height: var(--body-lh, 1.5);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: inherit;
  font-size: inherit;
  line-height: inherit;
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
  color: inherit;
}

button { cursor: pointer; border: none; background: none; }

ul, ol { list-style: none; }

a { color: inherit; text-decoration: none; }

table { border-collapse: collapse; }

[hidden] { display: none !important; }

kbd {
  font-family: var(--ff-mono, 'Geist Mono', monospace);
  font-size: 0.8em;
  background: var(--bg-elevated);
  border: 1px solid var(--border-base);
  border-bottom-width: 2px;
  border-radius: var(--r-base);
  padding: 0.1em 0.4em;
  color: var(--fg-muted);
}`;
  }

  function generateFrameworkCSS(tokens) {
    const parts = [];

    parts.push(`/* ── Accessibility ── */
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }
.not-sr-only { position: static; width: auto; height: auto; padding: 0; margin: 0; overflow: visible; clip: auto; white-space: normal; }`);

    // Text utilities
    const typeScale = (tokens['type-scale'] || []).filter(t => t.name.startsWith('fs-'));
    if (typeScale.length) {
      parts.push('/* Text size utilities */');
      typeScale.forEach(t => {
        parts.push(`.${t.name} { font-size: var(--${t.name}); }`);
      });
    }

    // Spacing utilities
    const spacingToks = tokens['spacing'] || [];

    if (spacingToks.length) {
      parts.push('\n/* Spacing utilities */');
      spacingToks.forEach(t => {
        const n = t.name.replace('s-', '');
        parts.push(`.p-${n}  { padding: var(--${t.name}); }`);
        parts.push(`.px-${n} { padding-inline: var(--${t.name}); }`);
        parts.push(`.py-${n} { padding-block: var(--${t.name}); }`);
        parts.push(`.m-${n}  { margin: var(--${t.name}); }`);
        parts.push(`.mx-${n} { margin-inline: var(--${t.name}); }`);
        parts.push(`.my-${n} { margin-block: var(--${t.name}); }`);
        parts.push(`.gap-${n} { gap: var(--${t.name}); }`);
      });
    }

    // Border radius
    const radiusToks = tokens['radius'] || [];
    if (radiusToks.length) {
      parts.push('\n/* Border radius utilities */');
      radiusToks.forEach(t => {
        const n = t.name.replace('r-', '');
        const cls = n === 'base' ? 'rounded' : `rounded-${n}`;
        parts.push(`.${cls} { border-radius: var(--${t.name}); }`);
      });
    }

    // Shadow utilities
    const shadowToks = tokens['shadow'] || [];
    if (shadowToks.length) {
      parts.push('\n/* Shadow utilities */');
      shadowToks.forEach(t => {
        parts.push(`.${t.name} { box-shadow: var(--${t.name}); }`);
      });
    }

    // Component classes — driven by component tokens
    parts.push(`
/* ── Buttons ── */
/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--s-1-5);
  height: 2.25rem;
  padding: 0 var(--btn-px);
  font-size: var(--btn-fs);
  font-weight: var(--btn-fw);
  font-family: inherit;
  border-radius: var(--btn-br);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--duration-150) var(--ease-in-out),
              border-color var(--duration-150) var(--ease-in-out),
              color var(--duration-150) var(--ease-in-out),
              opacity var(--duration-150) var(--ease-in-out),
              box-shadow var(--duration-150) var(--ease-in-out);
  text-decoration: none; white-space: nowrap; line-height: 1;
}
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn:active:not(:disabled) { opacity: 0.8; }
.btn--sm { height: 1.875rem; padding: 0 var(--s-2-5); font-size: var(--fs-xs); border-radius: var(--r-base); }
.btn--lg { height: 2.75rem; padding: 0 var(--s-6); font-size: var(--fs-base); border-radius: var(--r-lg); }
.btn--icon { width: 2.25rem; height: 2.25rem; padding: 0; }
.btn--icon-sm { width: 1.875rem; height: 1.875rem; padding: 0; font-size: var(--fs-xs); border-radius: var(--r-base); }
.btn--primary { background: var(--btn-bg); color: var(--btn-fg); border-color: var(--btn-bd); }
.btn--primary:hover:not(:disabled) { background: var(--fg-muted); border-color: var(--fg-muted); }
.btn--secondary { background: var(--btn-sec-bg); color: var(--btn-sec-fg); border-color: var(--btn-sec-bd); box-shadow: 0 1px 2px rgba(0,0,0,0.06); }
.btn--secondary:hover:not(:disabled) { background: var(--bg-hover); border-color: var(--border-strong); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.btn--ghost { background: transparent; color: var(--fg-muted); border-color: transparent; }
.btn--ghost:hover:not(:disabled) { background: var(--bg-hover); color: var(--fg-base); border-color: var(--border-base); }
.btn--danger { background: var(--status-error); color: #fff; border-color: var(--status-error); }
.btn--danger:hover:not(:disabled) { opacity: 0.85; }`);

    parts.push(`
/* ── Badge ── */
.badge { display: inline-flex; align-items: center; gap: var(--s-1); padding: var(--badge-py) var(--badge-px); font-size: var(--badge-fs); font-weight: var(--font-medium); border-radius: var(--badge-br); border: 1px solid transparent; line-height: 1.4; }
.badge--default { background: var(--bg-elevated); color: var(--fg-muted); border-color: var(--border-base); }
.badge--success { background: var(--status-success-bg); color: var(--status-success); }
.badge--warning { background: var(--status-warning-bg); color: var(--status-warning); }
.badge--error   { background: var(--status-error-bg);   color: var(--status-error); }
.badge--info    { background: var(--status-info-bg);    color: var(--status-info); }
.badge--purple  { background: rgba(168,85,247,0.12);    color: #a855f7; }
.badge--pink    { background: rgba(236,72,153,0.12);    color: #ec4899; }
.badge--teal    { background: rgba(20,184,166,0.12);    color: #14b8a6; }
.badge--orange  { background: rgba(249,115,22,0.12);    color: #f97316; }`);

    parts.push(`
/* ── Card ── */
/* Cards */
.card { background: var(--card-bg); border: 1px solid var(--card-bd); border-radius: var(--card-br); padding: var(--card-p); box-shadow: var(--card-shadow); overflow: hidden; }
.card--interactive { cursor: pointer; transition: border-color var(--duration-200) var(--ease-in-out), background var(--duration-200) var(--ease-in-out); }
.card--interactive:hover { border-color: var(--border-strong); background: var(--bg-hover); }`);

    parts.push(`
/* ── Alert ── */
.alert { display: flex; align-items: flex-start; gap: var(--s-2-5); padding: var(--alert-py) var(--alert-px); border-radius: var(--alert-br); border: 1px solid transparent; font-size: var(--alert-fs); }
.alert--info    { background: var(--status-info-bg);    color: var(--status-info);    border-color: color-mix(in srgb, var(--status-info) 25%, transparent); }
.alert--success { background: var(--status-success-bg); color: var(--status-success); border-color: color-mix(in srgb, var(--status-success) 25%, transparent); }
.alert--warning { background: var(--status-warning-bg); color: var(--status-warning); border-color: color-mix(in srgb, var(--status-warning) 25%, transparent); }
.alert--error   { background: var(--status-error-bg);   color: var(--status-error);   border-color: color-mix(in srgb, var(--status-error) 25%, transparent); }`);

    parts.push(`
/* ── Forms ── */
/* Inputs */
.input, .select {
  display: block; width: 100%;
  height: 2.25rem;
  padding: 0 var(--input-px);
  font-size: var(--input-fs);
  color: var(--input-fg);
  background: var(--input-bg);
  border: 1px solid var(--input-bd);
  border-radius: var(--input-br);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color var(--duration-150) var(--ease-in-out),
              box-shadow var(--duration-150) var(--ease-in-out);
  font-family: inherit;
  line-height: var(--leading-normal);
}
.textarea {
  display: block; width: 100%;
  height: auto; min-height: 5rem;
  padding: var(--input-py) var(--input-px);
  font-size: var(--input-fs);
  color: var(--input-fg);
  background: var(--input-bg);
  border: 1px solid var(--input-bd);
  border-radius: var(--input-br);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color var(--duration-150) var(--ease-in-out),
              box-shadow var(--duration-150) var(--ease-in-out);
  font-family: inherit;
  line-height: var(--leading-relaxed);
  resize: vertical;
}
.input::placeholder, .textarea::placeholder { color: var(--input-ph); }
.input:focus, .select:focus, .textarea:focus {
  border-color: var(--input-bd-focus);
  box-shadow: 0 0 0 1px var(--input-bd-focus);
}
.input:disabled, .select:disabled, .textarea:disabled {
  opacity: 0.4; cursor: not-allowed; background: var(--bg-hover);
}
.input--error { border-color: var(--status-error) !important; box-shadow: 0 0 0 1px var(--status-error) !important; }
.select {
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238f8f8f' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--s-3) center;
  padding-right: 2rem;
}`);

    parts.push(`
/* ── Toggle ── */
.toggle { position: relative; width: 40px; height: 22px; cursor: pointer; display: inline-flex; align-items: center; }
.toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.toggle__track { width: 40px; height: 22px; background: var(--toggle-bg-off); border-radius: var(--r-full); position: relative; transition: background var(--duration-200) var(--ease-in-out); }
.toggle__track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: var(--toggle-thumb); border-radius: 50%; transition: transform var(--duration-200) var(--ease-spring); box-shadow: var(--shadow-sm); }
.toggle input:checked + .toggle__track { background: var(--toggle-bg-on); }
.toggle input:checked + .toggle__track::after { transform: translateX(18px); }`);

    parts.push(`
/* ── Divider ── */
.divider { height: 1px; background: var(--border-base); margin: var(--s-4) 0; }
.divider-labeled { display: flex; align-items: center; gap: var(--s-3); margin: var(--s-4) 0; }
.divider-labeled::before, .divider-labeled::after { content: ''; flex: 1; height: 1px; background: var(--border-base); }`);

    parts.push(`
/* ── Tabs ── */
/* Tabs */
.tabs { display: flex; border-bottom: 1px solid var(--border-base); }
.tab { padding: var(--s-2) var(--s-4); font-size: var(--fs-sm); font-weight: var(--font-medium); color: var(--tab-fg); border: none; background: none; cursor: pointer; border-bottom: 1px solid transparent; margin-bottom: -1px; transition: color var(--duration-150) var(--ease-in-out), border-color var(--duration-150) var(--ease-in-out); font-family: inherit; }
.tab:hover:not(:disabled) { color: var(--tab-hover-fg); }
.tab--active { color: var(--tab-active-fg); border-bottom-color: var(--tab-active-bd); }
.tab:disabled { opacity: 0.4; cursor: not-allowed; }
.tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }`);

    parts.push(`
/* ── Avatar ── */
.avatar { border-radius: var(--avatar-br); background: var(--avatar-bg); color: var(--avatar-fg); font-weight: var(--font-semibold); display: inline-flex; align-items: center; justify-content: center; border: 2px solid var(--bg-surface); }
.avatar--sm { width: 28px; height: 28px; font-size: var(--fs-xs); }
.avatar--md { width: 36px; height: 36px; font-size: var(--fs-sm); }
.avatar--lg { width: 48px; height: 48px; font-size: var(--fs-base); }
.avatar--xl { width: 64px; height: 64px; font-size: var(--fs-xl); }
.avatar-stack { display: flex; }
.avatar-stack .avatar + .avatar { margin-left: -10px; }`);

    parts.push(`
/* ── Tooltip ── */
/* Usage: <div class="tooltip-wrap"><button>…</button><div class="tooltip-content" role="tooltip">…</div></div> */
.tooltip-wrap { position: relative; display: inline-flex; }
[role="tooltip"],
.tooltip-content { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: var(--tooltip-bg); border: 1px solid var(--border-base); border-radius: var(--tooltip-br); padding: var(--s-1-5) var(--s-3); font-size: var(--tooltip-fs); color: var(--tooltip-fg); white-space: nowrap; box-shadow: var(--shadow-md); pointer-events: none; opacity: 0; visibility: hidden; transition: opacity var(--duration-150) var(--ease-in-out), visibility var(--duration-150) var(--ease-in-out); }
.tooltip-content::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--border-base); }
.tooltip-wrap:hover .tooltip-content,
.tooltip-wrap:focus-within .tooltip-content { opacity: 1; visibility: visible; }
/* data-tooltip — attribute-driven alternative */
[data-tooltip] { position: relative; }
[data-tooltip]::after { content: attr(data-tooltip); position: absolute; bottom: calc(100% + 7px); left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: var(--tooltip-fs); color: var(--tooltip-fg); background: var(--tooltip-bg); border: 1px solid var(--border-base); border-radius: var(--tooltip-br); padding: var(--s-1) var(--s-2); pointer-events: none; opacity: 0; visibility: hidden; transition: opacity var(--duration-150) var(--ease-in-out), visibility var(--duration-150) var(--ease-in-out); z-index: 9999; box-shadow: var(--shadow-md); }
[data-tooltip]:hover::after, [data-tooltip]:focus-visible::after { opacity: 1; visibility: visible; }`);

    parts.push(`
/* ── Typography ── */
/* Typography */
h1, h2, h3, h4, h5, h6 { font-family: var(--h-ff); }
h1 { font-size: var(--h1-fs); color: var(--h1-fg); font-weight: var(--h1-fw); line-height: var(--h1-lh); letter-spacing: var(--h1-ls); }
h2 { font-size: var(--h2-fs); color: var(--h2-fg); font-weight: var(--h2-fw); line-height: var(--h2-lh); letter-spacing: var(--h2-ls); }
h3 { font-size: var(--h3-fs); color: var(--h3-fg); font-weight: var(--h3-fw); line-height: var(--h3-lh); letter-spacing: var(--h3-ls); }
h4 { font-size: var(--h4-fs); color: var(--h4-fg); font-weight: var(--h4-fw); letter-spacing: var(--h4-ls); }
h5 { font-size: var(--h5-fs); color: var(--h5-fg); font-weight: var(--h5-fw); }
h6 { font-size: var(--h6-fs); color: var(--h6-fg); font-weight: var(--h6-fw); }
p { font-family: var(--body-ff); font-size: var(--body-fs); color: var(--body-fg); line-height: var(--body-lh); }
.text-muted { font-size: var(--body-muted-fs); color: var(--body-muted-fg); }
a { color: var(--link-fg); text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1px; }
a:hover { color: var(--link-hover-fg); text-decoration-color: currentColor; }
ul, ol { font-size: var(--list-fs); color: var(--list-fg); line-height: var(--list-lh); }
ul li::marker, ol li::marker { color: var(--list-marker-fg); }
blockquote { background: var(--blockquote-bg); border-left: 2px solid var(--blockquote-bd); padding: var(--s-3) var(--s-4); border-radius: var(--r-md); margin: var(--s-4) 0; }
blockquote p { color: var(--fg-muted); }
/* Steps list */
.list-steps { list-style: none; padding-left: 0; counter-reset: steps; }
.list-steps li { counter-increment: steps; position: relative; padding-left: calc(var(--step-list-fs, 0.75rem) + var(--step-list-p, 0.375rem) * 2 + 10px); padding-bottom: 20px; font-size: var(--list-fs); color: var(--list-fg); line-height: var(--list-lh); }
.list-steps li:last-child { padding-bottom: 0; }
.list-steps li::before { content: counter(steps); position: absolute; left: 0; top: 0; width: calc(var(--step-list-fs, 0.75rem) + var(--step-list-p, 0.375rem) * 2); height: calc(var(--step-list-fs, 0.75rem) + var(--step-list-p, 0.375rem) * 2); border-radius: var(--step-list-br, 9999px); background: var(--step-list-bg, var(--accent)); color: var(--step-list-fg, #fff); font-size: var(--step-list-fs, 0.75rem); font-weight: var(--font-bold); line-height: calc(var(--step-list-fs, 0.75rem) + var(--step-list-p, 0.375rem) * 2); text-align: center; box-sizing: border-box; }
.list-steps li::after { content: ''; position: absolute; left: calc((var(--step-list-fs, 0.75rem) + var(--step-list-p, 0.375rem) * 2) / 2 - 0.5px); top: calc(var(--step-list-fs, 0.75rem) + var(--step-list-p, 0.375rem) * 2); bottom: 0; width: 1px; background: var(--step-list-line, var(--border-base)); }
.list-steps li:last-child::after { display: none; }`);

    parts.push(`
/* ── Code ── */
/* Code */
code, kbd, samp { font-family: var(--code-ff); }
code { font-size: var(--code-inline-fs); color: var(--code-inline-fg); background: var(--code-inline-bg); border: 1px solid var(--code-inline-bd); border-radius: var(--code-inline-br); padding: var(--code-inline-py) var(--code-inline-px); font-weight: 400; }
pre { background: var(--code-block-bg); border: 1px solid var(--code-block-bd); border-radius: var(--code-block-br); padding: var(--code-block-py) var(--code-block-px); overflow-x: auto; -webkit-overflow-scrolling: touch; }
pre code { font-size: var(--code-block-fs); color: var(--code-block-fg); line-height: var(--code-block-lh); background: none; border: none; border-radius: 0; padding: 0; }`);

    parts.push(`
/* ── Table ── */
/* Table */
.table { width: 100%; border-collapse: collapse; font-size: var(--body-fs); color: var(--table-cell-fg); }
.table th { background: var(--table-header-bg); color: var(--table-header-fg); font-size: var(--fs-xs); font-weight: var(--font-semibold); letter-spacing: 0.06em; text-transform: uppercase; text-align: left; padding: var(--s-2) var(--s-3); border-bottom: 1px solid var(--table-bd); }
.table td { padding: var(--s-3) var(--s-3); border-bottom: 1px solid var(--table-bd); font-size: var(--fs-sm); }
.table tbody tr:last-child td { border-bottom: none; }
.table-striped tbody tr:nth-child(even) { background: var(--table-stripe-bg); }
.table-hover tbody tr { transition: background var(--duration-100) var(--ease-in-out); }
.table-hover tbody tr:hover { background: var(--table-hover-bg); }
.table-bordered { border: 1px solid var(--table-bd); border-radius: var(--r-lg); overflow: hidden; }`);

    return parts.join('\n');
  }

  function generateCSS(state, activeTab, hideComments, hideFramework) {
    const { tokens, settings } = state;
    // CSS output always uses light values for :root and a dark override block.
    // The current UI theme does NOT affect the generated output.

    let output = '';

    if (!hideComments) {
      output += `/* Design System Builder v4 */\n/* Base font: ${settings.baseFontSize}px */\n\n`;
    }

    if (activeTab === 'tokens' || !hideFramework) {
      // :root always gets light (non-dark) values
      output += generateRootBlock(tokens, settings, false);
      output += '\n\n';
      const darkBlock = generateDarkBlock(tokens);
      if (darkBlock) {
        if (!hideComments) output += `/* Dark mode overrides */\n`;
        output += darkBlock + '\n\n';
      }
    }

    if (activeTab === 'framework' && !hideFramework) {
      if (!hideComments) output += `/* ── CSS Reset ── */\n`;
      output += generateResetCSS() + '\n\n';
      if (!hideComments) output += `/* ── Framework Utility Classes ── */\n`;
      output += generateFrameworkCSS(tokens);
    }

    return output.trim();
  }

  function computeTokenValue(token, settings, isDark, allTokens) {
    return getTokenValue(token, isDark, settings, allTokens);
  }

  return { generateCSS, computeTokenValue, computeFluidValue };
})();

/* ═══════════════════════════════════════════════════════════════════════
   THEME ENGINE
   ═══════════════════════════════════════════════════════════════════════ */

const ThemeEngine = (() => {
  function apply(state) {
    const { tokens, settings } = state;
    const root = document.documentElement;
    const isDark = settings.appTheme === 'dark';

    // App theme
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Apply token CSS vars to root (pass tokens so fluid min/max token references resolve)
    for (const toks of Object.values(tokens)) {
      for (const t of toks) {
        const val = CSSEngine.computeTokenValue(t, settings, isDark, tokens);
        if (val) root.style.setProperty(`--${t.name}`, val);
      }
    }

    // Update theme toggle icons
    const moon = document.querySelector('.icon-moon');
    const sun  = document.querySelector('.icon-sun');
    if (moon && sun) {
      moon.style.display = isDark ? 'block' : 'none';
      sun.style.display  = isDark ? 'none' : 'block';
    }

    // Update preview theme attribute for dark override CSS
    const previewEl = document.getElementById('preview-inner');
    if (previewEl) {
      previewEl.setAttribute('data-preview-theme', isDark ? 'dark' : 'light');
    }
  }

  function flashToken(tokenId) {
    // Find all preview elements marked with this token's var usage
    const rows = document.querySelectorAll(`[data-token-id="${tokenId}"]`);
    rows.forEach(el => {
      el.classList.remove('is-highlighted');
      void el.offsetWidth;
      el.classList.add('is-highlighted');
    });
  }

  return { apply, flashToken };
})();

/* ═══════════════════════════════════════════════════════════════════════
   PREVIEW ENGINE
   ═══════════════════════════════════════════════════════════════════════ */

const PreviewEngine = (() => {

  function section(id, title, desc, bodyFn, className = '') {
    const el = document.createElement('section');
    el.className = 'preview-section';
    el.id = `section-${id}`;
    el.setAttribute('data-section', id);
    el.setAttribute('tabindex', '-1');
    el.innerHTML = `
      ${title ? `<div class="preview-section__header">
        <div class="preview-section__title-row">
          <h2 class="preview-section__title">${title}</h2>
          ${className ? `<span class="preview-section__class">${className}</span>` : ''}
        </div>
        ${desc ? `<p class="preview-section__desc">${desc}</p>` : ''}
      </div>` : ''}
      <div class="preview-section__body"></div>
    `;
    bodyFn(el.querySelector('.preview-section__body'));
    return el;
  }

  function renderGettingStarted(body) {
    body.innerHTML = `
      <div class="preview-hero">
        <div class="preview-hero__gradient" aria-hidden="true"></div>
        <p class="preview-hero__eyebrow">Design System Builder</p>
        <h1 class="preview-hero__title">Build <em>beautiful</em><br>design systems</h1>
        <p class="preview-hero__desc">
          A token-driven design system builder with live preview and production-ready CSS output.
          Define tokens on the right, see every component update instantly.
        </p>

        <div class="preview-hero__steps">
          <div class="preview-hero__step">
            <span class="preview-hero__step-num">1</span>
            <span class="preview-hero__step-text">Edit tokens in the right panel — colour, type, spacing, and more.</span>
          </div>
          <div class="preview-hero__step">
            <span class="preview-hero__step-num">2</span>
            <span class="preview-hero__step-text">Watch every component update live with zero page refresh.</span>
          </div>
          <div class="preview-hero__step">
            <span class="preview-hero__step-num">3</span>
            <span class="preview-hero__step-text">Copy or download the generated CSS — tokens + framework classes included.</span>
          </div>
          <div class="preview-hero__step">
            <span class="preview-hero__step-num">4</span>
            <span class="preview-hero__step-text">Export your token set as JSON to share or version-control.</span>
          </div>
        </div>

        <div class="gs-controls">
          <p class="gs-controls__heading">Top bar controls</p>
          <div class="gs-controls__grid">
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Reset</p>
                <p class="gs-control-item__desc">Restore all tokens to their original default values.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Undo / Redo</p>
                <p class="gs-control-item__desc">Step backwards or forwards through your token edits. Badges show how many steps are available.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Toggle nav</p>
                <p class="gs-control-item__desc">Show or hide the left navigation panel to gain more preview space.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Toggle token editor</p>
                <p class="gs-control-item__desc">Show or hide the right token editor panel. Both panels can be hidden for a full-width style guide view.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Import</p>
                <p class="gs-control-item__desc">Load a previously exported JSON token file to restore a saved design system.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Export</p>
                <p class="gs-control-item__desc">Download your current tokens as a JSON file to version-control or share.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Settings</p>
                <p class="gs-control-item__desc">Adjust viewport breakpoints for fluid type and spacing clamp calculations.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Theme toggle</p>
                <p class="gs-control-item__desc">Switch the preview between light and dark mode. Tokens with a dark value swap automatically.</p>
              </div>
            </div>
            <div class="gs-control-item">
              <span class="gs-control-item__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <div>
                <p class="gs-control-item__label">Command palette</p>
                <p class="gs-control-item__desc">Quickly search and jump to any section or token.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="shortcut-table">
          <table>
            <thead>
              <tr><th>Shortcut</th><th>Action</th></tr>
            </thead>
            <tbody>
              <tr><td><kbd>Ctrl+Z</kbd></td><td>Undo</td></tr>
              <tr><td><kbd>Ctrl+Y</kbd> / <kbd>Ctrl+Shift+Z</kbd></td><td>Redo</td></tr>
              <tr><td><kbd>Escape</kbd></td><td>Close popover / modal</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderColourPrimitives(body, tokens) {
    const toks = tokens['color-primitives'] || [];

    const families = [
      { label: 'Neutral', prefix: 'neutral-' },
      { label: 'Blue',    prefix: 'brand-' },
      { label: 'Green',   prefix: 'green-' },
      { label: 'Red',     prefix: 'red-' },
      { label: 'Amber',   prefix: 'amber-' },
      { label: 'Purple',  prefix: 'purple-' },
      { label: 'Pink',    prefix: 'pink-' },
      { label: 'Teal',    prefix: 'teal-' },
      { label: 'Cyan',    prefix: 'cyan-' },
      { label: 'Orange',  prefix: 'orange-' },
      { label: 'Yellow',  prefix: 'yellow-' },
    ];
    const scaleRows = families.map(({ label, prefix }) => {
      const items = toks.filter(t => t.name.startsWith(prefix));
      if (!items.length) return '';
      return `
        <div class="color-scale-row">
          <span class="color-scale-label">${label}</span>
          <div class="color-scale-wrap">
            <div class="color-scale-swatches">
              ${items.map(t => `
                <div class="color-scale-swatch" style="background:var(--${t.name})" data-var="--${t.name}" title="--${t.name}: ${t.value}"></div>
              `).join('')}
            </div>
            <div class="color-scale-steps">
              ${items.map(t => `
                <span class="color-scale-step">${t.name.replace(prefix, '')}</span>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    body.innerHTML = `<div class="color-scale-grid">${scaleRows}</div>`;
  }

  function renderColourSemantic(body, tokens) {
    const toks = tokens['color-semantic'] || [];
    const knownPrefixes = ['bg-', 'fg-', 'border-', 'accent', 'status-'];
    const groups = [
      { label: 'Background', items: toks.filter(t => t.name.startsWith('bg-')) },
      { label: 'Foreground', items: toks.filter(t => t.name.startsWith('fg-')) },
      { label: 'Border',     items: toks.filter(t => t.name.startsWith('border-')) },
      { label: 'Accent',     items: toks.filter(t => t.name.startsWith('accent')) },
      { label: 'Status',     items: toks.filter(t => t.name.startsWith('status-')) },
      { label: 'Custom',     items: toks.filter(t => !knownPrefixes.some(p => t.name.startsWith(p))) },
    ];

    const scaleRow = ({ label, items }) => {
      if (!items.length) return '';
      return `
        <div class="color-scale-row">
          <span class="color-scale-label">${label}</span>
          <div class="color-scale-wrap">
            <div class="color-scale-swatches">
              ${items.map(t => `
                <div class="color-scale-swatch" style="background:var(--${t.name})" data-var="--${t.name}" title="--${t.name}: ${t.value}"></div>
              `).join('')}
            </div>
            <div class="color-scale-steps">
              ${items.map(t => {
                const step = t.name
                  .replace(/^bg-|^fg-|^border-|^status-/, '')
                  .replace(/^accent$/, 'base') || t.name;
                return `<span class="color-scale-step" title="${t.description || ''}">${step}</span>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    };

    body.innerHTML = `<div class="color-scale-grid">${groups.map(scaleRow).join('')}</div>`;
  }

  function renderTypeScale(body, tokens, settings = {}) {
    const toks = (tokens['type-scale'] || []).filter(t => t.name.startsWith('fs-'));
    const base = settings.baseFontSize || 16;
    const showPx = settings.inputUnit === 'px';
    const displayVal = (v) => {
      if (showPx && v && v.endsWith('rem')) {
        const px = parseFloat(v) * base;
        return (px === 0 ? '0' : px.toFixed(0)) + 'px';
      }
      return v;
    };
    body.innerHTML = toks.map(t => `
      <div class="type-scale-item">
        <span class="type-scale-item__sample" style="font-size:var(--${t.name})">The quick brown fox jumps over the lazy dog</span>
        <div class="type-scale-item__meta">
          <span class="type-scale-item__token">--${t.name}</span>
          <span class="type-scale-item__value">${displayVal(t.value)}</span>
        </div>
      </div>
    `).join('');
  }

  function renderTypeFluid(body, tokens, settings) {
    const toks = tokens['type-fluid'] || [];
    body.innerHTML = toks.map(t => {
      const cv = CSSEngine.computeFluidValue(t, settings, tokens);
      return `
        <div class="type-scale-item">
          <span class="type-scale-item__sample" style="font-size:${cv}">The quick brown fox — fluid type</span>
          <div class="type-scale-item__meta">
            <span class="type-scale-item__token">--${t.name}</span>
            <span class="type-scale-item__value" style="font-size:9.5px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cv}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderHeadings(body) {
    body.innerHTML = `
      <div class="preview-headings">
        <h1>The Craft of Great Typography</h1>
        <span class="heading-meta">h1 · text-5xl · leading-tight</span>
        <h2>Design Systems at Scale</h2>
        <span class="heading-meta">h2 · text-4xl · font-bold</span>
        <h3>Component Architecture Patterns</h3>
        <span class="heading-meta">h3 · text-3xl · font-semibold</span>
        <h4>Token-Driven Styling</h4>
        <span class="heading-meta">h4 · text-2xl · font-semibold</span>
        <h5>Accessible by Default</h5>
        <span class="heading-meta">h5 · text-xl · font-semibold</span>
        <h6>Keyboard Navigation Support</h6>
        <span class="heading-meta">h6 · text-lg · font-semibold</span>
      </div>
    `;
  }

  function renderBodyText(body) {
    body.innerHTML = `
      <div class="preview-body">
        <p>
          Good typography is the foundation of any great design system. It establishes hierarchy,
          guides the reader's eye, and communicates the personality of your brand. When type is
          set with intention — proper scale, weight, and spacing — everything else falls into place.
        </p>
        <p class="text-muted">
          Secondary body text using fg-muted. Use this for supporting copy, captions, or any text
          that should be visually de-emphasised without becoming inaccessible.
        </p>
      </div>
    `;
  }

  function renderLinks(body) {
    body.innerHTML = `
      <div class="preview-links" style="font-size:var(--fs-base);line-height:var(--leading-relaxed)">
        <p>
          Read the <a href="#">documentation</a> to learn more about how tokens work.
          You can also <a href="#">browse the source code</a> or
          <a href="#" aria-label="Open external link">contribute on GitHub
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-left:2px"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>.
        </p>
        <p style="margin-top:var(--s-3)">
          Visited links should remain clearly distinguishable.
          <a href="#">This link leads somewhere.</a>
        </p>
      </div>
    `;
  }

  function renderLists(body) {
    body.innerHTML = `
      <div class="preview-lists">
        <p class="preview-btn-row-label">Unordered</p>
        <ul>
          <li>Consistent spacing scales built from a single base unit</li>
          <li>Semantic colour tokens that adapt to dark and light modes</li>
          <li>Fluid typography using CSS clamp() for smooth scaling</li>
          <li>Production-ready CSS custom properties output</li>
        </ul>
        <p class="preview-btn-row-label" style="margin-top:var(--s-6)">Ordered</p>
        <ol>
          <li>Define your primitive colour palette</li>
          <li>Map primitives to semantic roles</li>
          <li>Build components using only semantic tokens</li>
          <li>Export and integrate into your project</li>
        </ol>
        <p class="preview-btn-row-label" style="margin-top:var(--s-6)">Steps</p>
        <ol class="list-steps">
          <li>Define your primitive colour palette and map to semantic roles</li>
          <li>Build component tokens for buttons, inputs, and cards</li>
          <li>Preview every change live in the style guide</li>
          <li>Export CSS and integrate into your project</li>
        </ol>
      </div>
    `;
  }

  function renderCode(body) {
    body.innerHTML = `
      <div style="font-size:var(--fs-base);color:var(--fg-base);line-height:var(--leading-relaxed)">
        <p>
          Use the <code class="inline-code">var(--accent)</code> CSS custom property to apply
          the primary accent colour anywhere in your stylesheet.
          The <code class="inline-code">clamp()</code> function powers fluid scaling.
        </p>
      </div>
      <br/>
      <pre class="code-block"><code><span class="code-comment">/* Applying token-driven styles */</span>
<span class="code-prop">.hero-title</span> {
  <span class="code-keyword">font-size</span>: <span class="code-string">var(--fluid-4xl)</span>;
  <span class="code-keyword">color</span>: <span class="code-string">var(--fg-base)</span>;
  <span class="code-keyword">letter-spacing</span>: <span class="code-string">-0.03em</span>;
  <span class="code-keyword">line-height</span>: <span class="code-string">var(--leading-tight)</span>;
}

<span class="code-prop">.btn--primary</span> {
  <span class="code-keyword">background</span>: <span class="code-string">var(--accent)</span>;
  <span class="code-keyword">color</span>: <span class="code-string">var(--accent-fg)</span>;
  <span class="code-keyword">border-radius</span>: <span class="code-string">var(--r-md)</span>;
  <span class="code-keyword">transition</span>: <span class="code-fn">background</span> <span class="code-string">var(--duration-150) var(--ease-in-out)</span>;
}</code></pre>
    `;
  }

  function renderBlockquote(body) {
    body.innerHTML = `
      <div class="preview-blockquote">
        <blockquote>
          <p>"Design is not just what it looks like and feels like. Design is how it works. A great design system makes the right thing easy and the wrong thing impossible."</p>
          <cite>— Inspired by Steve Jobs</cite>
        </blockquote>
      </div>
    `;
  }

  function renderSpacing(body, tokens, settings = {}) {
    const toks = (tokens['spacing'] || []).filter(t => t.name !== 's-0');
    const base = settings.baseFontSize || 16;
    const showPx = settings.inputUnit === 'px';
    const displayVal = (v) => {
      if (showPx && v && v.endsWith('rem')) {
        const px = parseFloat(v) * base;
        return (px === 0 ? '0' : px % 1 === 0 ? px + 'px' : px.toFixed(1) + 'px');
      }
      return v;
    };
    body.innerHTML = toks.map(t => {
      const remVal = parseFloat(t.value);
      const barW = Math.min(remVal * 40, 280);
      return `
        <div class="spacing-item">
          <span class="spacing-item__label">--${t.name}</span>
          <div class="spacing-item__bar-wrap">
            <div class="spacing-item__bar" style="width:${barW}px"></div>
          </div>
          <span class="spacing-item__value">${displayVal(t.value)}</span>
        </div>
      `;
    }).join('');
  }

  function renderSpacingFluid(body, tokens, settings) {
    const toks = tokens['spacing-fluid'] || [];
    body.innerHTML = toks.map(t => {
      const cv = CSSEngine.computeFluidValue(t, settings, tokens);
      return `
        <div class="spacing-item">
          <span class="spacing-item__label">--${t.name}</span>
          <div class="spacing-item__bar-wrap">
            <div class="spacing-item__bar" style="width:${Math.min(t.fluidMin * 40, 280)}px"></div>
          </div>
          <span class="spacing-item__value" style="font-size:9.5px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cv}</span>
        </div>
      `;
    }).join('');
  }

  function renderRadius(body, tokens, settings = {}) {
    const toks = tokens['radius'] || [];
    const base = settings.baseFontSize || 16;
    const showPx = settings.inputUnit === 'px';
    const displayVal = (v) => {
      if (showPx && v && v.endsWith('rem')) {
        const px = parseFloat(v) * base;
        return (px === 0 ? '0' : px % 1 === 0 ? px + 'px' : px.toFixed(1) + 'px');
      }
      return v;
    };
    body.innerHTML = `
      <div class="radius-strip">
        <div class="radius-strip__shapes">
          ${toks.map(t => `
            <div class="radius-strip__shape" style="border-radius:var(--${t.name})" title="--${t.name}: ${t.value}"></div>
          `).join('')}
        </div>
        <div class="radius-strip__labels">
          ${toks.map(t => `
            <div class="radius-strip__label">
              <span class="radius-strip__name">${t.name.replace('r-', '')}</span>
              <span class="radius-strip__value">${displayVal(t.value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderShadow(body, tokens) {
    const toks = (tokens['shadow'] || []).filter(t => t.name !== 'shadow-none');
    body.innerHTML = `
      <div class="shadow-stage">
        ${toks.map(t => `
          <div class="shadow-card" style="box-shadow:${t.value}">
            <span class="shadow-card__name">${t.name.replace('shadow-', '')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderMotion(body, tokens) {
    const durations = (tokens['motion'] || []).filter(t => t.name.startsWith('duration-'));
    const easings   = (tokens['motion'] || []).filter(t => t.name.startsWith('ease-'));

    body.innerHTML = `
      <p style="font-size:var(--fs-sm);font-weight:600;color:var(--fg-muted);margin-bottom:var(--s-3)">Durations (hover to animate)</p>
      <div class="motion-grid" style="margin-bottom:var(--s-6)">
        ${durations.map(t => `
          <div class="motion-item">
            <div class="motion-item__box" data-duration="var(--${t.name})" style="transition:transform var(--${t.name}) var(--ease-spring)"></div>
            <span class="motion-item__label">--${t.name}<br/>${t.value}</span>
          </div>
        `).join('')}
      </div>
      <p style="font-size:var(--fs-sm);font-weight:600;color:var(--fg-muted);margin-bottom:var(--s-3)">Easings (hover to animate)</p>
      <div class="motion-grid">
        ${easings.map(t => `
          <div class="motion-item">
            <div class="motion-item__box" data-easing="var(--${t.name})" style="transition:transform 400ms var(--${t.name})"></div>
            <span class="motion-item__label">--${t.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Attach hover handlers for animation
    body.querySelectorAll('.motion-item__box').forEach(box => {
      box.addEventListener('mouseenter', () => {
        box.classList.remove('is-animating');
        void box.offsetWidth;
        const dur = box.getAttribute('data-duration') || 'var(--duration-300)';
        const ease = box.getAttribute('data-easing') || 'var(--ease-spring)';
        box.style.animationDuration = dur;
        box.style.animationTimingFunction = ease;
        box.classList.add('is-animating');
      });
      box.addEventListener('animationend', () => {
        box.classList.remove('is-animating');
      });
    });
  }

  function renderButtons(body) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px">
        <div>
          <p class="preview-btn-row-label">Variants</p>
          <div class="preview-btn-group">
            <button class="btn btn--primary">Primary</button>
            <button class="btn btn--secondary">Secondary</button>
            <button class="btn btn--ghost">Ghost</button>
            <button class="btn btn--danger">Danger</button>
          </div>
        </div>
        <div>
          <p class="preview-btn-row-label">Sizes</p>
          <div class="preview-btn-group">
            <button class="btn btn--primary btn--sm">Small</button>
            <button class="btn btn--primary">Base</button>
            <button class="btn btn--primary btn--lg">Large</button>
          </div>
        </div>
        <div>
          <p class="preview-btn-row-label">With icon</p>
          <div class="preview-btn-group">
            <button class="btn btn--primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              Download
            </button>
            <button class="btn btn--secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload
            </button>
            <button class="btn btn--ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search
            </button>
          </div>
        </div>
        <div>
          <p class="preview-btn-row-label">Disabled</p>
          <div class="preview-btn-group">
            <button class="btn btn--primary" disabled>Primary</button>
            <button class="btn btn--secondary" disabled>Secondary</button>
            <button class="btn btn--danger" disabled>Danger</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderInput(body) {
    body.innerHTML = `
      <div style="display:grid;gap:var(--s-4);max-width:400px">
        <div>
          <label class="form-label" for="prev-input-default">Default</label>
          <input id="prev-input-default" class="input" type="text" placeholder="Enter your name…" />
        </div>
        <div>
          <label class="form-label" for="prev-input-val">With value</label>
          <input id="prev-input-val" class="input" type="text" value="Farhan Munim" />
          <span class="form-hint">This is a hint text to help users fill this field.</span>
        </div>
        <div>
          <label class="form-label" for="prev-input-err">Error state</label>
          <input id="prev-input-err" class="input input--error" type="email" value="invalid-email" />
          <span class="form-error-msg">Please enter a valid email address.</span>
        </div>
        <div>
          <label class="form-label" for="prev-input-dis">Disabled</label>
          <input id="prev-input-dis" class="input" type="text" placeholder="Cannot edit this field" disabled />
        </div>
      </div>
    `;
  }

  function renderTextarea(body) {
    body.innerHTML = `
      <div style="display:grid;gap:var(--s-4);max-width:400px">
        <div>
          <label class="form-label" for="prev-ta-default">Default</label>
          <textarea id="prev-ta-default" class="textarea" rows="4" placeholder="Tell us about your project…"></textarea>
        </div>
        <div>
          <label class="form-label" for="prev-ta-dis">Disabled</label>
          <textarea id="prev-ta-dis" class="textarea" rows="3" placeholder="Cannot edit this field" disabled></textarea>
        </div>
      </div>
    `;
  }

  function renderSelect(body) {
    body.innerHTML = `
      <div style="display:grid;gap:var(--s-4);max-width:300px">
        <div>
          <label class="form-label" for="prev-sel-default">Default</label>
          <select id="prev-sel-default" class="select">
            <option>Choose a framework…</option>
            <option selected>Design System Builder</option>
            <option>Tailwind CSS</option>
            <option>Radix UI</option>
            <option>shadcn/ui</option>
          </select>
        </div>
        <div>
          <label class="form-label" for="prev-sel-dis">Disabled</label>
          <select id="prev-sel-dis" class="select" disabled>
            <option>Cannot change this</option>
          </select>
        </div>
      </div>
    `;
  }

  function renderCheckboxRadio(body) {
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--s-6)">
        <div>
          <p class="form-label" style="margin-bottom:var(--s-3)">Checkbox</p>
          <div class="check-group">
            <label class="check-item"><input type="checkbox" /><span>Unchecked</span></label>
            <label class="check-item"><input type="checkbox" checked /><span>Checked</span></label>
            <label class="check-item"><input type="checkbox" data-indeterminate="true" /><span>Indeterminate</span></label>
            <label class="check-item"><input type="checkbox" disabled /><span>Disabled</span></label>
            <label class="check-item"><input type="checkbox" checked disabled /><span>Checked &amp; disabled</span></label>
          </div>
        </div>
        <div>
          <p class="form-label" style="margin-bottom:var(--s-3)">Radio</p>
          <div class="check-group">
            <label class="check-item"><input type="radio" name="prev-radio" /><span>Option A</span></label>
            <label class="check-item"><input type="radio" name="prev-radio" checked /><span>Option B (selected)</span></label>
            <label class="check-item"><input type="radio" name="prev-radio" /><span>Option C</span></label>
            <label class="check-item"><input type="radio" name="prev-radio-dis" disabled /><span>Disabled</span></label>
          </div>
        </div>
      </div>
    `;

    // Set indeterminate
    const indet = body.querySelector('[data-indeterminate="true"]');
    if (indet) indet.indeterminate = true;
  }

  function renderToggle(body) {
    const items = [
      { label: 'Notifications', checked: true },
      { label: 'Dark mode', checked: false },
      { label: 'Auto-save', checked: true },
      { label: 'Beta features', checked: false },
    ];

    body.innerHTML = items.map((item) => `
      <div class="toggle-row">
        <label class="toggle" aria-label="${item.label}">
          <input type="checkbox" ${item.checked ? 'checked' : ''} />
          <span class="toggle__track"></span>
        </label>
        <span class="toggle-label">${item.label}</span>
      </div>
    `).join('');
  }

  function renderBadge(body) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--s-4)">
        <div>
          <p class="preview-btn-row-label">Status badges</p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--s-2);align-items:center">
            <span class="badge badge--default">Default</span>
            <span class="badge badge--success">Success</span>
            <span class="badge badge--warning">Warning</span>
            <span class="badge badge--error">Error</span>
            <span class="badge badge--info">Info</span>
            <span class="badge badge--purple">Purple</span>
            <span class="badge badge--pink">Pink</span>
            <span class="badge badge--teal">Teal</span>
            <span class="badge badge--orange">Orange</span>
          </div>
        </div>
        <div>
          <p class="preview-btn-row-label">Tag (removable)</p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--s-2);align-items:center">
            <span class="tag">Design Systems <button class="tag__remove" aria-label="Remove tag">×</button></span>
            <span class="tag">CSS Custom Props <button class="tag__remove" aria-label="Remove tag">×</button></span>
            <span class="tag">Token-driven <button class="tag__remove" aria-label="Remove tag">×</button></span>
          </div>
        </div>
      </div>
    `;
  }

  function renderAlert(body) {
    body.innerHTML = `
      <div class="alert alert--info">
        <svg class="alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div class="alert__body"><p class="alert__title">Heads up</p><p class="alert__msg">You can customise any token using the editor on the right panel.</p></div>
      </div>
      <div class="alert alert--success">
        <svg class="alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <div class="alert__body"><p class="alert__title">Tokens exported</p><p class="alert__msg">Your design tokens have been successfully exported as JSON.</p></div>
      </div>
      <div class="alert alert--warning">
        <svg class="alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div class="alert__body"><p class="alert__title">Duplicate token name</p><p class="alert__msg">A token with this name already exists. Please choose a unique name.</p></div>
      </div>
      <div class="alert alert--error">
        <svg class="alert__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <div class="alert__body"><p class="alert__title">Invalid value</p><p class="alert__msg">The colour value you entered is not valid. Please use a hex, rgb, or hsl value.</p></div>
      </div>
    `;
  }

  function renderCard(body) {
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:var(--s-5)">
        <div class="card">
          <div class="card__body">
            <h3 class="card__title">Standard Card</h3>
            <p class="card__text">A simple card with a title and body text. Uses bg-surface and border-base tokens throughout.</p>
          </div>
          <div class="card__footer">
            <span>March 2025</span>
            <span class="badge badge--info">New</span>
          </div>
        </div>

        <div class="card card--interactive">
          <div class="card__body">
            <h3 class="card__title">Interactive Card</h3>
            <p class="card__text">Hover over this card to see the elevated shadow and stronger border effect.</p>
          </div>
          <div class="card__footer">
            <span>Hover me</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        <div class="card">
          <div class="card__media" aria-hidden="true"></div>
          <div class="card__body">
            <h3 class="card__title">Media Card</h3>
            <p class="card__text">A card with a gradient header using accent and info status tokens.</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderModal(body) {
    body.innerHTML = `
      <div class="modal-preview">
        <div class="modal-preview__inner">
          <div class="modal-preview__header">
            <h3 class="modal-preview__title">Confirm Action</h3>
            <button class="app-btn app-btn--ghost app-btn--icon" aria-label="Close modal" style="width:28px;height:28px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-preview__body">
            <p>Are you sure you want to delete this token? This action cannot be undone and may break references to this token in your components.</p>
            <p>Consider exporting your current token set before making destructive changes.</p>
          </div>
          <div class="modal-preview__footer">
            <button class="btn btn--ghost btn--sm">Cancel</button>
            <button class="btn btn--danger btn--sm">Delete token</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDivider(body) {
    body.innerHTML = `
      <div style="max-width:480px">
        <p style="font-size:var(--fs-sm);color:var(--fg-muted);margin-bottom:var(--s-3)">Plain divider</p>
        <hr class="divider" />
        <p style="font-size:var(--fs-sm);color:var(--fg-muted);margin-bottom:var(--s-3)">Labelled divider</p>
        <div class="divider-labeled">
          <span class="divider-labeled__text">Or continue with</span>
        </div>
        <div style="display:flex;gap:var(--s-2);margin-top:var(--s-4)">
          <button class="btn btn--secondary" style="flex:1">GitHub</button>
          <button class="btn btn--secondary" style="flex:1">Google</button>
        </div>
      </div>
    `;
  }

  function renderTable(body) {
    const rows = [
      { name: 'Alex Johnson', role: 'Designer', status: 'Active', joined: 'Jan 2024' },
      { name: 'Sam Rivera',   role: 'Engineer', status: 'Active', joined: 'Mar 2024' },
      { name: 'Jordan Kim',   role: 'PM',       status: 'Pending', joined: 'May 2024' },
      { name: 'Casey Chen',   role: 'Designer', status: 'Inactive', joined: 'Feb 2023' },
    ];
    const statusBadge = (s) => {
      const map = { Active: 'badge--success', Pending: 'badge--warning', Inactive: 'badge--default' };
      return `<span class="badge ${map[s] || 'badge--default'}">${s}</span>`;
    };
    body.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Role</th><th>Status</th><th>Joined</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.name}</td>
                <td style="color:var(--fg-muted)">${r.role}</td>
                <td>${statusBadge(r.status)}</td>
                <td style="color:var(--fg-muted)">${r.joined}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderTabs(body) {
    const tabs = ['Overview', 'Components', 'Tokens', 'Settings'];
    body.innerHTML = `
      <div>
        <div class="tabs-bar" role="tablist">
          ${tabs.map((t, i) => `
            <button class="tab${i === 0 ? ' tab--active' : ''}${i === 3 ? ' tab-disabled' : ''}"
                    role="tab" aria-selected="${i === 0}" ${i === 3 ? 'disabled' : ''}>${t}</button>
          `).join('')}
        </div>
        <p style="font-size:var(--fs-sm);color:var(--fg-muted)">
          Tab panel content for <strong style="color:var(--fg-base)">Overview</strong>. Each tab represents a different view of your design system.
        </p>
      </div>
    `;

    // Live tab switching
    body.querySelectorAll('.tab:not(:disabled)').forEach(tab => {
      tab.addEventListener('click', () => {
        body.querySelectorAll('.tab').forEach(t => {
          t.classList.remove('tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('tab--active');
        tab.setAttribute('aria-selected', 'true');
        const p = body.querySelector('p');
        if (p) p.innerHTML = `Tab panel content for <strong style="color:var(--fg-base)">${tab.textContent}</strong>. Each tab represents a different view of your design system.`;
      });
    });
  }

  function renderTooltip(body) {
    body.innerHTML = `
      <div style="display:flex;gap:var(--s-6);align-items:flex-end;flex-wrap:wrap;padding-top:var(--s-8)">
        <div>
          <p style="font-size:var(--fs-xs);color:var(--fg-muted);margin-bottom:var(--s-2)">Hover to see</p>
          <div class="tooltip-wrap">
            <button class="btn btn--secondary">Hover me
              <div class="tooltip-content" role="tooltip">This is a tooltip with helpful info</div>
            </button>
          </div>
        </div>
        <div>
          <div class="tooltip-wrap">
            <button class="btn btn--primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              More info
              <div class="tooltip-content" role="tooltip">Additional context lives here</div>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderAvatar(body) {
    const initials = ['A', 'JK', 'SR', 'CM', 'FT'];
    const colors = [
      'background:var(--accent-bg);color:var(--accent)',
      'background:color-mix(in srgb,var(--status-success) 15%,transparent);color:var(--status-success)',
      'background:color-mix(in srgb,var(--status-info) 15%,transparent);color:var(--status-info)',
      'background:color-mix(in srgb,var(--status-warning) 15%,transparent);color:var(--status-warning)',
      'background:color-mix(in srgb,var(--status-error) 15%,transparent);color:var(--status-error)',
    ];

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--s-6)">
        <div>
          <p class="preview-btn-row-label">Sizes</p>
          <div style="display:flex;align-items:center;gap:var(--s-3)">
            <span class="avatar avatar--sm" style="${colors[0]}">A</span>
            <span class="avatar avatar--md" style="${colors[1]}">JK</span>
            <span class="avatar avatar--lg" style="${colors[2]}">SR</span>
            <span class="avatar avatar--xl" style="${colors[3]}">CM</span>
          </div>
        </div>
        <div>
          <p class="preview-btn-row-label">Stack</p>
          <div class="avatar-stack">
            ${initials.slice(0, 4).map((i, idx) => `
              <span class="avatar avatar--md" style="${colors[idx % colors.length]};z-index:${4-idx}">${i}</span>
            `).join('')}
            <span class="avatar avatar--md" style="background:var(--bg-elevated);color:var(--fg-muted);z-index:0">+3</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderAll(state) {
    const container = document.getElementById('preview-inner');
    if (!container) return;

    const { tokens, settings } = state;

    const sections = [
      ['getting-started',   '',                   '',                                       el => renderGettingStarted(el)],
      ['colour-primitives', 'Colour · Primitives', 'Raw palette values — neutrals, brand violet, and status colours.', el => renderColourPrimitives(el, tokens)],
      ['colour-semantic',   'Colour · Semantic',  'Role-based tokens that map to context. Dark mode values shown where applicable.', el => renderColourSemantic(el, tokens)],
      ['type-scale',        'Type Scale',         'Fixed font size tokens.',                                           el => renderTypeScale(el, tokens, settings)],
      ['type-fluid',        'Fluid Type',         'Font sizes using clamp() — scale smoothly between viewport breakpoints.', el => renderTypeFluid(el, tokens, settings)],
      ['headings',          'Headings',           'h1 through h6 with realistic content.',                             el => renderHeadings(el)],
      ['body-text',         'Body Text',          'Paragraph styles for primary and secondary content.',               el => renderBodyText(el)],
      ['links',             'Links',              'Inline links with hover and focus states.',                         el => renderLinks(el)],
      ['lists',             'Lists',              'Unordered and ordered list styles.',                                el => renderLists(el)],
      ['code',              'Code',               'Inline code and code blocks.',                                      el => renderCode(el)],
      ['blockquote',        'Blockquote',         'Quoted text with accent left border.',                              el => renderBlockquote(el)],
      ['spacing',           'Spacing',            '4px-base scale from s-0 to s-32.',                         el => renderSpacing(el, tokens, settings)],
      ['spacing-fluid',     'Fluid Spacing',      'Spacing tokens using clamp() for viewport-responsive padding and gaps.', el => renderSpacingFluid(el, tokens, settings)],
      ['radius',            'Radius',             'Border radius tokens from none to full pill.',                      el => renderRadius(el, tokens, settings)],
      ['shadow',            'Shadow',             'Box shadow tokens from sm to 2xl.',                                 el => renderShadow(el, tokens)],
      ['motion',            'Motion',             'Duration and easing tokens. Click boxes to preview.',               el => renderMotion(el, tokens)],
      ['buttons',           'Buttons',            'Primary, secondary, ghost, and danger variants in 3 sizes.',        el => renderButtons(el),       '.btn .btn--primary .btn--ghost'],
      ['input',             'Input',              'Text input in default, error, and disabled states.',                el => renderInput(el),         '.input'],
      ['textarea',          'Textarea',           'Multi-line text input.',                                            el => renderTextarea(el),      '.textarea'],
      ['select',            'Select',             'Dropdown select element.',                                          el => renderSelect(el),        '.select'],
      ['checkbox-radio',    'Checkbox & Radio',   'Checked, unchecked, indeterminate, and disabled states.',           el => renderCheckboxRadio(el), '.checkbox .radio'],
      ['toggle',            'Toggle',             'On/off toggle — click to change state.',                            el => renderToggle(el),        '.toggle'],
      ['badge',             'Badge',              'Status badges and removable tags.',                                  el => renderBadge(el),         '.badge .badge--*'],
      ['alert',             'Alert',              'Info, success, warning, and error alert variants.',                 el => renderAlert(el),         '.alert .alert--*'],
      ['card',              'Card',               'Standard, interactive hover, and media card variants.',             el => renderCard(el),          '.card'],
      ['modal',             'Modal',              'Static representation of a modal dialog.',                          el => renderModal(el),         '.modal'],
      ['divider',           'Divider',            'Horizontal rule variants — plain and labelled.',                    el => renderDivider(el),       '.divider'],
      ['table',             'Table',              'Data table with zebra striping and row hover.',                     el => renderTable(el),         '.table'],
      ['tabs',              'Tabs',               'Horizontal tabs — active, hover, and disabled states.',             el => renderTabs(el),          '.tabs .tab'],
      ['tooltip',           'Tooltip',            'Button with tooltip appearing above.',                              el => renderTooltip(el),       '.tooltip-wrap'],
      ['avatar',            'Avatar',             'Image fallback initials in multiple sizes, and an avatar stack.',  el => renderAvatar(el),        '.avatar .avatar-stack'],
    ];

    container.innerHTML = '';
    sections.forEach(([id, title, desc, fn, className = '']) => {
      const sec = section(id, title, desc, fn, className);
      container.appendChild(sec);
    });
  }

  // Partial re-render for a specific section only
  function rerenderSection(sectionId, state) {
    const el = document.querySelector(`#section-${sectionId} .preview-section__body`);
    if (!el) return;

    const { tokens, settings } = state;

    switch (sectionId) {
      // Token visualisation sections
      case 'colour-primitives': renderColourPrimitives(el, tokens); break;
      case 'colour-semantic':   renderColourSemantic(el, tokens); break;
      case 'type-scale':        renderTypeScale(el, tokens, settings); break;
      case 'type-fluid':        renderTypeFluid(el, tokens, settings); break;
      case 'spacing':           renderSpacing(el, tokens, settings); break;
      case 'spacing-fluid':     renderSpacingFluid(el, tokens, settings); break;
      case 'radius':            renderRadius(el, tokens, settings); break;
      case 'shadow':            renderShadow(el, tokens); break;
      case 'motion':            renderMotion(el, tokens); break;
      // Component preview sections — re-render so structural token changes show immediately
      case 'buttons':        renderButtons(el); break;
      case 'input':          renderInput(el); break;
      case 'textarea':       renderTextarea(el); break;
      case 'select':         renderSelect(el); break;
      case 'checkbox-radio': renderCheckboxRadio(el); break;
      case 'toggle':         renderToggle(el); break;
      case 'badge':          renderBadge(el); break;
      case 'alert':          renderAlert(el); break;
      case 'card':           renderCard(el); break;
      case 'modal':          renderModal(el); break;
      case 'divider':        renderDivider(el); break;
      case 'table':          renderTable(el); break;
      case 'tabs':           renderTabs(el); break;
      case 'tooltip':        renderTooltip(el); break;
      case 'avatar':         renderAvatar(el); break;
      case 'headings':       renderHeadings(el); break;
      case 'body-text':      renderBodyText(el); break;
      case 'links':          renderLinks(el); break;
      case 'lists':          renderLists(el); break;
      case 'code':           renderCode(el); break;
      case 'blockquote':     renderBlockquote(el); break;
    }
  }

  return { renderAll, rerenderSection };
})();

/* ═══════════════════════════════════════════════════════════════════════
   UI MODULE
   ═══════════════════════════════════════════════════════════════════════ */

const UI = (() => {

  /* ── State ── */
  let activeSection = 'getting-started';
  let searchQuery = '';
  let cssPanelTab = 'tokens';
  let pendingDeleteId = null;

  /* ── Toast ── */
  function showToast(message, type = 'info', duration = 2800) {
    const container = document.getElementById('toast-container');
    const icons = {
      success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      error:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  /* ── CSS Panel ── */
  function updateCSSOutput() {
    const state = TokenStore.getState();
    const settings = state.settings;
    const css = CSSEngine.generateCSS(state, cssPanelTab, settings.cssHideComments, settings.cssHideFramework);
    const codeEl = document.getElementById('css-code');
    if (codeEl) codeEl.innerHTML = syntaxHighlightCSS(css);
  }

  function markInputError(input, message) {
    input.style.borderColor = 'var(--status-error, #e5484d)';
    input.title = message;
    input.focus();
    input.select();
    showToast(message, 'error');
    const clear = () => {
      input.style.borderColor = '';
      input.title = '';
      input.removeEventListener('input', clear);
    };
    input.addEventListener('input', clear);
  }

  function syntaxHighlightCSS(css) {
    // Simple tokeniser — escape HTML first
    let s = css
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Comments
    s = s.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="css-cmt">$1</span>');
    // At-rules
    s = s.replace(/(@[\w-]+)/g, '<span class="css-at">$1</span>');
    // Selectors (lines ending in {)
    s = s.replace(/^([^{}\n]+)\{/gm, '<span class="css-sel">$1</span>{');
    // Properties
    s = s.replace(/^\s+(--?[\w-]+)(\s*:)/gm, (_, p, colon) =>
      `  <span class="css-prop">${p}</span>${colon}`
    );

    return s;
  }

  /* ── Token Editor ── */
  // For component sections, return 'components' plus a prefix filter
  const COMPONENT_SECTION_PREFIX = {
    'buttons':        'btn-',
    'input':          'input-',
    'textarea':       'input-',
    'select':         'input-',
    'checkbox-radio': 'toggle-',
    'toggle':         'toggle-',
    'badge':          'badge-',
    'alert':          'alert-',
    'card':           'card-',
    'modal':          'card-',
    'divider':        'border-',
    'table':          'table-',
    'tabs':           'tab-',
    'tooltip':        'tooltip-',
    'avatar':         'avatar-',
    'headings':       'h',
    'body-text':      'body-',
    'links':          'link-',
    'lists':          ['list-', 'step-list-'],
    'blockquote':     'blockquote-',
    'code':           'code-',
  };

  function getCategoryForSection(sectionId) {
    const map = {
      'colour-primitives': 'color-primitives',
      'colour-semantic':   'color-semantic',
      'type-scale':        'type-scale',
      'type-fluid':        'type-fluid',
      'spacing':           'spacing',
      'spacing-fluid':     'spacing-fluid',
      'radius':            'radius',
      'shadow':            'shadow',
      'motion':            'motion',
    };
    if (map[sectionId]) return map[sectionId];
    if (COMPONENT_SECTION_PREFIX[sectionId]) return 'components';
    return null;
  }

  function getComponentPrefixForSection(sectionId) {
    return COMPONENT_SECTION_PREFIX[sectionId] || null;
  }

  function getCategoryLabel(cat) {
    const map = {
      'color-primitives': 'Colour Primitives',
      'color-semantic':   'Colour Semantic',
      'type-scale':       'Type Scale',
      'type-fluid':       'Fluid Type',
      'spacing':          'Spacing',
      'spacing-fluid':    'Fluid Spacing',
      'radius':           'Radius',
      'shadow':           'Shadow',
      'motion':           'Motion',
      'components':       'Component Tokens',
    };
    return map[cat] || cat;
  }

  function getSectionTitle(sectionId) {
    const map = {
      'getting-started':  'Getting Started',
      'colour-primitives':'Colour Primitives',
      'colour-semantic':  'Colour Semantic',
      'type-scale':       'Type Scale',
      'type-fluid':       'Fluid Type',
      'headings':         'Headings',
      'body-text':        'Body Text',
      'links':            'Links',
      'lists':            'Lists',
      'code':             'Code',
      'blockquote':       'Blockquote',
      'spacing':          'Spacing',
      'spacing-fluid':    'Fluid Spacing',
      'radius':           'Radius',
      'shadow':           'Shadow',
      'motion':           'Motion',
      'buttons':          'Buttons',
      'input':            'Input',
      'textarea':         'Textarea',
      'select':           'Select',
      'checkbox-radio':   'Checkbox & Radio',
      'toggle':           'Toggle',
      'badge':            'Badge',
      'alert':            'Alert',
      'card':             'Card',
      'modal':            'Modal',
      'divider':          'Divider',
      'table':            'Table',
      'tabs':             'Tabs',
      'tooltip':          'Tooltip',
      'avatar':           'Avatar',
    };
    return map[sectionId] || sectionId;
  }

  function renderTokenRow(token) {
    const state = TokenStore.getState();
    const settings = state.settings;
    const isDiff = token.value !== token.defaultValue || token.darkValue !== token.defaultDarkValue;
    const isFluid = token.fluidMin != null;
    const isColor = looksLikeColor(token.value) || isColorCategory(token.category);
    // Only show dark toggle for colour categories, or component tokens whose value is a colour reference
    const showDarkToggle = isColorCategory(token.category) || (token.category === 'components' && isColor);

    const unitLabel = settings.inputUnit;
    const base = settings.baseFontSize;

    // Convert a stored rem string (e.g. "1rem") to the display unit
    const convertDisplay = (v) => {
      if (!v || settings.inputUnit === 'rem') return v;
      if (typeof v === 'string' && v.endsWith('rem')) {
        const px = parseFloat(v) * base;
        return (px === 0 ? '0' : px.toFixed(2).replace(/\.?0+$/, '')) + 'px';
      }
      return v;
    };

    // Convert a stored rem number (fluid min/max) to display unit
    const fluidNumDisplay = (n) => {
      if (settings.inputUnit === 'rem') return n;
      const px = n * base;
      return px === 0 ? 0 : parseFloat(px.toFixed(2));
    };

    // Build datalist of type-scale token names for fluid endpoint inputs
    const typeScaleToks = (state.tokens['type-scale'] || []).filter(t => t.name.startsWith('fs-'));
    const datalistId = `fluid-scale-list-${token.id}`;
    const typeScaleDatalist = `<datalist id="${datalistId}">${typeScaleToks.map(t => `<option value="${t.name}">`).join('')}</datalist>`;

    const fluidValDisplay = (v) => {
      if (typeof v === 'string') return v; // token name — show as-is
      return fluidNumDisplay(v);
    };

    const moonSVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    const sunSVG  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

    let valueContent;
    if (isFluid) {
      valueContent = `
        ${typeScaleDatalist}
        <div class="token-row__fluid-row">
          <div>
            <span class="token-row__fluid-label">Min</span>
            <input type="text" class="token-row__value-input" data-field="fluidMin" value="${fluidValDisplay(token.fluidMin)}" list="${datalistId}" placeholder="fs-sm or 1" />
          </div>
          <div>
            <span class="token-row__fluid-label">Max</span>
            <input type="text" class="token-row__value-input" data-field="fluidMax" value="${fluidValDisplay(token.fluidMax)}" list="${datalistId}" placeholder="fs-4xl or 4.5" />
          </div>
        </div>
      `;
    } else {
      valueContent = `
        <div class="token-row__value-row">
          ${isColor ? `
            <div class="token-row__swatch" title="Pick colour" style="background:${token.value}">
              <input type="color" value="${/^#[0-9a-f]{6}$/i.test(token.value) ? token.value : '#0070f3'}" data-field="color" tabindex="-1" aria-label="Light colour picker" />
            </div>
          ` : ''}
          <input type="text" class="token-row__value-input" data-field="value"
            value="${convertDisplay(token.value) || ''}"
            placeholder="${unitLabel === 'px' ? '16px' : '1rem'}" />
          ${showDarkToggle ? `
            <button class="token-row__dark-toggle${token.darkValue ? ' is-active' : ''}" data-action="toggle-dark"
              title="${token.darkValue ? 'Remove dark value' : 'Add dark value'}"
              aria-label="${token.darkValue ? 'Remove dark value' : 'Add dark value'}"
              aria-pressed="${!!token.darkValue}">${moonSVG}</button>
          ` : ''}
        </div>
        ${token.darkValue ? `
          <div class="token-row__dark-row">
            ${isColor ? `
              <div class="token-row__swatch" title="Pick dark colour" style="background:${token.darkValue}">
                <input type="color" value="${/^#[0-9a-f]{6}$/i.test(token.darkValue) ? token.darkValue : '#3291ff'}" data-field="dark-color" tabindex="-1" aria-label="Dark colour picker" />
              </div>
            ` : ''}
            <span class="token-row__dark-label" aria-hidden="true">${moonSVG}</span>
            <input type="text" class="token-row__value-input" data-field="darkValue"
              value="${convertDisplay(token.darkValue) || ''}" placeholder="Dark value" />
          </div>
        ` : ''}
      `;
    }

    const el = document.createElement('div');
    el.className = `token-row${isDiff ? ' is-modified' : ''}`;
    el.setAttribute('data-token-id', token.id);
    el.setAttribute('role', 'listitem');
    el.innerHTML = `
      <div class="token-row__body">
        <div class="token-row__name-wrap">
          <span class="token-row__name-prefix">--</span>
          <input type="text" class="token-row__name-input" value="${token.name}"
            data-field="name" ${token.locked ? 'readonly' : ''}
            aria-label="Token name: ${token.name}" spellcheck="false" autocomplete="off" />
        </div>
        ${valueContent}
        ${token.description ? `<span class="token-row__desc">${token.description}</span>` : ''}
      </div>
      <div class="token-row__actions" aria-label="Token actions">
        ${token.locked ? `
          <span class="token-row__lock-icon" title="Semantic token — cannot be deleted" aria-label="Locked">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </span>
        ` : ''}
        ${isDiff ? `
          <button class="token-row__action-btn" data-action="reset" title="Reset to default" aria-label="Reset to default">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          </button>
        ` : ''}
        ${!token.locked ? `
          <button class="token-row__action-btn token-row__action-btn--danger" data-action="delete" title="Delete token" aria-label="Delete --${token.name}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        ` : ''}
      </div>
    `;

    // Event wiring
    wireTokenRow(el, token);

    return el;
  }

  function wireTokenRow(el, token) {
    const state = TokenStore.getState();
    const settings = state.settings;

    // Name input
    const nameInput = el.querySelector('[data-field="name"]');
    if (nameInput) {
      nameInput.addEventListener('change', () => {
        const newName = nameInput.value.trim().replace(/\s+/g, '-').toLowerCase();
        if (!newName) { nameInput.value = token.name; return; }
        // Check for duplicates
        const existing = TokenStore.getAllTokens().find(t => t.name === newName && t.id !== token.id);
        if (existing) {
          markInputError(nameInput, `"--${newName}" already exists`);
          nameInput.value = token.name;
          return;
        }
        TokenStore.updateToken(token.id, { name: newName });
      });
    }

    // Value input
    const valueInput = el.querySelector('[data-field="value"]');
    if (valueInput) {
      valueInput.addEventListener('change', () => {
        let v = valueInput.value.trim();
        v = pxInputToRem(v, settings, token.value);
        TokenStore.updateToken(token.id, { value: v });
      });
    }

    // Dark value input
    const darkInput = el.querySelector('[data-field="darkValue"]');
    if (darkInput) {
      darkInput.addEventListener('change', () => {
        let v = darkInput.value.trim();
        v = pxInputToRem(v, settings, token.darkValue);
        TokenStore.updateToken(token.id, { darkValue: v });
      });
    }

    // Colour swatches
    const colorPicker = el.querySelector('[data-field="color"]');
    if (colorPicker) {
      colorPicker.addEventListener('input', debounce(() => {
        TokenStore.updateToken(token.id, { value: colorPicker.value }, true);
        const swatch = colorPicker.closest('.token-row__swatch');
        if (swatch) swatch.style.background = colorPicker.value;
      }, 50));
      colorPicker.addEventListener('change', () => {
        TokenStore.updateToken(token.id, { value: colorPicker.value });
      });
    }

    const darkColorPicker = el.querySelector('[data-field="dark-color"]');
    if (darkColorPicker) {
      darkColorPicker.addEventListener('input', debounce(() => {
        TokenStore.updateToken(token.id, { darkValue: darkColorPicker.value }, true);
        const swatch = darkColorPicker.closest('.token-row__swatch');
        if (swatch) swatch.style.background = darkColorPicker.value;
      }, 50));
      darkColorPicker.addEventListener('change', () => {
        TokenStore.updateToken(token.id, { darkValue: darkColorPicker.value });
      });
    }

    // Fluid inputs — values may be rem numbers or token name strings (e.g. 'fs-sm')
    const fluidMin = el.querySelector('[data-field="fluidMin"]');
    const fluidMax = el.querySelector('[data-field="fluidMax"]');
    const fluidBase = settings.baseFontSize;
    const parseFluidInput = (raw) => {
      const trimmed = raw.trim();
      // If it matches a known token name pattern, store as string reference
      if (/^[a-z]/.test(trimmed) && isNaN(parseFloat(trimmed))) return trimmed;
      let v = parseFloat(trimmed) || 0;
      if (settings.inputUnit === 'px') v = v / fluidBase;
      return v;
    };
    if (fluidMin) {
      fluidMin.addEventListener('change', () => {
        TokenStore.updateToken(token.id, { fluidMin: parseFluidInput(fluidMin.value) });
      });
    }
    if (fluidMax) {
      fluidMax.addEventListener('change', () => {
        TokenStore.updateToken(token.id, { fluidMax: parseFluidInput(fluidMax.value) });
      });
    }

    // Dark toggle
    const darkToggle = el.querySelector('[data-action="toggle-dark"]');
    if (darkToggle) {
      darkToggle.addEventListener('click', () => {
        const hasDark = !!token.darkValue;
        if (hasDark) {
          TokenStore.updateToken(token.id, { darkValue: '' });
        } else {
          TokenStore.updateToken(token.id, { darkValue: token.value });
        }
      });
    }

    // Reset
    const resetBtn = el.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        TokenStore.resetToken(token.id);
        showToast('Token reset to default', 'info');
      });
    }

    // Delete
    const deleteBtn = el.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        pendingDeleteId = token.id;
        // Find tokens that reference this token via var(--name)
        const refPattern = `var(--${token.name})`;
        const refs = TokenStore.getAllTokens().filter(t =>
          t.id !== token.id && (
            (t.value && t.value.includes(refPattern)) ||
            (t.darkValue && t.darkValue.includes(refPattern))
          )
        );
        const inUseWarning = refs.length
          ? `\n\nWarning: ${refs.length} token${refs.length > 1 ? 's' : ''} reference this token: ${refs.map(t => `--${t.name}`).join(', ')}. Those references will break.`
          : '';
        showConfirm({
          title: 'Delete Token',
          message: `Delete token "--${token.name}"? This action cannot be undone.${inUseWarning}`,
          okLabel: 'Delete',
          onOk: () => {
            TokenStore.deleteToken(pendingDeleteId);
            showToast(`Token "--${token.name}" deleted`, 'success');
            pendingDeleteId = null;
          }
        });
      });
    }
  }

  function renderTokenList() {
    const container = document.getElementById('token-list');
    if (!container) return;

    const cat = getCategoryForSection(activeSection);

    if (!cat) {
      container.innerHTML = `<div style="padding:20px 12px;text-align:center;color:var(--app-text-subtle);font-size:12px">
        No editable tokens for this section.<br/>Navigate to a token section in the left panel.
      </div>`;
      return;
    }

    let tokens = TokenStore.getTokensByCategory(cat);

    // For component sections, filter to only show relevant tokens for that section
    const compPrefix = getComponentPrefixForSection(activeSection);
    if (compPrefix && cat === 'components') {
      const prefixes = Array.isArray(compPrefix) ? compPrefix : [compPrefix];
      tokens = tokens.filter(t => prefixes.some(p => t.name.startsWith(p)));
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tokens = tokens.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.value.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }

    // Label: for component sections use the section title, not generic "Component Tokens"
    const displayLabel = compPrefix ? getSectionTitle(activeSection) + ' Tokens' : getCategoryLabel(cat);

    // Update title
    const title = document.getElementById('editor-section-title');
    if (title) title.textContent = displayLabel;

    container.innerHTML = '';

    // Section header
    const header = document.createElement('div');
    header.className = 'token-section__header';
    header.innerHTML = `
      ${displayLabel}
      <span class="token-section__count">${tokens.length}</span>
    `;
    container.appendChild(header);

    if (!tokens.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px 12px;text-align:center;color:var(--app-text-subtle);font-size:12px';
      empty.textContent = searchQuery ? 'No tokens match your search.' : 'No tokens in this category.';
      container.appendChild(empty);
    } else {
      tokens.forEach(t => {
        container.appendChild(renderTokenRow(t));
      });
    }

    // Add custom token form (only if no search active)
    if (!searchQuery) {
      // For component sections, auto-prefix token names so they pass the prefix filter
      const prefixHintRaw = compPrefix || '';
      const prefixHint = Array.isArray(prefixHintRaw) ? prefixHintRaw[0] : prefixHintRaw;
      const sectionHints = {
        'type-scale':  { placeholder: 'fs-name',      tip: 'Font-size tokens should be named <code style="font-size:inherit;color:var(--accent)">fs-*</code> to appear in the style guide.' },
        'colour-semantic': { placeholder: 'bg-name',    tip: 'Use a prefix like <code style="font-size:inherit;color:var(--accent)">bg-</code>, <code style="font-size:inherit;color:var(--accent)">fg-</code>, <code style="font-size:inherit;color:var(--accent)">border-</code>, or <code style="font-size:inherit;color:var(--accent)">status-</code> to group in the preview.' },
      };
      const sectionHint = !prefixHint ? (sectionHints[activeSection] || null) : null;
      const namePlaceholder = prefixHint ? `${prefixHint}name` : (sectionHint ? sectionHint.placeholder : 'token-name');
      const prefixesDisplay = Array.isArray(prefixHintRaw) ? prefixHintRaw.map(p => `<code style="font-size:inherit;color:var(--accent)">--${p}</code>`).join(', ') : (prefixHint ? `<code style="font-size:inherit;color:var(--accent)">--${prefixHint}</code>` : '');

      const form = document.createElement('div');
      form.className = 'add-token-form';
      form.innerHTML = `
        <span class="add-token-form__title">New token</span>
        ${prefixHint ? `<p style="font-size:10px;color:var(--app-text-subtle);margin:0;line-height:1.5">Prefix: ${prefixesDisplay}</p>` : ''}
        ${sectionHint ? `<p style="font-size:10px;color:var(--app-text-subtle);margin:0;line-height:1.5">${sectionHint.tip}</p>` : ''}
        <div class="add-token-form__fields">
          <div class="add-token-form__input-wrap">
            <span class="add-token-form__prefix">--</span>
            <input type="text" id="new-token-name" placeholder="${namePlaceholder}" aria-label="New token name" spellcheck="false" />
          </div>
          <input type="text" id="new-token-value" class="no-prefix" placeholder="value" aria-label="New token value" style="flex:0 0 80px" />
        </div>
        <button id="btn-add-token-submit" class="app-btn app-btn--primary" style="width:100%;justify-content:center;height:28px;font-size:12px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Token
        </button>
      `;
      form.querySelector('#btn-add-token-submit').addEventListener('click', () => {
        const nameInput = form.querySelector('#new-token-name');
        const valueInput = form.querySelector('#new-token-value');
        let name = nameInput.value.trim().replace(/\s+/g, '-').toLowerCase();

        // Auto-prepend section prefix for component sections
        const allPrefixes = Array.isArray(prefixHintRaw) ? prefixHintRaw : (prefixHintRaw ? [prefixHintRaw] : []);
        if (prefixHint && !allPrefixes.some(p => name.startsWith(p))) {
          name = prefixHint + name;
        }

        const value = valueInput.value.trim();
        if (!name || name === prefixHint) {
          markInputError(nameInput, 'Token name is required');
          return;
        }
        const exists = TokenStore.getAllTokens().find(t => t.name === name);
        if (exists) {
          markInputError(nameInput, `"--${name}" already exists`);
          return;
        }
        nameInput.style.borderColor = '';
        nameInput.title = '';
        TokenStore.addToken(cat, { name, value });
        nameInput.value = '';
        valueInput.value = '';
        showToast(`Token "--${name}" added`, 'success');
      });
      container.appendChild(form);
    }
  }

  /* ── Nav ── */
  function setActiveSection(sectionId) {
    activeSection = sectionId;

    // Clear search when switching sections
    if (searchQuery) {
      searchQuery = '';
      const searchEl = document.getElementById('token-search');
      if (searchEl) searchEl.value = '';
    }

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      const sec = el.getAttribute('data-section');
      el.classList.toggle('is-active', sec === sectionId);
      el.setAttribute('aria-current', sec === sectionId ? 'page' : 'false');
    });

    // Update editor title
    const title = document.getElementById('editor-section-title');
    const sectionLabel = (() => {
      const cat = getCategoryForSection(sectionId);
      return cat ? getCategoryLabel(cat) : getSectionTitle(sectionId);
    })();
    if (title) title.textContent = sectionLabel;

    // Update search placeholder to reflect current section
    const searchEl = document.getElementById('token-search');
    if (searchEl) searchEl.placeholder = 'Search tokens in this section\u2026';

    renderTokenList();
  }

  /* ── Intersection Observer ── */
  function initScrollSpy() {
    const sections = document.querySelectorAll('.preview-section');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            const sec = entry.target.getAttribute('data-section');
            if (sec && sec !== activeSection) {
              setActiveSection(sec);
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '-48px 0px -40% 0px' }
    );
    sections.forEach(s => observer.observe(s));
  }

  /* ── CSS Panel ── */
  function setCSSPanelState(newState) {
    const panel = document.getElementById('css-panel');
    if (!panel) return;
    panel.setAttribute('data-state', newState);

    const toggle = document.getElementById('css-panel-toggle');
    const body = document.getElementById('css-panel-body');
    const expandIcon = document.getElementById('css-maximize-icon');
    const restoreIcon = document.getElementById('css-restore-icon');

    const isCollapsed = newState === 'collapsed';
    const isMaximized = newState === 'maximized';

    if (toggle) toggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    if (body) body.setAttribute('aria-hidden', isCollapsed ? 'true' : 'false');
    if (expandIcon) expandIcon.style.display = isMaximized ? 'none' : '';
    if (restoreIcon) restoreIcon.style.display = isMaximized ? '' : 'none';
  }

  function initCSSPanel() {
    const panel = document.getElementById('css-panel');

    // Toggle button: collapsed ↔ normal (or maximized → normal)
    document.getElementById('css-panel-toggle')?.addEventListener('click', () => {
      const state = panel.getAttribute('data-state');
      if (state === 'collapsed') {
        setCSSPanelState('normal');
      } else {
        // normal or maximized → collapsed
        setCSSPanelState('collapsed');
      }
    });

    // Maximize / restore button
    document.getElementById('css-maximize')?.addEventListener('click', () => {
      const state = panel.getAttribute('data-state');
      setCSSPanelState(state === 'maximized' ? 'normal' : 'maximized');
    });

    document.getElementById('css-copy')?.addEventListener('click', () => {
      const code = document.getElementById('css-code')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        showToast('CSS copied to clipboard', 'success');
      });
    });

    document.getElementById('css-download')?.addEventListener('click', () => {
      const css = document.getElementById('css-code')?.textContent || '';
      const blob = new Blob([css], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'style.css';
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSS downloaded', 'success');
    });

    // CSS tabs — restore persisted tab
    const savedTab = localStorage.getItem('dsb-css-tab');
    if (savedTab) cssPanelTab = savedTab;

    document.querySelectorAll('.css-tabs__tab').forEach(tab => {
      const tabId = tab.getAttribute('data-tab');
      tab.classList.toggle('css-tabs__tab--active', tabId === cssPanelTab);
      tab.setAttribute('aria-selected', tabId === cssPanelTab ? 'true' : 'false');
      tab.addEventListener('click', () => {
        cssPanelTab = tabId;
        localStorage.setItem('dsb-css-tab', cssPanelTab);
        document.querySelectorAll('.css-tabs__tab').forEach(t => {
          t.classList.toggle('css-tabs__tab--active', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        updateCSSOutput();
      });
    });
  }

  /* ── Settings ── */
  function initSettings() {
    const btn = document.getElementById('btn-settings');
    const popover = document.getElementById('settings-popover');
    const backdrop = document.getElementById('settings-backdrop');
    const closeBtn = document.getElementById('settings-close');

    function openSettings() {
      const settings = TokenStore.getSettings();
      document.getElementById('setting-base-font').value = settings.baseFontSize;
      document.querySelector(`input[name="input-unit"][value="${settings.inputUnit}"]`).checked = true;
      document.getElementById('setting-min-vp').value = settings.minViewport;
      document.getElementById('setting-max-vp').value = settings.maxViewport;
      document.getElementById('setting-hide-comments').checked = settings.cssHideComments;
      document.getElementById('setting-hide-framework').checked = settings.cssHideFramework;

      popover.hidden = false;
      backdrop.hidden = false;
    }

    function closeSettings() {
      popover.hidden = true;
      backdrop.hidden = true;
    }

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popover.hidden) openSettings(); else closeSettings();
    });
    closeBtn?.addEventListener('click', closeSettings);
    backdrop?.addEventListener('click', closeSettings);

    // Live setting changes
    document.getElementById('setting-base-font')?.addEventListener('change', e => {
      TokenStore.updateSettings({ baseFontSize: parseInt(e.target.value) || 16 });
    });

    document.querySelectorAll('input[name="input-unit"]').forEach(radio => {
      radio.addEventListener('change', () => {
        TokenStore.updateSettings({ inputUnit: radio.value });
        renderTokenList(); // re-render with new unit
      });
    });

    document.getElementById('setting-min-vp')?.addEventListener('change', e => {
      TokenStore.updateSettings({ minViewport: parseInt(e.target.value) || 320 });
    });

    document.getElementById('setting-max-vp')?.addEventListener('change', e => {
      TokenStore.updateSettings({ maxViewport: parseInt(e.target.value) || 1280 });
    });

    document.getElementById('setting-hide-comments')?.addEventListener('change', e => {
      TokenStore.updateSettings({ cssHideComments: e.target.checked }, true);
      updateCSSOutput();
    });

    document.getElementById('setting-hide-framework')?.addEventListener('change', e => {
      TokenStore.updateSettings({ cssHideFramework: e.target.checked }, true);
      updateCSSOutput();
    });
  }

  /* ── Command Palette ── */
  function initCommandPalette() {
    const overlay = document.getElementById('cmd-overlay');
    const input   = document.getElementById('cmd-input');
    const results = document.getElementById('cmd-results');
    let focusedIdx = -1;

    const sections = [
      { type: 'section', name: 'Getting Started',     id: 'getting-started' },
      { type: 'section', name: 'Colour Primitives',   id: 'colour-primitives' },
      { type: 'section', name: 'Colour Semantic',     id: 'colour-semantic' },
      { type: 'section', name: 'Type Scale',          id: 'type-scale' },
      { type: 'section', name: 'Fluid Type',          id: 'type-fluid' },
      { type: 'section', name: 'Headings',            id: 'headings' },
      { type: 'section', name: 'Body Text',           id: 'body-text' },
      { type: 'section', name: 'Links',               id: 'links' },
      { type: 'section', name: 'Lists',               id: 'lists' },
      { type: 'section', name: 'Code',                id: 'code' },
      { type: 'section', name: 'Blockquote',          id: 'blockquote' },
      { type: 'section', name: 'Spacing',             id: 'spacing' },
      { type: 'section', name: 'Fluid Spacing',       id: 'spacing-fluid' },
      { type: 'section', name: 'Radius',              id: 'radius' },
      { type: 'section', name: 'Shadow',              id: 'shadow' },
      { type: 'section', name: 'Motion',              id: 'motion' },
      { type: 'section', name: 'Buttons',             id: 'buttons' },
      { type: 'section', name: 'Input',               id: 'input' },
      { type: 'section', name: 'Textarea',            id: 'textarea' },
      { type: 'section', name: 'Select',              id: 'select' },
      { type: 'section', name: 'Checkbox & Radio',    id: 'checkbox-radio' },
      { type: 'section', name: 'Toggle',              id: 'toggle' },
      { type: 'section', name: 'Badge',               id: 'badge' },
      { type: 'section', name: 'Alert',               id: 'alert' },
      { type: 'section', name: 'Card',                id: 'card' },
      { type: 'section', name: 'Modal',               id: 'modal' },
      { type: 'section', name: 'Divider',             id: 'divider' },
      { type: 'section', name: 'Table',               id: 'table' },
      { type: 'section', name: 'Tabs',                id: 'tabs' },
      { type: 'section', name: 'Tooltip',             id: 'tooltip' },
      { type: 'section', name: 'Avatar',              id: 'avatar' },
    ];

    function getItems(q) {
      const all = [];
      all.push(...sections);
      // Add tokens
      TokenStore.getAllTokens().forEach(t => {
        all.push({ type: 'token', name: t.name, sub: t.value, id: t.id, category: t.category });
      });

      if (!q) return sections.slice(0, 10);

      const ql = q.toLowerCase();
      return all.filter(item =>
        item.name.toLowerCase().includes(ql) ||
        (item.sub && item.sub.toLowerCase().includes(ql))
      ).slice(0, 15);
    }

    function renderResults(q) {
      const items = getItems(q);
      focusedIdx = -1;
      results.innerHTML = items.map((item, i) => `
        <li class="cmd-result" role="option" data-idx="${i}" data-type="${item.type}" data-id="${item.id || ''}" data-section="${item.id || ''}">
          <span class="cmd-result__type">${item.type}</span>
          <span class="cmd-result__name">${item.name}</span>
          ${item.sub ? `<span class="cmd-result__sub">${item.sub.slice(0, 40)}</span>` : ''}
        </li>
      `).join('');

      results.querySelectorAll('.cmd-result').forEach(el => {
        el.addEventListener('click', () => selectResult(el));
        el.addEventListener('mouseenter', () => {
          results.querySelectorAll('.cmd-result').forEach(r => r.classList.remove('is-focused'));
          el.classList.add('is-focused');
          focusedIdx = parseInt(el.getAttribute('data-idx'));
        });
      });
    }

    function selectResult(el) {
      const type = el.getAttribute('data-type');
      const id   = el.getAttribute('data-id');

      if (type === 'section') {
        const sectionEl = document.getElementById(`section-${id}`);
        if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(id);
      } else if (type === 'token') {
        // Find token's section
        const token = TokenStore.getTokenById(id);
        if (token) {
          const sectionMap = {
            'color-primitives': 'colour-primitives',
            'color-semantic':   'colour-semantic',
            'type-scale':       'type-scale',
            'type-fluid':       'type-fluid',
            'spacing':          'spacing',
            'spacing-fluid':    'spacing-fluid',
            'radius':           'radius',
            'shadow':           'shadow',
            'motion':           'motion',
          };
          const sec = sectionMap[token.category];
          if (sec) {
            const sectionEl = document.getElementById(`section-${sec}`);
            if (sectionEl) sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(sec);
            // Highlight after a tick
            setTimeout(() => {
              const row = document.querySelector(`[data-token-id="${id}"]`);
              if (row) {
                row.classList.remove('is-highlighted');
                void row.offsetWidth;
                row.classList.add('is-highlighted');
                row.scrollIntoView({ block: 'nearest' });
              }
            }, 100);
          }
        }
      }

      close();
    }

    function open() {
      overlay.hidden = false;
      input.value = '';
      renderResults('');
      input.focus();
    }

    function close() {
      overlay.hidden = true;
    }

    input?.addEventListener('input', () => renderResults(input.value));

    input?.addEventListener('keydown', e => {
      const items = results.querySelectorAll('.cmd-result');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedIdx = Math.min(focusedIdx + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('is-focused', i === focusedIdx));
        items[focusedIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedIdx = Math.max(focusedIdx - 1, 0);
        items.forEach((el, i) => el.classList.toggle('is-focused', i === focusedIdx));
        items[focusedIdx]?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        const focused = results.querySelector('.is-focused');
        if (focused) selectResult(focused);
        else if (items[0]) selectResult(items[0]);
      } else if (e.key === 'Escape') {
        close();
      }
    });

    overlay?.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    document.getElementById('btn-cmdpalette')?.addEventListener('click', open);

    // Expose open function
    window._openCommandPalette = open;
  }

  /* ── Import / Export ── */
  function initImportExport() {
    document.getElementById('btn-export')?.addEventListener('click', () => {
      const state = TokenStore.getState();
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'design-tokens.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Tokens exported as JSON', 'success');
    });

    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed.tokens || !parsed.settings) throw new Error('Invalid format: missing tokens or settings');
          TokenStore.importState(parsed);
          showToast('Tokens imported successfully', 'success');
        } catch (err) {
          showToast(`Import failed: ${err.message}`, 'error', 5000);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  /* ── Editor panel toggle ── */
  function initPanelToggles() {
    const layout  = document.querySelector('.app-layout');
    const nav     = document.querySelector('.app-nav');
    const editor  = document.querySelector('.app-editor');
    const navBtn  = document.getElementById('btn-toggle-nav');
    const edBtn   = document.getElementById('btn-toggle-editor');
    if (!layout || !nav || !editor) return;

    let navHidden = false;
    let edHidden  = false;

    function syncColumns() {
      if (!navHidden && !edHidden) {
        layout.style.gridTemplateColumns = 'var(--app-nav-w) 1fr var(--app-editor-w)';
      } else if (navHidden && !edHidden) {
        layout.style.gridTemplateColumns = '1fr var(--app-editor-w)';
      } else if (!navHidden && edHidden) {
        layout.style.gridTemplateColumns = 'var(--app-nav-w) 1fr';
      } else {
        layout.style.gridTemplateColumns = '1fr';
      }
    }

    navBtn?.addEventListener('click', () => {
      navHidden = !navHidden;
      nav.style.display = navHidden ? 'none' : '';
      navBtn.setAttribute('aria-label', navHidden ? 'Show nav' : 'Hide nav');
      navBtn.setAttribute('data-tooltip', navHidden ? 'Show nav' : 'Hide nav');
      navBtn.setAttribute('data-tooltip-pos', 'below');
      navBtn.setAttribute('aria-pressed', navHidden ? 'true' : 'false');
      navBtn.querySelector('.icon-nav-hide').style.display = navHidden ? 'none' : '';
      navBtn.querySelector('.icon-nav-show').style.display = navHidden ? '' : 'none';
      syncColumns();
    });

    edBtn?.addEventListener('click', () => {
      edHidden = !edHidden;
      editor.style.display = edHidden ? 'none' : '';
      edBtn.setAttribute('aria-label', edHidden ? 'Show token editor' : 'Hide token editor');
      edBtn.setAttribute('data-tooltip', edHidden ? 'Show token editor' : 'Hide token editor');
      edBtn.setAttribute('data-tooltip-pos', 'below');
      edBtn.setAttribute('aria-pressed', edHidden ? 'true' : 'false');
      edBtn.querySelector('.icon-editor-hide').style.display = edHidden ? 'none' : '';
      edBtn.querySelector('.icon-editor-show').style.display = edHidden ? '' : 'none';
      syncColumns();
    });
  }

  /* ── Theme toggle ── */
  function initTheme() {
    document.getElementById('btn-theme')?.addEventListener('click', () => {
      const current = TokenStore.getSettings().appTheme;
      TokenStore.updateSettings({ appTheme: current === 'dark' ? 'light' : 'dark' }, true);
      showToast(`Switched to ${current === 'dark' ? 'light' : 'dark'} mode`, 'info');
    });
  }

  /* ── Undo / Redo ── */
  function updateHistoryButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    const undoCount = document.getElementById('undo-count');
    const redoCount = document.getElementById('redo-count');

    if (undoBtn) undoBtn.disabled = !TokenStore.canUndo();
    if (redoBtn) redoBtn.disabled = !TokenStore.canRedo();
    if (undoCount) {
      const n = TokenStore.undoCount();
      undoCount.textContent = n > 0 ? n : '';
    }
    if (redoCount) {
      const n = TokenStore.redoCount();
      redoCount.textContent = n > 0 ? n : '';
    }
  }

  function initUndoRedo() {
    document.getElementById('btn-undo')?.addEventListener('click', () => {
      if (TokenStore.undo()) showToast('Undone', 'info');
    });
    document.getElementById('btn-redo')?.addEventListener('click', () => {
      if (TokenStore.redo()) showToast('Redone', 'info');
    });
  }

  /* ── Confirm Modal ── */
  function showConfirm({ title, message, okLabel = 'Confirm', onOk, danger = true }) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    // Support newlines and a warning sub-section
    const msgEl = document.getElementById('confirm-message');
    const parts = message.split('\n\n');
    msgEl.innerHTML = '';
    parts.forEach((part, i) => {
      if (i === 0) {
        const p = document.createElement('p');
        p.textContent = part;
        msgEl.appendChild(p);
      } else {
        const warn = document.createElement('p');
        warn.style.cssText = 'margin-top:10px;padding:8px 10px;background:var(--status-warning-bg,rgba(255,180,0,.12));color:var(--status-warning,#f5a623);border-radius:var(--r-base,4px);font-size:0.8125rem;line-height:1.5';
        warn.textContent = part;
        msgEl.appendChild(warn);
      }
    });
    const okBtn = document.getElementById('confirm-ok');
    okBtn.textContent = okLabel;
    okBtn.style.background = danger ? 'var(--status-error,#e5484d)' : '';
    okBtn.style.borderColor = danger ? 'var(--status-error,#e5484d)' : '';
    okBtn.style.color = danger ? '#fff' : '';
    modal._onOk = onOk;
    modal.hidden = false;
  }

  function initConfirmModal() {
    document.getElementById('confirm-cancel')?.addEventListener('click', () => {
      const modal = document.getElementById('confirm-modal');
      modal.hidden = true;
      modal._onOk = null;
      pendingDeleteId = null;
    });
    document.getElementById('confirm-ok')?.addEventListener('click', () => {
      const modal = document.getElementById('confirm-modal');
      if (modal._onOk) {
        modal._onOk();
        modal._onOk = null;
      }
      modal.hidden = true;
    });

    document.getElementById('btn-reset-all')?.addEventListener('click', () => {
      showConfirm({
        title: 'Reset Everything',
        message: 'This will restore all tokens to their default values. Your current changes will be lost. Are you sure?',
        okLabel: 'Reset',
        onOk: () => {
          TokenStore.resetAll();
          showToast('All tokens reset to defaults', 'success');
        }
      });
    });
  }

  /* ── Nav click handler ── */
  function initNavClicks() {
    document.querySelectorAll('.nav-item[data-section]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const sec = link.getAttribute('data-section');
        const target = document.getElementById(`section-${sec}`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveSection(sec);
        }
      });
    });
  }

  /* ── Modified dots ── */
  function updateModifiedDots() {
    document.querySelectorAll('.nav-item__modified-dot[data-category]').forEach(dot => {
      const cat = dot.getAttribute('data-category');
      const tokens = TokenStore.getTokensByCategory(cat);
      const hasModified = tokens.some(t => t.value !== t.defaultValue || t.darkValue !== t.defaultDarkValue);
      dot.classList.toggle('is-visible', hasModified);
    });
  }

  /* ── Search ── */
  function initSearch() {
    document.getElementById('token-search')?.addEventListener('input', debounce(e => {
      searchQuery = e.target.value.trim();
      renderTokenList();
    }, 200));
  }

  /* ── Add token button ── */
  function initAddTokenBtn() {
    document.getElementById('btn-add-token')?.addEventListener('click', () => {
      // Scroll token list to bottom (to see form)
      const container = document.getElementById('token-list');
      if (container) {
        container.scrollTop = container.scrollHeight;
        const nameInput = container.querySelector('#new-token-name');
        if (nameInput) nameInput.focus();
      }
    });
  }

  /* ── Keyboard shortcuts ── */
  function initKeyboard() {
    document.addEventListener('keydown', e => {
      const meta = e.ctrlKey || e.metaKey;

      // Close overlays on Escape
      if (e.key === 'Escape') {
        document.getElementById('cmd-overlay').hidden = true;
        document.getElementById('confirm-modal').hidden = true;
        document.getElementById('settings-popover').hidden = true;
        document.getElementById('settings-backdrop').hidden = true;
        return;
      }

      // Ctrl+Z — undo
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (TokenStore.undo()) showToast('Undone', 'info');
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if (meta && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        if (TokenStore.redo()) showToast('Redone', 'info');
        return;
      }

    });
  }

  /* ── Main onChange handler ── */
  const debouncedCSSUpdate = debounce(updateCSSOutput, 80);
  const debouncedTokenListUpdate = debounce(renderTokenList, 60);

  function onStateChange(changedTokenId) {
    const state = TokenStore.getState();

    // Apply CSS vars to document
    ThemeEngine.apply(state);

    // Flash preview elements using this token
    if (changedTokenId) {
      ThemeEngine.flashToken(changedTokenId);

      // Re-render relevant preview section
      const token = TokenStore.getTokenById(changedTokenId);
      if (token) {
        const sectionMap = {
          'color-primitives': 'colour-primitives',
          'color-semantic':   'colour-semantic',
          'type-scale':       'type-scale',
          'type-fluid':       'type-fluid',
          'spacing':          'spacing',
          'spacing-fluid':    'spacing-fluid',
          'radius':           'radius',
          'shadow':           'shadow',
          'motion':           'motion',
        };
        const sec = sectionMap[token.category];
        if (sec) {
          PreviewEngine.rerenderSection(sec, state);
        } else if (token.category === 'components') {
          // Map component token name prefix to the preview section that uses it
          const name = token.name;
          const componentSectionMap = [
            [/^btn-/,         'buttons'],
            [/^input-/,       ['input', 'textarea', 'select']],
            [/^card-/,        'card'],
            [/^badge-/,       'badge'],
            [/^alert-/,       'alert'],
            [/^toggle-/,      'toggle'],
            [/^avatar-/,      'avatar'],
            [/^table-/,       'table'],
            [/^tab-/,         'tabs'],
            [/^tooltip-/,     'tooltip'],
            [/^h\d?-/,        'headings'],
            [/^body-/,        'body-text'],
            [/^link-/,        'links'],
            [/^list-|^step-/, 'lists'],
            [/^code-/,        ['code', 'blockquote']],
            [/^blockquote-/,  'blockquote'],
            [/^btn-sec-/,     'buttons'],
          ];
          for (const [pattern, sections] of componentSectionMap) {
            if (pattern.test(name)) {
              const targets = Array.isArray(sections) ? sections : [sections];
              targets.forEach(s => PreviewEngine.rerenderSection(s, state));
              break;
            }
          }
        }
      }
    } else {
      // Full re-render (undo/redo/import etc)
      PreviewEngine.renderAll(state);
      initScrollSpy();
    }

    debouncedTokenListUpdate();
    debouncedCSSUpdate();
    updateHistoryButtons();
    updateModifiedDots();
  }

  /* ── Init ── */
  function init() {
    TokenStore.init();

    const state = TokenStore.getState();

    // Initial full render
    PreviewEngine.renderAll(state);
    ThemeEngine.apply(state);

    updateHistoryButtons();
    updateModifiedDots();

    // Wire up all UI
    initNavClicks();
    initScrollSpy();
    initCSSPanel(); // must run before initial CSS output so saved tab is restored first
    updateCSSOutput(); // now render with the correct (restored) tab
    initSettings();
    initCommandPalette();
    initImportExport();
    initPanelToggles();
    initTheme();
    initUndoRedo();
    initConfirmModal();
    initSearch();
    initAddTokenBtn();
    initKeyboard();

    // Subscribe to store changes
    TokenStore.subscribe(onStateChange);

    // Set initial active section
    setActiveSection('getting-started');
  }

  return { init };
})();

/* ═══════════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => UI.init());
