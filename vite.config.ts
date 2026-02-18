/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/tests/**', 'src/main.ts', 'src/ui.ts'],
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
