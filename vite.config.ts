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
    cssCodeSplit: true,
    sourcemap: mode === 'development',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
          ],
          charts: ['recharts', 'react-simple-maps'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js', '@supabase/auth-helpers-react'],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') 
            : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
    // Performance optimizations
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
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
    postcss: {
      plugins: mode === 'production' ? [
        require('cssnano')({
          preset: ['default', {
            discardComments: { removeAll: true },
            reduceIdents: false,
          }],
        }),
      ] : [],
    },
  },
}));
