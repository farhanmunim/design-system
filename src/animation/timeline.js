/* ═══════════════════════════════════════════════════════════════════════
   Timeline — tracks (grouped by element), draggable keyframes + tween bars,
   ruler, scrubbable playhead, zoom, and snapping.

   Perf: event delegation on the scroll container; drags mutate only the
   dragged node's transform and use {history:false} commits, with one
   {history:true} snapshot on pointer-up (a whole drag = one undo step).
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear } from '../core/dom.js';
import { clamp } from '../core/util.js';
import { EASING } from '../core/easing.js';
import * as icons from '../shell/icons.js';
import { animStore, sceneOps } from './animStore.js';
import { PROPERTIES, PROPERTY_IDS, sceneDuration } from './schema.js';
import { sampleSceneAt } from './interpolator.js';

const LABEL_W = 176;
const PAD_MS = 200; // headroom past last keyframe

export function createTimeline({ player, getSelected, onSelectElement }) {
  let pxPerMs = 0.28;
  let selectedKf = null; // { trackId, kfId }
  let drag = null;

  const scroll = h('div.tl__scroll');
  const grid = h('div.tl__grid');
  const playhead = h('div.tl__playhead');
  scroll.append(grid);

  /* ── toolbar ─────────────────────────────────────────────────────── */
  const timeLabel = h('span.tl__time', {}, '0.00s');
  const playBtn = h('button.app-btn.app-btn--icon.app-btn--primary', { 'aria-label': 'Play', title: 'Play (Space)', onclick: () => player.toggle() });
  playBtn.innerHTML = icons.play;
  const loopBtn = h('button.app-btn.app-btn--ghost.app-btn--icon', { 'aria-label': 'Loop', title: 'Loop', onclick: () => {
    sceneOps.setSetting('loop', !animStore.getState().settings.loop);
  } });
  loopBtn.innerHTML = icons.loop;

  const toolbar = h('div.tl__toolbar', {}, [
    playBtn,
    loopBtn,
    h('div.tl__time-wrap', {}, [timeLabel]),
    h('div.app-header__spacer'),
    h('div.tl__zoom', {}, [
      h('button.app-btn.app-btn--ghost.app-btn--icon', { title: 'Zoom out', onclick: () => zoom(0.8) }, '−'),
      h('button.app-btn.app-btn--ghost.app-btn--icon', { title: 'Zoom in', onclick: () => zoom(1.25) }, '+'),
    ]),
  ]);

  const el = h('div.tl', {}, [toolbar, scroll]);

  /* ── geometry ────────────────────────────────────────────────────── */
  const timeToX = (t) => t * pxPerMs;
  const xToTime = (x) => x / pxPerMs;
  const laneWidth = () => Math.max(sceneDuration(animStore.getState()) + PAD_MS, 800 / pxPerMs) * pxPerMs;

  function zoom(factor) {
    const prev = pxPerMs;
    pxPerMs = clamp(pxPerMs * factor, 0.05, 2);
    const ratio = pxPerMs / prev;
    scroll.scrollLeft *= ratio;
    render();
  }

  /* ── render ──────────────────────────────────────────────────────── */
  function render() {
    const scene = animStore.getState();
    const lw = laneWidth();
    grid.style.setProperty('--lane-w', lw + 'px');
    grid.style.setProperty('--label-w', LABEL_W + 'px');
    clear(grid);

    // ruler row
    grid.appendChild(h('div.tl__corner', {}, [h('span.tl__corner-label', {}, scene.name || 'Scene')]));
    grid.appendChild(buildRuler(scene, lw));

    // element groups
    for (const elem of scene.elements) {
      const usedProps = scene.tracks.filter((t) => t.elementId === elem.id).map((t) => t.property);
      const availProps = PROPERTY_IDS.filter((p) => !usedProps.includes(p));

      const addSel = h('select.tl__addprop', { title: 'Animate a property' }, [
        h('option', { value: '' }, '+ property'),
        ...availProps.map((p) => h('option', { value: p }, PROPERTIES[p].label)),
      ]);
      addSel.addEventListener('change', () => { if (addSel.value) { sceneOps.ensureTrack(elem.id, addSel.value); } });

      const head = h('div.tl__group-head', {
        class: getSelected() === elem.id ? 'is-selected' : '',
        onclick: () => onSelectElement(elem.id),
      }, [
        h('span.tl__group-name', {}, elem.name),
        availProps.length ? addSel : null,
      ]);
      grid.appendChild(head);
      grid.appendChild(h('div.tl__group-lane'));

      for (const track of scene.tracks.filter((t) => t.elementId === elem.id)) {
        grid.appendChild(buildTrackLabel(track));
        grid.appendChild(buildLane(track, scene));
      }
    }

    grid.appendChild(playhead); // absolute child of the (scrollable) grid

    loopBtn.classList.toggle('is-active', !!scene.settings.loop);
    updatePlayhead(player.time());
  }

  function buildRuler(scene, lw) {
    const ruler = h('div.tl__ruler', { style: { width: lw + 'px' } });
    const dur = sceneDuration(scene) + PAD_MS;
    const targetPx = 84;
    const step = niceStep(targetPx / pxPerMs);
    for (let t = 0; t <= dur; t += step) {
      const x = timeToX(t);
      ruler.appendChild(h('div.tl__tick', { style: { left: x + 'px' } }, [
        h('span.tl__tick-label', {}, (t / 1000).toFixed(step < 1000 ? 2 : 1) + 's'),
      ]));
    }
    ruler.addEventListener('pointerdown', (e) => startScrub(e, ruler));
    return ruler;
  }

  function buildTrackLabel(track) {
    const del = h('button.tl__row-del', { title: 'Remove track', 'aria-label': 'Remove track', onclick: (e) => { e.stopPropagation(); sceneOps.removeTrack(track.id); } });
    del.innerHTML = icons.trash;
    return h('div.tl__row-label', {}, [
      h('span.tl__row-name', {}, PROPERTIES[track.property]?.label || track.property),
      del,
    ]);
  }

  function buildLane(track, scene) {
    const lane = h('div.tl__lane', { 'data-track': track.id, style: { width: laneWidth() + 'px' } });
    lane.addEventListener('dblclick', (e) => {
      if (e.target.closest('.kf')) return;
      const rect = lane.getBoundingClientRect();
      const t = Math.max(0, Math.round(xToTime(e.clientX - rect.left)));
      const val = sampleSceneAt(scene, t).get(track.elementId)?.[track.property];
      sceneOps.addKeyframe(track.id, t, val ?? PROPERTIES[track.property].default);
    });

    const kfs = track.keyframes;
    // tween bars between consecutive keyframes
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i], b = kfs[i + 1];
      const bar = h('div.tl__tween', {
        title: EASING[a.ease]?.label || a.ease,
        style: { left: timeToX(a.time) + 'px', width: Math.max(0, timeToX(b.time - a.time)) + 'px' },
      });
      lane.appendChild(bar);
    }
    // keyframe diamonds
    for (const kf of kfs) {
      const node = h('button.kf', {
        'data-kf': kf.id,
        'aria-label': `Keyframe at ${(kf.time / 1000).toFixed(2)}s`,
        class: (selectedKf && selectedKf.kfId === kf.id) ? 'is-selected' : '',
        style: { left: timeToX(kf.time) + 'px' },
        onpointerdown: (e) => startKfDrag(e, track, kf, lane),
        oncontextmenu: (e) => { e.preventDefault(); sceneOps.removeKeyframe(track.id, kf.id); },
      });
      node.innerHTML = icons.diamond;
      lane.appendChild(node);
    }
    return lane;
  }

  /* ── scrubbing ───────────────────────────────────────────────────── */
  function startScrub(e, ruler) {
    const rect = ruler.getBoundingClientRect();
    const move = (ev) => player.seek(Math.max(0, xToTime(ev.clientX - rect.left)));
    move(e);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /* ── keyframe drag (single undo step, with snapping) ─────────────── */
  function startKfDrag(e, track, kf, lane) {
    e.stopPropagation();
    e.preventDefault();
    selectKf(track.id, kf.id);
    const node = e.currentTarget;
    node.setPointerCapture?.(e.pointerId);
    const rect = lane.getBoundingClientRect();
    drag = { track, kf, node, laneLeft: rect.left, moved: false };
    window.addEventListener('pointermove', onKfMove);
    window.addEventListener('pointerup', onKfUp);
  }

  function snapTargets(exceptKfId) {
    const scene = animStore.getState();
    const set = new Set([0, player.time()]);
    for (const t of scene.tracks) for (const k of t.keyframes) if (k.id !== exceptKfId) set.add(k.time);
    return [...set];
  }

  function onKfMove(e) {
    if (!drag) return;
    drag.moved = true;
    let t = Math.max(0, xToTime(e.clientX - drag.laneLeft));
    if (!e.altKey) {
      const snaps = snapTargets(drag.kf.id);
      for (const s of snaps) {
        if (Math.abs(timeToX(t) - timeToX(s)) < 6) { t = s; break; }
      }
    }
    t = Math.round(t);
    drag.pendingTime = t;
    // Mutate only the dragged node + the live state object — NO store commit,
    // so nothing re-renders and the dragged node stays attached. Preview
    // follows via player.refresh(). One snapshot is taken on pointer-up.
    drag.node.style.left = timeToX(t) + 'px';
    drag.kf.time = t;
    player.refresh();
  }

  function onKfUp() {
    window.removeEventListener('pointermove', onKfMove);
    window.removeEventListener('pointerup', onKfUp);
    if (drag && drag.moved && drag.pendingTime != null) {
      // Commit the already-applied time as one undo step (also re-sorts + renders)
      sceneOps.updateKeyframe(drag.track.id, drag.kf.id, { time: drag.pendingTime }, { history: true });
    }
    drag = null;
  }

  function selectKf(trackId, kfId) {
    selectedKf = { trackId, kfId };
    grid.querySelectorAll('.kf.is-selected').forEach((n) => n.classList.remove('is-selected'));
    grid.querySelector(`.kf[data-kf="${kfId}"]`)?.classList.add('is-selected');
    onKfSelect?.(selectedKf);
  }

  let onKfSelect = null;

  /* ── playhead ────────────────────────────────────────────────────── */
  function updatePlayhead(t) {
    playhead.style.transform = `translateX(${LABEL_W + timeToX(t)}px)`;
    timeLabel.textContent = (t / 1000).toFixed(2) + 's';
    playBtn.innerHTML = player.isPlaying() ? icons.pause : icons.play;
    playBtn.setAttribute('aria-label', player.isPlaying() ? 'Pause' : 'Play');
  }

  // Delete selected keyframe with keyboard
  function handleKey(e) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKf && el.isConnected) {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      sceneOps.removeKeyframe(selectedKf.trackId, selectedKf.kfId);
      selectedKf = null;
    }
  }
  window.addEventListener('keydown', handleKey);

  return {
    el,
    render,
    updatePlayhead,
    getSelectedKf: () => selectedKf,
    onKeyframeSelect: (fn) => { onKfSelect = fn; },
    destroy: () => window.removeEventListener('keydown', handleKey),
  };
}

function niceStep(raw) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = n >= 5 ? 5 : n >= 2 ? 2 : 1;
  return Math.max(50, step * pow);
}
