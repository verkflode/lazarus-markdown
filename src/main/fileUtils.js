/**
 * Pure file helpers, kept separate from fileOps.js (which imports Electron)
 * so they can be unit-tested in plain Node.
 */
import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import { dirname, extname, isAbsolute, resolve } from 'path';

export const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdown', '.mkd', '.txt']);

export const isMarkdownPath = (filePath) =>
  MARKDOWN_EXTENSIONS.has(extname(filePath).toLowerCase());

/** Detect a buffer's encoding and decode it; UTF-8 (incl. ASCII) passes through. */
export function detectAndDecode(buffer) {
  const detected = jschardet.detect(buffer);
  const encoding = (detected.encoding || 'utf-8').toLowerCase();
  const confident = detected.confidence > 0.9;
  if (confident && encoding !== 'utf-8' && encoding !== 'ascii' && iconv.encodingExists(encoding)) {
    return { content: iconv.decode(buffer, encoding), encoding };
  }
  return { content: buffer.toString('utf-8'), encoding: 'utf-8' };
}

/**
 * Resolve a link href from a markdown document to an absolute file path.
 * Returns { relPath, target }, or null for empty / anchor-only hrefs.
 */
export function resolveLinkTarget(basePath, href) {
  let relPath;
  try {
    relPath = decodeURIComponent(href.split(/[?#]/)[0]);
  } catch {
    return null; // malformed percent-encoding
  }
  if (!relPath) return null;
  const target = isAbsolute(relPath) ? relPath : resolve(dirname(basePath), relPath);
  return { relPath, target };
}
