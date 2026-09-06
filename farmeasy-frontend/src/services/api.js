const configuredBase = import.meta.env.VITE_API_BASE_URL || "/api";

export const API_BASE_URL = configuredBase.replace(/\/$/, "");

let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("auth:logout"));
}

function endpoint(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return response.json();
  const text = await response.text();
  return text ? { detail: text } : null;
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) throw new ApiError("登录状态已失效", 401);

  if (!refreshPromise) {
    refreshPromise = fetch(endpoint("/auth/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (response) => {
        const data = await parseResponse(response);
        if (!response.ok || !data?.access) {
          throw new ApiError("登录状态已失效", response.status, data);
        }
        localStorage.setItem("token", data.access);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);
        return data.access;
      })
      .catch((error) => {
        clearAuthStorage();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request(path, options = {}, canRetry = true) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem("token");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint(path), { ...options, headers });
  if (response.status === 401 && canRetry && localStorage.getItem("refresh")) {
    await refreshAccessToken();
    return request(path, options, false);
  }

  const data = await parseResponse(response);
  if (!response.ok) {
    const message = data?.error || data?.detail || "请求失败，请稍后重试。";
    throw new ApiError(message, response.status, data);
  }
  return data;
}

function bodyOptions(method, body, options = {}) {
  return {
    ...options,
    method,
    body: body instanceof FormData ? body : JSON.stringify(body),
  };
}

export const api = {
  request,
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, bodyOptions("POST", body, options)),
  put: (path, body, options) => request(path, bodyOptions("PUT", body, options)),
  patch: (path, body, options) => request(path, bodyOptions("PATCH", body, options)),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};

export function mediaUrl(path) {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith("blob:")) return path;
  if (!/^https?:\/\//i.test(API_BASE_URL)) return path.startsWith("/") ? path : `/${path}`;
  const origin = new URL(API_BASE_URL).origin;
  return `${origin}/${path.replace(/^\/+/, "")}`;
}

export default API_BASE_URL;
