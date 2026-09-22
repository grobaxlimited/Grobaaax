/**
 * Cross-platform WhatsApp Link Helper with iOS Safari & PWA compatibility
 */

export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Open a WhatsApp link reliably on all platforms (iOS Safari, Android, Desktop, PWA).
 * On iOS Safari, `window.open()` after async promises is blocked by WebKit's popup blocker.
 * Using direct top-level navigation (`window.location.href`) and programmatic link clicks
 * ensures iOS triggers its Universal Link to open the native WhatsApp application.
 */
export function openExternalWhatsApp(whatsappUrl: string): void {
  if (!whatsappUrl) return;

  const onIOS = isIOS();

  if (onIOS) {
    // 1. Try programmatic link trigger targeted at top frame
    try {
      const link = document.createElement('a');
      link.href = whatsappUrl;
      link.target = '_top';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // ignore
    }

    // 2. Guaranteed fallback navigation for iOS WebKit & Safari
    setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 100);
    return;
  }

  // Non-iOS devices (Desktop & Android):
  try {
    const newWin = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      window.location.href = whatsappUrl;
    }
  } catch {
    window.location.href = whatsappUrl;
  }
}
