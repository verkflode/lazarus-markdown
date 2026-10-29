import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createStore } from '../src/main/store.js';

describe('createStore', () => {
  let dir;
  let file;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lazarus-store-'));
    file = join(dir, 'state.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts empty when the file does not exist', () => {
    expect(createStore(file).all()).toEqual({});
  });

  it('starts empty when the file is corrupt', () => {
    writeFileSync(file, '{not json');
    expect(createStore(file).all()).toEqual({});
  });

  it('persists values across instances after flush', () => {
    const store = createStore(file);
    store.set('theme', 'dark');
    store.set('focusMode', true);
    store.flush();
    expect(createStore(file).all()).toEqual({ theme: 'dark', focusMode: 'true' });
  });

  it('removes a key set to null', () => {
    const store = createStore(file);
    store.set('theme', 'dark');
    store.set('theme', null);
    store.flush();
    expect(JSON.parse(readFileSync(file, 'utf-8'))).toEqual({});
  });

  it('leaves no temp file behind', () => {
    const store = createStore(file);
    store.set('a', '1');
    store.flush();
    expect(existsSync(`${file}.tmp`)).toBe(false);
  });
});
