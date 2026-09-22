import React from 'react';
import {
  X,
  ScrollText,
  Shield,
  Trophy,
  Clock,
  Swords,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { SchoolDomeSeason } from '../../types';

interface SchoolDomeRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  season?: SchoolDomeSeason | null;
}

const DEFAULT_STANDARD_RULES = [
  'Registration is completely free and open to all verified scholars before Question #1 begins.',
  'Once Question #1 is launched by the Arbiter, registration is permanently locked for the entire season.',
  'Each scholar receives exactly ONE attempt per live elimination question.',
  'The Arbiter sets a strict countdown timer for each question; submissions after the timer expires will be rejected.',
  'Submitting the correct answer within the time limit secures your survival and advancement to the next question.',
  'Submitting an incorrect answer or failing to answer in time results in immediate elimination to Spectator Mode.',
  'When the Admin clicks "End Season", the entire prize pool is distributed EQUALLY to all last scholars standing directly into their wallets.',
];

export const SchoolDomeRulesModal: React.FC<SchoolDomeRulesModalProps> = ({
  isOpen,
  onClose,
  season,
}) => {
  if (!isOpen) return null;

  const adminRules = (season?.rules && season.rules.length > 0)
    ? season.rules
    : DEFAULT_STANDARD_RULES;

  const prizePoolText = season
    ? `${season.prizeCurrency === 'NGN' ? '₦' : ''}${season.prizePool?.toLocaleString() || '50,000'} ${season.prizeCurrency || 'GP'}`
    : '50,000 GP';

  return (
    <div
      id="school-dome-rules-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="school-dome-rules-modal-card"
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  School Dome Official Rules
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950">
                  Season #{season?.seasonNumber || 1}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Rules & Guidelines set by Admin & Grobaax Arena Arbiter
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Close Rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                <Trophy className="w-3.5 h-3.5" />
                <span>Equal Prize Pool</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                <strong>{prizePoolText}</strong> split equally among all last scholars standing.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Countdown Clock</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Admin sets a ticking timer for each question. Answers after 0s are rejected.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
                <Shield className="w-3.5 h-3.5" />
                <span>1 Attempt Only</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                1 answer per scholar. Correct survives; incorrect or timeout eliminates.
              </p>
            </div>
          </div>

          {/* Admin Custom Rules Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-500" />
                <span>Active Season Regulations</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                {adminRules.length} Rule{adminRules.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="space-y-2.5">
              {adminRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                    {idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {rule}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Fairness Note */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Season End & Payout Guarantee:</p>
              <p className="leading-relaxed text-[11px] opacity-90">
                The moment the Admin clicks <strong>End Season</strong>, typing becomes permanently unavailable in this arena. The entire prize pool is instantaneously distributed to each surviving scholar&apos;s wallet balance with an authoritative transaction receipt.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Platform Academic Directorate Verified</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
