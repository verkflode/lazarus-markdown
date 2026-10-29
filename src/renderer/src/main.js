import 'katex/dist/katex.min.css';
import './styles.css';
import './preview.css';
import previewCssRaw from './preview.css?raw';

import { createEditor } from './editor.js';
import { createPreview } from './preview.js';
import { createSidebar } from './sidebar.js';
import { createTabs } from './tabs.js';
import { createQuickOpen, flattenTree } from './quickopen.js';
import { commands as formatCommands } from './formatting.js';

// ---------------------------------------------------------------------------
// 1. Theme — resolved before anything renders so there's no flash
// ---------------------------------------------------------------------------
const savedTheme = window.api.store.get('theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let theme = savedTheme || (systemDark ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;

// ---------------------------------------------------------------------------
// 2. Editor
// ---------------------------------------------------------------------------
const editor = createEditor(document.getElementById('editor'), {
  theme,
  onChange: handleContentChange,
  onCursor: ({ line, col }) => {
    statusCursor.textContent = `Ln ${line}, Col ${col}`;
  },
});

// Writing modes, restored from last session
let focusMode = window.api.store.get('focusMode') === 'true';
let typewriterMode = window.api.store.get('typewriterMode') === 'true';
if (focusMode) editor.setFocusMode(true);
if (typewriterMode) editor.setTypewriter(true);

function toggleFocusMode() {
  focusMode = !focusMode;
  window.api.store.set('focusMode', String(focusMode));
  editor.setFocusMode(focusMode);
  updateModeIndicators();
}

function toggleTypewriter() {
  typewriterMode = !typewriterMode;
  window.api.store.set('typewriterMode', String(typewriterMode));
  editor.setTypewriter(typewriterMode);
  updateModeIndicators();
}

function updateModeIndicators() {
  statusFocus.hidden = !focusMode;
  statusTypewriter.hidden = !typewriterMode;
}

// ---------------------------------------------------------------------------
// 3. Preview
// ---------------------------------------------------------------------------
const preview = createPreview(document.getElementById('preview'), {
  getTheme: () => theme,
  getBasePath: () => tabs.active()?.path,
  onTaskToggle: toggleTaskInSource,
  onOpenLink: openLinkedFile,
});

// ---------------------------------------------------------------------------
// 4. Sidebar
// ---------------------------------------------------------------------------
const sidebar = createSidebar({
  onOpenFile: (path) => openPath(path),
  onGoToLine: (line) => editor.goToLine(line),
});

// ---------------------------------------------------------------------------
// 5. Tabs — each tab owns its EditorState, scroll position, and dirty flag
// ---------------------------------------------------------------------------
const tabs = createTabs(document.getElementById('tabbar'), {
  onSwitch(oldTab, newTab) {
    if (oldTab) {
      oldTab.scrollTop = editor.scrollDOM.scrollTop;
    }
    if (!newTab) {
      tabs.add({}); // last tab closed; always keep one open
      return;
    }
    const nextState = newTab.state ?? editor.createState(newTab.content);
    const previousState = editor.swapState(nextState);
    if (oldTab) oldTab.state = previousState;
    newTab.state = null; // now live in the view; captured again on next switch
    editor.scrollDOM.scrollTop = newTab.scrollTop;
    refreshDerivedUI(newTab);
    editor.focus();
    schedulePersistSession();
  },
  onAdd: () => schedulePersistSession(),
  onClose: (tab) => {
    if (tab.path) window.api.unwatchFile(tab.path);
    schedulePersistSession();
  },
  canClose: async (tab) => {
    if (!tab.dirty) return true;
    const result = await window.api.confirm({
      message: `"${tab.name}" has unsaved changes.`,
      detail: 'Close the tab and discard them?',
      buttons: ['Discard Changes', 'Cancel'],
      cancelId: 1,
    });
    return result.choice === 0;
  },
});

// ---------------------------------------------------------------------------
// 5b. Session + recent files — persisted via main (state.json), restored on launch
// ---------------------------------------------------------------------------
const SESSION_KEY = 'lazarus-session';
const RECENT_KEY = 'lazarus-recent';
const MAX_SESSION_BYTES = 4_000_000;

let currentFolderPath = null;
let recentPaths = [];
try {
  const stored = JSON.parse(window.api.store.get(RECENT_KEY) || '[]');
  if (Array.isArray(stored)) recentPaths = stored.filter((p) => typeof p === 'string');
} catch {
  recentPaths = [];
}

function noteRecent(path) {
  if (!path) return;
  recentPaths = [path, ...recentPaths.filter((p) => p !== path)].slice(0, 10);
  try {
    window.api.store.set(RECENT_KEY, JSON.stringify(recentPaths));
  } catch {
    // storage full/blocked — recents are best-effort
  }
}

let sessionTimer = null;
function schedulePersistSession() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(persistSession, 300);
}

