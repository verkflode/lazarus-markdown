import { describe, it, expect } from 'vitest';
import { slashQuery, SNIPPETS } from '../src/renderer/src/slash-menu.js';

describe('slash trigger', () => {
  it('activates on a bare slash at line start', () => {
    expect(slashQuery('/', 1)).toBe('');
  });

  it('captures the partial query after the slash', () => {
    expect(slashQuery('/tab', 4)).toBe('tab');
  });

  it('does not activate mid-sentence', () => {
    expect(slashQuery('see and/or here', 8)).toBeNull();
  });

  it('does not activate for a slash after text', () => {
    expect(slashQuery('foo /bar', 8)).toBeNull();
  });

  it('does not activate once the token has a space', () => {
    expect(slashQuery('/table now', 10)).toBeNull();
  });
});

describe('snippets', () => {
  it('every snippet has a label, detail, and template', () => {
    for (const snippet of SNIPPETS) {
      expect(snippet.label).toMatch(/^\/\w+/);
      expect(snippet.detail).toBeTruthy();
      expect(snippet.template).toBeTruthy();
    }
  });

  it('includes the promised block types', () => {
    const labels = SNIPPETS.map((s) => s.label);
    expect(labels).toEqual(
      expect.arrayContaining(['/table', '/code', '/mermaid', '/math'])
    );
  });
});
