import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Tarayıcı /App.tsx gibi kaynak URL'sine gidince SPA'ya yönlendir. Mutlaka en başta çalışmalı.
const redirectSourceUrls = (): import('vite').Plugin => ({
  name: 'redirect-source-urls',
  enforce: 'pre',
  configureServer(server: import('vite').ViteDevServer) {
    const redirect: (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => void = (req, res, next) => {
      const pathname = (req.url ?? '').split('?')[0];
      const accept = (req.headers.accept ?? '').toLowerCase();
      const isHtml = accept.includes('text/html');
      const isSourceFile = /^\/(App|MainApp|LandingPage|LegalPage|AuthContext|context|lib|admin)\.[tj]sx?$/i.test(pathname)
        || (/^\/(index)\.[tj]sx?$/i.test(pathname) && isHtml);
      const skip = pathname.includes('node_modules') || pathname.startsWith('/@') || pathname.startsWith('/src/');
      if (!skip && isSourceFile && isHtml) {
        res.statusCode = 302;
        res.setHeader('Location', '/');
        res.end();
        return;
      }
      next();
    };
    const app = server.middlewares as { stack: { route: string; handle: (req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => void }[] };
    if (Array.isArray(app.stack)) {
      app.stack = [{ route: '', handle: redirect }, ...app.stack];
    } else {
      server.middlewares.use(redirect);
    }
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [redirectSourceUrls(), react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