function persistSession() {
  const active = tabs.active();
  const payload = {
    folderPath: currentFolderPath,
    activePath: active?.path || null,
    tabs: tabs.list().map((t) => ({
      path: t.path,
      name: t.name,
      scrollTop: Math.round(t === active ? editor.scrollDOM.scrollTop : t.scrollTop),
      // Untitled tabs have no file on disk; keep their text so nothing is lost.
      // File tabs are re-read from disk on restore.
      content: t.path ? undefined : t.content,
    })),
  };
  let json = JSON.stringify(payload);
  if (json.length > MAX_SESSION_BYTES) {
    // Too big to persist: drop unsaved untitled text rather than fail
    payload.tabs = payload.tabs.map((t) => ({ ...t, content: undefined }));
    json = JSON.stringify(payload);
  }
  try {
    window.api.store.set(SESSION_KEY, json);
  } catch {
    // storage full/blocked — session restore is best-effort
  }
}

async function restoreSession() {
  let session = null;
  try {
    session = JSON.parse(window.api.store.get(SESSION_KEY) || 'null');
  } catch {
    return;
  }
  if (!session || !Array.isArray(session.tabs) || session.tabs.length === 0) return;

  if (session.folderPath) {
    try {
      const tree = await window.api.readFolderTree(session.folderPath);
      if (tree && tree.length > 0) {
        currentFolderPath = session.folderPath;
        sidebar.showFolder(tree);
        folderFiles = flattenTree(tree);
      }
    } catch {
      // folder no longer exists — skip it
    }
  }

  const restored = [];
  for (const saved of session.tabs) {
    let tab = null;
    if (saved.path) {
      try {
        tab = openInTab(await window.api.readFile(saved.path));
      } catch {
        // file no longer exists — skip it
      }
    } else {
      tab = tabs.add({ name: saved.name || 'Untitled', content: saved.content || '' });
    }
    if (tab) restored.push([tab, saved.scrollTop || 0]);
  }
  for (const [tab, scrollTop] of restored) tab.scrollTop = scrollTop;
  if (session.activePath) {
    const active = tabs.findByPath(session.activePath);
    if (active) tabs.activate(active.id);
  }
  // Apply the restored scroll offset once layout has settled
  requestAnimationFrame(() => {
    const active = tabs.active();
    if (active) editor.scrollDOM.scrollTop = active.scrollTop;
  });
}

// ---------------------------------------------------------------------------
// 6. Quick open — folder files plus recently opened files
// ---------------------------------------------------------------------------
let folderFiles = [];

function quickOpenFiles() {
  const seen = new Set();
  const out = [];
  for (const p of recentPaths) {
    seen.add(p);
    out.push({ name: p.slice(p.lastIndexOf('/') + 1), path: p });
  }
  for (const f of folderFiles) {
    if (!seen.has(f.path)) {
      seen.add(f.path);
      out.push(f);
    }
  }
  return out;
}

const quickOpen = createQuickOpen({
  getFiles: quickOpenFiles,
  onPick: (path) => openPath(path),
});

// ---------------------------------------------------------------------------
// 7. Status bar
// ---------------------------------------------------------------------------
const statusWords = document.getElementById('status-words');
const statusChars = document.getElementById('status-chars');
const statusCursor = document.getElementById('status-cursor');
const statusPath = document.getElementById('status-path');
const statusFocus = document.getElementById('status-focus');
const statusTypewriter = document.getElementById('status-typewriter');
statusFocus.addEventListener('click', () => toggleFocusMode());
statusTypewriter.addEventListener('click', () => toggleTypewriter());

function countWords(content) {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~-]/g, ' ');
  return plain.split(/\s+/).filter(Boolean).length;
}

