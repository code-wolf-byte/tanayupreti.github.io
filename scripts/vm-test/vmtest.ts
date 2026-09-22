// End-to-end check of src/webvm/vm.ts against the real alpine.ext2.
// Bundled with esbuild and driven by headless Chrome: ./scripts/vm-test/run.sh
import { exec, list, readFile, writeFile, isWritable, quote } from '../../src/webvm/vm';
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
  assert('home_has_portfolio_files', ['README.txt', 'about.txt', 'contact.txt', 'projects', 'scratch'].every((n) => homeNames.includes(n)), homeNames);
  assert('home_projects_is_dir', home.some((e) => e.name === 'projects' && e.isDir), home);
  assert('home_scratch_is_dir', home.some((e) => e.name === 'scratch' && e.isDir), home);

  // list() reports writability per entry — the file browser's lock glyph rides
  // on this, so it must match the permissions the image bakes in.
  const readmeEntry = home.find((e) => e.name === 'README.txt');
  assert('list_readonly_file_not_writable', readmeEntry?.writable === false, readmeEntry);
  const scratchDir = await list('/home/user/scratch');
  const notesEntry = scratchDir.find((e) => e.name === 'notes.txt');
  assert('list_scratch_file_writable', notesEntry?.writable === true, notesEntry);
  // Names with the type/writable prefix stripped cleanly (no leading marker).
  assert('list_names_clean', home.every((e) => !/^[dfrw] /.test(e.name)), homeNames);

  const projects = await list('/home/user/projects');
  assert('projects_populated', projects.length >= 3 && projects.every((e) => e.name.endsWith('.txt')), projects.map((e) => e.name));

  // Content must survive the config.json -> image -> VM trip intact.
  assert('readme_readable', (await readFile('/home/user/README.txt')).includes('Portfolio'), (await readFile('/home/user/README.txt')).slice(0, 40));
  assert('about_has_no_html', !(await readFile('/home/user/about.txt')).includes('<br'), (await readFile('/home/user/about.txt')).slice(0, 60));

  // Permissions: portfolio content read-only, scratch/ the one writable spot.
  const RO = '/home/user/README.txt';
  const RW = '/home/user/scratch/notes.txt';

  assert('readonly_not_writable', (await isWritable(RO)) === false);
  assert('scratch_is_writable', (await isWritable(RW)) === true);

  let roThrew = '';
  try {
    await writeFile(RO, 'should not land');
  } catch (e) {
    roThrew = String((e as Error).message);
  }
  assert('readonly_file_rejects_write', /denied|read-only/i.test(roThrew), roThrew);
  assert('readonly_content_intact', (await readFile(RO)).includes('Portfolio'), (await readFile(RO)).slice(0, 30));

  // Root-owned, so uid 1000 can't just chmod the guardrail away.
  assert('readonly_cannot_chmod', (await exec(`chmod +w ${quote(RO)} 2>&1 || echo blocked`)).includes('blocked'));
  assert('readonly_still_not_writable_after_chmod', (await isWritable(RO)) === false);

  // A read-only directory must reject new files too.
  assert('projects_dir_readonly', (await exec('touch /home/user/projects/new.txt 2>&1 || echo blocked')).includes('blocked'));

  // The shell's cwd stays usable, or the terminal feels broken.
  assert('home_dir_still_writable', (await exec('touch /home/user/.probe && echo ok && rm -f /home/user/.probe')).trim() === 'ok');

  // writeFile round-trip, including a path that needs shell quoting.
  await writeFile('/tmp/hello.txt', 'written from JS\n');
  assert('writeFile_roundtrip', (await readFile('/tmp/hello.txt')) === 'written from JS\n');

  await writeFile('/tmp/awkward name.txt', 'quoted ok\n');
  assert('writeFile_quoted_path', (await readFile('/tmp/awkward name.txt')) === 'quoted ok\n');

  assert('baseName_file', baseName('/home/user/README.txt') === 'README.txt', baseName('/home/user/README.txt'));
  assert('baseName_root', baseName('/') === '/', baseName('/'));

  // The editor's real job: open the writable file, edit, save, reopen.
  // Saving twice is what broke DataDevice before, so do it twice.
  const original = await readFile(RW);
  await writeFile(RW, original + '\nedited once\n');
  assert('editor_save_once', (await readFile(RW)).endsWith('edited once\n'));
  await writeFile(RW, original + '\nedited twice\n');
  assert('editor_save_twice', (await readFile(RW)).endsWith('edited twice\n'));
  await writeFile(RW, original);
  assert('editor_restore', (await readFile(RW)) === original);

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
