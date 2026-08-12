import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vitest, not Jest: Next.js 15's own toolchain (SWC/Turbopack-adjacent)
 * plays more naturally with Vite's transform pipeline, and Vitest's
 * config/API is close enough to Jest's that nothing here should feel
 * unfamiliar. jsdom provides the browser-like environment component
 * tests render into.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
