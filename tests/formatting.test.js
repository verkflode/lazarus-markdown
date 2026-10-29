import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import {
  computeToggleInline,
  computeSetHeading,
  computeToggleLinePrefix,
  computeInsertLink,
} from '../src/renderer/src/formatting.js';

function state(doc, anchor, head = anchor) {
  return EditorState.create({ doc, selection: EditorSelection.single(anchor, head) });
}

function applied(st, spec) {
  return st.update(spec).state.doc.toString();
}

describe('toggle inline markers', () => {
  it('wraps a selection in bold', () => {
    const st = state('hello world', 0, 5);
    expect(applied(st, computeToggleInline(st, '**'))).toBe('**hello** world');
  });

  it('unwraps when the selection is already bold (markers outside)', () => {
    const st = state('**hello** world', 2, 7);
    expect(applied(st, computeToggleInline(st, '**'))).toBe('hello world');
  });

  it('unwraps when the selection includes the markers', () => {
    const st = state('**hello** world', 0, 9);
    expect(applied(st, computeToggleInline(st, '**'))).toBe('hello world');
  });

  it('inserts an empty pair at the cursor with cursor centered', () => {
    const st = state('ab', 1);
    const spec = computeToggleInline(st, '**');
    const next = st.update(spec);
    expect(next.state.doc.toString()).toBe('a****b');
    expect(next.state.selection.main.head).toBe(3);
  });
});

describe('headings', () => {
  it('adds a heading to a plain line', () => {
    const st = state('title', 2);
    expect(applied(st, computeSetHeading(st, 2))).toBe('## title');
  });

  it('changes an existing heading level', () => {
    const st = state('### title', 4);
    expect(applied(st, computeSetHeading(st, 1))).toBe('# title');
  });

  it('toggles off when the level matches', () => {
    const st = state('## title', 4);
    expect(applied(st, computeSetHeading(st, 2))).toBe('title');
  });

  it('applies to every selected line', () => {
    const st = state('one\ntwo', 0, 7);
    expect(applied(st, computeSetHeading(st, 3))).toBe('### one\n### two');
  });
});

describe('line prefixes', () => {
  it('toggles a list on', () => {
    const st = state('alpha\nbeta', 0, 10);
    expect(applied(st, computeToggleLinePrefix(st, 'list'))).toBe('- alpha\n- beta');
  });

  it('toggles a list off when all lines are lists', () => {
    const st = state('- alpha\n- beta', 0, 14);
    expect(applied(st, computeToggleLinePrefix(st, 'list'))).toBe('alpha\nbeta');
  });

  it('completes partial lists instead of stripping', () => {
    const st = state('- alpha\nbeta', 0, 12);
    expect(applied(st, computeToggleLinePrefix(st, 'list'))).toBe('- alpha\n- beta');
  });

  it('toggles tasks with checkbox marker', () => {
    const st = state('todo item', 0);
    expect(applied(st, computeToggleLinePrefix(st, 'task'))).toBe('- [ ] todo item');
  });

  it('removes a checked task marker', () => {
    const st = state('- [x] done item', 0);
    expect(applied(st, computeToggleLinePrefix(st, 'task'))).toBe('done item');
  });

  it('toggles blockquotes preserving indentation', () => {
    const st = state('  quoted', 4);
    expect(applied(st, computeToggleLinePrefix(st, 'quote'))).toBe('  > quoted');
  });
});

describe('links', () => {
  it('uses a URL from the clipboard', () => {
    const st = state('click here', 0, 10);
    expect(applied(st, computeInsertLink(st, 'https://example.com'))).toBe(
      '[click here](https://example.com)'
    );
  });

  it('leaves the cursor in the url slot without a clipboard URL', () => {
    const st = state('docs', 0, 4);
    const next = st.update(computeInsertLink(st, 'not a url'));
    expect(next.state.doc.toString()).toBe('[docs]()');
    expect(next.state.selection.main.head).toBe(7);
  });

  it('inserts placeholder text at a bare cursor', () => {
    const st = state('', 0);
    expect(applied(st, computeInsertLink(st, ''))).toBe('[link text]()');
  });
});
