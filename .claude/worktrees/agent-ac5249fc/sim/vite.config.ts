import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/abm/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
