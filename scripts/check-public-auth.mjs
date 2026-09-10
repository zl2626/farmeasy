// GitHub Pages must be able to reach the public backend before publishing.
// Local builds and Vercel builds do not depend on the previous deployment.
if (process.env.GITHUB_ACTIONS === 'true') {
  const base = process.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
  if (!base?.startsWith('https://')) throw new Error('Set VITE_API_BASE_URL to the deployed HTTPS backend.');
  const origin = 'https://zl2626.github.io';
  for (const [path, method, expected] of [
    ['/auth/register/', 'OPTIONS', 200],
    ['/auth/register/', 'POST', 400],
    ['/auth/login/', 'POST', 400],
    ['/auth/refresh/', 'POST', 400],
    ['/education/profile/', 'GET', 401],
  ]) {
    const headers = { Origin: origin, 'Content-Type': 'application/json' };
    if (method === 'OPTIONS') Object.assign(headers, {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
    });
    const response = await fetch(base + path, {
      method, headers, body: method === 'POST' ? '{}' : undefined,
      signal: AbortSignal.timeout(45000),
    });
    if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}`);
    if (response.headers.get('access-control-allow-origin') !== origin) throw new Error(`${path}: browser CORS is blocked`);
    if (method !== 'OPTIONS') {
      const data = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`${path}: invalid API response`);
    }
    console.log(`PASS public ${method} ${path}: ${response.status}, CORS allowed`);
  }
}
