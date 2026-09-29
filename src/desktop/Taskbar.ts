import { onVmStage, TOTAL_STAGES } from '../webvm/vm';
import { vm } from '../webvm/vm';
import { bus } from './session';
import type { WindowId } from '../types';

export interface LauncherApp {
  label: string;
  glyph?: string;
  accent?: string;
  run: () => void;
}

export class Taskbar {
  readonly element: HTMLElement;
  private readonly windowsEl: HTMLElement;
  private readonly clockEl: HTMLElement;
  private readonly menuEl: HTMLElement;
  private readonly appsBtn: HTMLButtonElement;
  private vmEl!: HTMLElement;
  private readonly buttons = new Map<WindowId, HTMLButtonElement>();
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  constructor(apps: LauncherApp[]) {
    this.element = document.createElement('div');
    this.element.id = 'taskbar';
    this.element.innerHTML = `
      <button id="taskbar-apps" title="Launch an app">▮ Apps</button>
      <div id="taskbar-menu" hidden></div>
      <div id="taskbar-windows"></div>
      <div id="taskbar-tray">
        <span id="taskbar-vm" class="is-booting">
          <i class="tray-led"></i><span class="tray-text">booting</span>
        </span>
        <span id="taskbar-clock"></span>
      </div>
    `;
    this.windowsEl = this.element.querySelector('#taskbar-windows') as HTMLElement;
    this.clockEl = this.element.querySelector('#taskbar-clock') as HTMLElement;
    this.menuEl = this.element.querySelector('#taskbar-menu') as HTMLElement;
    this.appsBtn = this.element.querySelector('#taskbar-apps') as HTMLButtonElement;

    this.vmEl = this.element.querySelector('#taskbar-vm') as HTMLElement;
    this.buildMenu(apps);
    this.startClock();
    this.trackVm();

    bus.instructions.subscribe((msg) => {
      switch (msg.type) {
        case 'create':
          return this.addWindow(msg.id, msg.title, msg.accent);
        case 'destroy':
          return this.removeWindow(msg.id);
        case 'focus':
          return this.setFocused(msg.id);
        case 'minimize':
          return this.setMinimized(msg.id, msg.minimized);
        // 'title' is ignored: buttons keep the base name, dirty marker is titlebar-only.
      }
    });
  }

  private buildMenu(apps: LauncherApp[]): void {
    for (const app of apps) {
      const item = document.createElement('button');
      item.className = 'taskbar-menu-item';
      if (app.accent) item.style.setProperty('--accent', app.accent);
      const glyph = document.createElement('span');
      glyph.className = 'taskbar-menu-glyph';
      glyph.textContent = app.glyph ?? '▪';
      const label = document.createElement('span');
      label.textContent = app.label;
      item.append(glyph, label);
      item.addEventListener('click', () => {
        this.closeMenu();
        app.run();
      });
      this.menuEl.appendChild(item);
    }

    this.appsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.menuEl.hidden ? this.openMenu() : this.closeMenu();
    });
    // Any click elsewhere, or Escape, dismisses the menu.
    document.addEventListener('click', () => this.closeMenu());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeMenu();
    });
  }

  private openMenu(): void {
    this.menuEl.hidden = false;
    this.appsBtn.classList.add('active');
  }

  private closeMenu(): void {
    this.menuEl.hidden = true;
    this.appsBtn.classList.remove('active');
  }

  /**
   * Live VM state in the tray, driven by the same stage reports the boot
   * screen uses — so the claim in the terminal's banner has a running
   * indicator backing it up rather than being a one-off splash.
   */
  private trackVm(): void {
    const text = this.vmEl.querySelector('.tray-text') as HTMLElement;
    onVmStage((stage) => {
      text.textContent = `booting ${stage.step}/${TOTAL_STAGES}`;
    });
    vm().then(
      () => {
        this.vmEl.classList.replace('is-booting', 'is-up');
        text.textContent = 'linux up';
      },
      () => {
        this.vmEl.classList.replace('is-booting', 'is-down');
        text.textContent = 'vm failed';
      }
    );
  }

  private startClock(): void {
    const tick = () => {
      const now = new Date();
      this.clockEl.textContent =
        now.toLocaleDateString([], { day: '2-digit', month: 'short' }).toUpperCase() +
        '  ' +
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);
  }

  private addWindow(id: WindowId, title: string, accent?: string): void {
    const btn = document.createElement('button');
    btn.className = 'taskbar-btn';
    if (accent) btn.style.setProperty('--accent', accent);
    btn.textContent = title;
    btn.addEventListener('click', () => bus.intents.publish({ type: 'activate', id }));
    this.buttons.set(id, btn);
    this.windowsEl.appendChild(btn);
  }

  private removeWindow(id: WindowId): void {
    const btn = this.buttons.get(id);
    if (btn) {
      btn.remove();
      this.buttons.delete(id);
    }
  }

  private setFocused(id: WindowId | null): void {
    this.buttons.forEach((btn, btnId) => {
      btn.classList.toggle('active', btnId === id);
    });
  }

  private setMinimized(id: WindowId, isMinimized: boolean): void {
    const btn = this.buttons.get(id);
    if (btn) btn.classList.toggle('minimized', isMinimized);
  }

  destroy(): void {
    if (this.clockTimer !== null) clearInterval(this.clockTimer);
  }
}
