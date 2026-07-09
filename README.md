# Studio — Design System & Animation Builder

A minimal, zero-build web app with two co-equal workspaces:

1. **Design System** — a token-driven design-system builder. Edit tokens, see a
   live component preview, and copy production-ready CSS (tokens + framework).
2. **Animation Studio** — a visual GSAP / motion.dev animation builder. Add
   elements to a stage, edit their motion on a timeline, scrub a live preview,
   and export clean, framework-free **GSAP** or **motion.dev** code.

**Live:** [design-system.farhan.app](https://design-system.farhan.app)

## Highlights

- **One shared shell** — header, workspace switcher, theming, undo/redo,
  import/export, command palette (`⌘K`), and toasts are shared by both tools.
- **Design System** — primitive & semantic color tokens with light/dark values,
  typography, spacing, radius, and shadow; live preview of buttons, badges,
  inputs, cards, and alerts; CSS output where every value traces to a token.
- **Animation Studio** — box/text elements, a keyframe timeline (drag, snap,
  zoom), play/pause/loop/scrub, and dual **GSAP + Motion** code generation from
  a single neutral timeline model. Each export ships with copy-paste install
  instructions for the chosen library.
- **Zero build** — native ES modules, no bundler, no framework. The only
  third-party code is loaded lazily via an import map for the optional
  "preview with the real library" mode; core UX runs fully offline.

## Architecture

```
index.html            # shell DOM + <script type="importmap"> + module entry
src/
  main.js             # boot: theme + workspaces + shell
  core/               # store factory, easing registry, dom/util/id helpers
  shell/              # header + switcher, theme, toast, palette, export modal
  design/             # Design System workspace (tokens, cssEngine, preview)
  animation/          # Animation Studio (schema, interpolator, player, stage,
                      #   timeline, inspector, generators/{gsap,motion})
styles/               # shell.css, design.css, animation.css, timeline.css
legacy/               # the previous single-file app (kept for reference)
```

The store, undo/redo, and localStorage persistence are a single `createStore`
factory (`src/core/store.js`); each workspace gets its own instance. The
Animation Studio's preview is driven by a neutral cubic-bezier interpolator
(`src/animation/interpolator.js`) so what you see is identical whether you
export GSAP or Motion. The easing registry (`src/core/easing.js`) resolves one
named easing three ways — bezier (preview), GSAP string, and Motion value.

## Running locally

No build step, no dependencies. Serve the repo root with any static server:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Stack

- Vanilla JS (native ES modules), no framework, no build step
- GSAP (free) and motion.dev (MIT) for the optional real-library preview
- Deployed on Cloudflare Pages

## License

[MIT](LICENSE)
