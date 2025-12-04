import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/community-survey/" : "/",

  // WASM-specific optimizations
  optimizeDeps: {
    exclude: ["@duckdb/duckdb-wasm"],
  },

  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove all console.* calls in production
        drop_debugger: true, // Remove debugger statements
      },
    },
  },

  // Development server configuration
  server: {
    host: true, // Bind to all network interfaces (accessible on local network)
    port: 5173,
    strictPort: true, // CRITICAL: Exit with error if port 5173 is not available
    fs: {
      allow: ["."],
    },
    // Allow all hosts for local network access
    allowedHosts: "all",
    // CRITICAL: Required for SharedArrayBuffer support
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
}));
