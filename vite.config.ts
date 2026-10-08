import { createServer, defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Put the real landing page in HTML in dev and production; hosting remains static. */
function landingPage(): Plugin {
  let base = '/';
  return {
    name: 'landing-page-html',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html, context) {
        const server =
          context.server ??
          (await createServer({
            configFile: false,
            base,
            // Build-time rendering must not rewrite the running dev server's dependency cache.
            cacheDir: 'node_modules/.vite-prerender',
            plugins: [react()],
            optimizeDeps: { noDiscovery: true, include: [] },
            server: { middlewareMode: true },
            appType: 'custom',
          }));
        try {
          const { render } = await server.ssrLoadModule('/src/prerender.tsx');
          return html.replace('<!--app-html-->', () => render());
        } finally {
          if (!context.server) await server.close();
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), landingPage()],
});
