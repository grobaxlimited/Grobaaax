import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Swords,
  Trophy,
  Users,
  CheckCircle2,
  UserX,
  Eye,
  Shield,
  Coins,
  Sparkles,
  Award,
  Crown,
  Info,
} from 'lucide-react';
import { SchoolDomeSeason, UserProfile } from '../../types';

interface SchoolDomeContendersModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: SchoolDomeSeason | null;
  currentUser: UserProfile;
  isUserRegistered: boolean;
  isUserStanding: boolean;
  isUserEliminated: boolean;
  isRegistrationOpen: boolean;
  isRegistering: boolean;
  onRegister: () => void;
}

export const SchoolDomeContendersModal: React.FC<SchoolDomeContendersModalProps> = ({
  isOpen,
  onClose,
  season,
  currentUser,
  isUserRegistered,
  isUserStanding,
  isUserEliminated,
  isRegistrationOpen,
  isRegistering,
  onRegister,
}) => {
  const [activeRosterTab, setActiveRosterTab] = useState<'all' | 'standing' | 'knockout'>('standing');

  // Close on Escape key and prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !season) return null;

  const registeredCount = season.registeredUserIds?.length || 0;
  const standingCount = season.activeUserIds?.length ?? 0;
  const knockoutCount = season.eliminatedUserIds?.length || 0;

  const prizePool = season.prizePool || 50000;
  const currency = season.prizeCurrency || 'GP';
  const prizePoolDisplay = `${prizePool.toLocaleString()} ${currency}`;

  // Estimate payout per standing scholar
  const prizePerStanding = standingCount > 0 ? Math.floor(prizePool / standingCount) : prizePool;
  const survivalRate = registeredCount > 0 ? Math.round((standingCount / registeredCount) * 100) : 100;

  // Filter list based on roster tab
  let currentRosterIds: string[] = [];
  if (activeRosterTab === 'standing') {
    currentRosterIds = season.activeUserIds || [];
  } else if (activeRosterTab === 'knockout') {
    currentRosterIds = season.eliminatedUserIds || [];
  } else {
    currentRosterIds = season.registeredUserIds || [];
  }

  const modalContent = (
    <div
      id="school-dome-contenders-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 select-none sm:select-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contenders-modal-title"
    >
      <div
        id="school-dome-contenders-modal-card"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-white animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Swords Branding & Prize Pool */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 shadow-xs">
              <Swords className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="contenders-modal-title"
                  className="text-base sm:text-lg font-black tracking-tight text-white truncate"
                >
                  Season #{season.seasonNumber || 1} Contenders
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shrink-0">
                  {prizePoolDisplay}
                </span>
              </div>
              <p className="text-xs text-blue-200/80 truncate mt-0.5">
                {season.status === 'ended'
                  ? 'Season Concluded • Final Champion Standings'
                  : season.firstQuestionLaunched
                  ? `Active Elimination Battles • Question #${season.currentQuestionNumber || season.totalQuestionsLaunched || 1}`
                  : 'Registration Window Open • Prepare for Question #1'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="btn-close-contenders-modal"
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
            title="Close Contenders Pop-up"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* The 3 Core Metric Cards: Registered Member, Standing Member, Knockout Member */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                Arena Member Breakdown
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Live Synchronized
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              {/* Registered Members Card */}
              <div
                id="stat-card-registered"
                className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs flex flex-col items-center justify-center transition hover:border-blue-300"
              >
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1.5">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Registered
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums my-0.5">
                  {registeredCount}
                </span>
                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                  Total Enrolled
                </span>
              </div>

              {/* Standing Members Card */}
              <div
                id="stat-card-standing"
                className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/70 shadow-xs flex flex-col items-center justify-center transition hover:border-emerald-400 relative overflow-hidden"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 relative">
                  <CheckCircle2 className="w-4 h-4" />
                  {standingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Standing
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums my-0.5">
                  {standingCount}
                </span>
                <span className="text-[9px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
                  {survivalRate}% Survived
                </span>
              </div>

              {/* Knockout Members Card */}
              <div
                id="stat-card-knockout"
                className="p-3 sm:p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/70 shadow-xs flex flex-col items-center justify-center transition hover:border-rose-400"
              >
                <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-1.5">
                  <UserX className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Knocked Out
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums my-0.5">
                  {knockoutCount}
                </span>
                <span className="text-[9px] font-medium text-rose-500/80 dark:text-rose-400/80">
                  Eliminated
                </span>
              </div>
            </div>
          </div>

          {/* Survival Rate & Projected Prize Share */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/60 dark:to-blue-950/30 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Projected Prize Per Survivor:</span>
              </div>
              <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                ~{prizePerStanding.toLocaleString()} {currency}
              </span>
            </div>

            {/* Survival Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Survivor Retention</span>
                <span>
                  {standingCount} of {registeredCount} scholars ({survivalRate}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${survivalRate}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${100 - survivalRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Scholar's Own Status in the Arena */}
          <div
            id="scholar-arena-status-card"
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Your Arena Standing
              </span>
              {isUserStanding ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Still Standing
                </span>
              ) : isUserEliminated ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                  <UserX className="w-3 h-3" /> Knocked Out
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Spectator
                </span>
              )}
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                {isUserStanding ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : isUserEliminated ? (
                  <UserX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-0.5 min-w-0">
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                  {isUserStanding
                    ? 'Active Contender in the Running'
                    : isUserEliminated
                    ? 'Eliminated (Spectator Mode)'
                    : isUserRegistered
                    ? 'Registered & Ready for Battle'
                    : 'Not Registered for this Season'}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isUserStanding
                    ? 'You are active in this season. Submitting correct answers within each timer keeps you standing for the grand prize pool!'
                    : isUserEliminated
                    ? 'You submitted an incorrect answer or the countdown timer expired. You can continue spectating questions and participating in chat.'
                    : isRegistrationOpen
                    ? `Registration is currently open for Season #${season.seasonNumber || 1}. Claim your contender slot now to battle for the ${prizePoolDisplay} prize pool!`
                    : 'Registration permanently locked when Question #1 launched. Spectators can follow all live questions in real-time.'}
                </p>
              </div>
            </div>

            {/* Registration Action Button inside Popup if not enrolled and registration is open */}
            {!isUserRegistered && isRegistrationOpen && (
              <button
                type="button"
                id="btn-modal-register-season"
                onClick={() => {
                  onRegister();
                }}
                disabled={isRegistering}
                className="mt-1 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                <span>
                  {isRegistering
                    ? 'Registering You into the Arena...'
                    : `Register for Season #${season.seasonNumber || 1} Free`}
                </span>
              </button>
            )}
          </div>

          {/* Interactive Member Roster Filter Tabs */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Contender Roster
              </span>
              <span className="text-[10px] text-slate-500">
                {currentRosterIds.length} scholar{currentRosterIds.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-xs font-bold border border-slate-200/60 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => setActiveRosterTab('standing')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeRosterTab === 'standing'
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Standing</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-white">
                  {standingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRosterTab('knockout')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeRosterTab === 'knockout'
                    ? 'bg-white dark:bg-rose-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Knocked Out</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-white">
                  {knockoutCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRosterTab('all')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeRosterTab === 'all'
                    ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>All Enrolled</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-600 dark:text-white">
                  {registeredCount}
                </span>
              </button>
            </div>

            {/* Roster Member List */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {currentRosterIds.length > 0 ? (
                currentRosterIds.map((uid, index) => {
                  const isCurrent = uid === currentUser.id;
                  const isStanding = season.activeUserIds?.includes(uid);
                  const isEliminated = season.eliminatedUserIds?.includes(uid);

                  return (
                    <div
                      key={uid || index}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                        isCurrent
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                          {isCurrent
                            ? (currentUser.name || 'Y')[0]?.toUpperCase()
                            : `#${index + 1}`}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {isCurrent ? `${currentUser.name || 'You'} (You)` : `Contender #${index + 1}`}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500 text-white">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block">
                            ID: {uid.substring(0, 10)}...
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isStanding ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Standing
                          </span>
                        ) : isEliminated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <UserX className="w-3 h-3 text-rose-500" /> Knockout
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            Registered
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                  <Info className="w-5 h-5 mx-auto text-slate-400" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    No scholars in this category yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with Big Close Button for Mobile Phones */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
            All contenders must submit correct answers before timers expire to survive.
          </div>
          <button
            type="button"
            onClick={onClose}
            id="btn-footer-close-contenders-modal"
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold text-xs transition cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
