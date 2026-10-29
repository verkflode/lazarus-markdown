import { describe, it, expect } from 'vitest';
import iconv from 'iconv-lite';
import {
  detectAndDecode,
  resolveLinkTarget,
  isMarkdownPath,
} from '../src/main/fileUtils.js';

describe('detectAndDecode', () => {
  it('passes UTF-8 through as UTF-8', () => {
    const buffer = Buffer.from('# Héllo wörld — naïve', 'utf-8');
    const result = detectAndDecode(buffer);
    expect(result.encoding).toBe('utf-8');
    expect(result.content).toContain('Héllo wörld');
  });

  it('detects and decodes Windows-1252', () => {
    // Long, accent-heavy text so jschardet's confidence clears the 0.9 bar
    const text = 'Voilà le café où les élèves naïfs ont réussi à être très forts en français. '.repeat(10);
    const buffer = iconv.encode(text, 'windows-1252');
    const result = detectAndDecode(buffer);
    expect(result.encoding).toBe('windows-1252');
    expect(result.content).toContain('Voilà le café');
    expect(result.content).not.toContain('Ã');
  });

  it('detects Shift_JIS with full confidence', () => {
    const text = 'これは日本語のテキストです。マークダウンのドキュメントをテストしています。'.repeat(5);
    const buffer = iconv.encode(text, 'shift_jis');
    const result = detectAndDecode(buffer);
    expect(result.encoding.toLowerCase()).toBe('shift_jis');
    expect(result.content).toContain('これは日本語');
  });
});

describe('resolveLinkTarget', () => {
  it('resolves a relative link against the document directory', () => {
    expect(resolveLinkTarget('/docs/note.md', 'other.md')).toEqual({
      relPath: 'other.md',
      target: '/docs/other.md',
    });
  });

  it('strips query strings and fragments, and decodes percent-encoding', () => {
    expect(resolveLinkTarget('/docs/note.md', './sub/my%20file.md?x=1#y').target).toBe(
      '/docs/sub/my file.md'
    );
  });

  it('keeps absolute paths absolute', () => {
    expect(resolveLinkTarget('/docs/note.md', '/elsewhere/x.md').target).toBe('/elsewhere/x.md');
  });

  it('returns null for anchor-only and empty hrefs', () => {
    expect(resolveLinkTarget('/docs/note.md', '#section')).toBeNull();
    expect(resolveLinkTarget('/docs/note.md', '')).toBeNull();
  });

  it('returns null for malformed percent-encoding', () => {
    expect(resolveLinkTarget('/docs/note.md', '%zz.md')).toBeNull();
  });
});

describe('isMarkdownPath', () => {
  it('accepts markdown extensions case-insensitively', () => {
    expect(isMarkdownPath('/a/b.MD')).toBe(true);
    expect(isMarkdownPath('/a/b.markdown')).toBe(true);
    expect(isMarkdownPath('/a/b.txt')).toBe(true);
  });

  it('rejects other files', () => {
    expect(isMarkdownPath('/a/b.png')).toBe(false);
    expect(isMarkdownPath('/a/b')).toBe(false);
  });
});
