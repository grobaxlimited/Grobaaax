import React, { useEffect, useState } from 'react';

interface PWASplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const PWASplashScreen: React.FC<PWASplashScreenProps> = ({
  onFinish,
  minDurationMs = 0,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hasShownSplash = sessionStorage.getItem('grbx_splash_shown') === 'true';
      if (hasShownSplash) return false;
    }
    return true;
  });
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Check if splash has already been shown in current session
    const hasShownSplash = sessionStorage.getItem('grbx_splash_shown') === 'true';
    if (hasShownSplash) {
      setIsVisible(false);
      if (onFinish) onFinish();
      return;
    }

    const timer = setTimeout(() => {
      setIsFadingOut(true);
      sessionStorage.setItem('grbx_splash_shown', 'true');
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 200);
      return () => clearTimeout(hideTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      id="pwa-splash-screen"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-gradient-to-b from-[#02081c] via-[#030d2e] to-[#01040f] text-white p-6 select-none transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top spacer */}
      <div className="w-full flex justify-end">
        <span className="text-[10px] font-mono tracking-widest text-blue-300/60 uppercase">
          Grobaax PWA
        </span>
      </div>

      {/* Center Icon & Branding */}
      <div className="flex flex-col items-center text-center space-y-5 relative z-10">
        {/* App Splash Icon */}
        <div className="relative group">
          {/* Subtle blue glow behind icon */}
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-md opacity-50 animate-pulse" />

          {/* Main App Icon matching PWA app icon */}
          <img
            src="/pwa-512x512.png"
            alt="Grobaax Icon"
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl shadow-2xl border border-blue-500/40 object-cover transform transition duration-500 scale-100 hover:scale-105"
          />
        </div>

        {/* Title & Slogan */}
        <div className="space-y-1.5 max-w-sm px-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Grobaax</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-blue-200/90 tracking-wide leading-relaxed">
            Represent your school title, conquer academic arenas, and connect with scholars nationwide.
          </p>
        </div>

        {/* Loader Progress */}
        <div className="pt-3 flex flex-col items-center gap-2">
          <div className="w-36 h-1 bg-slate-800/80 rounded-full overflow-hidden border border-blue-500/20">
            <div className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600 rounded-full animate-[shimmer_1.5s_infinite]" />
          </div>
          <span className="text-[11px] text-blue-300/70 font-medium">
            Connecting students & institutions...
          </span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center relative z-10 space-y-0.5">
        <p className="text-[11px] font-bold text-blue-300/80 tracking-widest uppercase">
          Grobaax Academic Network
        </p>
        <p className="text-[9px] text-slate-500 font-mono">
          Android • iOS • Web App
        </p>
      </div>
    </div>
  );
};
