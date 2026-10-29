import { describe, it, expect } from 'vitest';
import { render } from '../src/renderer/src/markdown.js';

describe('markdown pipeline', () => {
  it('renders basic markdown', () => {
    const html = render('# Title\n\nSome **bold** text.');
    expect(html).toContain('<h1');
    expect(html).toContain('Title');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('highlights fenced code with Prism', () => {
    const html = render('```js\nconst x = 1;\n```');
    expect(html).toContain('language-javascript');
    expect(html).toContain('token');
  });

  it('resolves language aliases', () => {
    const html = render('```py\ndef f(): pass\n```');
    expect(html).toContain('language-python');
  });

  it('renders task lists as enabled checkboxes', () => {
    const html = render('- [ ] open\n- [x] done');
    expect(html).toContain('task-list-item-checkbox');
    expect(html).toContain('checked');
  });

  it('renders tables', () => {
    const html = render('| a | b |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders math with KaTeX', () => {
    const html = render('Euler: $e^{i\\pi} + 1 = 0$');
    expect(html).toContain('katex');
  });

  it('marks mermaid blocks for lazy rendering instead of highlighting', () => {
    const html = render('```mermaid\ngraph TD\nA-->B\n```');
    expect(html).toContain('mermaid-source');
    expect(html).not.toContain('language-mermaid');
  });

  it('renders footnotes', () => {
    const html = render('text[^1]\n\n[^1]: the note');
    expect(html).toContain('footnote');
  });

  it('strips script tags and event handlers', () => {
    const html = render('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('renders GitHub alerts as styled callouts', () => {
    const html = render('> [!WARNING]\n> Mind the gap');
    expect(html).toContain('markdown-alert markdown-alert-warning');
    expect(html).toContain('Warning');
    expect(html).toContain('<svg'); // icon survives sanitization
    expect(html).not.toContain('[!WARNING]');
  });

  it('leaves ordinary blockquotes alone', () => {
    const html = render('> just a quote');
    expect(html).toContain('<blockquote>');
    expect(html).not.toContain('markdown-alert');
  });

  it('renders [[toc]] with links that match heading anchors', () => {
    const html = render('[[toc]]\n\n# First Part\n\n## Second Part');
    expect(html).toContain('class="table-of-contents"');
    expect(html).toContain('href="#first-part"');
    expect(html).toContain('id="first-part"');
    expect(html).toContain('href="#second-part"');
    expect(html).toContain('id="second-part"');
    expect(html).not.toContain('[[toc]]');
  });

  it('never emits javascript: hrefs', () => {
    // markdown-it refuses the link outright, leaving literal text with no <a>
    const html = render('[click](javascript:alert(1))');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('<a');
  });
});
