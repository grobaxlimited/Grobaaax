import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isChrome, setIsChrome] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('grbx_pwa_prompt_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isDocumentReferrer = document.referrer.includes('android-app://');
      return isStandaloneMedia || isNavigatorStandalone || isDocumentReferrer;
    };

    setIsInstalled(checkStandalone());

    // 2. Detect platform / device
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isChromeBrowser = /chrome|crios/.test(ua) && !/edg|opr|opera|brave|firefox/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChrome(isChromeBrowser);

    // 3. Listen for Chromium/Android 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('PWA: beforeinstallprompt event captured');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for 'appinstalled'
    const handleAppInstalled = () => {
      console.log('PWA: GRBX Box was successfully installed on device');
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        sessionStorage.removeItem('grbx_pwa_prompt_dismissed');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
        return false;
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
        return false;
      }
    }
    return false;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('grbx_pwa_prompt_dismissed', 'true');
    } catch {}
  }, []);

  const resetDismiss = useCallback(() => {
    setIsDismissed(false);
    try {
      sessionStorage.removeItem('grbx_pwa_prompt_dismissed');
    } catch {}
  }, []);

  return {
    isInstallable: !!deferredPrompt,
    hasNativePrompt: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isChrome,
    isDismissed,
    install,
    dismiss,
    resetDismiss,
  };
}
