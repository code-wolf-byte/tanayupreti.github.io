// Checks the session's window state machine: intents in, instructions out. No
// browser needed: run it with `npm run test:session`.
import assert from 'node:assert/strict';
import { Session, createBus, type Instruction, type Intent } from '../../src/desktop/session.ts';

function setup(mobile = false) {
  const bus = createBus();
  new Session(bus);
  const out: Instruction[] = [];
  bus.instructions.subscribe((m) => out.push(m));
  const send = (i: Intent) => bus.intents.publish(i);
  send({ type: 'screen', width: 1400, height: 900, mobile });
  return { bus, out, send };
}

// Taskbar activate: minimize, then restore + focus; z only climbs.
{
  const { out, send } = setup();
  send({ type: 'launch', app: 'projects' });
  out.length = 0;
  send({ type: 'activate', id: 'win-1' });
  assert.deepEqual(out, [
    { type: 'minimize', id: 'win-1', minimized: true },
    { type: 'focus', id: null, z: 101 },
  ]);
  out.length = 0;
  send({ type: 'activate', id: 'win-1' });
  assert.deepEqual(out, [
    { type: 'minimize', id: 'win-1', minimized: false },
    { type: 'focus', id: 'win-1', z: 102 },
  ]);
}

// On mobile, activate always focuses — never minimizes.
{
  const { out, send } = setup(true);
  send({ type: 'launch', app: 'files' });
  out.length = 0;
  send({ type: 'activate', id: 'win-1' });
  assert.deepEqual(out.map((m) => m.type), ['focus']);
}

// Closing the focused window focuses the newest remaining one; closing a
// background window leaves focus alone.
{
  const { out, send } = setup();
  send({ type: 'launch', app: 'terminal' });
  send({ type: 'launch', app: 'files' });
  send({ type: 'launch', app: 'projects' });
  out.length = 0;
  send({ type: 'close', id: 'win-1' });
  assert.deepEqual(out, [{ type: 'destroy', id: 'win-1' }]);
  out.length = 0;
  send({ type: 'close', id: 'win-3' });
  assert.deepEqual(out.map((m) => `${m.type}:${'id' in m ? m.id : ''}`), ['destroy:win-3', 'focus:win-2']);
  out.length = 0;
  send({ type: 'close', id: 'win-3' });
  assert.deepEqual(out, [], 'closing twice is a no-op');
}

// Editor: titled by file name, dirty marker comes from the session.
{
  const { out, send } = setup();
  send({ type: 'launch', app: 'editor', path: '/home/user/scratch/notes.txt' });
  const create = out.find((m) => m.type === 'create');
  assert.equal(create?.type === 'create' && create.title, 'notes.txt');
  out.length = 0;
  send({ type: 'dirty', id: 'win-1', dirty: true });
  assert.deepEqual(out, [{ type: 'title', id: 'win-1', title: '• notes.txt', dirty: true }]);
}

// A subscriber that publishes mid-delivery must not overtake the message
// being delivered: every subscriber sees create before the focus it caused.
{
  const bus = createBus();
  new Session(bus);
  bus.intents.publish({ type: 'screen', width: 1400, height: 900, mobile: false });
  bus.instructions.subscribe((m) => {
    if (m.type === 'create') bus.intents.publish({ type: 'focus', id: m.id });
  });
  const seen: string[] = [];
  bus.instructions.subscribe((m) => seen.push(m.type));
  bus.intents.publish({ type: 'launch', app: 'files' });
  assert.equal(seen[0], 'create');
}

// Unknown ids are ignored everywhere rather than creating phantom state.
{
  const { out, send } = setup();
  for (const type of ['focus', 'close', 'minimize', 'activate'] as const) send({ type, id: 'nope' });
  send({ type: 'dirty', id: 'nope', dirty: true });
  assert.deepEqual(out, []);
}

console.log('session: ALL PASS');
