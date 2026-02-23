import { WindowManager } from './WindowManager';
import { Taskbar } from './Taskbar';
import { TerminalWindow } from '../windows/TerminalWindow';

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

    // Build taskbar
    this.taskbar = new Taskbar();

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

    // Wire Taskbar → WindowManager
    this.taskbar.onButtonClick = (id) => {
      this.windowManager.toggleMinimize(id);
    };

    // Open default terminal window
    this.windowManager.open(new TerminalWindow(), {
      title: './Portfolio',
      width: 760,
      height: 480,
    });
  }
}
