import React, { useState } from 'react';
import {
  Swords,
  Trophy,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Sparkles,
  Building2,
} from 'lucide-react';
import { registerUserForSchoolDome } from '../../lib/schoolDomeService';
import { SchoolDomeSeason, UserProfile } from '../../types';

interface SchoolDomeRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: SchoolDomeSeason;
  currentUser: UserProfile | null;
  onRegistrationSuccess?: () => void;
}

export const SchoolDomeRegistrationModal: React.FC<SchoolDomeRegistrationModalProps> = ({
  isOpen,
  onClose,
  season,
  currentUser,
  onRegistrationSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleRegister = async () => {
    if (!currentUser) {
      setErrorMsg('Please log in to register for School Dome.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const res = await registerUserForSchoolDome(season.id, currentUser);
      if (res.success) {
        setSuccessMsg(res.message);
        if (onRegistrationSuccess) onRegistrationSuccess();
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const prizeText = `${season.prizeCurrency === 'NGN' ? '₦' : ''}${season.prizePool.toLocaleString()} ${season.prizeCurrency === 'GP' ? 'GP' : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Enter the Arena
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {season.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Season Prize Banner */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl border border-amber-500/30 ring-1 ring-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-400">GRAND TOURNAMENT POOL</span>
              <span className="text-xs font-black text-emerald-400">FREE ENTRY</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              {prizeText}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Divided equally among all scholars who answer every question accurately and survive until the finale!
            </p>
          </div>

          {/* Participant Profile Preview */}
          {currentUser && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Registering Scholar
              </span>
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3 shrink-0 text-blue-500" />
                    <span>{currentUser.institution || 'Verified Scholar'}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Important Lock Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p className="leading-relaxed">
              <strong>Registration Window:</strong> Free entry is open right now. Once Question #1 is launched by the Arbiter, registration locks permanently for this entire season.
            </p>
          </div>

          {/* Register Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting || Boolean(successMsg)}
              onClick={handleRegister}
              className="w-full py-3 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg cursor-pointer transition hover:scale-101 active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Registering...</span>
              ) : successMsg ? (
                <span>Registered Successfully!</span>
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  <span>Confirm Free Registration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
