import { WebVmTerminal } from '../webvm/WebVmTerminal';
import type { WindowContent } from '../types';

export class VmWindow implements WindowContent {
  private readonly vm = new WebVmTerminal();

  mount(container: HTMLElement): void {
    this.vm.mount(container);
  }

  destroy(): void {
    this.vm.destroy();
  }
}
