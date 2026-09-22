import React from 'react';
import {
  X,
  Share2,
  PlusSquare,
  Smartphone,
  Download,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  onTriggerNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  isAndroid,
  isChrome,
  onTriggerNativeInstall,
  hasNativePrompt,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pwa-install-guide-modal"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 relative animate-slideUp text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <img
            src="/pwa-192x192.png"
            alt="Grobaax"
            className="w-14 h-14 rounded-2xl shadow-md border border-blue-500/30 object-cover"
          />
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Install Grobaax</span>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Represent your school title, conquer academic arenas, and connect with scholars nationwide.
            </p>
          </div>
        </div>

        {/* Benefits Pill List */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center gap-2 text-[11px] font-semibold text-blue-800 dark:text-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Instant Home Screen Launch</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Fast Offline Caching</span>
          </div>
        </div>

        {/* Native Prompt CTA if available */}
        {hasNativePrompt && onTriggerNativeInstall && (
          <div className="mb-5">
            <button
              onClick={() => {
                onTriggerNativeInstall();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tap to Install on Device Now</span>
            </button>
            <div className="text-center mt-2">
              <span className="text-[10px] text-slate-400">
                Direct Chrome installation prompt ready
              </span>
            </div>
          </div>
        )}

        {/* Device-Specific Instructions */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {isIOS
                ? 'How to Install on iPhone / iPad (iOS Safari)'
                : 'How to Install on Android / Google Chrome'}
            </span>
          </div>

          {isIOS ? (
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  Tap the <strong className="text-slate-900 dark:text-white">Share</strong> button in Safari's bottom toolbar
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-200 font-semibold">
                    <Share2 className="w-3 h-3 text-blue-500" />
                    <span>Share</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  Scroll down and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>
                  <div className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] text-slate-700 dark:text-slate-200 font-semibold">
                    <PlusSquare className="w-3 h-3 text-blue-500" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  Tap <strong className="text-slate-900 dark:text-white">Add</strong> in the top-right corner to finish!
                </div>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  Tap Chrome's <strong className="text-slate-900 dark:text-white">three dots menu (⋮)</strong> in the top-right corner
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  Select <strong className="text-slate-900 dark:text-white">"Install app"</strong> or <strong className="text-slate-900 dark:text-white">"Add to Home screen"</strong>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  Confirm <strong className="text-slate-900 dark:text-white">Install</strong>. Grobaax will appear on your app launcher and home screen!
                </div>
              </li>
            </ol>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
};
