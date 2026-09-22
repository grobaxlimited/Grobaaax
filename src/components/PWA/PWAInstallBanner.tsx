import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const {
    hasNativePrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isChrome,
    isDismissed,
    install,
    dismiss,
  } = usePWAInstall();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [hasPopped, setHasPopped] = useState(false);

  // Trigger smooth pop-in after short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPopped(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Only show the pop install prompt when the user is on Chrome or mobile device (Android / iOS)
  const isTargetBrowserOrDevice = isChrome || isAndroid || isIOS;

  if (isInstalled || isDismissed || !isTargetBrowserOrDevice) {
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
      {/* Floating Pop Install Prompt */}
      <aside
        id="pwa-install-banner"
        aria-label="Install App Prompt"
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900/95 dark:bg-slate-900/95 border border-blue-500/40 text-white rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl transition-all duration-500 ease-out transform ${
          hasPopped ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Official App Icon */}
          <div className="relative shrink-0">
            <img
              src="/pwa-192x192.png"
              alt="Grobaax"
              className="w-12 h-12 rounded-xl object-cover border border-blue-500/40 shadow-md"
            />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black tracking-tight text-white truncate">
                Install Grobaax
              </h4>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/30 text-blue-300 border border-blue-400/30 uppercase shrink-0 flex items-center gap-0.5">
                <Smartphone className="w-2.5 h-2.5" />
                <span>{isIOS ? 'iOS' : isAndroid ? 'Android' : 'Chrome'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">
              Install Grobaax on your Android or iOS device
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={dismiss}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Step-by-step Installation Modal */}
      <PWAInstallGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isChrome={isChrome}
        hasNativePrompt={hasNativePrompt}
        onTriggerNativeInstall={install}
      />
    </>
  );
};

