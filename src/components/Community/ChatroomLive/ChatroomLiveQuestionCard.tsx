import React, { useState, useEffect } from 'react';
import {
  ChatroomLiveQuestion,
  UserRole,
} from '../../../types';
import { TwitterVerifiedBadge, PremiumPackageBadge } from '../../ui/UserBadgeItem';
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
  PlusCircle,
  ScrollText,
} from 'lucide-react';
import { ChatroomRulesModal } from './ChatroomRulesModal';

interface ChatroomLiveQuestionCardProps {
  question: ChatroomLiveQuestion;
  role?: UserRole;
  isManagerOrAdmin?: boolean;
  hasRepliedToQuestion?: boolean;
  onCloseQuestion?: (questionId: string) => void;
  onExtendTime?: (questionId: string, extraSeconds: number) => void;
  onOpenUpgradeModal?: () => void;
  isUserPremium?: boolean;
  onReplyToAnswer?: (question: ChatroomLiveQuestion) => void;
}

export const ChatroomLiveQuestionCard: React.FC<ChatroomLiveQuestionCardProps> = ({
  question,
  role,
  isManagerOrAdmin,
  hasRepliedToQuestion,
  onCloseQuestion,
  onExtendTime,
  onOpenUpgradeModal,
  isUserPremium,
  onReplyToAnswer,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

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
        // Auto close timer if expired
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [question.endAt, question.status, onCloseQuestion]);

  const totalTime = question.timeLimitSeconds || 60;
  const progressPercent = Math.max(
    0,
    Math.min(100, (secondsRemaining / totalTime) * 100)
  );

  const isActive = question.status === 'active' && secondsRemaining > 0;
  const winners = question.selectedWinners || [];
  const maxWinners = question.winnerLimit || 5;

  return (
    <div
      id={`live-question-card-${question.id}`}
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
              <Flame className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xs font-black tracking-wider uppercase text-amber-400">
              {isActive ? 'Live Competition Question' : 'Completed Round'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              #{question.questionNumber} of {question.totalQuestions || 10}
            </span>
          </div>
        </div>

        {/* Prize Pill & Countdown Clock */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30 text-xs font-black flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {maxWinners} Winners • {question.gpRewardPerWinner || 200} GP Each
            </span>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border ${
              isActive
                ? secondsRemaining <= 10
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isActive ? `${secondsRemaining}s Left` : 'Time Expired'}
            </span>
          </div>

          {/* Daily GP Grab Rules Icon Button */}
          <button
            type="button"
            onClick={() => setIsRulesModalOpen(true)}
            className="px-2.5 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-400/40 text-indigo-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="View Daily GP Grab Rules"
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-300" />
            <span>Rules</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {isActive && (
        <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              secondsRemaining <= 10
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
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Answer with exact word/term in chat</span>
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

        {/* Winner Slots & Real-time Roster */}
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>
                Verified Premium Winners ({winners.length} / {maxWinners} Slots Filled)
              </span>
            </span>
            <span className="text-slate-400 text-[11px]">
              {question.totalSubmissionsCount || 0} typed answers received
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from({ length: maxWinners }).map((_, idx) => {
              const winner = winners[idx];
              if (winner) {
                const isWinnerVip = Boolean(
                  winner.isVip ||
                  (winner.membershipTier && (winner.membershipTier.toLowerCase().includes('vip') || winner.membershipTier.toLowerCase().includes('titan')))
                );
                const isWinnerPremium = Boolean(isWinnerVip || winner.isPremium || winner.membershipTier);

                return (
                  <div
                    key={`winner-${winner.userId}-${idx}`}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-blue-600/20 border border-amber-500/40 flex items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={winner.userAvatar}
                        alt={winner.userName}
                        className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-400 shrink-0"
                      />
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-black text-white truncate flex items-center gap-1 flex-wrap">
                          <span className={isWinnerVip ? 'text-amber-300 font-black' : 'text-white'}>
                            {winner.userName}
                          </span>
                          {isWinnerPremium && (
                            <TwitterVerifiedBadge
                              className="w-3.5 h-3.5"
                              title={isWinnerVip ? 'VIP Verified Grobaax Scholar' : 'Verified Grobaax Scholar'}
                            />
                          )}
                          {isWinnerPremium && (
                            <PremiumPackageBadge
                              tier={winner.membershipTier || (isWinnerVip ? 'VIP SCHOLAR' : 'PREMIUM')}
                              isVip={isWinnerVip}
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-amber-300/80 truncate">
                          {winner.institution}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg shrink-0">
                      +{winner.gpAwarded || 200} GP
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={`empty-slot-${idx}`}
                  className="p-2.5 rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center gap-2 text-slate-500 text-xs"
                >
                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    #{idx + 1}
                  </div>
                  <span className="text-[11px] italic">
                    {isActive ? 'Awaiting fastest answer...' : 'Unclaimed slot'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Active Answer Callout Action */}
        {isActive && onReplyToAnswer && (
          <div className="p-3 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-2xl border border-blue-400/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Know the answer? Type in chat or click reply to submit!</span>
            </div>
            {hasRepliedToQuestion ? (
              <div className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Answer Submitted (1 Attempt Allowed)</span>
              </div>
            ) : (
              <button
                onClick={() => onReplyToAnswer(question)}
                className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition hover:scale-105 flex items-center gap-1.5 shrink-0"
              >
                <span>Reply with Answer</span>
                <span>⚡</span>
              </button>
            )}
          </div>
        )}

        {/* Free user upgrade prompt inside card if not premium */}
        {!isUserPremium && onOpenUpgradeModal && (
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Free scholars answer for pride. <span className="font-bold text-white">Upgrade to Premium</span> to qualify for the 200 GP prize pool!
              </span>
            </div>
            <button
              onClick={onOpenUpgradeModal}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg cursor-pointer shrink-0 transition"
            >
              Upgrade 👑
            </button>
          </div>
        )}

        {/* Admin Management Toolbar */}
        {isManagerOrAdmin && (
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Arbiter Controls</span>
            </span>

            <div className="flex items-center gap-2">
              {isActive && onExtendTime && (
                <button
                  onClick={() => onExtendTime(question.id, 30)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold cursor-pointer transition"
                >
                  +30s Time
                </button>
              )}

              {isActive && onCloseQuestion && (
                <button
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

      {/* Rules Modal */}
      {isRulesModalOpen && (
        <ChatroomRulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          onOpenUpgradeModal={onOpenUpgradeModal}
          isPremium={isUserPremium}
          isManagerOrAdmin={isManagerOrAdmin}
        />
      )}
    </div>
  );
};
