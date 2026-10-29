import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, Transaction } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentWithTab } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { indentUnit } from '@codemirror/language';
import { lightTheme, darkTheme } from './cm-themes.js';
import {
  focusMode,
  typewriterMode,
  focusCompartment,
  typewriterCompartment,
} from './writing-modes.js';
import { slashMenu } from './slash-menu.js';

const themeConfig = new Compartment();

export function createEditor(container, { theme = 'light', onChange, onCursor } = {}) {
  let currentTheme = theme;
  // Writing modes are editor-global, not per-tab; re-asserted after each swap
  let focusOn = false;
  let typewriterOn = false;

  const extensions = [
    basicSetup,
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    indentUnit.of('  '),
    keymap.of([indentWithTab]),
    slashMenu,
    focusCompartment.of([]),
    typewriterCompartment.of([]),
    themeConfig.of(theme === 'dark' ? darkTheme : lightTheme),
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown editor', spellcheck: 'true' }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
      if ((update.selectionSet || update.docChanged) && onCursor) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursor({ line: line.number, col: pos - line.from + 1 });
      }
    }),
  ];

  const makeState = (content) => EditorState.create({ doc: content || '', extensions });

  const view = new EditorView({ parent: container, state: makeState('') });

  return {
    // Tab support: every tab owns an EditorState (undo history, cursor,
    // selection travel with it); switching tabs swaps states on the one view
    createState: makeState,
    swapState(state) {
      const previous = view.state;
      view.setState(state);
      // A fresh state resets every compartment to its default; re-assert the
      // editor-global settings (theme, writing modes) that outlive one tab
      view.dispatch({
        effects: [
          themeConfig.reconfigure(currentTheme === 'dark' ? darkTheme : lightTheme),
          focusCompartment.reconfigure(focusOn ? focusMode : []),
          typewriterCompartment.reconfigure(typewriterOn ? typewriterMode : []),
        ],
      });
      return previous;
    },

    view,
    scrollDOM: view.scrollDOM,

    getContent: () => view.state.doc.toString(),

    // Replaces the document without polluting undo history (file loads, reverts)
    setContent(content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content || '' },
        annotations: Transaction.addToHistory.of(false),
      });
    },

    setTheme(theme) {
      currentTheme = theme;
      view.dispatch({
        effects: themeConfig.reconfigure(theme === 'dark' ? darkTheme : lightTheme),
      });
    },

    setFocusMode(on) {
      focusOn = on;
      view.dispatch({ effects: focusCompartment.reconfigure(on ? focusMode : []) });
    },

    setTypewriter(on) {
      typewriterOn = on;
      view.dispatch({ effects: typewriterCompartment.reconfigure(on ? typewriterMode : []) });
      if (on) {
        // Center immediately on enable
        const head = view.state.selection.main.head;
        view.dispatch({ selection: { anchor: head }, scrollIntoView: true });
      }
    },

    goToLine(lineNumber) {
      const line = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines));
      view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
      view.focus();
    },

    openSearch: () => openSearchPanel(view),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
