import { Capacitor } from '@capacitor/core';

export type AppPlatform = 'android_app' | 'ios_app' | 'pwa_standalone' | 'browser';

/**
 * Checks if the application is running inside a packaged native Android application
 * (Google Play Store release built with Capacitor, TWA, or native WebView).
 */
export function isAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Capacitor native check
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      return true;
    }
  } catch {}

  // 2. Window Capacitor fallback
  const win = window as any;
  if (win.Capacitor?.isNativePlatform?.() && win.Capacitor?.getPlatform?.() === 'android') {
    return true;
  }

  // 3. User agent & WebView identifier checks
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('grobaaxandroidapp') || ua.includes('grobaax/android')) {
    return true;
  }

  // 4. Android TWA (Trusted Web Activity) referrer check
  if (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://com.grobaax.app')) {
    return true;
  }

  // 5. Explicit environment flag / search parameter
  try {
    if (window.location?.search?.includes('platform=android_app')) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Checks if the application is running inside a packaged native iOS application
 * (Apple App Store release built with Capacitor or native WKWebView).
 */
export function isIOSApp(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Capacitor native check
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      return true;
    }
  } catch {}

  // 2. Window Capacitor fallback
  const win = window as any;
  if (win.Capacitor?.isNativePlatform?.() && win.Capacitor?.getPlatform?.() === 'ios') {
    return true;
  }

  // 3. User agent & WebView identifier checks
  const ua = (navigator.userAgent || '').toLowerCase();
  if (ua.includes('grobaaxiosapp') || ua.includes('grobaax/ios')) {
    return true;
  }

  // 4. Explicit environment flag / search parameter
  try {
    if (window.location?.search?.includes('platform=ios_app')) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Checks if the application is running inside either the packaged Android or iOS native app.
 */
export function isPackagedApp(): boolean {
  return isAndroidApp() || isIOSApp();
}

/**
 * Checks if the app is currently running in standalone PWA mode from a web browser.
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(isStandaloneMedia || isNavigatorStandalone);
}

/**
 * Returns true if the application is being accessed through a normal web browser.
 */
export function isBrowser(): boolean {
  return !isPackagedApp();
}

/**
 * Resolves the current runtime distribution platform.
 */
export function getAppPlatform(): AppPlatform {
  if (isAndroidApp()) return 'android_app';
  if (isIOSApp()) return 'ios_app';
  if (isStandalonePWA()) return 'pwa_standalone';
  return 'browser';
}
