import type { WindowId } from '../types';

export interface LauncherApp {
  label: string;
  run: () => void;
}

export class Taskbar {
  readonly element: HTMLElement;
  private readonly windowsEl: HTMLElement;
  private readonly clockEl: HTMLElement;
  private readonly menuEl: HTMLElement;
  private readonly appsBtn: HTMLButtonElement;
  private readonly buttons = new Map<WindowId, HTMLButtonElement>();
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  onButtonClick?: (id: WindowId) => void;

  constructor(apps: LauncherApp[]) {
    this.element = document.createElement('div');
    this.element.id = 'taskbar';
    this.element.innerHTML = `
      <button id="taskbar-apps" title="Launch an app">▮ Apps</button>
      <div id="taskbar-menu" hidden></div>
      <div id="taskbar-windows"></div>
      <span id="taskbar-clock"></span>
    `;
    this.windowsEl = this.element.querySelector('#taskbar-windows') as HTMLElement;
    this.clockEl = this.element.querySelector('#taskbar-clock') as HTMLElement;
    this.menuEl = this.element.querySelector('#taskbar-menu') as HTMLElement;
    this.appsBtn = this.element.querySelector('#taskbar-apps') as HTMLButtonElement;

    this.buildMenu(apps);
    this.startClock();
  }

  private buildMenu(apps: LauncherApp[]): void {
    for (const app of apps) {
      const item = document.createElement('button');
      item.className = 'taskbar-menu-item';
      item.textContent = app.label;
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

  private startClock(): void {
    const tick = () => {
      this.clockEl.textContent = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);
  }

  addWindow(id: WindowId, title: string): void {
    const btn = document.createElement('button');
    btn.className = 'taskbar-btn';
    btn.textContent = title;
    btn.addEventListener('click', () => {
      this.onButtonClick?.(id);
    });
    this.buttons.set(id, btn);
    this.windowsEl.appendChild(btn);
  }

  removeWindow(id: WindowId): void {
    const btn = this.buttons.get(id);
    if (btn) {
      btn.remove();
      this.buttons.delete(id);
    }
  }

  setFocused(id: WindowId | null): void {
    this.buttons.forEach((btn, btnId) => {
      btn.classList.toggle('active', btnId === id);
    });
  }

  setMinimized(id: WindowId, isMinimized: boolean): void {
    const btn = this.buttons.get(id);
    if (btn) btn.classList.toggle('minimized', isMinimized);
  }

  destroy(): void {
    if (this.clockTimer !== null) clearInterval(this.clockTimer);
  }
}
