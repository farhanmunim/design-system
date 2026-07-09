/* Tiny, dependency-free syntax highlighter for code previews.
   Not a full parser — just enough to make CSS/JS output readable. */

function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlight(code, language = 'plain') {
  const esc = escapeHTML(code);
  if (language === 'css') return highlightCSS(esc);
  if (language === 'js') return highlightJS(esc);
  return esc;
}

function highlightCSS(s) {
  return s
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
    .replace(/(--[\w-]+)(\s*:)/g, '<span class="hl-prop">$1</span>$2')
    .replace(/([\w-]+)(\s*:)(?![^{]*\{)/g, (m, p, c) => (m.includes('hl-') ? m : `<span class="hl-prop">${p}</span>${c}`))
    .replace(/(:\s*)([^;{}\n]+)(;)/g, (m, a, val, b) => `${a}<span class="hl-val">${val}</span>${b}`)
    .replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="hl-num">$1</span>')
    .replace(/([.#][\w-]+|:[\w-]+|\[[^\]]+\])(?=[^{}]*\{)/g, '<span class="hl-sel">$1</span>');
}

function highlightJS(s) {
  return s
    .replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
    .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*?`|"[^"]*?"|'[^']*?')/g, '<span class="hl-str">$1</span>')
    .replace(/\b(const|let|var|function|return|import|from|new|await|async|if|else|for|of)\b/g, '<span class="hl-kw">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>');
}
