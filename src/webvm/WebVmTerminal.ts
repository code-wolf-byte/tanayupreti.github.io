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
    this.fitAddon.fit();

    // The window can be resized (dragged edges, maximize) independently of
    // the browser viewport, so a plain 'resize' listener isn't enough.
    this.resizeObserver = new ResizeObserver(() => this.fitAddon.fit());
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

  private async boot(): Promise<void> {
    const { cx } = await vm();

    this.statusEl.remove();

    this.sendInput = cx.setCustomConsole(
      // The console is shared by every VT; this window is the tty1 shell only.
      (buf, vt) => {
        if (vt === 1) this.term.write(buf);
      },
      this.term.cols,
      this.term.rows
    );
    this.term.focus();

    await cx.run('/bin/bash', ['--login'], {
      env: ['HOME=/home/user', 'USER=user', 'SHELL=/bin/bash', 'TERM=xterm', 'LANG=en_US.UTF-8'],
      cwd: '/home/user',
      uid: 1000,
      gid: 1000,
    });
  }
}
