import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { vm } from './vm';
import type { WindowContent } from '../types';

export class WebVmTerminal implements WindowContent {
  private statusEl!: HTMLElement;
  private termEl!: HTMLElement;
  private term!: Terminal;
  private fitAddon!: FitAddon;
  private resizeObserver!: ResizeObserver;
  private sendInput: ((keyCode: number) => void) | null = null;
  private lastOutByte = 0;

  mount(container: HTMLElement): void {
    container.innerHTML = `
      <div class="vm-status">Booting Linux (Alpine, x86)&hellip;</div>
      <div class="vm-console"></div>
    `;
    this.statusEl = container.querySelector('.vm-status')!;
    this.termEl = container.querySelector('.vm-console')!;

    this.term = new Terminal({ cursorBlink: true, fontFamily: 'monospace', fontSize: 14 });
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(this.termEl);
    this.applyFit();

    // The window can be resized (dragged edges, maximize) independently of
    // the browser viewport, so a plain 'resize' listener isn't enough. It also
    // fires when a hidden window is shown again, which is how the guest learns
    // its real size after booting off-screen.
    this.resizeObserver = new ResizeObserver(() => this.applyFit());
    this.resizeObserver.observe(this.termEl);

    const encoder = new TextEncoder();
    this.term.onData((data) => {
      if (!this.sendInput) return;
      for (const byte of encoder.encode(data)) this.sendInput(byte);
    });

    this.boot().catch((err) => {
      console.error('WebVM failed to boot', err);
      this.statusEl.textContent = 'Failed to start the VM — see browser console for details.';
      this.statusEl.classList.add('vm-status-error');
    });
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.term.dispose();
    // CheerpX has no documented teardown API — the VM's WASM/worker instance
    // keeps running until the tab unloads. Closing this window only detaches
    // the console DOM node, which is an accepted limitation here.
  }

  /**
   * Fit xterm to the window, but never against a zero-sized element: a window
   * that is hidden (mobile shows only the focused one) or minimized measures 0,
   * and fitting to that gives a ~10-column terminal. The guest is told its size
   * exactly once, at boot, so a bad fit there is permanent.
   *
   * ponytail: the guest keeps its boot dimensions — CheerpX 1.2.8 exposes no
   * resize call, and re-registering the console does not update the guest's
   * termios (verified). So a window resized after boot leaves xterm and the
   * guest disagreeing about width, and long lines wrap at the old column.
   * Upgrade path: a CheerpX version with a winsize API, or feed `stty cols N`
   * through the input channel if the stray prompt echo is acceptable.
   */
  private applyFit(): void {
    if (!this.termEl.clientWidth || !this.termEl.clientHeight) return;
    this.fitAddon.fit();
  }

  /**
   * CheerpX hands us the guest's bytes unprocessed: the guest termios says
   * `opost onlcr`, but nothing applies it, so a bare LF drops the cursor a row
   * without returning it to column 0 and every multi-line output staircases
   * across the screen. Do the translation here — the single point where guest
   * output reaches the terminal. Tracking the last byte across chunks keeps an
   * existing CRLF (vi, less, anything that emits its own CR) from doubling.
   */
  private writeCooked(buf: Uint8Array): void {
    const out = new Uint8Array(buf.length * 2);
    let n = 0;
    for (const byte of buf) {
      if (byte === 0x0a && this.lastOutByte !== 0x0d) out[n++] = 0x0d;
      out[n++] = byte;
      this.lastOutByte = byte;
    }
    this.term.write(out.subarray(0, n));
  }

  private async boot(): Promise<void> {
    const { cx } = await vm();

    this.statusEl.remove();

    // Fit once more right before registering: this is the guest's only chance
    // to learn its size. A window still hidden here keeps xterm's 80x24
    // default, which is at least a sane terminal.
    this.applyFit();
    this.sendInput = cx.setCustomConsole(
      // The console is shared by every VT; this window is the tty1 shell only.
      (buf, vt) => {
        if (vt === 1) this.writeCooked(buf);
      },
      this.term.cols,
      this.term.rows
    );
    this.term.focus();

    // setsid -c makes the console bash's controlling terminal. Without it, bash
    // can't initialise job control and greets every visitor with
    // "bash: initialize_job_control: no job control in background: Bad file
    // descriptor" before the banner.
    await cx.run('/usr/bin/setsid', ['-c', '/bin/bash', '--login'], {
      env: ['HOME=/home/user', 'USER=user', 'SHELL=/bin/bash', 'TERM=xterm', 'LANG=en_US.UTF-8'],
      cwd: '/home/user',
      uid: 1000,
      gid: 1000,
    });
  }
}
