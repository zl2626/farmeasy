import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function loadApi(env) {
  const source = await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8');
  return import(`data:text/javascript,${encodeURIComponent(source.replaceAll('import.meta.env', JSON.stringify(env)))}`);
}

test('production never defaults to the visitor computer', async () => {
  const api = await loadApi({ PROD: true });
  assert.equal(api.API_BASE_URL, '/api');
});

test('development uses the same-origin Django proxy', async () => {
  const api = await loadApi({ PROD: false });
  assert.equal(api.API_BASE_URL, '/api');
});

test('configured API and uploaded images use the public backend', async () => {
  const api = await loadApi({ PROD: true, VITE_API_BASE_URL: 'https://api.example.com/api/' });
  assert.equal(api.API_BASE_URL, 'https://api.example.com/api');
  assert.equal(api.mediaUrl('/media/leaf.png'), 'https://api.example.com/media/leaf.png');
});
