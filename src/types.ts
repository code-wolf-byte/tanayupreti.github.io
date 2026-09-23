export type WindowId = string;

export interface WindowOptions {
  title: string;
  /** CSS colour (or var() reference) this app owns. Defaults to --accent. */
  accent?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

export interface WindowContent {
  mount(container: HTMLElement): void;
  destroy(): void;
}
