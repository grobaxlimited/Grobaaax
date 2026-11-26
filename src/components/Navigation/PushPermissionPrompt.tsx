import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  fetchPublicPushConfig,
  getBrowserPushCapability,
  isPushPromptDismissed,
  markPushPromptDismissed,
  requestPermissionAndRegisterDevice,
} from '../../lib/pushNotifications';

interface PushPermissionPromptProps {
  userId?: string | null;
  enabled: boolean;
}

export const PushPermissionPrompt: React.FC<PushPermissionPromptProps> = ({
  userId,
  enabled,
}) => {
  const [visible, setVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!enabled || !userId || userId === 'guest') {
      setVisible(false);
      return;
    }
    if (isPushPromptDismissed()) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const cfg = await fetchPublicPushConfig();
        if (!cfg || !cfg.vapidPublicKey || !cfg.firebaseConfigReady || cfg.projectMismatch) {
          return;
        }
        const cap = await getBrowserPushCapability(cfg);
        if (cancelled) return;
        if (cap.supported && cap.status === 'ready' && cap.permission === 'default') {
          setVisible(true);
        }
      } catch {}
    }, 2800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, enabled]);

  if (!visible) return null;

  const handleDismiss = () => {
    markPushPromptDismissed();
    setVisible(false);
  };

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      await requestPermissionAndRegisterDevice();
    } catch {} finally {
      markPushPromptDismissed();
      setIsRequesting(false);
      setVisible(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-5 sm:bottom-5 z-40 sm:max-w-sm">
      <div className="rounded-2xl bg-slate-900 text-white border border-blue-500/30 shadow-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-black tracking-tight text-white">
                Turn on Grobaax Notifications
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                Get alerts for connection requests, messages, School Dome rounds, and competition results even when Grobaax is closed.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              aria-label="Close notification prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleAllow()}
              disabled={isRequesting}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer transition disabled:opacity-50"
            >
              {isRequesting ? 'Enabling...' : 'Allow Notifications'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isRequesting}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold cursor-pointer transition"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
