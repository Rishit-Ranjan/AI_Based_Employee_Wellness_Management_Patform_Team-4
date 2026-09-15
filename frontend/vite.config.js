import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { defineConfig } from 'vite';

export default defineConfig(() => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    return {
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
        server: {
            proxy: {
                '/api': {
                    target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
                    changeOrigin: true,
                    secure: false,
                    configure: (proxy) => {
                        // Throttle "backend down" logs: one line per outage window
                        // instead of one per failed request.
                        let outSince = 0;
                        let suppressed = 0;
                        const isConnErr = (e) =>
                            e && (e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET' || e.code === 'ECONNABORTED' || e.code === 'EPIPE');
                        proxy.on('error', (err) => {
                            if (!isConnErr(err)) {
                                console.log('[vite] Proxy error:', err.code || err.message || err);
                                return;
                            }
                            const now = Date.now();
                            if (now - outSince > 5000) {
                                const note = suppressed ? ` (${suppressed} previous requests suppressed)` : '';
                                suppressed = 0;
                                outSince = now;
                                console.log(`[vite] Backend unreachable, waiting for it to come up...${note}`);
                            } else {
                                suppressed++;
                            }
                        });
                        proxy.on('proxyRes', () => {
                            if (outSince) {
                                console.log('[vite] Backend connection restored.');
                                outSince = 0;
                                suppressed = 0;
                            }
                        });
                    },
                },
            },
            hmr: process.env.DISABLE_HMR !== 'true',
            watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
    };
});