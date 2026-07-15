// End-to-end check of src/webvm/vm.ts against the real alpine.ext2.
// Bundled with esbuild and driven by headless Chrome: ./scripts/vm-test/run.sh
import { exec, list, readFile, writeFile, quote } from '../../src/webvm/vm';
import { parentOf, joinPath } from '../../src/windows/FileBrowserWindow';
import { baseName } from '../../src/windows/EditorWindow';

const results: Record<string, unknown> = {};
const log = (k: string, v: unknown) => {
  results[k] = v;
  document.body.textContent += `${k}: ${JSON.stringify(v)}\n`;
};

const assert = (name: string, cond: boolean, detail?: unknown) => {
  log(name, cond ? 'PASS' : `FAIL ${JSON.stringify(detail ?? '')}`);
};

try {
  // quote() is pure — check it before paying for a VM boot.
  assert('quote_plain', quote('/etc/hosts') === `'/etc/hosts'`, quote('/etc/hosts'));
  assert('quote_spaces', quote('/a b/c') === `'/a b/c'`, quote('/a b/c'));
  assert("quote_singlequote", quote("it's") === `'it'\\''s'`, quote("it's"));

  // Path helpers: pure, and the thing that strands a user at the wrong level.
  assert('parentOf_nested', parentOf('/usr/local/bin') === '/usr/local', parentOf('/usr/local/bin'));
  assert('parentOf_top', parentOf('/usr') === '/', parentOf('/usr'));
  assert('parentOf_root', parentOf('/') === '/', parentOf('/'));
  assert('parentOf_trailing_slash', parentOf('/usr/local/') === '/usr', parentOf('/usr/local/'));
  assert('joinPath_root', joinPath('/', 'etc') === '/etc', joinPath('/', 'etc'));
  assert('joinPath_nested', joinPath('/home/user', 'a.txt') === '/home/user/a.txt', joinPath('/home/user', 'a.txt'));

  // Walking up from a real directory must land somewhere that still lists.
  const upFromBin = parentOf('/usr/local/bin');
  assert('parentOf_lands_on_real_dir', (await list(upFromBin)).some((e) => e.name === 'bin'), upFromBin);

  // list() against a directory whose contents we know from the image build.
  const bins = await list('/usr/local/bin');
  const names = bins.map((e) => e.name).sort();
  assert('list_finds_portfolio_cmds', ['about', 'banner', 'help', 'projects', 'repo', 'whoami'].every((n) => names.includes(n)), names);
  assert('list_files_not_dirs', bins.every((e) => !e.isDir), bins);

  const root = await list('/');
  assert('list_marks_dirs', root.some((e) => e.name === 'etc' && e.isDir), root.filter((e) => e.name === 'etc'));
  assert('list_no_trailing_slash_in_name', root.every((e) => !e.name.endsWith('/')), root);

  // readFile
  const passwd = await readFile('/etc/passwd');
  assert('readFile_works', passwd.includes('root:'), passwd.slice(0, 60));

  // The portfolio content generate-content.mjs bakes into the home directory:
  // this is the first thing a visitor sees, so an empty /home/user is a bug.
  const home = await list('/home/user');
  const homeNames = home.map((e) => e.name).sort();
  assert('home_not_empty', home.length > 0, homeNames);
  assert('home_has_portfolio_files', ['README.txt', 'about.txt', 'contact.txt', 'projects'].every((n) => homeNames.includes(n)), homeNames);
  assert('home_projects_is_dir', home.some((e) => e.name === 'projects' && e.isDir), home);

  const projects = await list('/home/user/projects');
  assert('projects_populated', projects.length >= 3 && projects.every((e) => e.name.endsWith('.txt')), projects.map((e) => e.name));

  // Content must survive the config.json -> image -> VM trip intact.
  assert('readme_readable', (await readFile('/home/user/README.txt')).includes('Portfolio'), (await readFile('/home/user/README.txt')).slice(0, 40));
  assert('about_has_no_html', !(await readFile('/home/user/about.txt')).includes('<br'), (await readFile('/home/user/about.txt')).slice(0, 60));

  // Home files must be user-writable, or the editor can't save them.
  assert('home_files_writable_by_user', (await exec('test -w /home/user/README.txt && echo yes')).trim() === 'yes');

  // writeFile round-trip, including a path that needs shell quoting.
  await writeFile('/tmp/hello.txt', 'written from JS\n');
  assert('writeFile_roundtrip', (await readFile('/tmp/hello.txt')) === 'written from JS\n');

  await writeFile('/tmp/awkward name.txt', 'quoted ok\n');
  assert('writeFile_quoted_path', (await readFile('/tmp/awkward name.txt')) === 'quoted ok\n');

  assert('baseName_file', baseName('/home/user/README.txt') === 'README.txt', baseName('/home/user/README.txt'));
  assert('baseName_root', baseName('/') === '/', baseName('/'));

  // The editor's real job: open a portfolio file, edit it, save, reopen.
  // Saving twice is what broke DataDevice before, so do it twice.
  const target = '/home/user/README.txt';
  const original = await readFile(target);
  await writeFile(target, original + '\nedited once\n');
  assert('editor_save_once', (await readFile(target)).endsWith('edited once\n'));
  await writeFile(target, original + '\nedited twice\n');
  assert('editor_save_twice', (await readFile(target)).endsWith('edited twice\n'));
  await writeFile(target, original);
  assert('editor_restore', (await readFile(target)) === original);

  // Non-zero exit must reject, and must carry stderr (which is redirected too).
  let threw = '';
  try {
    await readFile('/definitely/missing');
  } catch (e) {
    threw = String((e as Error).message);
  }
  assert('exec_throws_on_failure', threw.length > 0 && /No such file|not found/i.test(threw), threw);

  // The lane must survive a failed RPC.
  assert('lane_survives_failure', (await exec('echo still alive')).trim() === 'still alive');

  // Concurrent callers must not interleave through the shared /out/rpc file.
  const [a, b, c] = await Promise.all([exec('echo aaa'), exec('echo bbb'), exec('echo ccc')]);
  assert('lane_serializes', a.trim() === 'aaa' && b.trim() === 'bbb' && c.trim() === 'ccc', { a, b, c });
} catch (e) {
  log('FATAL', String(e) + '\n' + ((e as Error).stack ?? ''));
}

const failed = Object.entries(results).filter(
  ([k, v]) => k === 'FATAL' || (typeof v === 'string' && (v as string).startsWith('FAIL'))
);
log('SUMMARY', failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED: ${failed.map(([k]) => k).join(', ')}`);
await fetch('/result', { method: 'POST', body: JSON.stringify(results, null, 2) });
