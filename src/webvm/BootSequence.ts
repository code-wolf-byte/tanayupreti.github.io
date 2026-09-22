import { onVmStage, TOTAL_STAGES, type VmStage } from './vm';

/**
 * The POST screen shown over the terminal while Linux comes up.
 *
 * Every line corresponds to a real stage of `boot()` in vm.ts and is timed
 * against the clock, so the sequence takes exactly as long as the boot does —
 * there is no scripted delay and no fake progress bar. A slow connection shows
 * a slow boot, which is the honest thing for a screen whose whole argument is
 * "this is really happening".
 */
export class BootSequence {
  readonly element: HTMLElement;
  private readonly logEl: HTMLElement;
  private readonly barEl: HTMLElement;
  private unsubscribe: (() => void) | null = null;
  private pending: { row: HTMLElement; startedAt: number } | null = null;
  private done = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'vm-boot';
    this.element.innerHTML = `
      <div class="vm-boot-head">
        <span class="vm-boot-title">tanayupreti.dev</span>
        <span class="vm-boot-sub">power-on self test</span>
      </div>
      <div class="vm-boot-log"></div>
      <div class="vm-boot-bar"><i></i></div>
    `;
    this.logEl = this.element.querySelector('.vm-boot-log')!;
    this.barEl = this.element.querySelector('.vm-boot-bar i')!;

    this.unsubscribe = onVmStage((stage) => this.onStage(stage));
  }

  private onStage(stage: VmStage): void {
    this.settlePending('ok');

    const row = document.createElement('div');
    row.className = 'vm-boot-row';
    row.innerHTML = `
      <span class="vm-boot-mark">····</span>
      <span class="vm-boot-label"></span>
      <span class="vm-boot-note"></span>
      <span class="vm-boot-ms"></span>
    `;
    (row.querySelector('.vm-boot-label') as HTMLElement).textContent = stage.label;
    const note = row.querySelector('.vm-boot-note') as HTMLElement;
    note.textContent = stage.note;
    // Type the note out at a fixed rate; steps() needs the character count.
    note.style.setProperty('--n', String(stage.note.length));

    this.logEl.appendChild(row);
    this.pending = { row, startedAt: performance.now() };
    this.barEl.style.width = `${(stage.step / TOTAL_STAGES) * 100}%`;
  }

  /** Stamp the in-flight row with its real elapsed time and an outcome. */
  private settlePending(outcome: 'ok' | 'fail'): void {
    if (!this.pending) return;
    const { row, startedAt } = this.pending;
    const ms = Math.round(performance.now() - startedAt);
    row.classList.add(outcome === 'ok' ? 'is-ok' : 'is-fail');
    (row.querySelector('.vm-boot-mark') as HTMLElement).textContent =
      outcome === 'ok' ? ' ok ' : 'fail';
    (row.querySelector('.vm-boot-ms') as HTMLElement).textContent = `${ms}ms`;
    this.pending = null;
  }

  /** Last line: the shell, which WebVmTerminal starts itself. */
  startingShell(): void {
    this.settlePending('ok');
    this.barEl.style.width = '100%';
    const row = document.createElement('div');
    row.className = 'vm-boot-row is-ok';
    row.innerHTML =
      `<span class="vm-boot-mark"> ok </span>` +
      `<span class="vm-boot-label">shell</span>` +
      `<span class="vm-boot-note" style="--n:22">/bin/bash · uid 1000</span>` +
      `<span class="vm-boot-ms"></span>`;
    this.logEl.appendChild(row);
  }

  fail(message: string): void {
    this.settlePending('fail');
    this.done = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.barEl.classList.add('is-fail');
    const row = document.createElement('div');
    row.className = 'vm-boot-row is-fail';
    const text = document.createElement('span');
    text.className = 'vm-boot-error';
    text.textContent = message;
    row.appendChild(text);
    this.logEl.appendChild(row);
  }

  /**
   * Fade out and remove. Resolves only once the node is gone, so the caller can
   * do its final fit with the overlay out of the way.
   */
  finish(): Promise<void> {
    if (this.done) return Promise.resolve();
    this.done = true;
    this.unsubscribe?.();
    this.unsubscribe = null;
    return new Promise((resolve) => {
      this.element.classList.add('is-leaving');
      const remove = () => {
        this.element.remove();
        resolve();
      };
      this.element.addEventListener('transitionend', remove, { once: true });
      // transitionend never fires if the element is display:none (a minimized
      // or off-screen window), so never hang the boot on it.
      setTimeout(remove, 700);
    });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.element.remove();
  }
}
