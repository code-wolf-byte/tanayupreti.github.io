export type WindowId = string;

export interface WindowOptions {
  title: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface WindowContent {
  mount(container: HTMLElement): void;
  destroy(): void;
}
