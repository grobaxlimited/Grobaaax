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
        className={`fixed bottom-3.5 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 z-50 max-w-sm sm:max-w-md w-auto transition-all duration-500 ease-out ${
          hasPopped ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <div className="relative overflow-hidden p-3.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-[0_14px_45px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.65)] text-slate-900 dark:text-slate-100 flex items-center justify-between gap-3">
          {/* Subtle top brand glow line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

          {/* App Icon + Smartphone Badge & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="Grobaax"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl shadow-md border border-slate-200/80 dark:border-slate-700/80 object-cover bg-white dark:bg-slate-800"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900">
                <Smartphone className="w-2.5 h-2.5" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">
                  Install Grobaax
                </h4>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950/90 dark:text-blue-300 border border-blue-200/90 dark:border-blue-800/80 shrink-0">
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
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition cursor-pointer select-none"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              onClick={dismiss}
              title="Dismiss"
              aria-label="Dismiss banner"
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
