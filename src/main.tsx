import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { isCorporateAdvertisingDomain } from './utils/domainPortal';

const isCorporatePortal =
  typeof window !== 'undefined' && isCorporateAdvertisingDomain();

// Intercept uncaught Firestore quota resource-exhausted rejections gracefully and filter benign Vite HMR logs
if (typeof window !== 'undefined') {
  const _origConsoleError = console.error;
  console.error = function (...args: any[]) {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      (args[0].includes('[vite] failed to connect to websocket') ||
        args[0].includes('[vite] connecting') ||
        args[0] === '[vite]' ||
        args[0].startsWith('[vite]'))
    ) {
      return;
    }
    _origConsoleError.apply(console, args);
  };

  if (!isCorporatePortal) {
    window.addEventListener('unhandledrejection', (event) => {
      if (
        event.reason &&
        (String(event.reason).includes('resource-exhausted') ||
          String(event.reason?.message).includes('resource-exhausted') ||
          event.reason?.code === 'resource-exhausted')
      ) {
        event.preventDefault();
        console.warn('Firestore write quota exceeded; operating in offline fallback mode.');
      }
    });

    // Prevent multi-touch pinch zoom while ensuring smooth vertical scrolling on student PWA
    document.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    document.addEventListener(
      'touchmove',
      (event) => {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    // Prevent Safari gesture zooming
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });
    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });
    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });
  }
}

const root = createRoot(document.getElementById('root')!);

async function importWithRetry<T>(
  loader: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loader();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delayMs = 350 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

function handleBootstrapFailure(err: unknown) {
  console.error('Failed to load Grobaax application module:', err);
  if (typeof window !== 'undefined') {
    try {
      const reloadKey = 'grobaax_module_retry_reloaded';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(reloadKey);
    } catch (_) {}
  }

  root.render(
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans space-y-4">
      <h1 className="text-xl font-black tracking-tight">Unable to load Grobaax</h1>
      <p className="text-sm text-slate-300 max-w-md">
        A temporary connection issue interrupted loading. Tap below to reload cleanly.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer"
      >
        Reload App
      </button>
    </div>
  );
}

if (isCorporatePortal) {
  // Ensure any previously installed student PWA service worker is removed on advertise.grobaax.com
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      })
      .catch(() => {});
  }

  // Load ONLY the Corporate Advertising Portal without importing or executing any student modules
  void importWithRetry(() => import('./components/Corporate/CorporateAdvertisingPortal'))
    .then(({ CorporateAdvertisingPortal }) => {
      try {
        sessionStorage.removeItem('grobaax_module_retry_reloaded');
      } catch (_) {}
      root.render(
        <StrictMode>
          <CorporateAdvertisingPortal />
        </StrictMode>
      );
    })
    .catch(handleBootstrapFailure);
} else {
  if (typeof window !== 'undefined') {
    if (import.meta.env.DEV && 'serviceWorker' in navigator) {
      // Unregister stale service workers during development so Vite /src/* modules are never intercepted
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
        })
        .catch(() => {});
    } else if (import.meta.env.PROD) {
      // Student domains (grobaax.com, www.grobaax.com): register student PWA SW in production
      void import('virtual:pwa-register')
        .then(({ registerSW }) => {
          const updateSW = registerSW({
            immediate: true,
            onNeedRefresh() {
              console.log('PWA: New content available, applying update and reloading...');
              updateSW(true);
            },
            onOfflineReady() {
              console.log('PWA: App is ready for offline use.');
            },
          });

          window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              updateSW(true);
            }
          });
        })
        .catch(() => {});
    }
  }

  void importWithRetry(() => import('./App'))
    .then(({ default: App }) => {
      try {
        sessionStorage.removeItem('grobaax_module_retry_reloaded');
      } catch (_) {}
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    })
    .catch(handleBootstrapFailure);
}
