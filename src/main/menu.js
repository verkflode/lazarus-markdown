import { app, Menu } from 'electron';

export function buildMenu(send) {
  const isMac = process.platform === 'darwin';

  const heading = (level) => ({
    label: `Heading ${level}`,
    accelerator: `CmdOrCtrl+${level}`,
    click: () => send(`format:heading:${level}`),
  });

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { type: 'separator' },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { label: 'Open Folder…', accelerator: 'CmdOrCtrl+Shift+O', click: () => send('open-folder') },
        { label: 'Quick Open…', accelerator: 'CmdOrCtrl+P', click: () => send('quick-open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-as') },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            { label: 'Export as HTML…', click: () => send('export-html') },
            { label: 'Export as PDF…', click: () => send('export-pdf') },
          ],
        },
        { type: 'separator' },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => send('close-tab') },
        ...(isMac ? [] : [{ type: 'separator' }, { role: 'quit' }]),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: () => send('find') },
      ],
    },
    {
      label: 'Format',
      submenu: [
        { label: 'Bold', accelerator: 'CmdOrCtrl+B', click: () => send('format:bold') },
        { label: 'Italic', accelerator: 'CmdOrCtrl+I', click: () => send('format:italic') },
        { label: 'Strikethrough', accelerator: 'CmdOrCtrl+Shift+X', click: () => send('format:strikethrough') },
        { label: 'Inline Code', accelerator: 'CmdOrCtrl+E', click: () => send('format:code') },
        { label: 'Link', accelerator: 'CmdOrCtrl+K', click: () => send('format:link') },
        { type: 'separator' },
        heading(1),
        heading(2),
        heading(3),
        heading(4),
        heading(5),
        heading(6),
        { type: 'separator' },
        { label: 'List', accelerator: 'CmdOrCtrl+Shift+L', click: () => send('format:list') },
        { label: 'Task List', accelerator: 'CmdOrCtrl+Shift+T', click: () => send('format:task') },
        { label: 'Blockquote', accelerator: 'CmdOrCtrl+Shift+.', click: () => send('format:quote') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+\\', click: () => send('toggle-sidebar') },
        { label: 'Toggle Preview', accelerator: 'CmdOrCtrl+Shift+P', click: () => send('cycle-view') },
        { label: 'Toggle Dark Mode', accelerator: 'CmdOrCtrl+Shift+D', click: () => send('toggle-theme') },
        { type: 'separator' },
        { label: 'Focus Mode', accelerator: 'CmdOrCtrl+Shift+F', click: () => send('toggle-focus') },
        { label: 'Typewriter Scrolling', accelerator: 'CmdOrCtrl+Shift+Y', click: () => send('toggle-typewriter') },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL
          ? [{ type: 'separator' }, { role: 'toggleDevTools' }]
          : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Next Tab', accelerator: 'Control+Tab', click: () => send('next-tab') },
        { label: 'Previous Tab', accelerator: 'Control+Shift+Tab', click: () => send('prev-tab') },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
