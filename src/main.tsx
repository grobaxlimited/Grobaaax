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
  void import('./components/Corporate/CorporateAdvertisingPortal').then(
    ({ CorporateAdvertisingPortal }) => {
      root.render(
        <StrictMode>
          <CorporateAdvertisingPortal />
        </StrictMode>
      );
    }
  );
} else {
  // Student domains (grobaax.com, www.grobaax.com): register student PWA SW and mount existing App
  if (typeof window !== 'undefined') {
    void import('virtual:pwa-register').then(({ registerSW }) => {
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
    });
  }

  void import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
