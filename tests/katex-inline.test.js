import { describe, it, expect } from 'vitest';
import { inlineFontUrls } from '../src/renderer/src/katex-inline.js';

describe('inlineFontUrls', () => {
  const sample =
    "@font-face{font-family:'KaTeX_AMS';src:url(fonts/KaTeX_AMS-Regular.woff2) format('woff2')," +
    "url(fonts/KaTeX_AMS-Regular.woff) format('woff'),url(fonts/KaTeX_AMS-Regular.ttf) format('truetype')}";

  it('embeds woff2 fonts as data URIs and leaves no relative font urls', () => {
    const css = inlineFontUrls(sample);
    expect(css).toContain('data:font/woff2;base64,');
    expect(css).not.toMatch(/url\((['"]?)fonts\//);
    expect(css).toContain("font-family:'KaTeX_AMS'");
  });

  it('points woff/ttf fallbacks at the same embedded font', () => {
    const css = inlineFontUrls(sample);
    // all three src entries resolve to the same data URI
    const urls = css.match(/url\((data:font\/woff2;base64,[^)]+)\)/g);
    expect(urls).toHaveLength(3);
    expect(new Set(urls).size).toBe(1);
  });

  it('leaves unknown font references untouched', () => {
    const css = inlineFontUrls("a{background:url(fonts/Unknown.woff2)}");
    expect(css).toContain('url(fonts/Unknown.woff2)');
  });
});