function updateStatus(content) {
  statusWords.textContent = `${countWords(content)} words`;
  statusChars.textContent = `${content.length} characters`;
  statusPath.textContent = tabs.active()?.path || '';
}

// ---------------------------------------------------------------------------
// Content flow: editor → active tab → preview + outline + status + title
// ---------------------------------------------------------------------------
function handleContentChange(content) {
  const tab = tabs.active();
  if (!tab) return;
  tab.content = content;
  const wasDirty = tab.dirty;
  tab.dirty = content !== tab.savedContent;
  preview.update(content);
  sidebar.updateOutline(content);
  updateStatus(content);
  if (tab.dirty !== wasDirty) {
    tabs.render();
    updateTitle();
  }
  schedulePersistSession();
}

function updateTitle() {
  const tab = tabs.active();
  if (!tab) return;
  document.getElementById('doc-title').textContent = `${tab.dirty ? '● ' : ''}${tab.name}`;
  document.title = `${tab.name}${tab.dirty ? ' — Edited' : ''}`;
  window.api.setDocState({ path: tab.path, dirty: tabs.anyDirty() });
}

function refreshDerivedUI(tab) {
  preview.renderNow(tab.content);
  sidebar.updateOutline(tab.content);
  sidebar.markActiveFile(tab.path);
  updateStatus(tab.content);
  updateTitle();
}

// ---------------------------------------------------------------------------
// File operations
// ---------------------------------------------------------------------------
function openInTab({ path, name, content }) {
  const existing = path && tabs.findByPath(path);
  if (existing) {
    tabs.activate(existing.id);
    return existing;
  }
  // Reuse a pristine (untitled, empty, unsaved) tab rather than stacking a new
  // one — otherwise every file-open leaves a stray "Untitled" behind
  const current = tabs.active();
  const pristine = current && !current.path && !current.dirty && current.content === '';
  const tab = tabs.add({ path, name, content });
  if (pristine) void tabs.close(current.id);
  if (path) noteRecent(path);
  schedulePersistSession();
  return tab;
}

async function openFile() {
  const result = await window.api.openFile();
  if (!result.canceled) openInTab(result);
}

async function openPath(path) {
  const existing = tabs.findByPath(path);
  if (existing) {
    tabs.activate(existing.id);
    return;
  }
  openInTab(await window.api.readFile(path));
}

/** A relative link clicked in the preview: resolve against the current file. */
async function openLinkedFile(href) {
  const tab = tabs.active();
  if (!tab?.path) return; // untitled document: nothing to resolve against
  const result = await window.api.openLink(tab.path, href);
  if (result.kind === 'markdown') {
    openPath(result.path);
  } else if (result.kind === 'missing') {
    statusPath.textContent = `Not found: ${result.path}`;
  }
}

async function openFolder() {
  const result = await window.api.openFolder();
  if (result.canceled) return;
  currentFolderPath = result.path;
  sidebar.showFolder(result.tree);
  folderFiles = flattenTree(result.tree);
  schedulePersistSession();
}

/** Save one tab; prompts for a path if it has none. Returns false on cancel. */
async function saveTab(tab) {
  if (!tab.path) {
    const suggested = tab.name.endsWith('.md') ? tab.name : `${tab.name}.md`;
    const result = await window.api.saveDialog(suggested);
    if (result.canceled) return false;
    tab.path = result.path;
    tab.name = result.name;
  }
  await window.api.writeFile(tab.path, tab.content);
  tab.savedContent = tab.content;
  tab.dirty = false;
  tab.externalChange = false;
  tabs.render();
  schedulePersistSession();
  if (tab === tabs.active()) {
    updateTitle();
    updateStatus(tab.content);
    sidebar.markActiveFile(tab.path);
  }
  return true;
}

async function saveFileAs() {
  const tab = tabs.active();
  const suggested = tab.name.endsWith('.md') ? tab.name : `${tab.name}.md`;
  const result = await window.api.saveDialog(suggested);
  if (result.canceled) return;
  tab.path = result.path;
  tab.name = result.name;
  await window.api.writeFile(tab.path, tab.content);
  tab.savedContent = tab.content;
  tab.dirty = false;
  tab.externalChange = false;
  tabs.render();
  schedulePersistSession();
  refreshDerivedUI(tab);
}

