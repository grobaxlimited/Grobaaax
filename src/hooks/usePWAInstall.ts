import { useEffect, useState, useCallback } from 'react';
import { isPackagedApp, isAndroidApp, isIOSApp, isStandalonePWA } from '../utils/platformDetection';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return isPackagedApp() || isStandalonePWA();
  });
  const [isPackaged, setIsPackaged] = useState<boolean>(() => isPackagedApp());
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
    // 1. Packaged mobile app check (Google Play Android or App Store iOS)
    const inPackagedApp = isPackagedApp();
    setIsPackaged(inPackagedApp);

    if (inPackagedApp) {
      // Running inside installed Android / iOS app -> immediately mark installed and suppress PWA prompts
      setIsInstalled(true);
      return;
    }

    // 2. Check if running in standalone mode (already installed PWA from browser)
    setIsInstalled(isStandalonePWA());

    // 3. Detect browser platform / device for web browsers
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isChromeBrowser = /chrome|crios/.test(ua) && !/edg|opr|opera|brave|firefox/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChrome(isChromeBrowser);

    // 4. Listen for Chromium/Android browser 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: Event) => {
      // Never capture or prompt if running inside native packaged app
      if (isPackagedApp()) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 5. Listen for 'appinstalled' in browser
    const handleAppInstalled = () => {
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
    if (isPackagedApp()) return false;
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

  // In packaged apps (Android/iOS), isInstallable is strictly false
  const effectivelyInstallable = !isPackaged && !isInstalled && !!deferredPrompt;

  return {
    isInstallable: effectivelyInstallable,
    hasNativePrompt: effectivelyInstallable,
    isInstalled: isInstalled || isPackaged,
    isPackagedApp: isPackaged,
    isIOS,
    isAndroid,
    isChrome,
    isDismissed,
    install,
    dismiss,
    resetDismiss,
  };
}
