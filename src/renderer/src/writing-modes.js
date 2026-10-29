/**
 * Focus mode and typewriter scrolling — two independent CodeMirror extensions,
 * each toggled through a Compartment so it can turn on/off without rebuilding
 * the editor.
 */
import { EditorView, Decoration, ViewPlugin } from '@codemirror/view';
import { Compartment } from '@codemirror/state';

export const focusCompartment = new Compartment();
export const typewriterCompartment = new Compartment();

const dimClass = Decoration.line({ class: 'cm-dim' });

/**
 * Focus mode: dim every line except the paragraph containing the cursor.
 * A paragraph is a run of non-blank lines; blank lines act as separators.
 */
const focusPlugin = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = this.build(view);
    }
    update(update) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }
    build(view) {
      const { state } = view;
      const cursorLine = state.doc.lineAt(state.selection.main.head).number;

      // Expand from the cursor to the paragraph's blank-line boundaries
      let top = cursorLine;
      let bottom = cursorLine;
      const isBlank = (n) => state.doc.line(n).text.trim() === '';
      while (top > 1 && !isBlank(top - 1)) top--;
      while (bottom < state.doc.lines && !isBlank(bottom + 1)) bottom++;

      const builder = [];
      for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
          const line = state.doc.lineAt(pos);
          if (line.number < top || line.number > bottom) {
            builder.push(dimClass.range(line.from));
          }
          pos = line.to + 1;
        }
      }
      return Decoration.set(builder);
    }
  },
  { decorations: (v) => v.decorations }
);

const focusTheme = EditorView.theme({
  '.cm-dim': { opacity: '0.32', transition: 'opacity 0.15s ease' },
});

export const focusMode = [focusPlugin, focusTheme];

/**
 * Typewriter scrolling: keep the active line vertically centered. A generous
 * scrollMargin lets CodeMirror's own scrollIntoView do the centering on cursor
 * moves; the updateListener re-centers after edits.
 */
const typewriterPlugin = ViewPlugin.fromClass(
  class {
    update(update) {
      if (!update.docChanged && !update.selectionSet) return;
      const view = update.view;
      // Defer to next frame so layout reflects the change before we measure
      requestAnimationFrame(() => {
        const head = view.state.selection.main.head;
        const rect = view.coordsAtPos(head);
        if (!rect) return;
        const scroller = view.scrollDOM;
        const middle = scroller.clientHeight / 2;
        const lineCenter = rect.top + (rect.bottom - rect.top) / 2;
        const delta = lineCenter - (scroller.getBoundingClientRect().top + middle);
        if (Math.abs(delta) > 1) scroller.scrollTop += delta;
      });
    }
  }
);

// Padding so the first and last lines can still reach the vertical center
const typewriterTheme = EditorView.theme({
  '.cm-content': { paddingTop: '40vh', paddingBottom: '40vh' },
});

export const typewriterMode = [typewriterPlugin, typewriterTheme];
