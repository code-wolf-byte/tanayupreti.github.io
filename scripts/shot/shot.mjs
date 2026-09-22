import { chromium } from 'playwright';

const OUT = process.argv[2] ?? 'shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/01-desktop.png` });

await page.click('#taskbar-apps');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/02-appsmenu.png` });
await page.click('text=Projects');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/03-sdn.png` });

const win = page.locator('.window').last();
await win.screenshot({ path: `${OUT}/04-sdn-window.png` });
await page.click('.sdn-unit >> nth=2');
await page.waitForTimeout(300);
await win.screenshot({ path: `${OUT}/05-sdn-archived.png` });

await page.setViewportSize({ width: 620, height: 800 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-narrow.png` });

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
