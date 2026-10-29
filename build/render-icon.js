// Rasterize build/icon.svg to a full macOS .iconset using Electron's renderer,
// then the caller runs `iconutil` to produce icon.icns. No native image deps.
const { app, BrowserWindow } = require('electron');
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const svg = readFileSync(join(__dirname, 'icon.svg'), 'utf-8');
const iconsetDir = join(__dirname, 'icon.iconset');
mkdirSync(iconsetDir, { recursive: true });

// Exact pixel dimensions macOS expects for each iconset entry
const OUTPUTS = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024],
];

const htmlPath = join(iconsetDir, '_render.html');
writeFileSync(
  htmlPath,
  `<!doctype html><html><head><style>
    html,body{margin:0;padding:0;background:transparent}
    svg{display:block;width:100vw;height:100vh}
  </style></head><body>${svg}</body></html>`
);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 512, // ×2 on Retina => a 1024px master capture
    height: 512,
    show: false,
    frame: false, // no title bar stealing height — keep the capture square
    useContentSize: true,
    webPreferences: { sandbox: true, zoomFactor: 1 },
  });
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 300));

  const master = await win.webContents.capturePage();
  win.destroy();

  for (const [name, px] of OUTPUTS) {
    const resized = master.resize({ width: px, height: px, quality: 'best' });
    writeFileSync(join(iconsetDir, name), resized.toPNG());
  }
  console.log('ICONSET_DONE master=' + JSON.stringify(master.getSize()));
  app.quit();
});
