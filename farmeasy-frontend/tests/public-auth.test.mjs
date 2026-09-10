import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8');
const api = await import(`data:text/javascript,${encodeURIComponent(source.replaceAll('import.meta.env', '({ PROD: false })'))}`);

test('development requests use the frontend origin instead of the visitor loopback', () => {
  assert.equal(api.API_BASE_URL, '/api');
});

test('HTML from a wrong backend is reported as a service error', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Not Found</html>', { status: 404 }));
  await assert.rejects(() => api.publicRequest('/auth/login/', {}), /服务地址/);
});

test('registration validation errors are preserved for the form', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ mobile_number: ['该手机号已被注册'] }, { status: 400 }));
  assert.deepEqual(await api.publicRequest('/auth/register/', {}), {
    ok: false, data: { mobile_number: ['该手机号已被注册'] },
  });
});

test('connection failure has an actionable message', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(() => api.publicRequest('/auth/login/', {}), /无法连接/);
});

test('invalid successful JSON cannot be treated as an auth response', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json(null));
  await assert.rejects(() => api.publicRequest('/auth/login/', {}), /响应异常/);
});

test('password recovery preserves a JSON business 404', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ error: '该邮箱尚未注册' }, { status: 404 }));
  assert.deepEqual(await api.publicRequest('/auth/forgot-password/', {}), {
    ok: false, data: { error: '该邮箱尚未注册' },
  });
});
