import { WindowManager } from './WindowManager';
import { Taskbar } from './Taskbar';
import { VmWindow } from '../windows/VmWindow';
import { FileBrowserWindow } from '../windows/FileBrowserWindow';
import { EditorWindow, baseName } from '../windows/EditorWindow';

export class Desktop {
  private readonly root: HTMLElement;
  private readonly desktopArea: HTMLElement;
  private readonly taskbar: Taskbar;
  private readonly windowManager: WindowManager;

  constructor(selector: string) {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) throw new Error(`Desktop root element not found: ${selector}`);
    this.root = root;

    // Build desktop area
    this.desktopArea = document.createElement('div');
    this.desktopArea.id = 'desktop-area';

    // Build taskbar with the launcher's app list.
    this.taskbar = new Taskbar([
      { label: 'Terminal', run: () => this.openTerminal() },
      { label: 'Files', run: () => this.openFileBrowser() },
    ]);

    // Append to root
    this.root.appendChild(this.desktopArea);
    this.root.appendChild(this.taskbar.element);

    // Window manager
    this.windowManager = new WindowManager(this.desktopArea);

    // Wire WindowManager → Taskbar
    this.windowManager.onWindowOpened = (id, title) => {
      this.taskbar.addWindow(id, title);
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
    const height = Math.min(520, areaH - 2 * gap);
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
      title: './Portfolio',
      width: TERM_WIDTH,
      height: 500,
      ...pos,
    });
  }

  openFileBrowser(path?: string, pos?: WindowPos): void {
    const browser = new FileBrowserWindow(path);
    browser.onOpenFile = (filePath) => this.openEditor(filePath);
    this.windowManager.open(browser, { title: 'Files', width: 420, height: 420, ...pos });
  }

  openEditor(path: string): void {
    const editor = new EditorWindow(path);
    const name = baseName(path);
    const id = this.windowManager.open(editor, { title: name, width: 560, height: 420 });
    // "• name" while unsaved — the dot is the standard dirty marker.
    editor.onDirtyChange = (dirty) => this.windowManager.setTitle(id, dirty ? `• ${name}` : name);
  }
}

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
