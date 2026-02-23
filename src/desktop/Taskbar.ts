import type { WindowId } from '../types';

export class Taskbar {
  readonly element: HTMLElement;
  private readonly windowsEl: HTMLElement;
  private readonly clockEl: HTMLElement;
  private readonly buttons = new Map<WindowId, HTMLButtonElement>();
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  onButtonClick?: (id: WindowId) => void;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'taskbar';
    this.element.innerHTML = `
      <div id="taskbar-windows"></div>
      <span id="taskbar-clock"></span>
    `;
    this.windowsEl = this.element.querySelector('#taskbar-windows') as HTMLElement;
    this.clockEl = this.element.querySelector('#taskbar-clock') as HTMLElement;

    this.startClock();
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
