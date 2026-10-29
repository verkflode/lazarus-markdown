/**
 * Markdown formatting commands. Each compute* function is pure —
 * EditorState in, transaction spec out — so they're directly unit-testable.
 * The apply() wrapper dispatches to a view.
 */
import { EditorSelection } from '@codemirror/state';

/** Toggle an inline wrapper (**, *, ~~, `) around each selection range. */
export function computeToggleInline(state, marker) {
  const len = marker.length;
  return state.changeByRange((range) => {
    const { from, to } = range;
    const before = state.sliceDoc(Math.max(0, from - len), from);
    const after = state.sliceDoc(to, Math.min(state.doc.length, to + len));
    const inner = state.sliceDoc(from, to);

    // Selection wrapped from outside: **|text|**
    if (before === marker && after === marker) {
      return {
        changes: [
          { from: from - len, to: from },
          { from: to, to: to + len },
        ],
        range: EditorSelection.range(from - len, to - len),
      };
    }
    // Selection includes the markers: |**text**|
    if (inner.startsWith(marker) && inner.endsWith(marker) && inner.length >= len * 2) {
      return {
        changes: [
          { from, to: from + len },
          { from: to - len, to },
        ],
        range: EditorSelection.range(from, to - len * 2),
      };
    }
    // Wrap (empty selection gets the cursor between the markers)
    return {
      changes: [
        { from, insert: marker },
        { from: to, insert: marker },
      ],
      range: EditorSelection.range(from + len, to + len),
    };
  });
}

/** Set the heading level (1-6) of every selected line; same level toggles off. */
export function computeSetHeading(state, level) {
  const changes = [];
  const seen = new Set();
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let n = fromLine; n <= toLine; n++) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = state.doc.line(n);
      const match = /^(#{1,6})\s+/.exec(line.text);
      const currentLevel = match ? match[1].length : 0;
      const markerEnd = line.from + (match ? match[0].length : 0);
      const newPrefix = currentLevel === level ? '' : '#'.repeat(level) + ' ';
      changes.push({ from: line.from, to: markerEnd, insert: newPrefix });
    }
  }
  return { changes };
}

const LINE_PREFIX_PATTERNS = {
  list: /^(\s*)([-+*]\s+)(?!\[)/,
  task: /^(\s*)([-+*]\s+\[[ xX]\]\s+)/,
  quote: /^(\s*)(>\s+)/,
};

/**
 * Toggle a line prefix (list/task/quote) on every selected line.
 * All lines already prefixed -> remove; otherwise add to the unprefixed ones.
 */
export function computeToggleLinePrefix(state, kind) {
  const pattern = LINE_PREFIX_PATTERNS[kind];
  const insert = { list: '- ', task: '- [ ] ', quote: '> ' }[kind];
  const lines = [];
  const seen = new Set();
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let n = fromLine; n <= toLine; n++) {
      if (!seen.has(n)) {
        seen.add(n);
        lines.push(state.doc.line(n));
      }
    }
  }
  const relevant = lines.filter((l) => l.text.trim() !== '' || lines.length === 1);
  const allPrefixed = relevant.length > 0 && relevant.every((l) => pattern.test(l.text));
  const changes = [];
  for (const line of relevant) {
    const match = pattern.exec(line.text);
    if (allPrefixed && match) {
      const start = line.from + match[1].length;
      changes.push({ from: start, to: start + match[2].length });
    } else if (!allPrefixed && !match) {
      const indent = /^\s*/.exec(line.text)[0].length;
      changes.push({ from: line.from + indent, insert });
    }
  }
  return { changes };
}

/**
 * Wrap the selection as a markdown link. If clipboardText looks like a URL it
 * becomes the target and the cursor lands after the link; otherwise the cursor
 * lands in the empty url slot.
 */
export function computeInsertLink(state, clipboardText = '') {
  const url = /^https?:\/\/\S+$/.test(clipboardText.trim()) ? clipboardText.trim() : '';
  return state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to) || 'link text';
    const inserted = `[${text}](${url})`;
    const cursor = url
      ? range.from + inserted.length
      : range.from + text.length + 3; // inside the empty ()
    return {
      changes: { from: range.from, to: range.to, insert: inserted },
      range: EditorSelection.cursor(cursor),
    };
  });
}

/** Dispatch a computed spec to a view. */
function apply(view, spec) {
  view.dispatch({ ...spec, scrollIntoView: true, userEvent: 'input.format' });
  view.focus();
  return true;
}

export const commands = {
  bold: (view) => apply(view, computeToggleInline(view.state, '**')),
  italic: (view) => apply(view, computeToggleInline(view.state, '*')),
  strikethrough: (view) => apply(view, computeToggleInline(view.state, '~~')),
  code: (view) => apply(view, computeToggleInline(view.state, '`')),
  heading: (view, level) => apply(view, computeSetHeading(view.state, level)),
  list: (view) => apply(view, computeToggleLinePrefix(view.state, 'list')),
  task: (view) => apply(view, computeToggleLinePrefix(view.state, 'task')),
  quote: (view) => apply(view, computeToggleLinePrefix(view.state, 'quote')),
  link: async (view) => {
    let clip = '';
    try {
      clip = await navigator.clipboard.readText();
    } catch {
      // Clipboard unavailable (permissions); fall back to empty url slot
    }
    return apply(view, computeInsertLink(view.state, clip));
  },
};
