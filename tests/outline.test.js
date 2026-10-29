import { describe, it, expect } from 'vitest';
import { extractHeadings } from '../src/renderer/src/sidebar.js';

describe('extractHeadings', () => {
  it('extracts headings with levels and line numbers', () => {
    const headings = extractHeadings('# One\n\ntext\n\n## Two\n\n### Three');
    expect(headings).toEqual([
      { level: 1, text: 'One', line: 1 },
      { level: 2, text: 'Two', line: 5 },
      { level: 3, text: 'Three', line: 7 },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const headings = extractHeadings('# Real\n```\n# fake comment\n```\n## Also real');
    expect(headings.map((h) => h.text)).toEqual(['Real', 'Also real']);
  });

  it('strips trailing hashes', () => {
    const headings = extractHeadings('## Closed ##');
    expect(headings[0].text).toBe('Closed');
  });

  it('returns empty for content without headings', () => {
    expect(extractHeadings('just text\nno headings')).toEqual([]);
  });
});
