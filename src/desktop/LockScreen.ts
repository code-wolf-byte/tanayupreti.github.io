import logo from '../../res/logo.png';
import { vm } from '../webvm/vm';

/**
 * Shown on every visit, over a desktop that is already running: the VM boots
 * behind it (started by this screen), so the wait for Linux happens here instead
 * of in an empty terminal. Signing in before it's up shows a spinner until it
 * is, then the desktop.
 *
 * No password: `guest` is the only account. Any click or key signs in.
 */
export class LockScreen {
  private readonly element: HTMLElement;
  private readonly behind: HTMLElement[];
  private readonly clockTimer: ReturnType<typeof setInterval>;
  /** Settled either way: a failed boot still opens the desktop, whose terminal says why. */
  private readonly booted: Promise<void> = vm().then(
    () => void (this.ready = true),
    () => void (this.ready = true)
  );
  private ready = false;
  private signingIn = false;
  private readonly onKey = (e: KeyboardEvent): void => {
    // Modifiers alone (a stray Shift, Cmd+Tab back to the window) don't count.
    if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;
    // The terminal gets focus next; the key that signed in must not type into it.
    e.preventDefault();
    this.unlock();
  };

  /** `behind`: made inert while locked, so nothing behind can take keys meant for this. */
  constructor(root: HTMLElement, behind: HTMLElement[]) {
    this.behind = behind;
    this.element = document.createElement('div');
    this.element.id = 'lock';
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', 'Sign in');
    this.element.innerHTML = `
      <div class="lock-clock">
        <div class="lock-time"></div>
        <div class="lock-date"></div>
      </div>
      <div class="lock-user">
        <img class="lock-avatar" alt="" />
        <div class="lock-name">guest</div>
        <button class="lock-signin" type="button">Sign in <span aria-hidden="true">→</span></button>
        <div class="lock-hint">press any key</div>
        <div class="lock-spinner" role="status" aria-label="Signing in" hidden></div>
      </div>
    `;
    (this.element.querySelector('.lock-avatar') as HTMLImageElement).src = logo;

    const time = this.element.querySelector('.lock-time') as HTMLElement;
    const date = this.element.querySelector('.lock-date') as HTMLElement;
    const tick = () => {
      const now = new Date();
      time.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      date.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);

    for (const el of behind) el.inert = true;
    this.element.addEventListener('click', () => this.unlock());
    document.addEventListener('keydown', this.onKey);
    root.appendChild(this.element);
    (this.element.querySelector('.lock-signin') as HTMLElement).focus();
  }

  private async unlock(): Promise<void> {
    if (this.signingIn) return;
    this.signingIn = true;
    if (!this.ready) {
      this.element.classList.add('is-signing-in');
      (this.element.querySelector('.lock-spinner') as HTMLElement).hidden = false;
      // Keys stay swallowed until the desktop is up, so none reach the terminal early.
      await this.booted;
    }

    document.removeEventListener('keydown', this.onKey);
    clearInterval(this.clockTimer);
    for (const el of this.behind) el.inert = false;

    this.element.classList.add('is-leaving');
    this.element.addEventListener('transitionend', () => this.element.remove(), { once: true });
  }
}
