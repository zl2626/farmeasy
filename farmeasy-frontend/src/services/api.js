const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000/api";

const MEDIA_ORIGIN =
  import.meta.env.VITE_MEDIA_ORIGIN?.replace(/\/$/, "") ||
  API_BASE_URL.replace(/\/api$/, "");

export { API_BASE_URL };
export default API_BASE_URL;

export function mediaUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${MEDIA_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}
