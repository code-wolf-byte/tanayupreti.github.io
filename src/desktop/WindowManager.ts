import { AppWindow } from '../windows/Window';
import { VmWindow } from '../windows/VmWindow';
import { FileBrowserWindow } from '../windows/FileBrowserWindow';
import { EditorWindow } from '../windows/EditorWindow';
import { ProjectsWindow } from '../windows/ProjectsWindow';
import { bus, type Instruction } from './session';
import { projectRoute, setRoute } from './url';
import type { WindowContent, WindowId } from '../types';

/**
 * Draws what the session says and nothing else: every window change arrives
 * as an instruction, and every click on a window goes back out as an intent.
 */
export class WindowManager {
  private readonly windows = new Map<WindowId, AppWindow>();

  constructor(private readonly desktopArea: HTMLElement) {
    bus.instructions.subscribe((msg) => this.apply(msg));
  }

  private apply(msg: Instruction): void {
    if (msg.type === 'create') {
      const win = new AppWindow(msg.id, { title: msg.title, accent: msg.accent, ...msg.rect }, this.desktopArea);
      win.onFocus = (id) => bus.intents.publish({ type: 'focus', id });
      win.onClose = (id) => bus.intents.publish({ type: 'close', id });
      win.onMinimize = (id) => bus.intents.publish({ type: 'minimize', id });
      this.windows.set(msg.id, win);
      win.mount(contentFor(msg));
      return;
    }

    if (msg.type === 'focus') {
      this.windows.forEach((win, id) => {
        if (id !== msg.id) return win.blur();
        win.focus();
        win.setZIndex(msg.z);
      });
      return;
    }

    const win = this.windows.get(msg.id);
    if (!win) return;
    switch (msg.type) {
      case 'minimize':
        return msg.minimized ? win.minimize() : win.restore();
      case 'title':
        return win.setTitle(msg.title, msg.dirty);
      case 'destroy':
        win.destroy();
        this.windows.delete(msg.id);
        return;
    }
  }
}

function contentFor(msg: Extract<Instruction, { type: 'create' }>): WindowContent {
  switch (msg.app) {
    case 'terminal':
      return new VmWindow();
    case 'projects':
      return new ProjectsWindow(msg.path, (slug) => setRoute(msg.id, projectRoute(slug)));
    case 'files':
      return new FileBrowserWindow(msg.path);
    case 'editor': {
      const editor = new EditorWindow(msg.path ?? '');
      editor.onDirtyChange = (dirty) => bus.intents.publish({ type: 'dirty', id: msg.id, dirty });
      return editor;
    }
  }
}
