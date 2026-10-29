// Persistent key/value state (session, recent files, theme, writing modes),
// kept in a JSON file in userData. Chromium's localStorage isn't reliably
// written to disk for file:// pages, so the renderer goes through this instead.
import { readFileSync, writeFileSync, renameSync } from 'fs';

const WRITE_DELAY_MS = 500;

export function createStore(filePath) {
  let data = {};
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
  } catch {
    // missing or corrupt file — start empty
  }

  let timer = null;

  function flush() {
    clearTimeout(timer);
    timer = null;
    try {
      // Write-then-rename so a crash mid-write never leaves a truncated file
      const tmp = `${filePath}.tmp`;
      writeFileSync(tmp, JSON.stringify(data));
      renameSync(tmp, filePath);
    } catch {
      // disk full/read-only — state is best-effort
    }
  }

  return {
    all: () => ({ ...data }),
    set(key, value) {
      if (value === null || value === undefined) delete data[key];
      else data[key] = String(value);
      clearTimeout(timer);
      timer = setTimeout(flush, WRITE_DELAY_MS);
    },
    flush,
  };
}
