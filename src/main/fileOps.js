import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { readFile, writeFile, readdir, stat, mkdtemp, rm } from 'fs/promises';
import { watch } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import {
  MARKDOWN_EXTENSIONS,
  detectAndDecode,
  isMarkdownPath,
  resolveLinkTarget,
} from './fileUtils.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', '.svn', 'dist', 'out', 'build']);
const MAX_TREE_DEPTH = 6;

// One watcher per open file, so every tab reloads on external changes —
// not just the most recently opened one.
const watchers = new Map(); // filePath -> FSWatcher
let watcherWebContents = null;

function closeWatcher(filePath) {
  const watcher = watchers.get(filePath);
  if (watcher) {
    watchers.delete(filePath);
    watcher.close();
  }
}

function watchFile(filePath, webContents) {
  if (!filePath || webContents.isDestroyed()) return;
  // One teardown hook per webContents: when the window dies, all watchers die,
  // otherwise they outlive the window and fire into a destroyed target.
  if (watcherWebContents !== webContents) {
    watcherWebContents = webContents;
    webContents.once('destroyed', () => {
      for (const watcher of watchers.values()) watcher.close();
      watchers.clear();
      watcherWebContents = null;
    });
  }
  closeWatcher(filePath);
  try {
    let debounce = null;
    const watcher = watch(filePath, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (!webContents.isDestroyed()) {
          webContents.send('file:changed-externally', filePath);
        }
      }, 300);
    });
    watcher.on('error', () => {
      clearTimeout(debounce);
      closeWatcher(filePath);
    });
    watchers.set(filePath, watcher);
  } catch {
    // File may have been deleted or be on a volume that doesn't support watching
  }
}

/** Read a file, detecting encoding so non-UTF-8 documents still open cleanly. */
async function readTextFile(filePath) {
  const { content, encoding } = detectAndDecode(await readFile(filePath));
  return { content, encoding };
}

/** Build a nested tree of markdown files and directories. */
async function readTree(dirPath, depth = 0) {
  if (depth > MAX_TREE_DEPTH) return [];
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const nodes = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await readTree(fullPath, depth + 1);
      if (children.length > 0) {
        nodes.push({ name: entry.name, path: fullPath, type: 'dir', children });
      }
    } else if (isMarkdownPath(entry.name)) {
      nodes.push({ name: entry.name, path: fullPath, type: 'file' });
    }
  }
  nodes.sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1
  );
  return nodes;
}

export function registerFileOps(getWindow) {
  ipcMain.handle('dialog:open', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'mkd', 'txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const filePath = result.filePaths[0];
    const { content, encoding } = await readTextFile(filePath);
    watchFile(filePath, getWindow().webContents);
    return { canceled: false, path: filePath, name: basename(filePath), content, encoding };
  });

  ipcMain.handle('dialog:open-folder', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const folderPath = result.filePaths[0];
    const tree = await readTree(folderPath);
    return { canceled: false, path: folderPath, name: basename(folderPath), tree };
  });

  ipcMain.handle('dialog:save', async (_event, suggestedName) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      defaultPath: suggestedName || 'Untitled.md',
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    return { canceled: false, path: result.filePath, name: basename(result.filePath) };
  });

  // Native, non-blocking confirm dialog (window.confirm blocks the renderer)
  ipcMain.handle('dialog:confirm', async (event, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showMessageBox(win, {
      type: 'warning',
      message: options.message || 'Are you sure?',
      detail: options.detail || '',
      buttons: options.buttons || ['OK', 'Cancel'],
      defaultId: 0,
      cancelId: options.cancelId ?? (options.buttons?.length ?? 2) - 1,
    });
    return { choice: result.response };
  });

  ipcMain.handle('file:read', async (_event, filePath) => {
    const { content, encoding } = await readTextFile(filePath);
    watchFile(filePath, getWindow().webContents);
    return { path: filePath, name: basename(filePath), content, encoding };
  });

  // Stop watching a file (e.g. its tab was closed)
  ipcMain.handle('file:unwatch', (_event, filePath) => {
    closeWatcher(filePath);
    return { ok: true };
  });

  ipcMain.handle('file:write', async (_event, filePath, content) => {
    // Suspend the watcher so our own save doesn't echo back as an external change
    closeWatcher(filePath);
    await writeFile(filePath, content, 'utf-8');
    watchFile(filePath, getWindow().webContents);
    return { ok: true };
  });

  ipcMain.handle('folder:tree', async (_event, folderPath) => readTree(folderPath));

  // A link clicked in the preview: resolve it against the document's location.
  // Markdown files are returned for the renderer to open in a tab; anything
  // else that exists opens in its default app.
  ipcMain.handle('link:open', async (_event, basePath, href) => {
    const resolved = resolveLinkTarget(basePath, href);
    if (!resolved) return { kind: 'none' };
    const { target } = resolved;
    try {
      await stat(target);
    } catch {
      return { kind: 'missing', path: target };
    }
    if (isMarkdownPath(target)) {
      return { kind: 'markdown', path: target };
    }
    await shell.openPath(target);
    return { kind: 'external', path: target };
  });

  ipcMain.handle('export:html', async (_event, html, suggestedName) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      defaultPath: suggestedName || 'export.html',
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await writeFile(result.filePath, html, 'utf-8');
    return { canceled: false, path: result.filePath };
  });

  // PDF: render the standalone export HTML in a hidden window and print it.
  // Native printToPDF — no bundled second browser required.
  ipcMain.handle('export:pdf', async (_event, html, suggestedName) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      defaultPath: suggestedName || 'export.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    // Load from a temp file, not a data: URL — Chromium caps data: navigations
    // at ~2MB, which large documents with inlined fonts would exceed.
    const dir = await mkdtemp(join(tmpdir(), 'lazarus-export-'));
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true },
    });
    try {
      await writeFile(join(dir, 'export.html'), html, 'utf-8');
      await printWindow.loadFile(join(dir, 'export.html'));
      // Wait for real readiness (webfonts + layout) instead of a fixed sleep
      await printWindow.webContents.executeJavaScript(
        'document.fonts.ready.then(() => undefined)'
      );
      const pdf = await printWindow.webContents.printToPDF({
        printBackground: true,
        margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
        pageSize: 'A4',
      });
      await writeFile(result.filePath, pdf);
      return { canceled: false, path: result.filePath };
    } finally {
      printWindow.destroy();
      await rm(dir, { recursive: true, force: true });
    }
  });
}
