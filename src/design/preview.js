/* Live component preview for the design workspace. Renders demo components
   that consume the token CSS variables set on the preview container. */
import { h, clear } from '../core/dom.js';

export function renderPreview(root, state) {
  clear(root);
  const colorCat = state.categories.find((c) => c.id === 'color');

  root.append(
    section('Colors', h('div.pv-swatches', {}, colorCat.tokens.map((tok) =>
      h('div.pv-swatch', {}, [
        h('div.pv-swatch__chip', { style: { background: `var(--${tok.name})` } }),
        h('span.pv-swatch__name', {}, tok.name),
      ])
    ))),

    section('Typography', h('div.pv-type', {}, [
      h('h1', {}, 'The quick brown fox'),
      h('h2', {}, 'Jumps over the lazy dog'),
      h('h3', {}, 'A design system in motion'),
      h('p', {}, 'Body text sets the rhythm of an interface. Tokens drive every value here — edit one and this specimen updates live.'),
      h('p', {}, [document.createTextNode('Inline '), h('a', { href: '#' }, 'links'), document.createTextNode(' and '), h('code', {}, 'code'), document.createTextNode(' inherit their tokens too.')]),
    ])),

    section('Buttons', h('div.pv-row', {}, [
      h('button.btn.btn--primary', {}, 'Primary'),
      h('button.btn.btn--secondary', {}, 'Secondary'),
      h('button.btn.btn--ghost', {}, 'Ghost'),
      h('button.btn.btn--danger', {}, 'Danger'),
      h('button.btn.btn--primary', { disabled: true }, 'Disabled'),
    ])),

    section('Badges', h('div.pv-row', {}, [
      h('span.badge', {}, 'Default'),
      h('span.badge.badge--accent', {}, 'Accent'),
      h('span.badge.badge--success', {}, 'Success'),
      h('span.badge.badge--danger', {}, 'Danger'),
    ])),

    section('Inputs', h('div.pv-stack', {}, [
      h('input.input', { type: 'text', placeholder: 'you@example.com' }),
      h('input.input', { type: 'text', value: 'With a value' }),
    ])),

    section('Card', h('div.card', {}, [
      h('h3', {}, 'Card title'),
      h('p', {}, 'Cards compose surface, border, radius, and shadow tokens.'),
      h('button.btn.btn--primary', {}, 'Action'),
    ])),

    section('Alerts', h('div.pv-stack', {}, [
      h('div.alert', {}, 'A neutral, informational message.'),
      h('div.alert.alert--success', {}, 'Everything saved successfully.'),
      h('div.alert.alert--danger', {}, 'Something needs your attention.'),
    ])),
  );
}

function section(title, content) {
  return h('section.pv-section', {}, [h('h4.pv-section__title', {}, title), content]);
}
