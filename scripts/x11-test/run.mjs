// Drives the X11 prototype page in headless Chromium: boot timings, a device
// probe, screenshots, and whether keyboard and pointer input reach X.
// Screenshots go to shots/x11/. To use it by hand: `npm run dev`, open /x11.
//
// Runs the real Vite dev server (vite.config.ts), so this tests the same /x11
// route a person opens. Build the image first: ./scripts/webvm-image/build.sh x11
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const IMAGE = path.join(HERE, 'alpine-x11.ext2');
const OUT = path.join(REPO, 'shots/x11');

if (!fs.existsSync(IMAGE)) {
  console.error(`Missing ${IMAGE} — run scripts/webvm-image/build.sh x11 first.`);
  process.exit(1);
}

// Own port, so a running `npm run dev` on 5173 is left alone.
const PORT = 5199;
const server = await createServer({ root: REPO, server: { port: PORT, strictPort: true }, logLevel: 'warn' });
await server.listen();
try {
  await drive();
} finally {
  await server.close();
}

async function drive() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 820 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

  await page.goto(`http://localhost:${PORT}/x11`);
  // 8 minutes: a cold Xorg start pulls several MB of binaries through range requests.
  await page.waitForFunction(() => window.x11 && (window.x11.timings.done || window.x11.error), null, {
    timeout: 480_000,
  });
  const report = await page.evaluate(() => window.x11);
  console.log('timings (ms since page load):', report.timings);
  console.log('vt switches:', report.vts);
  if (report.error) console.log('ERROR:', report.error);
  console.log('--- probe\n' + report.probe);
  console.log('--- startx + Xorg (EE)/(WW)\n' + report.xlog);

  // Give twm and xterm time to map and paint after the socket appears.
  await page.waitForTimeout(20_000);
  await page.locator('#display').screenshot({ path: `${OUT}/01-desktop.png` });

  // Input: point at the xterm (twm focus follows the pointer), type, and time
  // how long until the canvas changes — a rough keystroke-to-pixel latency.
  const box = await page.locator('#display').boundingBox();
  await page.mouse.move(box.x + 200, box.y + 150);
  await page.mouse.click(box.x + 200, box.y + 150);
  await page.waitForTimeout(3000);
  const before = await page.locator('#display').screenshot();
  const typedAt = Date.now();
  await page.keyboard.type('echo typed-into-x11', { delay: 50 });
  let latency = null;
  for (let i = 0; i < 60; i++) {
    const now = await page.locator('#display').screenshot();
    if (!now.equals(before)) { latency = Date.now() - typedAt; break; }
    await page.waitForTimeout(250);
  }
  console.log('first pixel change after typing (ms, includes 50ms/key typing):', latency ?? 'none within 15s');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  await page.locator('#display').screenshot({ path: `${OUT}/02-typed.png` });

  // Pointer: drag xclock by its twm title bar (button 1 on a title = move).
  // It only lands where aimed if absolute coordinates and buttons both reach X.
  await page.mouse.move(box.x + 940, box.y + 26);
  await page.waitForTimeout(1000);
  await page.mouse.down();
  await page.mouse.move(box.x + 600, box.y + 500, { steps: 10 });
  await page.waitForTimeout(1000);
  await page.mouse.up();
  await page.waitForTimeout(3000);
  await page.locator('#display').screenshot({ path: `${OUT}/03-dragged.png` });
  await page.screenshot({ path: `${OUT}/04-page.png` });
  console.log(`screenshots: ${OUT}`);
  await browser.close();
}
