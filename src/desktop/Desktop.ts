import { WindowManager } from './WindowManager';
import { Taskbar } from './Taskbar';
import { ACCENT, Session, bus, type AppKind } from './session';

export class Desktop {
  private readonly desktopArea: HTMLElement;
  private readonly apps: DesktopApp[];

  constructor(selector: string) {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) throw new Error(`Desktop root element not found: ${selector}`);

    // Before any renderer subscribes, so no instruction can precede its state.
    new Session(bus);

    this.desktopArea = document.createElement('div');
    this.desktopArea.id = 'desktop-area';

    // One registry drives the Apps menu, the desktop icons and the accents.
    const launch = (app: AppKind) => () => bus.intents.publish({ type: 'launch', app });
    this.apps = [
      { label: 'Terminal', glyph: '▮', accent: ACCENT.terminal, run: launch('terminal') },
      { label: 'Files', glyph: '▤', accent: ACCENT.files, run: launch('files') },
      { label: 'Projects', glyph: '◈', accent: ACCENT.projects, run: launch('projects') },
    ];
    const taskbar = new Taskbar(this.apps);

    this.buildIcons();

    root.appendChild(this.desktopArea);
    root.appendChild(taskbar.element);

    new WindowManager(this.desktopArea);

    // The session places windows, so it has to know the screen it places them on.
    const screen = () =>
      bus.intents.publish({
        type: 'screen',
        width: this.desktopArea.clientWidth,
        height: this.desktopArea.clientHeight,
        mobile: isMobile(),
      });
    screen();
    new ResizeObserver(screen).observe(this.desktopArea);

    bus.intents.publish({ type: 'boot' });
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
}

interface DesktopApp {
  label: string;
  glyph: string;
  accent: string;
  run: () => void;
}

// Matches the 700px breakpoint in window.css, where windows go full-screen.
const isMobile = (): boolean => window.matchMedia('(max-width: 700px)').matches;
