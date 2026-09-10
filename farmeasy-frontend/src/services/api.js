const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") || "/api";

const MEDIA_ORIGIN =
  import.meta.env.VITE_MEDIA_ORIGIN?.replace(/\/$/, "") ||
  API_BASE_URL.replace(/\/api$/, "");

export { API_BASE_URL };
export default API_BASE_URL;

// Public auth calls must never attach or refresh an old session's credentials.
export async function publicRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error("连接服务超时，请稍后重试。");
    }
    throw new Error("无法连接账号服务，请确认服务已启动或联系管理员。");
  }
  if (response.status >= 500) throw new Error("账号服务暂时不可用，请稍后重试或联系管理员。");
  let data;
  try {
    data = await response.json();
  } catch {
    if (response.status === 404) throw new Error("账号服务地址不正确，请联系管理员。");
    throw new Error("账号服务响应异常，请联系管理员检查服务地址。");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("账号服务响应异常，请稍后重试。");
  }
  return { ok: response.ok, data };
}

let refreshRequest = null;
let refreshingToken = null;

export function expireSession() {
  for (const key of ["token", "refresh", "user"]) localStorage.removeItem(key);
  window.dispatchEvent(new Event("auth-expired"));
  return Object.assign(new Error("登录已过期，请重新登录后再试。"), { status: 401 });
}

export async function refreshAccessToken(failedToken) {
  const currentToken = localStorage.getItem("token");
  // Another request may already have renewed the token before this 401 arrived.
  if (currentToken && currentToken !== failedToken) return currentToken;
  const refresh = localStorage.getItem("refresh");
  if (!refresh) throw expireSession();
  if (refreshRequest && refreshingToken === refresh) return refreshRequest;

  refreshingToken = refresh;
  const request = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    // Do not restore a logged-out session or overwrite a newly logged-in user.
    if (localStorage.getItem("refresh") !== refresh) {
      throw new Error("登录状态已变更，请重试。");
    }
    if ([400, 401].includes(response.status)) throw expireSession();
    if (!response.ok) throw new Error("登录验证暂时不可用，请稍后重试。");
    const data = await response.json();
    if (typeof data.access !== "string" || !data.access) {
      throw new Error("登录验证返回异常，请稍后重试。");
    }
    if (localStorage.getItem("refresh") !== refresh) {
      throw new Error("登录状态已变更，请重试。");
    }
    localStorage.setItem("token", data.access);
    if (data.refresh) localStorage.setItem("refresh", data.refresh);
    return data.access;
  })();
  refreshRequest = request;
  try {
    return await request;
  } finally {
    if (refreshRequest === request) {
      refreshRequest = null;
      refreshingToken = null;
    }
  }
}

// For authenticated API calls only. Public/login requests use plain fetch.
export async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  let response = await fetch(url, { ...options, headers });
  if (response.status !== 401) return response;
  const newToken = await refreshAccessToken(token);
  headers.set("Authorization", `Bearer ${newToken}`);
  response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    if (localStorage.getItem("token") === newToken) throw expireSession();
    throw new Error("登录状态已变更，请重试。");
  }
  return response;
}

export function mediaUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${MEDIA_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
