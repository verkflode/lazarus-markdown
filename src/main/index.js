import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { registerFileOps } from './fileOps.js';
import { buildMenu } from './menu.js';
import { createStore } from './store.js';

let mainWindow = null;
let documentDirty = false;

// Files to open that arrived before the renderer was ready to receive them.
// macOS delivers open-file very early on a cold launch (double-click / "Open
// With"), often before the window — even before app 'ready' — so we buffer.
let rendererReady = false;
const pendingFiles = [];

function hasLiveWindow() {
  return mainWindow && !mainWindow.isDestroyed();
}

function deliverFile(path) {
  if (rendererReady && hasLiveWindow()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send('open-file-path', path);
    return;
  }
  // Renderer not ready, or the window was closed (macOS keeps the app alive
  // with no window). Buffer the path and (re)create a window to flush into.
  pendingFiles.push(path);
  if (app.isReady() && !hasLiveWindow()) createWindow();
}

// Register before app 'ready' so cold-launch file opens aren't missed.
app.on('open-file', (event, path) => {
  event.preventDefault();
  deliverFile(path);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 700,
    minHeight: 450,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 16 },
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // A closed window leaves a destroyed object behind; forget it so open-file
  // and activate recreate a fresh one instead of poking a dead reference
  mainWindow.on('closed', () => {
    mainWindow = null;
    rendererReady = false;
  });

  // Open external links in the default browser, never in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Dev server reloads are fine; everything else must not take over the window.
    // A dropped file (file:) becomes a tab instead of navigating the window.
    if (url.startsWith('http://localhost') || url.startsWith('https://localhost')) return;
    event.preventDefault();
    if (url.startsWith('file:')) {
      try {
        deliverFile(fileURLToPath(url));
      } catch {
        // not a valid file URL — ignore
      }
    } else if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
  });

  // Confirm before closing with unsaved changes
  mainWindow.on('close', (event) => {
    if (!documentDirty) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      message: 'Do you want to save the changes you made?',
      detail: "Your changes will be lost if you don't save them.",
    });
    if (choice === 2) {
      event.preventDefault();
    } else if (choice === 0) {
      event.preventDefault();
      mainWindow.webContents.send('menu', 'save-and-close');
    }
    // choice === 1: close without saving
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerFileOps(() => mainWindow);
  buildMenu((action) => {
    if (hasLiveWindow()) mainWindow.webContents.send('menu', action);
  });

  // Renderer keeps main informed so the title bar and close dialog stay honest
  ipcMain.on('doc:state', (_event, { path, dirty }) => {
    documentDirty = dirty;
    if (!hasLiveWindow()) return;
    if (path) mainWindow.setRepresentedFilename(path);
    mainWindow.setDocumentEdited(dirty);
  });

  ipcMain.on('app:close-window', () => {
    documentDirty = false;
    mainWindow?.close();
  });

  // Renderer is wired up and can receive file-open requests; flush the buffer.
  ipcMain.on('app:renderer-ready', () => {
    rendererReady = true;
    const queued = pendingFiles.splice(0);
    for (const path of queued) deliverFile(path);
  });

  createWindow();

  // Windows/Linux pass the file path as a launch argument instead of open-file
  if (process.platform !== 'darwin') {
    const fileArg = process.argv.slice(1).find((arg) => /\.(md|markdown|mdown|mkd)$/i.test(arg));
    if (fileArg) deliverFile(fileArg);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Session, recents and preferences. Preload loads them synchronously so the
// renderer can apply the theme before first paint.
const store = createStore(join(app.getPath('userData'), 'state.json'));
ipcMain.on('store:load', (event) => {
  event.returnValue = store.all();
});
ipcMain.on('store:set', (_event, key, value) => store.set(key, value));
app.on('will-quit', () => store.flush());
