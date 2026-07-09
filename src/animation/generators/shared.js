/* Shared generator helpers: version pins, selectors, number formatting,
   and per-element track grouping. Both generators read from here. */
import { fmtNum, isColor } from '../../core/util.js';
import { PROPERTIES } from '../schema.js';

/* Single source of truth for library versions — used by both the emitted
   install instructions and the app's own /vendor import map. */
export const LIB_VERSIONS = { gsap: '3.13.0', motion: '11' };

export const s = (ms) => fmtNum(ms / 1000, 4);

/** CSS-id-safe selector from element name (stable, deterministic). */
export function selectorFor(elem, index) {
  const slug = (elem.name || 'el').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return '#' + (slug || `el-${index}`);
}

export function fmtValue(property, v) {
  if (isColor(v)) return JSON.stringify(v);
  return fmtNum(Number(v), 3);
}

/** Group a scene's tracks by element, with a stable selector per element. */
export function groupByElement(scene) {
  return scene.elements.map((elem, i) => ({
    elem,
    selector: selectorFor(elem, i),
    tracks: scene.tracks.filter((t) => t.elementId === elem.id && t.keyframes.length > 0),
  })).filter((g) => g.tracks.length > 0);
}

/** GSAP install snippet (HTML, for the export modal `help`). */
export function gsapHelp() {
  const v = LIB_VERSIONS.gsap;
  return `
<p>GSAP is free (including all plugins). Pick one:</p>
<pre><code>&lt;!-- 1 · CDN script (global \`gsap\`) --&gt;
&lt;script src="https://cdn.jsdelivr.net/npm/gsap@${v}/dist/gsap.min.js"&gt;&lt;/script&gt;

&lt;!-- 2 · Import map + ESM (zero-build, matches this app) --&gt;
&lt;script type="importmap"&gt;
{ "imports": { "gsap": "https://cdn.jsdelivr.net/npm/gsap@${v}/+esm" } }
&lt;/script&gt;
&lt;script type="module"&gt;import { gsap } from "gsap";&lt;/script&gt;

// 3 · Direct ESM
import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@${v}/+esm";

// 4 · npm
npm i gsap  →  import { gsap } from "gsap";</code></pre>`;
}

/** Motion install snippet (HTML, for the export modal `help`). */
export function motionHelp() {
  const v = LIB_VERSIONS.motion;
  return `
<p>Motion (motion.dev) is MIT-licensed and ESM-first:</p>
<pre><code>&lt;!-- 1 · CDN script (global \`Motion\`) --&gt;
&lt;script src="https://cdn.jsdelivr.net/npm/motion@${v}/dist/motion.js"&gt;&lt;/script&gt;
&lt;script&gt;const { animate } = Motion;&lt;/script&gt;

&lt;!-- 2 · Import map + ESM (matches this app) --&gt;
&lt;script type="importmap"&gt;
{ "imports": { "motion": "https://cdn.jsdelivr.net/npm/motion@${v}/+esm" } }
&lt;/script&gt;
&lt;script type="module"&gt;import { animate } from "motion";&lt;/script&gt;

// 3 · Direct ESM
import { animate } from "https://cdn.jsdelivr.net/npm/motion@${v}/+esm";

// 4 · npm
npm i motion  →  import { animate } from "motion";</code></pre>`;
}
