// X11 prototype: boots scripts/x11-test/alpine-x11.ext2 and shows Xorg + twm on
// a canvas through CheerpX's KMS framebuffer. Standalone on purpose — it never
// touches src/webvm/vm.ts, so the site's VM stays exactly as it is.
//
// Served at /x11 by the dev server (vite.config.ts). Timings land on
// window.x11 (and on screen) for scripts/x11-test/run.mjs.
import { loadCheerpX } from '../../src/webvm/loadCheerpX';
import type { CheerpXLinux } from '../../src/webvm/loadCheerpX';

// Not in our CheerpX typings: only this prototype uses them. Signatures follow
// upstream WebVM (src/lib/WebVM.svelte), which drives the same 1.2.x API.
type Cx = CheerpXLinux & {
  setKmsCanvas(canvas: HTMLCanvasElement, width: number, height: number): void;
  setActivateConsole(fn: (vt: number) => void): void;
};

const WIDTH = 1024;
const HEIGHT = 768;

const t0 = performance.now();
const timings: Record<string, number> = {};
const report = { timings, probe: '', xlog: '', vts: [] as number[], error: '' };
(window as unknown as { x11: typeof report }).x11 = report;

const statusEl = document.getElementById('status')!;
const consoleEl = document.getElementById('console')!;
const canvas = document.getElementById('display') as HTMLCanvasElement;

function mark(name: string): void {
  timings[name] = Math.round(performance.now() - t0);
  statusEl.textContent = Object.entries(timings)
    .map(([k, v]) => `${k} ${(v / 1000).toFixed(1)}s`)
    .join('  ·  ');
}

const decoder = new TextDecoder();

async function main(): Promise<void> {
  const CheerpX = await loadCheerpX();
  const block = await CheerpX.HttpBytesDevice.create('/x11/alpine.ext2');
  // Fresh store name per build would matter if this shipped; it doesn't.
  const overlay = await CheerpX.OverlayDevice.create(block, await CheerpX.IDBDevice.create('x11-proto-overlay'));
  const out = await CheerpX.IDBDevice.create('x11-proto-out');

  const cx = (await CheerpX.Linux.create({
    mounts: [
      { type: 'ext2', path: '/', dev: overlay },
      { type: 'devs', path: '/dev' },
      { type: 'devpts', path: '/dev/pts' },
      { type: 'proc', path: '/proc' },
      // How Xorg and evdev find the framebuffer and input devices.
      { type: 'sys', path: '/sys' },
      { type: 'dir', path: '/out', dev: out },
    ],
  })) as Cx;
  mark('kernel');

  // Text VTs go to the log pane, so X's startup errors are visible without a shell.
  cx.setCustomConsole((buf, vt) => {
    consoleEl.textContent += `${vt === 1 ? '' : `[vt${vt}] `}${decoder.decode(buf)}`;
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }, 100, 30);
  cx.setKmsCanvas(canvas, WIDTH, HEIGHT);
  cx.setActivateConsole((vt) => {
    report.vts.push(vt);
    mark(`vt${vt}`);
  });

  // Same RPC trick as src/webvm/vm.ts: output via the /out IDB mount.
  let seq = 0;
  const exec = async (cmd: string): Promise<string> => {
    const file = `/r${seq++}`;
    await cx.run('/bin/sh', ['-c', `{ ${cmd} ; } > /out${file} 2>&1`]);
    return (await out.readFileAsBlob(file)).text();
  };

  report.probe = await exec(
    'ls -l /dev/fb* /dev/dri /dev/input /dev/tty0 /dev/tty7; ' +
      'echo ---; cat /proc/bus/input/devices; ' +
      'echo ---; ls /sys/class/graphics /sys/class/input'
  );
  mark('probe');

  // Root, because Alpine's Xorg isn't setuid and there's no seatd/logind here.
  // xinit rather than startx: startx runs xauth, which rejects the display name
  // because CheerpX's hostname is empty. Not awaited: it returns when X exits.
  void cx.run('/bin/sh', ['-c', 'xinit /etc/X11/xinit/xinitrc -- /usr/bin/X :0 vt7 -nolisten tcp > /out/startx.log 2>&1'], {
    env: ['HOME=/root', 'USER=root', 'PATH=/usr/bin:/usr/sbin:/bin:/sbin', 'TERM=xterm'],
    cwd: '/root',
    uid: 0,
    gid: 0,
  });
  mark('xinit');

  // X is accepting clients once its socket exists.
  for (let i = 0; i < 240; i++) {
    if ((await exec('test -S /tmp/.X11-unix/X0 && echo up || true')).includes('up')) {
      mark('x-socket');
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  report.xlog = await exec('cat /out/startx.log; echo ---; grep -E "\\((EE|WW)\\)|evdev|event[01]" /var/log/Xorg.0.log');
  mark('done');
}

main().catch((err) => {
  report.error = String(err);
  statusEl.textContent = `FAILED: ${err}`;
});
