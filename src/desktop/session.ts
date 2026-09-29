// The session: the one place window state lives, behind a pub/sub bus.
//
// Nothing on screen changes itself. The UI (icons, titlebars, the taskbar) and
// the Linux guest (via `open` in the shell) publish *intents*; the session
// applies them to its state and publishes *instructions*; WindowManager and
// Taskbar only render instructions. Same split as a display server and its
// clients — and, as there, interactive move/resize/maximize stay client-side,
// since routing every pointer frame through here buys nothing.
//
// No DOM in this file, so scripts/session-test can drive it from node.
import type { WindowId } from '../types';

export type AppKind = 'terminal' | 'files' | 'projects' | 'editor';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Intent =
  | { type: 'screen'; width: number; height: number; mobile: boolean }
  | { type: 'launch'; app: AppKind; path?: string; rect?: Rect }
  | { type: 'focus' | 'close' | 'minimize' | 'activate'; id: WindowId }
  | { type: 'dirty'; id: WindowId; dirty: boolean };

export type Instruction =
  | { type: 'create'; id: WindowId; app: AppKind; title: string; accent: string; rect: Rect; path?: string }
  /** id null: nothing is focused (the focused window was minimized). */
  | { type: 'focus'; id: WindowId | null; z: number }
  | { type: 'minimize'; id: WindowId; minimized: boolean }
  | { type: 'title'; id: WindowId; title: string; dirty: boolean }
  | { type: 'destroy'; id: WindowId };

/**
 * Messages published from inside a subscriber are queued, not delivered
 * re-entrantly — otherwise a renderer that publishes while handling `create`
 * could have its reply reach other subscribers before `create` does.
 */
function channel<T>() {
  const subs = new Set<(msg: T) => void>();
  const queue: T[] = [];
  let draining = false;
  return {
    publish(msg: T): void {
      queue.push(msg);
      if (draining) return;
      draining = true;
      while (queue.length) {
        const next = queue.shift()!;
        subs.forEach((fn) => {
          // One broken subscriber must not starve the rest, or wedge the queue.
          try {
            fn(next);
          } catch (err) {
            console.error('session bus subscriber failed', err);
          }
        });
      }
      draining = false;
    },
    subscribe(fn: (msg: T) => void): () => void {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function createBus() {
  return { intents: channel<Intent>(), instructions: channel<Instruction>() };
}
export type Bus = ReturnType<typeof createBus>;

/** The page's bus. Tests build their own with createBus(). */
export const bus = createBus();

/** Each app owns one hue, so overlapping windows stay tellable apart. */
export const ACCENT: Record<AppKind, string> = {
  terminal: 'var(--accent-2)',
  files: 'var(--warn)',
  editor: 'var(--ok)',
  projects: 'var(--app-projects)',
};

// Wide enough for the 90-column boot banner (~8.4px/char plus window chrome);
// narrower and `banner` falls back to its compact form.
const TERM_WIDTH = 860;

const DEFAULTS: Record<AppKind, { title: string; width: number; height: number }> = {
  terminal: { title: 'Terminal', width: TERM_WIDTH, height: 500 },
  files: { title: 'Files', width: 420, height: 420 },
  projects: { title: 'Projects', width: 660, height: 420 },
  editor: { title: 'Editor', width: 560, height: 420 },
};

export const baseName = (path: string): string => path.split('/').filter(Boolean).pop() ?? path;

interface Win {
  title: string;
  minimized: boolean;
}

export class Session {
  // Insertion order is open order, which close() relies on.
  private readonly windows = new Map<WindowId, Win>();
  private focused: WindowId | null = null;
  private screen = { width: 0, height: 0, mobile: false };
  private z = 100;
  private seq = 0;
  private cascade = 0;
  // Not a parameter property: node's type stripping (the session test) rejects those.
  private readonly bus: Bus;

  constructor(bus: Bus) {
    this.bus = bus;
    bus.intents.subscribe((intent) => this.handle(intent));
  }

  private emit(msg: Instruction): void {
    this.bus.instructions.publish(msg);
  }

  private handle(intent: Intent): void {
    switch (intent.type) {
      case 'screen':
        this.screen = { width: intent.width, height: intent.height, mobile: intent.mobile };
        return;
      case 'launch':
        return this.launch(intent.app, intent.path, intent.rect);
      case 'focus':
        return this.focus(intent.id);
      case 'close':
        return this.close(intent.id);
      case 'minimize':
        return this.minimize(intent.id);
      case 'activate': {
        // Taskbar button. On mobile only the focused window shows, so a tap
        // switches to that app rather than toggling minimize.
        const win = this.windows.get(intent.id);
        if (!win) return;
        if (this.screen.mobile || win.minimized) this.focus(intent.id);
        else this.minimize(intent.id);
        return;
      }
      case 'dirty': {
        // "• name" while unsaved — the dot is the standard dirty marker, and the
        // flag tints the whole title so the state reads without hunting for a dot.
        const win = this.windows.get(intent.id);
        if (!win) return;
        const title = intent.dirty ? `• ${win.title}` : win.title;
        this.emit({ type: 'title', id: intent.id, title, dirty: intent.dirty });
        return;
      }
    }
  }

  private launch(app: AppKind, path?: string, rect?: Rect): void {
    const id: WindowId = `win-${++this.seq}`;
    const spec = DEFAULTS[app];
    const title = app === 'editor' && path ? baseName(path) : spec.title;

    if (!rect) {
      // Centred, stepping down-right per window so a new one never lands
      // exactly on top of the last.
      const { width: areaW, height: areaH } = this.screen;
      const { width, height } = spec;
      const off = this.cascade;
      this.cascade = (this.cascade + 30) % 90;
      rect = {
        width,
        height,
        x: Math.max(0, Math.min((areaW - width) / 2 + off, areaW - width)),
        y: Math.max(0, Math.min((areaH - height) / 2 + off, areaH - height)),
      };
    }

    this.windows.set(id, { title, minimized: false });
    this.emit({ type: 'create', id, app, title, accent: ACCENT[app], rect, path });
    this.focus(id);
  }

  private focus(id: WindowId): void {
    const win = this.windows.get(id);
    if (!win) return;
    if (win.minimized) {
      win.minimized = false;
      this.emit({ type: 'minimize', id, minimized: false });
    }
    this.focused = id;
    this.emit({ type: 'focus', id, z: ++this.z });
  }

  private minimize(id: WindowId): void {
    const win = this.windows.get(id);
    if (!win || win.minimized) return;
    win.minimized = true;
    this.emit({ type: 'minimize', id, minimized: true });
    if (this.focused === id) {
      this.focused = null;
      this.emit({ type: 'focus', id: null, z: this.z });
    }
  }

  private close(id: WindowId): void {
    if (!this.windows.delete(id)) return;
    this.emit({ type: 'destroy', id });
    if (this.focused !== id) return;
    this.focused = null;
    // Surface the most recent remaining window. On mobile only the focused one
    // shows, so without this, closing the visible app leaves a blank screen.
    const next = [...this.windows.keys()].pop();
    if (next) this.focus(next);
  }
}
