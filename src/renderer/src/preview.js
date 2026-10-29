import { render } from './markdown.js';

const DEBOUNCE_MS = 200;

let renderTimer = null;
let mermaidModule = null;
let mermaidSeq = 0;
let pendingMermaid = Promise.resolve();
const mermaidCache = new Map(); // `${theme}\n${source}` -> svg

async function renderMermaidBlocks(container, theme) {
  const blocks = container.querySelectorAll('pre.mermaid-source');
  if (blocks.length === 0) return;

  if (!mermaidModule) {
    mermaidModule = import('mermaid').then((m) => m.default);
  }
  const mermaid = await mermaidModule;
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict',
  });

  for (const [index, block] of [...blocks].entries()) {
    const source = block.textContent;
    const cacheKey = `${theme}\n${source}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-diagram';
    try {
      let svg = mermaidCache.get(cacheKey);
      if (!svg) {
        ({ svg } = await mermaid.render(`mermaid-${++mermaidSeq}`, source));
        mermaidCache.set(cacheKey, svg);
      }
      wrapper.innerHTML = svg;
      block.replaceWith(wrapper);
    } catch {
      block.classList.add('mermaid-error');
      block.title = 'Mermaid could not parse this diagram';
    }
  }
  if (mermaidCache.size > 100) mermaidCache.clear();
}

function openExternalLinks(container) {
  for (const link of container.querySelectorAll('a[href^="http"]')) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
}

function addCopyButtons(container) {
  for (const pre of container.querySelectorAll('pre[class*="language-"], pre:not([class])')) {
    if (!pre.querySelector('code')) continue;
    const button = document.createElement('button');
    button.className = 'code-copy-btn';
    button.type = 'button';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      navigator.clipboard.writeText(pre.querySelector('code').textContent).then(() => {
        button.textContent = 'Copied';
        setTimeout(() => (button.textContent = 'Copy'), 1500);
      });
    });
    pre.appendChild(button);
  }
}

/**
 * Rewrite relative image srcs to absolute file: URLs resolved against the
 * current document's directory — without this they'd resolve against the
 * app's own index.html and never load.
 */
function resolveImages(container, basePath) {
  if (!basePath) return;
  const slash = basePath.lastIndexOf('/');
  if (slash <= 0) return;
  const dir = basePath.slice(0, slash);
  for (const img of container.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(src)) continue;
    try {
      img.setAttribute('src', new URL(src, `file://${dir}/`).href);
    } catch {
      // leave the original src if it can't be parsed
    }
  }
}

/**
 * Task-list checkboxes edit the markdown source directly: the nth rendered
 * checkbox corresponds to the nth checkbox marker in the document.
 */
function wireTaskCheckboxes(container, onToggle) {
  const boxes = container.querySelectorAll('input.task-list-item-checkbox');
  boxes.forEach((box, index) => {
    box.disabled = false;
    box.addEventListener('change', () => onToggle(index, box.checked));
  });
}

export function createPreview(element, { getTheme, getBasePath, onTaskToggle, onOpenLink }) {
  let scheduledContent = null;

  // Links without a scheme are documents relative to the current file; clicking
  // one must never navigate the window. In-page anchors (headings, footnotes)
  // scroll the preview pane instead.
  element.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || !element.contains(link)) return;
    const href = link.getAttribute('href');
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return; // http, mailto, … handled elsewhere
    event.preventDefault();
    if (href.startsWith('#')) {
      const id = decodeURIComponent(href.slice(1));
      element.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'start' });
    } else if (onOpenLink) {
      onOpenLink(href);
    }
  });

  function renderNow(content) {
    // Preserve the scroll position proportionally across the innerHTML swap,
    // so re-renders never jerk the pane (or echo into scroll sync)
    const pane = element.parentElement;
    const maxBefore = pane.scrollHeight - pane.clientHeight;
    const ratio = maxBefore > 0 ? pane.scrollTop / maxBefore : 0;
    element.innerHTML = render(content);
    const maxAfter = pane.scrollHeight - pane.clientHeight;
    if (maxAfter > 0 && ratio > 0) pane.scrollTop = ratio * maxAfter;
    resolveImages(element, getBasePath?.());
    openExternalLinks(element);
    addCopyButtons(element);
    if (onTaskToggle) wireTaskCheckboxes(element, onTaskToggle);
    pendingMermaid = renderMermaidBlocks(element, getTheme()).catch((error) =>
      console.warn('Mermaid rendering failed:', error)
    );
  }

  return {
    update(content) {
      scheduledContent = content;
      clearTimeout(renderTimer);
      renderTimer = setTimeout(() => renderNow(scheduledContent), DEBOUNCE_MS);
    },
    renderNow(content) {
      clearTimeout(renderTimer);
      renderNow(content);
    },
    /**
     * Render a detached copy for export. Diagrams always use the light theme
     * (exports land on white paper), and the live preview is left untouched.
     */
    async renderForExport(content) {
      await pendingMermaid; // mermaid.initialize is global; don't interleave passes
      const container = document.createElement('div');
      container.innerHTML = render(content);
      resolveImages(container, getBasePath?.());
      openExternalLinks(container);
      await renderMermaidBlocks(container, 'light').catch((error) =>
        console.warn('Mermaid rendering failed:', error)
      );
      return container.innerHTML;
    },
  };
}
