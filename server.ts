import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiApp } from './server/apiApp';
import { getAuthCallbackHtml } from './server/authCallbackHtml';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount unified API routes
  app.use(apiApp);

  // Lightweight OAuth Callback endpoint to handle cross-origin popup & PWA redirect authentication
  app.get(['/auth/callback', '/auth/callback/'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getAuthCallbackHtml());
  });

  // Explicit handlers for search engine robots & sitemap
  app.get('/robots.txt', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const robotsPath = path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'robots.txt');
    res.sendFile(robotsPath);
  });

  app.get('/sitemap.xml', (_req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const sitemapPath = path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'sitemap.xml');
    res.sendFile(sitemapPath);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Grobaax Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Grobaax server:', err);
});
