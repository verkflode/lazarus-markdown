/**
 * Slash menu: type "/" at the start of a line to get a filterable list of
 * block snippets, powered by CodeMirror's autocomplete. Each snippet uses
 * the ${} field syntax so the cursor lands in the first useful slot and Tab
 * moves between slots.
 */
import { autocompletion, snippetCompletion } from '@codemirror/autocomplete';

const SNIPPETS = [
  {
    label: '/table',
    detail: 'Table 3×3',
    template: '| ${Column 1} | ${Column 2} | ${Column 3} |\n| --- | --- | --- |\n| ${} | ${} | ${} |\n| ${} | ${} | ${} |\n',
  },
  {
    label: '/code',
    detail: 'Code block',
    template: '```${language}\n${}\n```\n',
  },
  {
    label: '/mermaid',
    detail: 'Mermaid diagram',
    template: '```mermaid\ngraph TD\n  ${A}[${Start}] --> ${B}[${End}]\n```\n',
  },
  {
    label: '/math',
    detail: 'Math block',
    template: '$$\n${}\n$$\n',
  },
  {
    label: '/hr',
    detail: 'Horizontal rule',
    template: '---\n',
  },
  {
    label: '/toc',
    detail: 'Table of contents',
    template: '${[[toc]]}\n',
  },
  {
    label: '/task',
    detail: 'Task list',
    template: '- [ ] ${first task}\n- [ ] ${}\n',
  },
  {
    label: '/quote',
    detail: 'Blockquote',
    template: '> ${}\n',
  },
  {
    label: '/callout',
    detail: 'Callout (GitHub alert)',
    template: '> [!${NOTE}]\n> ${}\n',
  },
];

/**
 * The completion source. Only fires when "/" begins the token at line start,
 * so a slash mid-sentence (URLs, dates, "and/or") never triggers it.
 */
function slashSource(context) {
  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.slice(0, context.pos - line.from);
  const match = /^\/(\w*)$/.exec(beforeCursor);
  if (!match) return null;

  return {
    from: line.from,
    filter: true,
    options: SNIPPETS.map((snippet) =>
      snippetCompletion(snippet.template, {
        label: snippet.label,
        detail: snippet.detail,
        type: 'keyword',
      })
    ),
  };
}

export const slashMenu = autocompletion({
  override: [slashSource],
  icons: false,
  defaultKeymap: true,
});

// Exported for unit testing the trigger logic
export function slashQuery(lineText, cursorCol) {
  const before = lineText.slice(0, cursorCol);
  const match = /^\/(\w*)$/.exec(before);
  return match ? match[1] : null;
}

export { SNIPPETS };
