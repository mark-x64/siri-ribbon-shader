import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const includeReference = mode === 'reference';
  return {
    base: './',
    publicDir: includeReference ? 'public' : false,
    define: {
      'import.meta.env.VITE_REFERENCE_ENABLED': JSON.stringify(includeReference ? 'true' : 'false'),
    },
    plugins: [react()],
    server: {
      watch: { usePolling: true },
    },
  };
});
