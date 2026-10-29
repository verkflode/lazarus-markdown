import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import anchor from 'markdown-it-anchor';
import multimdTable from 'markdown-it-multimd-table';
import texmath from 'markdown-it-texmath';
import githubAlerts from 'markdown-it-github-alerts';
import tocDoneRight from 'markdown-it-toc-done-right';
import katex from 'katex';
import DOMPurify from 'dompurify';
import Prism, { resolveLanguage } from './prism-setup.js';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang === 'mermaid') {
      // Marked for the preview post-processor; rendered lazily by mermaid
      return `<pre class="mermaid-source"><code>${md.utils.escapeHtml(code)}</code></pre>`;
    }
    const language = resolveLanguage(lang);
    if (language) {
      const highlighted = Prism.highlight(code, Prism.languages[language], language);
      return `<pre class="language-${language}"><code class="language-${language}">${highlighted}</code></pre>`;
    }
    return `<pre><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
});

md.use(taskLists, { enabled: true, label: true })
  .use(footnote)
  .use(anchor, { permalink: false, tabIndex: false })
  // [[toc]] — both plugins' default slugify match, so TOC links hit the anchors
  .use(tocDoneRight, { listType: 'ul' })
  // > [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!CAUTION]
  .use(githubAlerts)
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true })
  .use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { throwOnError: false } });

const SANITIZE_CONFIG = {
  FORBID_TAGS: ['style', 'form', 'button', 'select', 'textarea', 'object', 'embed', 'base', 'link', 'meta'],
  FORBID_ATTR: ['srcdoc'],
  ADD_ATTR: ['target'],
  // DOMPurify's default URI regexp plus file: — the preview legitimately loads
  // local images from the document's own directory (see resolveImages)
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

/** Render markdown to sanitized HTML. */
export function render(source) {
  return DOMPurify.sanitize(md.render(source), SANITIZE_CONFIG);
}
