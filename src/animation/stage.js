/* ═══════════════════════════════════════════════════════════════════════
   Stage — renders scene elements, applies interpolated props during playback,
   and supports click-to-select + drag-to-reposition (updates base.left/top).
   Coordinates are logical (scene.settings.width×height); the stage is CSS-
   scaled to fit, so generated code stays stable regardless of viewport.
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear } from '../core/dom.js';
import { propsToStyle } from './interpolator.js';
import { sceneOps } from './animStore.js';

export function createStage({ getScene, getSelected, onSelect }) {
  const surface = h('div.stage-surface');
  const frame = h('div.stage-frame', {}, [surface]);
  const wrap = h('div.stage-wrap', {}, [frame]);
  const nodes = new Map(); // elementId → DOM node

  let drag = null;

  function scaleToFit() {
    const s = getScene();
    surface.style.width = s.settings.width + 'px';
    surface.style.height = s.settings.height + 'px';
    surface.style.background = s.settings.background;
    const availW = frame.clientWidth - 32;
    const availH = frame.clientHeight - 32;
    if (availW <= 0 || availH <= 0) return;
    const scale = Math.min(1, availW / s.settings.width, availH / s.settings.height);
    surface.style.transform = `scale(${scale})`;
    surface.dataset.scale = scale;
  }

  function render() {
    const s = getScene();
    clear(surface);
    nodes.clear();
    for (const el of s.elements) {
      const node = h('div.stage-el', {
        'data-el': el.id,
        onpointerdown: (e) => startDrag(e, el.id),
      }, el.type === 'text' ? [] : []);
      styleBase(node, el);
      surface.appendChild(node);
      nodes.set(el.id, node);
    }
    scaleToFit();
    markSelection();
  }

  function styleBase(node, el) {
    const b = el.base;
    Object.assign(node.style, {
      left: b.left + 'px', top: b.top + 'px',
      width: b.width + 'px',
      height: el.type === 'text' ? 'auto' : b.height + 'px',
      background: b.background,
      color: b.color,
      borderRadius: (b.borderRadius || 0) + 'px',
      fontSize: (b.fontSize || 16) + 'px',
      fontWeight: b.fontWeight || 400,
    });
    node.classList.toggle('stage-el--text', el.type === 'text');
    node.textContent = el.type === 'text' ? (el.content || '') : '';
  }

  function apply(t, sampleFn) {
    const samples = sampleFn(getScene(), t);
    for (const [id, node] of nodes) {
      const p = samples.get(id);
      if (!p) continue;
      const st = propsToStyle(p);
      node.style.transform = st.transform;
      node.style.opacity = st.opacity;
    }
  }

  function markSelection() {
    const sel = getSelected();
    for (const [id, node] of nodes) node.classList.toggle('is-selected', id === sel);
  }

  function startDrag(e, id) {
    e.stopPropagation();
    onSelect(id);
    markSelection();
    const scale = parseFloat(surface.dataset.scale || '1');
    const el = getScene().elements.find((x) => x.id === id);
    drag = { id, startX: e.clientX, startY: e.clientY, baseLeft: el.base.left, baseTop: el.base.top, scale, moved: false };
    e.target.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onMove(e) {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / drag.scale;
    const dy = (e.clientY - drag.startY) / drag.scale;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    const node = nodes.get(drag.id);
    if (node) {
      node.style.left = Math.round(drag.baseLeft + dx) + 'px';
      node.style.top = Math.round(drag.baseTop + dy) + 'px';
    }
  }

  function onUp(e) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (drag && drag.moved) {
      const dx = (e.clientX - drag.startX) / drag.scale;
      const dy = (e.clientY - drag.startY) / drag.scale;
      sceneOps.updateElement(drag.id, { base: { left: Math.round(drag.baseLeft + dx), top: Math.round(drag.baseTop + dy) } });
    }
    drag = null;
  }

  surface.addEventListener('pointerdown', (e) => {
    if (e.target === surface) { onSelect(null); markSelection(); }
  });

  const ro = new ResizeObserver(() => scaleToFit());
  ro.observe(frame);

  return { el: wrap, render, apply, markSelection, scaleToFit, destroy: () => ro.disconnect() };
}
