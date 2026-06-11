import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default mergeConfig(
  {
    plugins: [react(), tailwindcss()],
  },
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup/frontend.js'],
      include: [
        'tests/**/*.test.{js,jsx}',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**', 'server/**'],
        exclude: [
          'node_modules',
          'dist',
          'public',
          '**/*.config.*',
          'src/main.jsx',
          'src/index.css',
        ],
      },
      css: false,
    },
  }),
);
