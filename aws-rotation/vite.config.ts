import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [sveltekit()],
    preview: {
        port: 9999,
        host: '0.0.0.0',
    },
    server: {
        port: 5173,
    },
});
