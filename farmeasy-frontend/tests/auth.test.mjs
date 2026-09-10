import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

let instance = 0;
async function setup(t, responder) {
  const values = new Map([['token', 'expired-access'], ['refresh', 'valid-refresh'], ['user', '{}']]);
  t.mock.method(globalThis, 'fetch', responder);
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  t.after(() => {
    for (const [key, descriptor] of [['localStorage', originalStorage], ['window', originalWindow]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } });
  const events = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events });
  const source = await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8');
  const apiUrl = `data:text/javascript,${encodeURIComponent(source.replaceAll('import.meta.env', '{ PROD: true }'))}#${instance++}`;
  const agri = await readFile(new URL('../src/services/agriService.js', import.meta.url), 'utf8');
  const service = await import(`data:text/javascript,${encodeURIComponent(agri.replace('"./api"', JSON.stringify(apiUrl)))}`);
  return { service, values, events };
}
const json = (body, status = 200) => Response.json(body, { status });
const invalid = () => json({ detail: 'Given token not valid for any token type', code: 'token_not_valid' }, 401);

test('farm requests recover from expired access tokens', async t => {
  const { service, values } = await setup(t, async (url, options) => {
    if (url.endsWith('/auth/refresh/')) return json({ access: 'new-access', refresh: 'rotated-refresh' });
    return new Headers(options.headers).get('Authorization') === 'Bearer new-access' ? json({ name: 'farm' }) : invalid();
  });
  assert.deepEqual(await service.getFarmProfile(), { name: 'farm' });
  assert.equal(values.get('token'), 'new-access');
  assert.equal(values.get('refresh'), 'rotated-refresh');
});

test('concurrent farm requests share a refresh', async t => {
  let refreshes = 0;
  const { service } = await setup(t, async (url, options) => {
    if (url.endsWith('/auth/refresh/')) { refreshes++; return json({ access: 'new-access' }); }
    return new Headers(options.headers).get('Authorization') === 'Bearer new-access' ? json([]) : invalid();
  });
  assert.deepEqual(await Promise.all([service.getFarmProfile(), service.getFarmTasks()]), [[], []]);
  assert.equal(refreshes, 1);
});

for (const missing of [false, true]) {
  test(`unrecoverable session clears credentials (missing refresh: ${missing})`, async t => {
    const { service, values, events } = await setup(t, async () => invalid());
    if (missing) values.delete('refresh');
    let expired = 0;
    events.addEventListener('auth-expired', () => expired++);
    await assert.rejects(service.getFarmProfile(), /登录已过期/);
    assert.equal(values.size, 0);
    assert.equal(expired, 1);
  });
}

test('temporary refresh failure preserves login', async t => {
  const { service, values } = await setup(t, async url => url.endsWith('/auth/refresh/') ? json({}, 503) : invalid());
  await assert.rejects(service.getFarmProfile(), /稍后重试/);
  assert.equal(values.get('refresh'), 'valid-refresh');
});

test('retried upload preserves its body and stops after another 401', async t => {
  const body = new FormData();
  body.append('image', new Blob(['image']), 'leaf.png');
  let attempts = 0;
  const { service, values } = await setup(t, async (url, options) => {
    if (url.endsWith('/auth/refresh/')) return json({ access: 'new-access' });
    attempts++;
    assert.equal(options.body, body);
    assert.equal(new Headers(options.headers).has('Content-Type'), false);
    return invalid();
  });
  await assert.rejects(service.createPestDiagnosis(body), /登录已过期/);
  assert.equal(attempts, 2);
  assert.equal(values.size, 0);
});

test('refresh response cannot restore credentials after logout', async t => {
  let release;
  let started;
  const pending = new Promise(resolve => { release = resolve; });
  const refreshing = new Promise(resolve => { started = resolve; });
  const { service, values } = await setup(t, async url => {
    if (url.endsWith('/auth/refresh/')) { started(); return pending; }
    return invalid();
  });
  const request = service.getFarmProfile();
  await refreshing;
  values.clear();
  release(json({ access: 'new-access' }));
  await assert.rejects(request, /登录状态已变更/);
  assert.equal(values.size, 0);
});

test('permission errors do not refresh or log out the user', async t => {
  const { service, values } = await setup(t, async url => {
    assert.ok(!url.endsWith('/auth/refresh/'));
    return json({ detail: 'Permission denied' }, 403);
  });
  await assert.rejects(service.getFarmProfile(), /Permission denied/);
  assert.equal(values.get('token'), 'expired-access');
});

test('late 401 reuses the token already renewed by another request', async t => {
  let refreshes = 0;
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  const { service } = await setup(t, async (url, options) => {
    if (url.endsWith('/auth/refresh/')) { refreshes++; return json({ access: 'new-access' }); }
    if (new Headers(options.headers).get('Authorization') === 'Bearer new-access') return json([]);
    if (url.endsWith('/farm/tasks/')) return delayed;
    return invalid();
  });
  const slow = service.getFarmTasks();
  await service.getFarmProfile();
  release(invalid());
  assert.deepEqual(await slow, []);
  assert.equal(refreshes, 1);
});
