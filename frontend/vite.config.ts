// Se importa de `vitest/config` y no de `vite`: es el mismo `defineConfig` con el
// bloque `test` incluido en los tipos.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/prueba/configuracion.ts'],
    css: false,
    include: ['src/**/*.prueba.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.prueba.{ts,tsx}', 'src/prueba/**', 'src/main.tsx'],
    },
  },
});