// ---------------------------------------------------------------------------
// Export (HTML and PDF share the same standalone document)
// ---------------------------------------------------------------------------
async function buildExportHTML() {
  const tab = tabs.active();
  const body = await preview.renderForExport(tab.content);
  // KaTeX CSS + fonts inlined as data URIs: the export is fully self-contained
  // (loaded lazily — the fonts are a few hundred KB)
  const { katexCssInlined } = await import('./katex-inline.js');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${tab.name}</title>
<style>${katexCssInlined()}</style>
<style>${previewCssRaw}
body { max-width: 820px; margin: 0 auto; padding: 2rem 1.5rem; }</style>
</head>
<body class="markdown-body">
${body}
</body>
</html>`;
}

const exportBaseName = () => tabs.active().name.replace(/\.(md|markdown)$/i, '');

async function exportHTML() {
  await window.api.exportHTML(await buildExportHTML(), `${exportBaseName()}.html`);
}

async function exportPDF() {
  await window.api.exportPDF(await buildExportHTML(), `${exportBaseName()}.pdf`);
}

// ---------------------------------------------------------------------------
// Task-list checkboxes: flip the nth checkbox marker in the source
// ---------------------------------------------------------------------------
function toggleTaskInSource(index, checked) {
  const content = editor.getContent();
  const pattern = /^(\s*(?:[-+*]|\d+[.)])\s+\[)[ xX](\])/gm;
  let match;
  let count = 0;
  while ((match = pattern.exec(content)) !== null) {
    if (count === index) {
      const markerPos = match.index + match[1].length;
      editor.view.dispatch({
        changes: { from: markerPos, to: markerPos + 1, insert: checked ? 'x' : ' ' },
      });
      return;
    }
    count += 1;
  }
}

// ---------------------------------------------------------------------------
// View modes and theme
// ---------------------------------------------------------------------------
const panes = document.getElementById('panes');
const VIEW_MODES = ['mode-editor', 'mode-split', 'mode-preview'];
const viewButtons = {
  'mode-editor': document.getElementById('btn-view-editor'),
  'mode-split': document.getElementById('btn-view-split'),
  'mode-preview': document.getElementById('btn-view-preview'),
};

function setViewMode(mode) {
  panes.className = mode;
  for (const [name, button] of Object.entries(viewButtons)) {
    button.classList.toggle('active', name === mode);
  }
}

function cycleViewMode() {
  const current = VIEW_MODES.indexOf(panes.className);
  setViewMode(VIEW_MODES[(current + 1) % VIEW_MODES.length]);
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  window.api.store.set('theme', theme);
  document.documentElement.dataset.theme = theme;
  editor.setTheme(theme);
  preview.renderNow(editor.getContent()); // re-render so mermaid picks up the theme
}

// ---------------------------------------------------------------------------
// Scroll sync. Each direction only fires on user-driven scrolling: the editor
// leads while focused or hovered, the preview leads only under the pointer.
// Programmatic scroll changes (preview re-renders, CodeMirror's own measure
// adjustments) must never echo into the other pane — that feedback is what
// restarts CodeMirror's measure loop.
// ---------------------------------------------------------------------------
const previewPane = document.getElementById('preview-pane');
const editorPane = document.getElementById('editor-pane');

let wheelPane = null;
let wheelExpiry = 0;
function markWheel(pane) {
  wheelPane = pane;
  wheelExpiry = performance.now() + 200;
}
editorPane.addEventListener('wheel', () => markWheel('editor'), { passive: true });
previewPane.addEventListener('wheel', () => markWheel('preview'), { passive: true });

function userIsScrolling(pane) {
  return wheelPane === pane && performance.now() < wheelExpiry;
}

function syncScroll(source, target) {
  const max = source.scrollHeight - source.clientHeight;
  if (max <= 0) return;
  const desired = (source.scrollTop / max) * (target.scrollHeight - target.clientHeight);
  if (Math.abs(target.scrollTop - desired) < 2) return;
  target.scrollTop = desired;
}

editor.scrollDOM.addEventListener(
  'scroll',
  () => {
    if (userIsScrolling('editor') || (editor.view.hasFocus && !userIsScrolling('preview'))) {
      syncScroll(editor.scrollDOM, previewPane);
    }
  },
  { passive: true }
);
previewPane.addEventListener(
  'scroll',
  () => {
    if (userIsScrolling('preview')) syncScroll(previewPane, editor.scrollDOM);
  },
  { passive: true }
);

// ---------------------------------------------------------------------------
// Toolbar and menu wiring
// ---------------------------------------------------------------------------
document.getElementById('btn-sidebar').addEventListener('click', () => sidebar.toggle());
document.getElementById('btn-theme').addEventListener('click', toggleTheme);
document.getElementById('btn-open-folder').addEventListener('click', openFolder);
for (const [mode, button] of Object.entries(viewButtons)) {
  button.addEventListener('click', () => setViewMode(mode));
}

const menuActions = {
  new: () => tabs.add({}),
  open: openFile,
  'open-folder': openFolder,
  'quick-open': () => quickOpen.show(),
  save: () => saveTab(tabs.active()),
  'save-as': saveFileAs,
  'export-html': exportHTML,
  'export-pdf': exportPDF,
  find: () => editor.openSearch(),
  'toggle-sidebar': () => sidebar.toggle(),
  'cycle-view': cycleViewMode,
  'toggle-theme': toggleTheme,
  'toggle-focus': toggleFocusMode,
  'toggle-typewriter': toggleTypewriter,
  'close-tab': () => tabs.closeActive(),
  'next-tab': () => tabs.next(),
  'prev-tab': () => tabs.prev(),
  'save-and-close': async () => {
    for (const tab of tabs.list().filter((t) => t.dirty)) {
      if (!(await saveTab(tab))) return; // canceled a save dialog: abort close
    }
    window.api.closeWindow();
  },
};

function handleMenuAction(action) {
  if (action.startsWith('format:')) {
    const [, command, arg] = action.split(':');
    formatCommands[command]?.(editor.view, arg ? Number(arg) : undefined);
    return;
  }
  menuActions[action]?.();
}

window.api.onMenu(handleMenuAction);

// Debug/E2E hook: native menu accelerators can't be triggered from DevTools
// protocol probes, so expose the same dispatch surface the menu uses.
window.__lazarus = {
  menu: handleMenuAction,
  async openFolderPath(path) {
    const tree = await window.api.readFolderTree(path);
    currentFolderPath = path;
    sidebar.showFolder(tree);
    folderFiles = flattenTree(tree);
    schedulePersistSession();
  },
};

// ⌘⇧[ / ⌘⇧] tab switching (menu covers ⌃Tab)
window.addEventListener('keydown', (event) => {
  if (event.metaKey && event.shiftKey && (event.key === '[' || event.key === ']')) {
    event.key === ']' ? tabs.next() : tabs.prev();
    event.preventDefault();
  }
});

// External file changes: refresh clean tabs, flag dirty ones with a badge
window.api.onFileChangedExternally(async (path) => {
  const tab = tabs.findByPath(path);
  if (!tab) return;
  if (tab.dirty) {
    tab.externalChange = true;
    tabs.render();
    if (tab === tabs.active()) statusPath.textContent = `${tab.path} — changed on disk`;
    return;
  }
  const result = await window.api.readFile(path);
  tab.savedContent = result.content;
  tab.content = result.content;
  tab.externalChange = false;
  if (tab === tabs.active()) {
    editor.setContent(result.content);
    refreshDerivedUI(tab);
  } else {
    tab.state = null; // stale; rebuilt from content on next activation
  }
  schedulePersistSession();
});

// Open files launched from Finder (double-click, "Open With", drag onto icon)
window.api.onOpenFilePath((path) => openPath(path));

// Drag & drop: dropping markdown files onto the window opens them in tabs
window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => {
  event.preventDefault();
  for (const file of event.dataTransfer?.files ?? []) {
    const path = window.api.pathForFile(file);
    if (/\.(md|markdown|mdown|mkd|txt)$/i.test(path)) openPath(path);
  }
});

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------
updateModeIndicators();

// Restore the previous session (tabs, folder, scroll); fall back to one empty tab
restoreSession().finally(() => {
  if (tabs.list().length === 0) tabs.add({});
  // Tell main we're wired up, so any files buffered during a cold launch flush now
  window.api.signalReady();
});
