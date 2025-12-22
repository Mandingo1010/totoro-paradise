import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        // Exclude UI integration tests that require full Vue component mounting
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
    resolve: {
        alias: {
            '~': resolve(__dirname, '.'),
            '@': resolve(__dirname, '.'),
        },
    },
})