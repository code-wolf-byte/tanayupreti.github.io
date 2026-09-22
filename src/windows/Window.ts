import interact from 'interactjs';
import type { WindowContent, WindowId, WindowOptions } from '../types';

export class AppWindow {
  readonly id: WindowId;
  readonly element: HTMLElement;
  private readonly titlebarEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly contentEl: HTMLElement;
  private readonly desktopArea: HTMLElement;
  private content: WindowContent | null = null;

  onFocus?: (id: WindowId) => void;
  onClose?: (id: WindowId) => void;
  onMinimize?: (id: WindowId) => void;

  constructor(id: WindowId, options: WindowOptions, desktopArea: HTMLElement) {
    this.id = id;
    this.desktopArea = desktopArea;

    const width = options.width ?? 700;
    const height = options.height ?? 450;

    // Default position: centered in desktop area
    const areaW = desktopArea.clientWidth;
    const areaH = desktopArea.clientHeight;
    const x = options.x ?? Math.max(0, (areaW - width) / 2);
    const y = options.y ?? Math.max(0, (areaH - height) / 2);

    // Build DOM
    this.element = document.createElement('div');
    this.element.className = 'window';
    this.element.style.width = `${width}px`;
    this.element.style.height = `${height}px`;
    this.element.style.transform = `translate(${x}px, ${y}px)`;
    this.element.setAttribute('data-x', String(x));
    this.element.setAttribute('data-y', String(y));

    this.element.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title">${this.escapeHtml(options.title)}</span>
        <div class="window-controls">
          <button class="window-btn window-minimize" title="Minimize">−</button>
          <button class="window-btn window-maximize" title="Maximize">□</button>
          <button class="window-btn window-close" title="Close">×</button>
        </div>
      </div>
      <div class="window-deco-bar" style="height:4px;margin-top:1px;"></div>
      <div class="window-deco-bar" style="height:3px;margin-top:2px;"></div>
      <div class="window-deco-bar" style="height:2px;margin-top:3px;"></div>
      <div class="window-deco-bar" style="height:1px;margin-top:4px;"></div>
      <div class="window-content"></div>
      <div class="resize-handle n"></div>
      <div class="resize-handle s"></div>
      <div class="resize-handle e"></div>
      <div class="resize-handle w"></div>
      <div class="resize-handle se"></div>
    `;

    this.titlebarEl = this.element.querySelector('.window-titlebar') as HTMLElement;
    this.titleEl = this.element.querySelector('.window-title') as HTMLElement;
    this.contentEl = this.element.querySelector('.window-content') as HTMLElement;

    this.bindControls();
    this.setupInteract();

    desktopArea.appendChild(this.element);
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private bindControls(): void {
    this.element.addEventListener('mousedown', () => {
      this.onFocus?.(this.id);
    });

    const closeBtn = this.element.querySelector('.window-close')!;
    const minimizeBtn = this.element.querySelector('.window-minimize')!;
    const maximizeBtn = this.element.querySelector('.window-maximize')!;

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onClose?.(this.id);
    });

    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onMinimize?.(this.id);
    });

    maximizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize();
    });
  }

  private setupInteract(): void {
    // Drag via titlebar — moves the window element
    interact(this.titlebarEl).draggable({
      listeners: {
        move: (event) => {
          if (this.element.classList.contains('maximized')) return;

          const el = this.element;
          const areaW = this.desktopArea.clientWidth;
          const areaH = this.desktopArea.clientHeight;
          const winW = el.offsetWidth;
          const winH = el.offsetHeight;

          let x = (parseFloat(el.getAttribute('data-x') ?? '0')) + event.dx;
          let y = (parseFloat(el.getAttribute('data-y') ?? '0')) + event.dy;

          x = Math.max(0, Math.min(areaW - winW, x));
          y = Math.max(0, Math.min(areaH - winH, y));

          el.style.transform = `translate(${x}px, ${y}px)`;
          el.setAttribute('data-x', String(x));
          el.setAttribute('data-y', String(y));
        },
      },
    });

    // Resize from edges/corner
    interact(this.element).resizable({
      edges: {
        top: '.resize-handle.n',
        bottom: '.resize-handle.s',
        right: '.resize-handle.e',
        left: '.resize-handle.w',
      },
      modifiers: [
        interact.modifiers.restrictSize({ min: { width: 240, height: 120 } }),
      ],
      listeners: {
        move: (event) => {
          if (this.element.classList.contains('maximized')) return;

          const el = this.element;
          let x = parseFloat(el.getAttribute('data-x') ?? '0');
          let y = parseFloat(el.getAttribute('data-y') ?? '0');

          el.style.width = `${event.rect.width}px`;
          el.style.height = `${event.rect.height}px`;

          x += event.deltaRect.left;
          y += event.deltaRect.top;

          el.style.transform = `translate(${x}px, ${y}px)`;
          el.setAttribute('data-x', String(x));
          el.setAttribute('data-y', String(y));
        },
      },
    });
  }

  mount(content: WindowContent): void {
    this.content = content;
    content.mount(this.contentEl);
  }

  setTitle(title: string): void {
    // textContent, not innerHTML: title can derive from a guest filename.
    this.titleEl.textContent = title;
  }

  focus(): void {
    this.element.classList.add('focused');
  }

  blur(): void {
    this.element.classList.remove('focused');
  }

  minimize(): void {
    this.element.classList.add('minimized');
  }

  restore(): void {
    this.element.classList.remove('minimized');
  }

  toggleMaximize(): void {
    this.element.classList.toggle('maximized');
  }

  setZIndex(z: number): void {
    this.element.style.zIndex = String(z);
  }

  destroy(): void {
    this.content?.destroy();
    interact(this.titlebarEl).unset();
    interact(this.element).unset();
    this.element.remove();
  }
}
