import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force all React-related packages to use the same instance
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-slot",
      "@radix-ui/react-toast",
      "@tanstack/react-query",
      "recharts",
      "lucide-react",
    ],
    exclude: ["@vite/client", "@vite/env"],
    force: mode === 'development', // Only force in development
  },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: mode === 'development',
    minify: 'esbuild',
  },
  esbuild: {
    // Tree shaking optimizations
    treeShaking: true,
    // Remove console logs in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // CSS optimizations
  css: {
    devSourcemap: mode === 'development',
  },
}));
