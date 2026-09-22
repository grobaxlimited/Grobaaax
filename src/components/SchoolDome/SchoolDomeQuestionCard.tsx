import React, { useState, useEffect } from 'react';
import {
  SchoolDomeQuestion,
  SchoolDomeSeason,
  UserRole,
} from '../../types';
import {
  Flame,
  Clock,
  Trophy,
  Crown,
  CheckCircle2,
  Users,
  Sparkles,
  HelpCircle,
  AlertCircle,
  Square,
  Swords,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface SchoolDomeQuestionCardProps {
  question: SchoolDomeQuestion;
  season?: SchoolDomeSeason | null;
  role?: UserRole;
  isManagerOrAdmin?: boolean;
  hasRepliedToQuestion?: boolean;
  isUserRegistered?: boolean;
  isUserStanding?: boolean;
  isUserPlanEligible?: boolean;
  userPlanName?: string;
  requiredPlanText?: string;
  planIneligibleReason?: string;
  onOpenUpgrade?: () => void;
  onCloseQuestion?: (questionId: string) => void;
  onExtendTime?: (questionId: string, extraSeconds: number) => void;
  onReplyToAnswer?: (question: SchoolDomeQuestion) => void;
}

export const SchoolDomeQuestionCard: React.FC<SchoolDomeQuestionCardProps> = ({
  question,
  season,
  role,
  isManagerOrAdmin,
  hasRepliedToQuestion,
  isUserRegistered = false,
  isUserStanding = false,
  isUserPlanEligible = true,
  userPlanName,
  requiredPlanText,
  planIneligibleReason,
  onOpenUpgrade,
  onCloseQuestion,
  onExtendTime,
  onReplyToAnswer,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (question.status !== 'active') {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((question.endAt - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && question.status === 'active' && onCloseQuestion) {
        onCloseQuestion(question.id);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [question.endAt, question.status, onCloseQuestion]);

  const totalTime = question.timeLimitSeconds || 300;
  const progressPercent = Math.max(
    0,
    Math.min(100, (secondsRemaining / totalTime) * 100)
  );

  const isActive = question.status === 'active' && secondsRemaining > 0;
  const survivors = question.survivorUserIds || [];
  const activeStandingCount = season?.activeUserIds?.length ?? survivors.length;
  const prizePoolText = season ? `${season.prizeCurrency === 'NGN' ? '₦' : ''}${season.prizePool.toLocaleString()} ${season.prizeCurrency === 'GP' ? 'GP' : ''}` : '₦50,000';

  const formatTime = (secs: number) => {
    if (secs <= 0) return 'Time Expired';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0) {
      return `${m}:${s < 10 ? '0' : ''}${s} remaining`;
    }
    return `${s}s remaining`;
  };

  const totalTimeText = totalTime >= 60 ? `${Math.round(totalTime / 60)} min` : `${totalTime}s`;

  return (
    <div
      id={`school-dome-question-card-${question.id}`}
      className={`rounded-3xl border transition-all overflow-hidden shadow-lg ${
        isActive
          ? 'bg-gradient-to-br from-slate-900 via-blue-950/60 to-slate-900 border-amber-500/50 shadow-amber-500/10 ring-1 ring-amber-500/30'
          : 'bg-slate-900/90 dark:bg-slate-900 border-slate-800'
      } text-white`}
    >
      {/* Top Banner Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-white/10 bg-white/5 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5">
            {isActive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                isActive ? 'bg-amber-400' : 'bg-slate-500'
              }`}
            />
          </span>

          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Swords className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-amber-400">
              {isActive ? 'SCHOOL DOME ELIMINATION CHALLENGE' : 'CONCLUDED ELIMINATION CHALLENGE'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Question #{question.questionNumber}
            </span>
            {(question.targetPlanName || question.targetTier) && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                question.targetPlanName
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : question.targetTier === 'vip'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : question.targetTier === 'premium'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {question.targetPlanName ? (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{question.targetPlanName}</span>
                  </>
                ) : question.targetTier === 'vip' ? (
                  <>
                    <Crown className="w-3 h-3 text-purple-400" />
                    <span>👑 VIP Only</span>
                  </>
                ) : question.targetTier === 'premium' ? (
                  <>
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>⭐ Premium & VIP</span>
                  </>
                ) : (
                  <span>🌐 Open to All</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Prize Pool & Countdown Clock */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 text-xs font-black flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {prizePoolText} Pool • Divided Equally Among Last Standing
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-300 font-bold px-2 py-1 bg-white/5 rounded-lg border border-white/10">
            <span>Time Limit: <strong>{totalTimeText}</strong></span>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border shadow-sm ${
              isActive
                ? secondsRemaining <= 15
                  ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                  : secondsRemaining <= 30
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isActive ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span>
              {isActive ? `⏱️ ${formatTime(secondsRemaining)}` : '⌛ Time Expired'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              secondsRemaining <= 15
                ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                : 'bg-gradient-to-r from-amber-400 to-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Question Body */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Answer correctly to survive • 1 attempt per scholar</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <span>⚡ {activeStandingCount} Contenders In The Running</span>
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white leading-snug tracking-tight">
            « {question.questionText} »
          </h3>
        </div>

        {/* Revealed Answer when Closed */}
        {!isActive && (
          <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-300">Official Correct Answer:</span>
              <span className="text-sm font-black text-emerald-400 underline decoration-emerald-500/50">
                {question.correctAnswer}
              </span>
            </div>
            {question.acceptedAlternativeAnswers && question.acceptedAlternativeAnswers.length > 0 && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Also accepted: {question.acceptedAlternativeAnswers.join(', ')}
              </span>
            )}
          </div>
        )}

        {/* Status Bar / Reply Trigger */}
        {isActive && (
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              {hasRepliedToQuestion ? (
                <span className="text-emerald-400 font-bold">
                  ✓ Your answer has been submitted for Question #{question.questionNumber}.
                </span>
              ) : !isUserRegistered ? (
                <span>
                  <span className="font-bold text-amber-400">Spectator Mode:</span> You are viewing the live arena. Register next season to compete for cash prizes!
                </span>
              ) : !isUserStanding ? (
                <span className="text-rose-300">
                  <span className="font-bold text-rose-400">Knocked Out:</span> You were eliminated in an earlier round. Enjoy spectating the finale!
                </span>
              ) : !isUserPlanEligible ? (
                <div className="flex items-center gap-2 text-amber-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong className="text-amber-400 font-black">Plan Filtered:</strong> Question #{question.questionNumber} is restricted to{' '}
                    <span className="underline decoration-amber-400 font-bold text-white">{requiredPlanText || 'higher plan'}</span> scholars.
                    {' '}(Your Plan: <span className="font-bold text-amber-300">{userPlanName || 'Free Scholar'}</span>). You are filtered out from answering without elimination.
                  </span>
                </div>
              ) : (
                <span>
                  Reply directly in the live chat below with your exact answer.
                </span>
              )}
            </div>

            {isUserStanding && !hasRepliedToQuestion && !isUserPlanEligible && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 select-none">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ineligible for Q#{question.questionNumber}</span>
                </div>
                {onOpenUpgrade && (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-sm transition hover:scale-105 cursor-pointer"
                  >
                    Upgrade Plan
                  </button>
                )}
              </div>
            )}

            {isUserStanding && !hasRepliedToQuestion && isUserPlanEligible && onReplyToAnswer && (
              <button
                type="button"
                onClick={() => onReplyToAnswer(question)}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition hover:scale-105 flex items-center gap-1.5 shrink-0"
              >
                <span>Reply with Answer</span>
                <span>⚡</span>
              </button>
            )}
          </div>
        )}

        {/* Admin Arbiter Controls */}
        {isManagerOrAdmin && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>School Dome Arbiter Controls</span>
            </span>

            <div className="flex items-center gap-2">
              {isActive && onExtendTime && (
                <button
                  type="button"
                  onClick={() => onExtendTime(question.id, 60)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold cursor-pointer transition"
                >
                  +60s Time
                </button>
              )}

              {isActive && onCloseQuestion && (
                <button
                  type="button"
                  onClick={() => onCloseQuestion(question.id)}
                  className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  <span>End & Finalize Question</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
