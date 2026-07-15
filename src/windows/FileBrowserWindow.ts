import { list } from '../webvm/vm';
import type { DirEntry } from '../webvm/vm';
import type { WindowContent } from '../types';

/** '/a/b' -> '/a'; '/a' -> '/'; '/' -> '/' */
export const parentOf = (path: string): string => {
  const trimmed = path.replace(/\/+$/, '');
  const cut = trimmed.slice(0, trimmed.lastIndexOf('/'));
  return cut === '' ? '/' : cut;
};

export const joinPath = (dir: string, name: string): string =>
  dir === '/' ? `/${name}` : `${dir.replace(/\/+$/, '')}/${name}`;

export class FileBrowserWindow implements WindowContent {
  private pathEl!: HTMLElement;
  private listEl!: HTMLElement;
  private cwd: string;
  // Bumped on every navigation so a slow listing can't repaint over a newer one.
  private navToken = 0;

  /** Set by the desktop to hand files off to an editor. */
  onOpenFile?: (path: string) => void;

  constructor(private readonly startPath = '/home/user') {
    this.cwd = startPath;
  }

  mount(container: HTMLElement): void {
    container.innerHTML = `
      <div class="fb">
        <div class="fb-path" title="Current directory"></div>
        <ul class="fb-list"></ul>
      </div>
    `;
    this.pathEl = container.querySelector('.fb-path')!;
    this.listEl = container.querySelector('.fb-list')!;
    void this.navigate(this.startPath);
  }

  destroy(): void {
    // Listeners live on elements the window is about to drop; nothing to unwind.
  }

  private async navigate(path: string): Promise<void> {
    const token = ++this.navToken;
    this.pathEl.textContent = path;
    this.setMessage('Loading…');
    try {
      const entries = await list(path);
      if (token !== this.navToken) return;
      this.cwd = path;
      this.render(entries);
    } catch (err) {
      if (token !== this.navToken) return;
      this.pathEl.textContent = this.cwd;
      this.setMessage((err as Error).message, true);
    }
  }

  private setMessage(text: string, isError = false): void {
    this.listEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = isError ? 'fb-msg fb-error' : 'fb-msg';
    li.textContent = text;
    this.listEl.appendChild(li);
  }

  private render(entries: DirEntry[]): void {
    const sorted = [...entries].sort(
      (a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name)
    );

    this.listEl.innerHTML = '';

    if (this.cwd !== '/') {
      this.listEl.appendChild(this.row({ name: '..', isDir: true }, parentOf(this.cwd)));
    }
    for (const entry of sorted) {
      this.listEl.appendChild(this.row(entry, joinPath(this.cwd, entry.name)));
    }
    if (sorted.length === 0) {
      // Appended, not set: '..' has to survive so an empty dir isn't a dead end.
      const li = document.createElement('li');
      li.className = 'fb-msg';
      li.textContent = '(empty)';
      this.listEl.appendChild(li);
    }
  }

  private row(entry: DirEntry, target: string): HTMLElement {
    const li = document.createElement('li');
    li.className = entry.isDir ? 'fb-row fb-dir' : 'fb-row fb-file';
    li.tabIndex = 0;

    const icon = document.createElement('span');
    icon.className = 'fb-icon';
    icon.textContent = entry.isDir ? '▸' : '·';

    const name = document.createElement('span');
    name.className = 'fb-name';
    // textContent, not innerHTML: filenames are guest-controlled.
    name.textContent = entry.name;

    li.append(icon, name);

    const open = () => {
      if (entry.isDir) void this.navigate(target);
      else this.onOpenFile?.(target);
    };
    li.addEventListener('dblclick', open);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') open();
    });
    return li;
  }
}
