import React, { useState, useEffect } from 'react';
import { ExternalLink, X, Smartphone } from 'lucide-react';

export const ChromeCustomTabExitBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user previously dismissed banner in this session
    const isDismissed = sessionStorage.getItem('grobaax_cct_banner_dismissed') === 'true';
    if (isDismissed) return;

    // Detect if running on mobile Android / Chrome
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // Check if running in pure standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    // If on Android and NOT in standalone PWA, the user is viewing via Chrome browser or Chrome Custom Tab (with [X] button)
    if (isAndroid && !isStandalone) {
      setIsVisible(true);
    }
  }, []);

  const handleCloseTab = () => {
    // Attempt to close the Chrome Custom Tab directly
    try {
      window.close();
    } catch (_) {}

    // Fallback: If window.close was prevented by browser policy, advise user
    setTimeout(() => {
      alert(
        'To enjoy Grobaax in full screen without the top [X] bar, please tap the (X) at the top or open Grobaax from your phone home screen.'
      );
    }, 400);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      sessionStorage.setItem('grobaax_cct_banner_dismissed', 'true');
    } catch (_) {}
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-500/30 text-white px-3 py-2 text-xs sm:text-sm shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="truncate text-slate-200">
            <span className="font-semibold text-blue-300">Tip:</span> To use Grobaax without the top <span className="font-bold text-white">[✕]</span> bar, open your installed app from the home screen.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCloseTab}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1"
            title="Close this temporary tab and return to your home screen"
          >
            <span>Close Tab</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
