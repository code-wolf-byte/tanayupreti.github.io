import { isWritable, readFile, writeFile } from '../webvm/vm';
import type { WindowContent } from '../types';

export const baseName = (path: string): string => path.split('/').filter(Boolean).pop() ?? path;

export class EditorWindow implements WindowContent {
  private textarea!: HTMLTextAreaElement;
  private statusEl!: HTMLElement;
  private saveBtn!: HTMLButtonElement;
  private loaded = '';

  /** Fires when the unsaved state flips, so the window title can show a marker. */
  onDirtyChange?: (isDirty: boolean) => void;

  constructor(private readonly path: string) {}

  mount(container: HTMLElement): void {
    container.innerHTML = `
      <div class="ed">
        <div class="ed-bar">
          <span class="ed-path"></span>
          <button class="ed-save" disabled>Save</button>
        </div>
        <textarea class="ed-text" spellcheck="false" readonly></textarea>
        <div class="ed-status">Loading…</div>
      </div>
    `;
    this.textarea = container.querySelector('.ed-text')!;
    this.statusEl = container.querySelector('.ed-status')!;
    this.saveBtn = container.querySelector('.ed-save')!;
    container.querySelector('.ed-path')!.textContent = this.path;

    this.saveBtn.addEventListener('click', () => void this.save());
    this.textarea.addEventListener('input', () => this.refreshDirty());
    this.textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void this.save();
      }
    });

    void this.load();
  }

  destroy(): void {
    // Nothing to unwind: listeners die with the elements.
  }

  get isDirty(): boolean {
    return this.textarea.value !== this.loaded;
  }

  private refreshDirty(): void {
    const dirty = this.isDirty;
    this.saveBtn.disabled = !dirty;
    this.onDirtyChange?.(dirty);
  }

  private async load(): Promise<void> {
    try {
      const text = await readFile(this.path);
      const writable = await isWritable(this.path);

      this.loaded = text;
      this.textarea.value = text;
      this.textarea.readOnly = !writable;
      // readOnly (not disabled) keeps read-only text selectable and scrollable.
      this.saveBtn.hidden = !writable;

      const lines = `${text.split('\n').length} lines`;
      this.setStatus(writable ? lines : `${lines} · read-only`);
      this.refreshDirty();
      this.textarea.focus();
    } catch (err) {
      // Binaries and unreadable files land here; keep the window honest.
      this.setStatus((err as Error).message, true);
    }
  }

  private async save(): Promise<void> {
    const snapshot = this.textarea.value;
    this.saveBtn.disabled = true;
    this.setStatus('Saving…');
    try {
      await writeFile(this.path, snapshot);
      // Compare against the snapshot, not the live value: the user may have
      // typed while the write was in flight.
      this.loaded = snapshot;
      this.setStatus(`Saved ${new Date().toLocaleTimeString()}`);
      this.refreshDirty();
    } catch (err) {
      this.setStatus((err as Error).message, true);
      this.refreshDirty();
    }
  }

  private setStatus(text: string, isError = false): void {
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle('ed-error', isError);
  }
}
