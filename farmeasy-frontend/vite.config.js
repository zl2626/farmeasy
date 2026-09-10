import { fileURLToPath } from "node:url";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves project sites under /<repository-name>/.
// Set VITE_BASE_PATH=/ when deploying a user/organization site (username.github.io).
const base = process.env.VITE_BASE_PATH || "/";
const proxy = {
  "/api": { target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8001", changeOrigin: true },
  "/media": { target: process.env.API_PROXY_TARGET || "http://127.0.0.1:8001", changeOrigin: true },
};

// https://vite.dev/config/
export default defineConfig({
  base,
  server: { proxy },
  preview: { proxy },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
});
