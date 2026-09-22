// CheerpX builds are immutable per-version, so pinning is safe: what works today
// keeps working forever. See https://cheerpx.io/docs/getting-started
const CHEERPX_URL = 'https://cxrtnc.leaningtech.com/1.2.8/cx.esm.js';

export interface CheerpXDevice {
  [key: string]: unknown;
}

/** JS -> VM: files written here appear under this device's mount point. */
export interface CheerpXDataDevice extends CheerpXDevice {
  writeFile(path: string, data: string): Promise<void>;
}

/** VM -> JS: the only supported way to read guest bytes back out. */
export interface CheerpXIDBDevice extends CheerpXDevice {
  readFileAsBlob(path: string): Promise<Blob>;
}

export interface CheerpXLinux {
  setConsole(el: HTMLElement): void;
  /**
   * Bypasses setConsole's built-in renderer (which sizes itself from the DOM
   * element and has had column-width miscalculations under fractional
   * display scaling). We drive rendering with xterm.js instead, which
   * measures cols/rows itself and is not subject to that.
   */
  setCustomConsole(
    writeFunc: (buf: Uint8Array, vt: number) => void,
    cols: number,
    rows: number
  ): (keyCode: number) => void;
  run(
    path: string,
    args: string[],
    opts?: {
      env?: string[];
      cwd?: string;
      uid?: number;
      gid?: number;
    }
  ): Promise<{ status: number }>;
}

/** 'devs'/'proc' are kernel-provided and take no dev. */
export type CheerpXMount =
  | { type: 'ext2' | 'dir'; path: string; dev: CheerpXDevice }
  | { type: 'devs' | 'proc' | 'sys' | 'devpts'; path: string };

export interface CheerpXModule {
  HttpBytesDevice: { create(url: string): Promise<CheerpXDevice> };
  IDBDevice: { create(name: string): Promise<CheerpXIDBDevice> };
  DataDevice: { create(): Promise<CheerpXDataDevice> };
  OverlayDevice: { create(lower: CheerpXDevice, upper: CheerpXDevice): Promise<CheerpXDevice> };
  Linux: {
    create(opts: { mounts: CheerpXMount[] }): Promise<CheerpXLinux>;
  };
}

let cheerpXPromise: Promise<CheerpXModule> | null = null;

export function loadCheerpX(): Promise<CheerpXModule> {
  if (!cheerpXPromise) {
    cheerpXPromise = import(/* @vite-ignore */ CHEERPX_URL) as Promise<CheerpXModule>;
  }
  return cheerpXPromise;
}
