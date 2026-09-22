import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with automatic cache updates
if (typeof window !== 'undefined') {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('PWA: New content available, auto-updating...');
    },
    onOfflineReady() {
      console.log('PWA: App is ready for offline use.');
    },
  });
}

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

  // Prevent multi-touch pinch zoom while ensuring smooth vertical scrolling
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
