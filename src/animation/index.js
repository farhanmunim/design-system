/* ═══════════════════════════════════════════════════════════════════════
   Animation Studio workspace — implements the shell workspace contract.
   Composes stage + timeline + inspector + player around animStore.
   ═══════════════════════════════════════════════════════════════════════ */
import { h, clear } from '../core/dom.js';
import { downloadText } from '../core/util.js';
import * as icons from '../shell/icons.js';
import { toast } from '../shell/toast.js';
import { animStore, sceneOps } from './animStore.js';
import { sampleSceneAt } from './interpolator.js';
import { createPlayer } from './player.js';
import { createStage } from './stage.js';
import { createTimeline } from './timeline.js';
import { createInspector } from './inspector.js';
import { toGSAP } from './generators/gsap.js';
import { toMotion } from './generators/motion.js';
import { gsapHelp, motionHelp } from './generators/shared.js';

let selectedElement = null;
let stage, timeline, inspector, player, unsub, container;

function selectElement(id) {
  selectedElement = id;
  timeline?.render();
  stage?.markSelection();
  inspector?.render();
}

function mount(root) {
  container = root;
  animStore.init();

  player = createPlayer({
    getScene: () => animStore.getState(),
    apply: (t) => stage.apply(t, sampleSceneAt),
    onTick: (t) => timeline.updatePlayhead(t),
  });

  stage = createStage({
    getScene: () => animStore.getState(),
    getSelected: () => selectedElement,
    onSelect: (id) => { selectedElement = id; inspector.render(); timeline.render(); },
  });

  timeline = createTimeline({
    player,
    getSelected: () => selectedElement,
    onSelectElement: (id) => selectElement(id),
  });
  timeline.onKeyframeSelect(() => inspector.render());

  inspector = createInspector({
    getSelected: () => selectedElement,
    onSelectElement: (id) => selectElement(id),
    getSelectedKf: () => timeline.getSelectedKf(),
  });

  const addBar = h('div.studio__add', {}, [
    labelBtn(icons.box, 'Box', () => { const id = sceneOps.addElement('box'); selectElement(id); }),
    labelBtn(icons.text, 'Text', () => { const id = sceneOps.addElement('text'); selectElement(id); }),
  ]);

  const stagePane = h('div.studio__stage', {}, [addBar, stage.el]);
  const layout = h('div.studio', {}, [
    h('div.studio__top', {}, [stagePane, inspector.el]),
    h('div.studio__bottom', {}, [timeline.el]),
  ]);
  clear(root);
  root.appendChild(layout);

  // Re-render on any store change (structural). During drags we call
  // player.refresh() directly, so history:false commits still update preview.
  unsub = animStore.subscribe(() => {
    stage.render();
    timeline.render();
    inspector.render();
    player.refresh();
  });

  stage.render();
  timeline.render();
  inspector.render();
  player.seek(0);

  window.addEventListener('keydown', onSpace);
}

function onSpace(e) {
  if (e.code === 'Space' && container?.isConnected) {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    e.preventDefault();
    player.toggle();
  }
}

function unmount() {
  player?.pause();
  unsub?.();
  stage?.destroy?.();
  timeline?.destroy?.();
  window.removeEventListener('keydown', onSpace);
  if (container) clear(container);
}

function exportTargets() {
  return [
    { id: 'gsap', label: 'GSAP', filename: 'animation.gsap.js', mime: 'text/javascript', language: 'js', generate: () => toGSAP(animStore.getState()), help: gsapHelp() },
    { id: 'motion', label: 'Motion', filename: 'animation.motion.js', mime: 'text/javascript', language: 'js', generate: () => toMotion(animStore.getState()), help: motionHelp() },
    { id: 'json', label: 'Scene JSON', filename: 'scene.json', mime: 'application/json', language: 'plain', generate: () => JSON.stringify(animStore.getState(), null, 2) },
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
        if (!Array.isArray(data.elements)) throw new Error('not a scene');
        animStore.replace(data);
        selectElement(null);
        toast('Scene imported', { type: 'success' });
      } catch (e) {
        toast('Invalid scene JSON', { type: 'error' });
      }
      input.remove();
    };
    reader.readAsText(file);
  });
  input.click();
}

function getCommands() {
  return [
    { group: 'Studio', title: 'Add box', run: () => selectElement(sceneOps.addElement('box')) },
    { group: 'Studio', title: 'Add text', run: () => selectElement(sceneOps.addElement('text')) },
    { group: 'Studio', title: 'Play / pause', run: () => player.toggle() },
    { group: 'Studio', title: 'Export GSAP / Motion…', run: () => {} }, // handled by shell export
  ];
}

function labelBtn(svg, label, onclick) {
  const b = h('button.app-btn.app-btn--ghost', { onclick });
  b.innerHTML = svg + `<span>${label}</span>`;
  return b;
}

export default {
  id: 'animation',
  label: 'Animation Studio',
  icon: icons.play,
  mount,
  unmount,
  getStore: () => animStore,
  getExportTargets: exportTargets,
  getCommands,
  onImport,
};
