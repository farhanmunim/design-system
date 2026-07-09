/* Boot: init theme, register workspaces, mount the shell. */
import { theme } from './shell/theme.js';
import { createShell } from './shell/shell.js';
import designWs from './design/index.js';
import animationWs from './animation/index.js';

theme.init();

let initial = 'design';
try { initial = localStorage.getItem('dsb-active-ws') || 'design'; } catch {}

createShell({
  root: document.getElementById('app'),
  workspaces: [designWs, animationWs],
  initialId: initial,
});
