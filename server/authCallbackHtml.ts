// Shared HTML template for OAuth redirect callback (/auth/callback)
// Automatically exchanges PKCE codes or tokens using Supabase client,
// informs opener / BroadcastChannel / LocalStorage, and returns user cleanly to /

export const getAuthCallbackHtml = (): string => {
  return `<!DOCTYPE html>
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
    <!-- Include Supabase JS to exchange code and store tokens directly -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h3>Authentication Successful</h3>
      <p>Connecting your Scholar profile... Returning to Grobaax Arena.</p>
      <a href="/" class="btn" id="returnBtn">Open Grobaax Arena</a>
    </div>
    <script>
      (async function() {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        const sParams = new URLSearchParams(search.replace(/^\\?/, ''));
        const hParams = new URLSearchParams(hash.replace(/^#/, ''));
        
        let code = sParams.get('code');
        let accessToken = hParams.get('access_token') || sParams.get('access_token');
        let refreshToken = hParams.get('refresh_token') || sParams.get('refresh_token');

        // Exchange code or set session via Supabase JS if available
        let session = null;
        try {
          if (typeof supabase !== 'undefined' && window.supabase?.createClient) {
            const sb = window.supabase.createClient(
              'https://rsnmxdyqrmkjsfxwypek.supabase.co',
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbm14ZHlxcm1ranNmeHd5cGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzI1NzYsImV4cCI6MjEwNDcwODU3Nn0.35_rPRhEbwfIpA5LlAKVueuxkLWjd4lyJphlNoVMaPc'
            );
            if (code) {
              const res = await sb.auth.exchangeCodeForSession(code);
              session = res.data?.session;
            } else if (accessToken) {
              const res = await sb.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              session = res.data?.session;
            }
          }
        } catch (e) {
          console.warn('[OAuth Callback] Session exchange notice:', e);
        }

        const payload = {
          type: 'SUPABASE_AUTH_SUCCESS',
          hash: hash,
          search: search,
          code: code,
          accessToken: session?.access_token || accessToken,
          refreshToken: session?.refresh_token || refreshToken,
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

        // 3. PostMessage directly to opener (for iframe / desktop popup)
        if (window.opener) {
          try {
            window.opener.postMessage(payload, '*');
          } catch(e) {}
          setTimeout(function() {
            try { window.close(); } catch(e) {}
          }, 600);
        } else {
          // If loaded directly (PWA or standalone redirect), replace URL to root
          setTimeout(function() {
            window.location.replace('/');
          }, 400);
        }
      })();
    </script>
  </body>
</html>`;
};
