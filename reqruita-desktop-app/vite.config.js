// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,      // Electron expects this
    strictPort: true // Fail if 5173 is already in use
  },

  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
