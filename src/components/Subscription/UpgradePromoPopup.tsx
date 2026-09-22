import React from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * UpgradePromoPopup
 * 
 * Floating modal/pop-up prompt for free/non-subscribed users.
 * Appears dynamically over the active interface in pop-up mode.
 * - Initial appearance: 10 minutes after entering the app for free users.
 * - Re-appearance: 10-minute continuous interval after dismissal.
 * - Disappears immediately when the user subscribes.
 */
export const UpgradePromoPopup: React.FC = () => {
  const {
    isUpgradePromoVisible,
    dismissUpgradePromo,
    isUserSubscribed,
    openWalletModal,
    activeTab,
  } = useApp();

  // ONLY non-subscribed users see the pop-up, controlled by the centralized global active-use timer.
  // Suppressed during live School Dome arena to prevent interrupting or disfiguring competition.
  if (
    isUserSubscribed ||
    !isUpgradePromoVisible ||
    activeTab === 'school_dome' ||
    activeTab === 'school_dome_results'
  ) {
    return null;
  }

  const handleUpgrade = () => {
    dismissUpgradePromo();
    openWalletModal('upgrade');
  };

  return (
    <div
      id="grobax-upgrade-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-popup-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="grobax-upgrade-popup-card"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 border border-blue-500/40 text-white shadow-2xl shadow-blue-950/80 p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* Subtle ambient lighting flares */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />

        {/* Top Header Row with Close Button */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              UPGRADE
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Grobaax Scholar
            </span>
          </div>

          <button
            id="btn-close-upgrade-popup"
            onClick={dismissUpgradePromo}
            title="Close"
            aria-label="Close Upgrade Pop-up"
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pop-up Body Content */}
        <div className="relative z-10 space-y-2">
          <h3
            id="upgrade-popup-title"
            className="text-lg font-black text-white tracking-tight"
          >
            Unlock more with Grobaax.
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Elevate your academic journey with 2x–3x GP multiplier boosts, priority competition arena entry, and full access to Grobaax tools.
          </p>
        </div>

        {/* Action Button Row */}
        <div className="relative z-10 pt-2">
          <button
            id="btn-upgrade-popup-cta"
            onClick={handleUpgrade}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
          >
            <span>Upgrade Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
