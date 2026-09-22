import React from 'react';
import { Sparkles, X, Globe, Crown, CheckCircle2, Building2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';

interface CrossCampusUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeInstitution: string;
}

export const CrossCampusUpgradeModal: React.FC<CrossCampusUpgradeModalProps> = ({
  isOpen,
  onClose,
  homeInstitution,
}) => {
  const { openWalletModal } = useApp();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    openWalletModal('upgrade');
  };

  return (
    <div
      id="cross-campus-upgrade-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cross-campus-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="cross-campus-upgrade-modal-card"
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-amber-500/40 text-white shadow-2xl shadow-amber-950/40 p-6 space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/15 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />

        {/* Top Header Row with Close Button */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              PREMIUM & VIP EXCLUSIVE
            </span>
          </div>

          <button
            id="cross-campus-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Visual Icon */}
        <div className="relative z-10 flex items-center justify-center pt-2">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Globe className="w-8 h-8 text-amber-400 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-xs">
              <Crown className="w-3 h-3 text-slate-900" />
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <div className="relative z-10 text-center space-y-2">
          <h3 id="cross-campus-modal-title" className="text-xl font-black text-white tracking-tight">
            Connect Across Other Campuses
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            Free scholar accounts are limited to browsing peers in their home school (
            <span className="text-amber-300 font-semibold">{homeInstitution || 'your registered institution'}</span>
            ). Upgrade to discover and connect with scholars nationwide!
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="relative z-10 space-y-2.5 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-amber-400">
            What you unlock with Premium & VIP:
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Search and browse over <strong>250+ Nigerian universities, polytechnics, and colleges</strong>.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Explore all faculties and academic departments of any selected institution.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Send direct <strong>WhatsApp connection requests</strong> to cross-campus scholars.
            </span>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Get the coveted <strong>Verified Scholar Blue Badge</strong> on your profile.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative z-10 space-y-2 pt-1">
          <button
            id="cross-campus-upgrade-btn"
            type="button"
            onClick={handleUpgrade}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>Upgrade to Premium / VIP</span>
          </button>

          <button
            id="cross-campus-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors text-center cursor-pointer"
          >
            Stay on My Campus ({homeInstitution})
          </button>
        </div>
      </div>
    </div>
  );
};
