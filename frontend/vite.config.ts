import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_BASE || "http://localhost:3001";

  return {
    plugins: [tailwindcss()],
    build: {
      sourcemap: false,
    },
    server: {
      proxy: {
        "/api": apiBase,
      },
    },
    preview: {
      proxy: {
        "/api": apiBase,
      },
    },
  };
});
