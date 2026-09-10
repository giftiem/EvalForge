import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredBaseUrl = env.EVALFORGE_SERVICE_BASE_URL?.trim().replace(/\/$/, "");
  let reasoningProxy = {};

  if (configuredBaseUrl) {
    const upstream = new URL(configuredBaseUrl);
    const upstreamPath = upstream.pathname.replace(/\/$/, "");
    reasoningProxy = {
      "/api/evalforge": {
        target: upstream.origin,
        changeOrigin: true,
        rewrite: (path: string) => `${upstreamPath}${path.replace(/^\/api\/evalforge/, "")}`,
      },
    };
  }

  return {
    plugins: [react()],
    server: { proxy: reasoningProxy },
    test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
  };
});
