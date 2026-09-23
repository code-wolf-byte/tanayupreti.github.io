// Captures the POST overlay while it is still on screen. Must not wait for
// networkidle — the boot is the network activity.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const OUT = process.argv[2] ?? 'shots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5174/', { waitUntil: 'commit' });
for (const ms of [250, 600, 1200, 2500]) {
  await page.waitForTimeout(ms === 250 ? 250 : ms - (ms === 600 ? 250 : ms === 1200 ? 600 : 1200));
  await page.locator('.window').first().screenshot({ path: `${OUT}/boot-${ms}.png` }).catch(() => {});
}
// Let it finish and confirm the overlay is gone and the banner remains.
await page.waitForSelector('.vm-boot', { state: 'detached', timeout: 60000 });
await page.waitForTimeout(800);
await page.locator('.window').first().screenshot({ path: `${OUT}/boot-done.png` });
console.log('banner present:', await page.locator('.vm-banner').isVisible());
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
