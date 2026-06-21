import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Quita console.* y debugger del bundle de producción (no afecta a `dev`)
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },

  build: {
    target: 'es2020',
    cssMinify: true,
    sourcemap: mode !== 'production', // sourcemaps en dev, no en producción (no expongas el fuente)
    chunkSizeWarningLimit: 600, // KB — avisa si algún chunk crece demasiado

    rollupOptions: {
      output: {
        // React/ReactDOM/wouter cambian poco entre despliegues: en un chunk
        // aparte, el navegador los cachea aunque el resto de la app cambie.
        manualChunks: {
          vendor: ['react', 'react-dom', 'wouter'],
          'vendor-icons': ['lucide-react'],     // ~500+ iconos: chunk propio para no inflar el bundle principal
          'vendor-utils': ['clsx', 'tailwind-merge'],
        },
      },
    },

    // Opcional: ~2-5% menos peso que esbuild, pero requiere `npm i -D terser`.
    // Descomenta solo si lo instalas:
    // minify: 'terser',
    // terserOptions: { compress: { drop_console: true, drop_debugger: true } },
  },
}));
