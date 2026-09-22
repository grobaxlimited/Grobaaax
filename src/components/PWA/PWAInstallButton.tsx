import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';
import { Download, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const {
    isInstalled,
    hasNativePrompt,
    isIOS,
    isAndroid,
    isChrome,
    install,
  } = usePWAInstall();

  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Hide button if already installed in standalone mode
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (hasNativePrompt) {
      const success = await install();
      if (!success) {
        setIsGuideOpen(true);
      }
    } else {
      setIsGuideOpen(true);
    }
  };

  return (
    <>
      {variant === 'compact' && (
        <button
          onClick={handleClick}
          title="Install Grobaax on your device"
          className={`p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer flex items-center gap-1.5 font-bold text-xs border border-blue-200 dark:border-blue-900/60 ${className}`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Install Grobaax</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          onClick={handleClick}
          className={`w-full py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-950/30 border border-blue-700/50 transition flex items-center justify-center gap-2 cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Download & Install Grobaax App</span>
        </button>
      )}

      {variant === 'pill' && (
        <button
          onClick={handleClick}
          className={`px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-xs font-bold transition hover:bg-blue-200 dark:hover:bg-blue-900 flex items-center gap-1.5 cursor-pointer shadow-xs ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Install App</span>
        </button>
      )}

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
