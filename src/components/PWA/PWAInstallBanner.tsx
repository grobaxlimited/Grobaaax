import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const {
    isInstallable,
    hasNativePrompt,
    isInstalled,
    isPackagedApp,
    isIOS,
    isAndroid,
    isChrome,
    isDismissed,
    install,
    dismiss,
  } = usePWAInstall();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [hasPopped, setHasPopped] = useState(false);

  // Smooth pop-in effect after 1.2s delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPopped(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Suppress banner if:
  // - Already running as installed standalone app or packaged APK/iOS app
  // - User clicked "X" (dismissed for current session)
  // - Device is not installable AND has no manual install method worth prompting
  if (isInstalled || isPackagedApp || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const outcome = await install();
      if (!outcome) {
        setIsGuideOpen(true);
      }
    } else {
      setIsGuideOpen(true);
    }
  };

  return (
    <>
      <aside
        id="pwa-install-banner"
        aria-label="Install Grobaax App"
        className={`fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 max-w-sm sm:max-w-md w-auto transition-all duration-500 ease-out ${
          hasPopped ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3">
          {/* App Icon + Smartphone Badge & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Grobaax"
                className="w-11 h-11 rounded-xl shadow-md border border-blue-500/30 object-cover"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
                <Smartphone className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  Install Grobaax
                </h4>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                  FREE APP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                Fast home-screen access &amp; offline arena
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="py-2 px-3 sm:px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer select-none"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              onClick={dismiss}
              title="Dismiss"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer select-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Manual Instructions Modal for iOS / Safari / unsupported Chromium */}
      <PWAInstallGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isChrome={isChrome}
        onTriggerNativeInstall={hasNativePrompt ? install : undefined}
        hasNativePrompt={hasNativePrompt}
      />
    </>
  );
};
