import { WindowManager } from './WindowManager';
import { Taskbar } from './Taskbar';
import { VmWindow } from '../windows/VmWindow';
import { FileBrowserWindow } from '../windows/FileBrowserWindow';
import { EditorWindow, baseName } from '../windows/EditorWindow';
import { ProjectsWindow } from '../windows/ProjectsWindow';

export class Desktop {
  private readonly root: HTMLElement;
  private readonly desktopArea: HTMLElement;
  private readonly taskbar: Taskbar;
  private readonly apps: DesktopApp[];
  private readonly windowManager: WindowManager;

  constructor(selector: string) {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) throw new Error(`Desktop root element not found: ${selector}`);
    this.root = root;

    // Build desktop area
    this.desktopArea = document.createElement('div');
    this.desktopArea.id = 'desktop-area';

    // One registry drives the Apps menu, the desktop icons and the accents.
    this.apps = [
      { label: 'Terminal', glyph: '▮', accent: ACCENT.terminal, run: () => this.openTerminal() },
      { label: 'Files', glyph: '▤', accent: ACCENT.files, run: () => this.openFileBrowser() },
      { label: 'Projects', glyph: '◈', accent: ACCENT.sdn, run: () => this.openProjects() },
    ];
    this.taskbar = new Taskbar(this.apps);

    this.buildIcons();

    // Append to root
    this.root.appendChild(this.desktopArea);
    this.root.appendChild(this.taskbar.element);

    // Window manager
    this.windowManager = new WindowManager(this.desktopArea);

    // Wire WindowManager → Taskbar
    this.windowManager.onWindowOpened = (id, title, accent) => {
      this.taskbar.addWindow(id, title, accent);
    };
    this.windowManager.onWindowClosed = (id) => {
      this.taskbar.removeWindow(id);
    };
    this.windowManager.onWindowFocused = (id) => {
      this.taskbar.setFocused(id);
    };
    this.windowManager.onWindowMinimized = (id, isMinimized) => {
      this.taskbar.setMinimized(id, isMinimized);
      if (isMinimized) this.taskbar.setFocused(null);
    };

    // Wire Taskbar → WindowManager. On mobile only the focused window shows, so
    // a taskbar tap switches to that app rather than toggling minimize.
    this.taskbar.onButtonClick = (id) => {
      if (isMobile()) this.windowManager.focus(id);
      else this.windowManager.toggleMinimize(id);
    };

    this.openStartupLayout();
  }

  /**
   * Launcher icons on the desktop itself. Double-click or Enter opens the app,
   * matching every desktop this is imitating; a single click only selects.
   */
  private buildIcons(): void {
    const layer = document.createElement('div');
    layer.id = 'desktop-icons';
    for (const app of this.apps) {
      const icon = document.createElement('button');
      icon.className = 'desktop-icon';
      icon.type = 'button';
      icon.style.setProperty('--accent', app.accent);

      const glyph = document.createElement('span');
      glyph.className = 'desktop-icon-glyph';
      glyph.textContent = app.glyph;
      const label = document.createElement('span');
      label.className = 'desktop-icon-label';
      label.textContent = app.label;
      icon.append(glyph, label);

      icon.addEventListener('dblclick', () => app.run());
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          app.run();
        }
      });
      layer.appendChild(icon);
    }
    this.desktopArea.appendChild(layer);
  }

  /** Terminal and Files tiled side by side, so neither buries the other at boot. */
  private openStartupLayout(): void {
    // Mobile shows one window at a time, so a second one at boot would just
    // bury the terminal. Files is a tap away in the Apps menu.
    if (isMobile()) {
      this.openTerminal();
      return;
    }

    const gap = 12;
    const areaW = this.desktopArea.clientWidth;
    const areaH = this.desktopArea.clientHeight;
    // Leave the icon row uncovered. Trading height rather than width keeps the
    // terminal at TERM_WIDTH, which the 90-column banner depends on.
    const height = Math.min(520, areaH - 2 * gap - ICON_ROW);
    const filesW = Math.min(340, Math.round(areaW * 0.3));
    const termW = Math.min(TERM_WIDTH, areaW - filesW - 3 * gap);

    this.openTerminal({ x: gap, y: gap, width: termW, height });
    this.openFileBrowser(undefined, {
      x: gap + termW + gap,
      y: gap,
      width: filesW,
      height,
    });
  }

  openTerminal(pos?: WindowPos): void {
    this.windowManager.open(new VmWindow(), {
      title: 'Terminal',
      accent: ACCENT.terminal,
      width: TERM_WIDTH,
      height: 500,
      ...pos,
    });
  }

  openProjects(pos?: WindowPos): void {
    this.windowManager.open(new ProjectsWindow(), {
      title: 'Projects',
      accent: ACCENT.sdn,
      width: 660,
      height: 420,
      ...pos,
    });
  }

  openFileBrowser(path?: string, pos?: WindowPos): void {
    const browser = new FileBrowserWindow(path);
    browser.onOpenFile = (filePath) => this.openEditor(filePath);
    this.windowManager.open(browser, {
      title: 'Files',
      accent: ACCENT.files,
      width: 420,
      height: 420,
      ...pos,
    });
  }

  openEditor(path: string): void {
    const editor = new EditorWindow(path);
    const name = baseName(path);
    const id = this.windowManager.open(editor, {
      title: name,
      accent: ACCENT.editor,
      width: 560,
      height: 420,
    });
    // "• name" while unsaved — the dot is the standard dirty marker, and the
    // flag tints the whole title so the state reads without hunting for a dot.
    editor.onDirtyChange = (dirty) =>
      this.windowManager.setTitle(id, dirty ? `• ${name}` : name, dirty);
  }
}

/** Each app owns one hue, so overlapping windows stay tellable apart. */
const ACCENT = {
  terminal: 'var(--accent-2)',
  files: 'var(--warn)',
  editor: 'var(--ok)',
  sdn: 'var(--app-projects)',
} as const;

interface DesktopApp {
  label: string;
  glyph: string;
  accent: string;
  run: () => void;
}

/** Vertical space the desktop icon row needs (icon + bottom inset). */
const ICON_ROW = 86;

// Wide enough for the 90-column boot banner (~8.4px/char plus window chrome);
// narrower and `banner` falls back to its compact form.
const TERM_WIDTH = 860;

interface WindowPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Matches the 700px breakpoint in window.css, where windows go full-screen.
export const isMobile = (): boolean => window.matchMedia('(max-width: 700px)').matches;
