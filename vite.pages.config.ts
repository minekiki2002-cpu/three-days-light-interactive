import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "pages-src",
  publicDir: resolve(__dirname, "public"),
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "pages-dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
  },
});
