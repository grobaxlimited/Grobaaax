import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GusSeason } from '../../types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Calendar,
  AlertCircle,
  Sparkles,
  FileText,
  UserCheck,
} from 'lucide-react';

interface GusRegistrationModalProps {
  season: GusSeason;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GusRegistrationModal: React.FC<GusRegistrationModalProps> = ({
  season,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, registerForGusSeason, userGusRecord } = useApp();
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isAlreadyRegistered =
    season.registeredParticipantIds.includes(currentUser.id) ||
    userGusRecord?.registrationStatus === 'REGISTERED';

  const handleRegister = () => {
    if (isAlreadyRegistered) return;
    setIsSubmitting(true);
    setTimeout(() => {
      registerForGusSeason(season.id);
      setIsSubmitting(false);
      onSuccess();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden text-white my-auto">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="cyan" size="sm">
                  GUS Protocol
                </Badge>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">LIVE REGISTRATION</span>
              </div>
              <h3 className="text-base font-black tracking-tight">{season.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* User Qualification Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Participant Verification Status
              </span>
              <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                Eligible Scholar
              </Badge>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-11 h-11 rounded-2xl object-cover border border-cyan-500/30"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-sm text-white truncate">{currentUser.name}</h4>
                <p className="text-xs text-slate-400 truncate">
                  {currentUser.institution} • {currentUser.department} ({currentUser.level})
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-bold block">GUS Tier</span>
                <span className="text-xs font-black text-amber-400">{currentUser.gusTier}</span>
              </div>
            </div>
          </div>

          {/* Season Highlights */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Grand Prize Pool</span>
              <span className="font-black text-amber-400 text-sm">+{season.prizePoolGP.toLocaleString()} GP</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Rounds Count</span>
              <span className="font-black text-cyan-400 text-sm">{season.rounds.length} Rounds</span>
            </div>
          </div>

          {/* Key Elimination Rule Highlight */}
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-rose-400 font-extrabold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Strict Instant Elimination Rule</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Every active user receives questions synchronously. Answering incorrectly or missing the time limit results in <strong className="text-rose-400">immediate permanent elimination</strong> for Season 1.
            </p>
          </div>

          {/* Rules Checklist */}
          {isAlreadyRegistered ? (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="font-black text-sm text-emerald-400">You Are Registered for {season.title}!</h4>
              <p className="text-xs text-slate-300">
                Your place is secured. Make sure to be in the GUS Arena when the server competition clock starts.
              </p>
              <p className="text-[10px] font-mono text-emerald-300">
                Registered ID: {currentUser.id} • Status: ACTIVE
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={e => setAgreedToRules(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  I understand that GUS requires live attendance and synchronized backend clock speed. Late entries cannot join active questions.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={e => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                />
                <span className="text-xs text-slate-300 leading-snug">
                  I accept the Grobaax Academic Fair Play Policy. Any use of external automation scripts or AI bots will forfeit all GP prize allocations.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
            Cancel
          </Button>

          {isAlreadyRegistered ? (
            <Button variant="emerald" size="sm" onClick={onClose} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              Registered ✓
            </Button>
          ) : (
            <Button
              variant="cyan"
              size="md"
              disabled={!agreedToRules || !agreedToTerms || isSubmitting}
              onClick={handleRegister}
              leftIcon={<UserCheck className="w-4 h-4" />}
            >
              {isSubmitting ? 'Registering...' : 'Confirm Registration'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
