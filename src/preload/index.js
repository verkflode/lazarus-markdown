import { contextBridge, ipcRenderer, webUtils } from 'electron';

// Persistent state lives in main; a local copy keeps reads synchronous
const stored = ipcRenderer.sendSync('store:load') || {};

contextBridge.exposeInMainWorld('api', {
  // Persistent key/value state (string values, like localStorage)
  store: {
    get: (key) => stored[key] ?? null,
    set: (key, value) => {
      stored[key] = String(value);
      ipcRenderer.send('store:set', key, value);
    },
  },

  // File dialogs and IO
  openFile: () => ipcRenderer.invoke('dialog:open'),
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  saveDialog: (suggestedName) => ipcRenderer.invoke('dialog:save', suggestedName),
  readFile: (path) => ipcRenderer.invoke('file:read', path),
  writeFile: (path, content) => ipcRenderer.invoke('file:write', path, content),
  unwatchFile: (path) => ipcRenderer.invoke('file:unwatch', path),
  confirm: (options) => ipcRenderer.invoke('dialog:confirm', options),
  readFolderTree: (path) => ipcRenderer.invoke('folder:tree', path),
  // Dropped File objects no longer carry .path; resolve it here
  pathForFile: (file) => webUtils.getPathForFile(file),
  openLink: (basePath, href) => ipcRenderer.invoke('link:open', basePath, href),
  exportHTML: (html, suggestedName) => ipcRenderer.invoke('export:html', html, suggestedName),
  exportPDF: (html, suggestedName) => ipcRenderer.invoke('export:pdf', html, suggestedName),

  // Document state (title bar, dirty indicator, close confirmation)
  setDocState: (state) => ipcRenderer.send('doc:state', state),
  closeWindow: () => ipcRenderer.send('app:close-window'),

  // Signal that the renderer is wired and can receive file-open requests
  signalReady: () => ipcRenderer.send('app:renderer-ready'),

  // Events from main
  onMenu: (callback) => ipcRenderer.on('menu', (_event, action) => callback(action)),
  onFileChangedExternally: (callback) =>
    ipcRenderer.on('file:changed-externally', (_event, path) => callback(path)),
  onOpenFilePath: (callback) =>
    ipcRenderer.on('open-file-path', (_event, path) => callback(path)),
});
