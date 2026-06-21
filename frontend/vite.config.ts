import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Quita console.* y debugger del bundle de producción (no afecta a `dev`)
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        // React/ReactDOM/wouter cambian poco entre despliegues: en un chunk
        // aparte, el navegador los cachea aunque el resto de la app cambie.
        manualChunks: {
          vendor: ['react', 'react-dom', 'wouter'],
        },
      },
    },
  },
}));
