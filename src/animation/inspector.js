/* ═══════════════════════════════════════════════════════════════════════
   Inspector — context panel for the current selection.
   - No selection      → scene settings + element list
   - Element selected  → name, geometry, appearance
   - Keyframe selected → time, value, easing
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear } from '../core/dom.js';
import * as icons from '../shell/icons.js';
import { animStore, sceneOps } from './animStore.js';
import { PROPERTIES, PROPERTY_IDS } from './schema.js';
import { EASING, EASING_IDS } from '../core/easing.js';

export function createInspector({ getSelected, onSelectElement, getSelectedKf }) {
  const body = h('div.insp__body');
  const el = h('aside.insp', {}, [
    h('header.insp__head', {}, [h('h2.insp__title', {}, 'Inspector')]),
    body,
  ]);

  function render() {
    const scene = animStore.getState();
    clear(body);
    const kf = getSelectedKf();
    const selId = getSelected();

    if (kf) return renderKeyframe(scene, kf);
    if (selId) {
      const elem = scene.elements.find((e) => e.id === selId);
      if (elem) return renderElement(elem);
    }
    return renderScene(scene);
  }

  function field(label, control) {
    return h('label.insp__field', {}, [h('span.insp__label', {}, label), control]);
  }

  function numInput(value, onChange, opts = {}) {
    const inp = h('input.insp__input', { type: 'number', value, step: opts.step ?? 1, ...(opts.min != null ? { min: opts.min } : {}), ...(opts.max != null ? { max: opts.max } : {}) });
    inp.addEventListener('change', () => onChange(parseFloat(inp.value)));
    return inp;
  }

  function renderScene(scene) {
    body.appendChild(h('div.insp__section', {}, [
      h('h3.insp__section-title', {}, 'Scene'),
      field('Name', textInput(scene.name, (v) => sceneOps.rename(v))),
      h('div.insp__grid2', {}, [
        field('Width', numInput(scene.settings.width, (v) => sceneOps.setSetting('width', v || 320))),
        field('Height', numInput(scene.settings.height, (v) => sceneOps.setSetting('height', v || 240))),
      ]),
      h('div.insp__grid2', {}, [
        field('Duration (ms)', numInput(scene.settings.duration, (v) => sceneOps.setSetting('duration', Math.max(100, v || 100)), { step: 100 })),
        field('FPS', numInput(scene.settings.fps, (v) => sceneOps.setSetting('fps', v || 60))),
      ]),
    ]));

    const list = h('div.insp__section', {}, [h('h3.insp__section-title', {}, 'Elements')]);
    scene.elements.forEach((e) => {
      list.appendChild(h('button.insp__el-row', { onclick: () => onSelectElement(e.id) }, [
        h('span.insp__el-icon', { html: e.type === 'text' ? icons.text : icons.box }),
        h('span.insp__el-name', {}, e.name),
        h('span.insp__el-type', {}, e.type),
      ]));
    });
    body.appendChild(list);
  }

  function renderElement(elem) {
    body.appendChild(h('div.insp__section', {}, [
      h('div.insp__breadcrumb', {}, [
        h('button.insp__back', { onclick: () => onSelectElement(null) }, '‹ Scene'),
      ]),
      h('h3.insp__section-title', {}, elem.name),
      field('Name', textInput(elem.name, (v) => sceneOps.renameElement(elem.id, v))),
      elem.type === 'text' ? field('Text', textInput(elem.content, (v) => sceneOps.updateElement(elem.id, { content: v }))) : null,
    ]));

    body.appendChild(h('div.insp__section', {}, [
      h('h3.insp__section-title', {}, 'Layout'),
      h('div.insp__grid2', {}, [
        field('X', numInput(elem.base.left, (v) => sceneOps.updateElement(elem.id, { base: { left: v } }))),
        field('Y', numInput(elem.base.top, (v) => sceneOps.updateElement(elem.id, { base: { top: v } }))),
      ]),
      h('div.insp__grid2', {}, [
        field('Width', numInput(elem.base.width, (v) => sceneOps.updateElement(elem.id, { base: { width: v } }))),
        field('Height', numInput(elem.base.height, (v) => sceneOps.updateElement(elem.id, { base: { height: v } }))),
      ]),
    ]));

    body.appendChild(h('div.insp__section', {}, [
      h('h3.insp__section-title', {}, 'Appearance'),
      field('Background', colorInput(elem.base.background, (v) => sceneOps.updateElement(elem.id, { base: { background: v } }))),
      field('Color', colorInput(elem.base.color, (v) => sceneOps.updateElement(elem.id, { base: { color: v } }))),
      h('div.insp__grid2', {}, [
        field('Radius', numInput(elem.base.borderRadius, (v) => sceneOps.updateElement(elem.id, { base: { borderRadius: v } }))),
        field('Font size', numInput(elem.base.fontSize, (v) => sceneOps.updateElement(elem.id, { base: { fontSize: v } }))),
      ]),
    ]));

    body.appendChild(h('div.insp__section', {}, [
      h('h3.insp__section-title', {}, 'Animate'),
      h('p.insp__hint', {}, 'Add a property track, then double-click a lane to add keyframes.'),
      animatePropButtons(elem),
    ]));

    body.appendChild(h('div.insp__section', {}, [
      h('button.app-btn.app-btn--danger.insp__delete', { onclick: () => { sceneOps.removeElement(elem.id); onSelectElement(null); } }, 'Delete element'),
    ]));
  }

  function animatePropButtons(elem) {
    const scene = animStore.getState();
    const used = scene.tracks.filter((t) => t.elementId === elem.id).map((t) => t.property);
    const wrap = h('div.insp__chips');
    PROPERTY_IDS.forEach((p) => {
      const on = used.includes(p);
      wrap.appendChild(h('button.insp__chip', {
        class: on ? 'is-on' : '',
        onclick: () => { if (!on) sceneOps.ensureTrack(elem.id, p); },
        disabled: on,
        title: on ? 'Already animated' : 'Animate ' + PROPERTIES[p].label,
      }, PROPERTIES[p].label));
    });
    return wrap;
  }

  function renderKeyframe(scene, sel) {
    const track = scene.tracks.find((t) => t.id === sel.trackId);
    const kf = track?.keyframes.find((k) => k.id === sel.kfId);
    if (!track || !kf) return renderScene(scene);
    const prop = PROPERTIES[track.property];
    const elem = scene.elements.find((e) => e.id === track.elementId);

    body.appendChild(h('div.insp__section', {}, [
      h('h3.insp__section-title', {}, `Keyframe · ${elem?.name} · ${prop.label}`),
      field('Time (ms)', numInput(kf.time, (v) => sceneOps.updateKeyframe(track.id, kf.id, { time: v }), { step: 10, min: 0 })),
      field('Value' + (prop.unit ? ` (${prop.unit})` : ''), numInput(kf.value, (v) => sceneOps.updateKeyframe(track.id, kf.id, { value: v }), { step: prop.step ?? 1, min: prop.min, max: prop.max })),
      field('Easing (out)', easeSelect(kf.ease, (v) => sceneOps.updateKeyframe(track.id, kf.id, { ease: v }))),
      h('div.insp__ease-preview', {}, [easeCurve(kf.ease)]),
      h('button.app-btn.app-btn--ghost.insp__delete', {
        disabled: track.keyframes.length <= 1,
        onclick: () => sceneOps.removeKeyframe(track.id, kf.id),
      }, 'Delete keyframe'),
    ]));
  }

  function easeSelect(value, onChange) {
    const sel = h('select.insp__input', {}, EASING_IDS.map((id) => h('option', { value: id, selected: id === value }, EASING[id].label)));
    sel.value = value;
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  function easeCurve(easeId) {
    const [x1, y1, x2, y2] = EASING[easeId]?.bezier || [0, 0, 1, 1];
    const W = 120, H = 60, pad = 6;
    const px = (x) => pad + x * (W - 2 * pad);
    const py = (y) => H - pad - y * (H - 2 * pad);
    const path = `M ${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'ease-curve');
    svg.innerHTML = `<line x1="${px(0)}" y1="${py(0)}" x2="${px(1)}" y2="${py(1)}" class="ease-curve__guide"/><path d="${path}" class="ease-curve__path"/>`;
    return svg;
  }

  function textInput(value, onChange) {
    const inp = h('input.insp__input', { type: 'text', value: value ?? '' });
    inp.addEventListener('change', () => onChange(inp.value));
    return inp;
  }

  function colorInput(value, onChange) {
    const text = h('input.insp__input.insp__input--color', { type: 'text', value: value ?? '' });
    const swatch = h('input.insp__swatch', { type: 'color', value: toHex(value) });
    swatch.addEventListener('input', () => { text.value = swatch.value; onChange(swatch.value); });
    text.addEventListener('change', () => onChange(text.value));
    return h('div.insp__color', {}, [swatch, text]);
  }

  return { el, render };
}

function toHex(v) {
  if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim())) return v.trim();
  return '#6366f1';
}
