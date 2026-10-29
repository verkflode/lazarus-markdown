import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { oneDark } from '@codemirror/theme-one-dark';

const FONT_STACK =
  '"SF Mono", ui-monospace, Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace';

const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '15px' },
  '.cm-content': {
    fontFamily: FONT_STACK,
    // Integer pixel metrics (15px × 1.6 = 24px): fractional line heights can
    // oscillate CodeMirror's measure loop ("Measure loop restarted" warning)
    lineHeight: '1.6',
    padding: '24px 8px 24px 4px',
  },
  '.cm-scroller': { fontFamily: FONT_STACK },
  '.cm-gutters': { border: 'none', fontSize: '12px' },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '42px', paddingRight: '10px' },
  '&.cm-focused': { outline: 'none' },
});

const lightColors = EditorView.theme(
  {
    '&': { color: '#1f2328', backgroundColor: '#ffffff' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#1f2328', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#b4d5fe',
    },
    '.cm-activeLine': { backgroundColor: '#f6f8fa80' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#1f2328' },
    '.cm-gutters': { backgroundColor: '#ffffff', color: '#8c959f' },
    '.cm-searchMatch': { backgroundColor: '#fff8c5', outline: '1px solid #d4a72c66' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#ffd43b' },
    '.cm-matchingBracket': { backgroundColor: '#c8e1ff', outline: '1px solid #79b8ff' },
    '.cm-panels': { backgroundColor: '#f6f8fa', color: '#1f2328' },
    '.cm-tooltip': {
      backgroundColor: '#ffffff',
      border: '1px solid #d0d7de',
      borderRadius: '6px',
    },
  },
  { dark: false }
);

const lightHighlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6e7781', fontStyle: 'italic' },
  { tag: tags.string, color: '#0a3069' },
  { tag: tags.keyword, color: '#cf222e' },
  { tag: tags.typeName, color: '#0550ae' },
  { tag: tags.className, color: '#6639ba' },
  { tag: tags.tagName, color: '#116329' },
  { tag: tags.function(tags.variableName), color: '#6639ba' },
  { tag: tags.variableName, color: '#0550ae' },
  { tag: tags.propertyName, color: '#0550ae' },
  { tag: tags.attributeName, color: '#6639ba' },
  { tag: tags.number, color: '#0550ae' },
  { tag: tags.bool, color: '#0550ae' },
  { tag: tags.operator, color: '#cf222e' },
  // Markdown
  { tag: tags.heading, fontWeight: '700', color: '#0550ae' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: '#0969da', textDecoration: 'underline' },
  { tag: tags.url, color: '#0969da' },
  { tag: tags.quote, color: '#57606a', fontStyle: 'italic' },
  { tag: tags.monospace, color: '#953800' },
  { tag: tags.list, color: '#cf222e' },
  { tag: tags.meta, color: '#6e7781' },
]);

export const lightTheme = [baseTheme, lightColors, syntaxHighlighting(lightHighlight)];

// oneDark ships its own colors; we only normalize sizing/typography on top of it
const darkOverrides = EditorView.theme(
  {
    '.cm-gutters': { backgroundColor: 'transparent' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  },
  { dark: true }
);

export const darkTheme = [baseTheme, oneDark, darkOverrides];
