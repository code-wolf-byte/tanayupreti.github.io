import { Terminal } from '../terminal/Terminal';
import type { WindowContent } from '../types';

export class TerminalWindow implements WindowContent {
  private readonly terminal = new Terminal();

  mount(container: HTMLElement): void {
    this.terminal.mount(container);
  }

  destroy(): void {
    this.terminal.destroy();
  }
}
