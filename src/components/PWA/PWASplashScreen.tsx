import React, { useEffect, useState } from 'react';

interface PWASplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const PWASplashScreen: React.FC<PWASplashScreenProps> = ({
  onFinish,
  minDurationMs = 0,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Only show splash if running as standalone PWA
    const isStandaloneMedia =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone =
      (window.navigator as unknown as { standalone?: boolean })?.standalone === true;

    if (!isStandaloneMedia && !isNavigatorStandalone) {
      setIsVisible(false);
      if (onFinish) onFinish();
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onFinish) onFinish();
    }, minDurationMs || 800);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      id="pwa-splash-screen"
      className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-white transition-opacity duration-300"
    >
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <img
          src="/pwa-192x192.png"
          alt="Grobaax"
          className="w-24 h-24 rounded-3xl shadow-2xl border-2 border-blue-500/40 object-cover"
        />
        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight text-white">Grobaax</h1>
          <p className="text-xs text-blue-400 font-semibold mt-0.5">
            Scholar Arena &amp; Academic Network
          </p>
        </div>
      </div>
    </div>
  );
};
