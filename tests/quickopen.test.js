import { describe, it, expect } from 'vitest';
import { fuzzyMatch, rankFiles, flattenTree } from '../src/renderer/src/quickopen.js';

describe('fuzzyMatch', () => {
  it('matches subsequences', () => {
    expect(fuzzyMatch('rdme', 'README.md')).toBeGreaterThan(0);
  });

  it('rejects non-matches', () => {
    expect(fuzzyMatch('xyz', 'README.md')).toBe(-1);
  });

  it('prefers word-boundary and consecutive hits', () => {
    const boundary = fuzzyMatch('fb', 'foo-bar.md');
    const scattered = fuzzyMatch('fb', 'falsebeam.md');
    expect(boundary).toBeGreaterThan(scattered);
  });

  it('empty query matches everything neutrally', () => {
    expect(fuzzyMatch('', 'anything.md')).toBe(0);
  });
});

describe('rankFiles', () => {
  const files = [
    { name: 'notes.md', path: '/docs/notes.md' },
    { name: 'meeting-notes.md', path: '/docs/work/meeting-notes.md' },
    { name: 'recipe.md', path: '/personal/recipe.md' },
  ];

  it('ranks name matches above path-only matches', () => {
    const ranked = rankFiles('notes', files);
    expect(ranked[0].name).toBe('notes.md');
    expect(ranked.map((f) => f.name)).not.toContain('recipe.md');
  });

  it('matches across path segments', () => {
    const ranked = rankFiles('work', files);
    expect(ranked.map((f) => f.name)).toContain('meeting-notes.md');
  });
});

describe('flattenTree', () => {
  it('flattens nested folders to files', () => {
    const tree = [
      { name: 'a.md', path: '/a.md', type: 'file' },
      {
        name: 'dir',
        path: '/dir',
        type: 'dir',
        children: [{ name: 'b.md', path: '/dir/b.md', type: 'file' }],
      },
    ];
    expect(flattenTree(tree).map((f) => f.path)).toEqual(['/a.md', '/dir/b.md']);
  });
});
