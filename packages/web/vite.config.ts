import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  envDir: resolve(import.meta.dirname, "../.."),
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      "~": resolve(import.meta.dirname, "app"),
    },
    dedupe: ["react", "react-dom"],
  },
});
