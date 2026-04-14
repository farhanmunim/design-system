# Design System Builder

A token-driven design system builder with live preview and production-ready CSS output.

**Live:** [design-system.farhan.app](https://design-system.farhan.app)

## About

A Geist-inspired live design system engine where tokens drive everything. Define primitive and semantic tokens, preview a full UI instantly, and copy clean, production-ready CSS.

## Features

- Token editor with light/dark variants and instant preview
- Full component library rendered from semantic tokens — buttons, inputs, badges, alerts, cards, modals, tabs, tooltips, avatars, and more
- Real-time CSS output with Tokens and Framework tabs, copy to clipboard, and download
- Fluid type and spacing tokens using `clamp()`
- Undo / redo, import / export token sets as JSON, command palette
- Dual-level theming — app UI theme and token-level light/dark values

## Running locally

Single-file static site — no build step, no dependencies beyond Google Fonts.

```bash
# Serve the repo root with any static server, e.g.
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Stack

- Vanilla JS (modular IIFE architecture — TokenStore, CSSEngine, ThemeEngine, PreviewEngine, UI)
- No frameworks, no build step
- Deployed on Cloudflare Pages

## License

[MIT](LICENSE)
