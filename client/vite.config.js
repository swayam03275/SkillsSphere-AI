import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],

  // Pre-bundle heavy dependencies on startup for faster cold starts
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react-redux",
      "@reduxjs/toolkit",
      "recharts",
      "lucide-react",
      "socket.io-client",
      "zod",
    ],
  },

  build: {
    // Disable source maps in production for smaller bundles
    sourcemap: false,
    // Target modern browsers for smaller output
    target: "es2020",
    // Suppress warning for large chunks
    chunkSizeWarningLimit: 3000,
    // Manual chunk splitting for optimal caching
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux"],
          "vendor-charts": ["recharts"],
          "vendor-editor": ["@monaco-editor/react"],
          "vendor-icons": ["lucide-react"],
          "vendor-socket": ["socket.io-client"],
        },
      },
    },
  },

  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
      },
    },
  },
});