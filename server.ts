import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiApp } from './server/apiApp';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount unified API routes
  app.use(apiApp);

  // Lightweight OAuth Callback endpoint to handle cross-origin popup & tab authentication without iframe nesting
  app.get(['/auth/callback', '/auth/callback/'], (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connecting to Grobaax Arena...</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: #090d16;
        color: #f8fafc;
        text-align: center;
        padding: 24px;
        box-sizing: border-box;
      }
      .card {
        background: #111827;
        border: 1px solid #1f2937;
        padding: 32px 28px;
        border-radius: 20px;
        max-width: 380px;
        width: 100%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .spinner {
        width: 44px;
        height: 44px;
        border: 4px solid rgba(245, 158, 11, 0.15);
        border-top-color: #f59e0b;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 20px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      h3 { margin: 0 0 8px; font-size: 19px; font-weight: 700; color: #fff; }
      p { margin: 0; font-size: 13.5px; color: #94a3b8; line-height: 1.5; }
      .btn {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 24px;
        background: #f59e0b;
        color: #000;
        font-weight: 700;
        border-radius: 12px;
        text-decoration: none;
        font-size: 14px;
        cursor: pointer;
        border: none;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h3>Authentication Successful</h3>
      <p>Connecting your Scholar profile... You may return to the application.</p>
      <a href="/" class="btn" id="returnBtn">Open Grobaax Arena</a>
    </div>
    <script>
      (function() {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        
        // Parse access_token if present in hash
        let accessToken = null;
        let refreshToken = null;
        let expiresIn = 3600;
        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
          expiresIn = parseInt(params.get('expires_in') || '3600', 10);
        }

        // Parse code if present in search (PKCE flow)
        let code = null;
        if (search) {
          const sParams = new URLSearchParams(search.replace(/^\?/, ''));
          code = sParams.get('code');
        }

        const payload = {
          type: 'SUPABASE_AUTH_SUCCESS',
          hash: hash,
          search: search,
          code: code,
          accessToken: accessToken,
          refreshToken: refreshToken,
          timestamp: Date.now()
        };

        // 1. BroadcastChannel for cross-tab communication
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('grobaax_oauth_channel');
            bc.postMessage(payload);
          }
        } catch(e) {}

        // 2. LocalStorage event for cross-window / mobile browsers
        try {
          localStorage.setItem('grobaax_oauth_event', JSON.stringify(payload));
        } catch(e) {}

        // 3. PostMessage directly to opener
        if (window.opener) {
          try {
            window.opener.postMessage(payload, '*');
          } catch(e) {}
          setTimeout(function() {
            try { window.close(); } catch(e) {}
          }, 800);
        } else {
          // If opened in separate tab (e.g. mobile Chrome), redirect back to home after 1.5s
          setTimeout(function() {
            window.location.href = '/';
          }, 1500);
        }
      })();
    </script>
  </body>
</html>`);
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
