import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  // `vite preview` serves the production build. It needs the same API proxy
  // as the dev server, otherwise a preview of the built app cannot reach the
  // backend and every /api call 404s.
  preview: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
