// The single CheerpX Linux instance for the whole page, plus the RPC used by
// desktop apps to reach the guest filesystem.
//
// CheerpX has no filesystem API for JS, so reads come back through an
// IDB-backed dir mount (/out) and writes go in through a DataDevice (/data).
// Only one Linux instance may exist per page, so it lives here rather than
// inside any one window.
import { loadCheerpX } from './loadCheerpX';
import type { CheerpXDataDevice, CheerpXIDBDevice, CheerpXLinux } from './loadCheerpX';

const DISK_IMAGE_URL = '/webvm/alpine.ext2';
// The overlay stores writes made against a specific base image. Rebuilding
// alpine.ext2 shifts the blocks underneath it, so bump this suffix whenever the
// image is rebuilt — otherwise returning visitors keep a stale overlay over a
// new base and see the old filesystem (or a corrupted mix).
const OVERLAY_STORE_NAME = 'webvm-alpine-overlay-6';
const RPC_STORE_NAME = 'webvm-rpc';

// Paths as the guest sees them; the device-relative twin is the same minus the mount point.
const RPC_OUT_GUEST = '/out/rpc';
const RPC_OUT_DEV = '/rpc';
const SCRATCH_DIR_GUEST = '/data';

interface Vm {
  cx: CheerpXLinux;
  out: CheerpXIDBDevice;
  data: CheerpXDataDevice;
}

let vmPromise: Promise<Vm> | null = null;

export function vm(): Promise<Vm> {
  if (!vmPromise) vmPromise = boot();
  return vmPromise;
}

async function boot(): Promise<Vm> {
  if (!window.crossOriginIsolated) {
    // coi-serviceworker normally reloads us into an isolated context on first
    // activation; if it hasn't, CheerpX can't have its SharedArrayBuffer.
    window.location.reload();
    throw new Error('reloading to obtain cross-origin isolation');
  }

  const CheerpX = await loadCheerpX();

  const blockDevice = await CheerpX.HttpBytesDevice.create(DISK_IMAGE_URL);
  const overlayDevice = await CheerpX.OverlayDevice.create(
    blockDevice,
    await CheerpX.IDBDevice.create(OVERLAY_STORE_NAME)
  );
  const out = await CheerpX.IDBDevice.create(RPC_STORE_NAME);
  const data = await CheerpX.DataDevice.create();

  const cx = await CheerpX.Linux.create({
    mounts: [
      { type: 'ext2', path: '/', dev: overlayDevice },
      { type: 'devs', path: '/dev' },
      { type: 'proc', path: '/proc' },
      { type: 'dir', path: '/out', dev: out },
      { type: 'dir', path: '/data', dev: data },
    ],
  });

  return { cx, out, data };
}

/** Wrap a path/word for /bin/sh. Filenames with spaces or quotes are normal. */
export const quote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`;

// Concurrent cx.run works, but a single lane costs three lines and removes a
// whole class of races (notably two RPCs sharing the one /out/rpc file).
let lane: Promise<unknown> = Promise.resolve();

/**
 * Run a shell command in the VM and return its combined output.
 *
 * stdout+stderr MUST stay redirected into /out: anything unredirected is
 * written to vt1 and corrupts the terminal window's display.
 */
export function exec(cmd: string): Promise<string> {
  const run = async (): Promise<string> => {
    const { cx, out } = await vm();
    const { status } = await cx.run('/bin/sh', ['-c', `{ ${cmd} ; } > ${RPC_OUT_GUEST} 2>&1`]);
    const text = await (await out.readFileAsBlob(RPC_OUT_DEV)).text();
    if (status !== 0) throw new Error(text.trim() || `command failed (status ${status})`);
    return text;
  };
  // Chain on settle, not success, so one failed RPC doesn't wedge the lane.
  const result = lane.then(run, run);
  lane = result.catch(() => undefined);
  return result;
}

export interface DirEntry {
  name: string;
  isDir: boolean;
  writable: boolean;
}

/**
 * List a directory with per-entry type and writability, in one RPC. Writability
 * is a real `test -w` as the VM's uid, so it matches what a save would do — the
 * file browser uses it to mark read-only files without a round-trip each.
 * Output line format: "<d|f> <w|r> <name>".
 */
export async function list(path: string): Promise<DirEntry[]> {
  const text = await exec(
    `cd ${quote(path)} && ls -A | while IFS= read -r e; do ` +
      `t=f; [ -d "$e" ] && t=d; w=r; [ -w "$e" ] && w=w; ` +
      `printf '%s %s %s\\n' "$t" "$w" "$e"; done`
  );
  return text
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const m = /^(.) (.) (.*)$/.exec(line);
      // Defensive: a name that somehow lacks the prefix is treated as a plain file.
      if (!m) return { name: line, isDir: false, writable: false };
      return { name: m[3], isDir: m[1] === 'd', writable: m[2] === 'w' };
    });
}

export const readFile = (path: string): Promise<string> => exec(`cat ${quote(path)}`);

/**
 * Whether the VM's user can write this path. Runs as the same uid as
 * writeFile (1000), so it can't disagree with what a save would actually do.
 */
export const isWritable = async (path: string): Promise<boolean> =>
  // `|| echo no`: test exits non-zero when not writable, and exec throws on that.
  (await exec(`test -w ${quote(path)} && echo yes || echo no`)).trim() === 'yes';

let scratchSeq = 0;

export async function writeFile(path: string, content: string): Promise<void> {
  const { data } = await vm();
  // DataDevice is the only JS->VM channel, and it is add-only: writing a path
  // it already holds throws "Unable to add file". So every write gets a fresh
  // name, then gets copied into place.
  // ponytail: scratch entries accumulate in memory for the session (no delete
  // API on DataDevice). Fine for editor-sized saves; if a session ever writes
  // enough to matter, base64 the content through `exec` instead.
  const scratch = `/scratch-${scratchSeq++}`;
  await data.writeFile(scratch, content);
  // `cat >` rather than `cp`: under CheerpX, cp onto an *existing* file fails,
  // resolving the destination as a directory ("cannot create regular file
  // '<dest>/<src>'"). Redirection works for both new and existing paths, and
  // keeps the destination's own inode and permissions.
  await exec(`cat ${SCRATCH_DIR_GUEST}${scratch} > ${quote(path)}`);
}
