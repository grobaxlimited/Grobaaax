import { useState, useEffect } from 'react';

export interface DevicePlatform {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
}

export function useDevicePlatform(): DevicePlatform {
  const [platform, setPlatform] = useState<DevicePlatform>(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return { isIOS: false, isAndroid: false, isStandalone: false };
    }

    const ua = (navigator.userAgent || '').toLowerCase();
    const isAndroidDevice = /android/.test(ua);
    const isIOSDevice =
      !isAndroidDevice &&
      (/iphone|ipad|ipod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // Optional query param / local override for platform testing
    let forcedIOS = false;
    let forcedAndroid = false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('platform') === 'ios') forcedIOS = true;
      if (urlParams.get('platform') === 'android') forcedAndroid = true;
      const stored = localStorage.getItem('grbx_force_platform');
      if (stored === 'ios') forcedIOS = true;
      if (stored === 'android') forcedAndroid = true;
    } catch {}

    const resolvedIOS = !forcedAndroid && (isIOSDevice || forcedIOS);
    const resolvedAndroid = !forcedIOS && (isAndroidDevice || forcedAndroid);

    return {
      isIOS: resolvedIOS,
      isAndroid: resolvedAndroid,
      isStandalone: isStandaloneMedia || isNavigatorStandalone,
    };
  });

  useEffect(() => {
    const checkPlatform = () => {
      const ua = (navigator.userAgent || '').toLowerCase();
      const isAndroidDevice = /android/.test(ua);
      const isIOSDevice =
        !isAndroidDevice &&
        (/iphone|ipad|ipod/.test(ua) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      let forcedIOS = false;
      let forcedAndroid = false;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('platform') === 'ios') forcedIOS = true;
        if (urlParams.get('platform') === 'android') forcedAndroid = true;
        const stored = localStorage.getItem('grbx_force_platform');
        if (stored === 'ios') forcedIOS = true;
        if (stored === 'android') forcedAndroid = true;
      } catch {}

      const resolvedIOS = !forcedAndroid && (isIOSDevice || forcedIOS);
      const resolvedAndroid = !forcedIOS && (isAndroidDevice || forcedAndroid);

      setPlatform({
        isIOS: resolvedIOS,
        isAndroid: resolvedAndroid,
        isStandalone: isStandaloneMedia || isNavigatorStandalone,
      });
    };

    checkPlatform();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener?.('change', checkPlatform);

    return () => {
      mediaQuery.removeEventListener?.('change', checkPlatform);
    };
  }, []);

  return platform;
}
