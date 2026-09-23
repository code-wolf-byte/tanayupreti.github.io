import { AppWindow } from '../windows/Window';
import type { WindowContent, WindowId, WindowOptions } from '../types';

interface WindowRecord {
  id: WindowId;
  title: string;
  instance: AppWindow;
  isMinimized: boolean;
  isMaximized: boolean;
}

export class WindowManager {
  private readonly desktopArea: HTMLElement;
  private readonly windows = new Map<WindowId, WindowRecord>();
  private zCounter = 100;
  private cascadeOffset = 0;
  private idCounter = 0;

  onWindowOpened?: (id: WindowId, title: string, accent?: string) => void;
  onWindowClosed?: (id: WindowId) => void;
  onWindowFocused?: (id: WindowId) => void;
  onWindowMinimized?: (id: WindowId, isMinimized: boolean) => void;

  constructor(desktopArea: HTMLElement) {
    this.desktopArea = desktopArea;
  }

  open(content: WindowContent, options: WindowOptions): WindowId {
    const id: WindowId = `win-${++this.idCounter}`;

    const offset = this.cascadeOffset;
    this.cascadeOffset = (this.cascadeOffset + 30) % 90;

    const winOptions: WindowOptions = {
      ...options,
      x: (options.x ?? undefined) !== undefined ? options.x : undefined,
      y: (options.y ?? undefined) !== undefined ? options.y : undefined,
    };

    // Apply cascade if no explicit position
    if (winOptions.x === undefined) {
      const areaW = this.desktopArea.clientWidth;
      const areaH = this.desktopArea.clientHeight;
      const w = options.width ?? 700;
      const h = options.height ?? 450;
      winOptions.x = Math.max(0, Math.min((areaW - w) / 2 + offset, areaW - w));
      winOptions.y = Math.max(0, Math.min((areaH - h) / 2 + offset, areaH - h));
    }

    const win = new AppWindow(id, winOptions, this.desktopArea);

    win.onFocus = (wid) => this.focus(wid);
    win.onClose = (wid) => this.close(wid);
    win.onMinimize = (wid) => this.minimize(wid);

    const record: WindowRecord = {
      id,
      title: options.title,
      instance: win,
      isMinimized: false,
      isMaximized: false,
    };

    this.windows.set(id, record);
    win.mount(content);
    this.focus(id);

    this.onWindowOpened?.(id, options.title, options.accent);
    return id;
  }

  focus(id: WindowId): void {
    const record = this.windows.get(id);
    if (!record) return;

    this.windows.forEach((rec) => rec.instance.blur());
    record.instance.focus();
    record.instance.setZIndex(++this.zCounter);

    if (record.isMinimized) {
      record.isMinimized = false;
      record.instance.restore();
      this.onWindowMinimized?.(id, false);
    }

    this.onWindowFocused?.(id);
  }

  close(id: WindowId): void {
    const record = this.windows.get(id);
    if (!record) return;
    record.instance.destroy();
    this.windows.delete(id);
    this.onWindowClosed?.(id);
    // Surface the most recent remaining window. On mobile only the focused one
    // shows, so without this, closing the visible app leaves a blank screen.
    const next = [...this.windows.keys()].pop();
    if (next) this.focus(next);
  }

  minimize(id: WindowId): void {
    const record = this.windows.get(id);
    if (!record) return;
    record.isMinimized = true;
    record.instance.minimize();
    this.onWindowMinimized?.(id, true);
  }

  restore(id: WindowId): void {
    this.focus(id);
  }

  toggleMinimize(id: WindowId): void {
    const record = this.windows.get(id);
    if (!record) return;
    if (record.isMinimized) {
      this.restore(id);
    } else {
      this.minimize(id);
    }
  }

  setTitle(id: WindowId, title: string, dirty = false): void {
    // Titlebar only; the taskbar button keeps the base name, which is fine.
    this.windows.get(id)?.instance.setTitle(title, dirty);
  }

  hasWindow(id: WindowId): boolean {
    return this.windows.has(id);
  }
}
