import API_BASE_URL, { authFetch } from "./api";

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };
  const response = await authFetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: "服务器返回格式异常" };
  }
  if (!response.ok) {
    throw new Error(data?.error || Object.values(data || {}).flat()?.[0] || "请求失败，请稍后重试");
  }
  return data;
}

export function getFarmProfile() {
  return request("/farm/profile/");
}

export function saveFarmProfile(profile) {
  return request("/farm/profile/", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}

export function getFarmTasks() {
  return request("/farm/tasks/");
}

export function getAgriProducts(params = {}) {
  const search = new URLSearchParams(params).toString();
  return request(`/farm/products/${search ? `?${search}` : ""}`);
}

export function createPestDiagnosis(formData) {
  return request("/pest/diagnosis/", {
    method: "POST",
    body: formData,
  });
}

export function getPestDiagnoses() {
  return request("/pest/diagnoses/");
}

export function createFollowUp(payload) {
  return request("/pest/follow-up/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function matchSubsidies(payload) {
  return request("/subsidy/match/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
