import React, { useState, useEffect } from 'react';
import {
  SchoolDomeQuestion,
  SchoolDomeSeason,
  UserRole,
} from '../../types';
import {
  Clock,
  CheckCircle2,
  Lock,
  Send,
  Reply,
  X,
  Sparkles,
  Zap,
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
  onAnswerSubmit?: (question: SchoolDomeQuestion, answerText: string) => void;
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
  onAnswerSubmit,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const diff = Math.max(0, Math.ceil((question.endAt - Date.now()) / 1000));
    return question.status === 'active' ? diff : 0;
  });
  const [isQuickReplying, setIsQuickReplying] = useState(false);
  const [quickAnswerText, setQuickAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (question.status !== 'active') {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((question.endAt - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0 && question.status === 'active' && onCloseQuestion) {
        onCloseQuestion(question.id);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [question.endAt, question.status, question.id, onCloseQuestion]);

  const formatTime = (secs: number) => {
    if (secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isStanding = isUserStanding || isManagerOrAdmin;
  const canReply = isStanding && isUserPlanEligible && !hasRepliedToQuestion;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickAnswerText.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    if (onAnswerSubmit) {
      onAnswerSubmit(question, trimmed);
    } else if (onReplyToAnswer) {
      onReplyToAnswer(question);
    }
    setQuickAnswerText('');
    setIsQuickReplying(false);
    setIsSubmitting(false);
  };

  return (
    <div
      id={`school-dome-question-card-${question.id}`}
      className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-lg text-white space-y-2 backdrop-blur-md transition-all"
    >
      {/* Compact Top Header Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Q#{question.questionNumber}</span>
          </span>

          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 shrink-0 border ${
              secondsRemaining <= 15
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatTime(secondsRemaining)}</span>
          </span>

          {question.targetPlanName && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
              {question.targetPlanName}
            </span>
          )}
        </div>

        {/* Right Action: Answer Submitted / Reply with Answer / Admin Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasRepliedToQuestion ? (
            <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>✓ Answer Submitted (1 attempt used)</span>
            </div>
          ) : !isUserPlanEligible && !isManagerOrAdmin ? (
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition cursor-pointer flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>Upgrade Plan</span>
            </button>
          ) : canReply ? (
            <button
              type="button"
              onClick={() => {
                setIsQuickReplying((prev) => !prev);
                onReplyToAnswer?.(question);
              }}
              className="px-3.5 py-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition hover:scale-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Reply directly or in arena chat below"
            >
              <Reply className="w-3.5 h-3.5 -scale-x-100 stroke-[2.5]" />
              <span>{isQuickReplying ? 'Close Reply' : 'Reply with Answer'}</span>
              <span>⚡</span>
            </button>
          ) : !isUserRegistered && !isManagerOrAdmin ? (
            <span className="text-[11px] text-amber-400/90 font-bold">Registration Closed</span>
          ) : (
            <span className="text-[11px] text-slate-400 font-bold">Spectator Mode</span>
          )}

          {/* Compact Arbiter Controls */}
          {isManagerOrAdmin && (
            <div className="flex items-center gap-1 pl-1 border-l border-white/10">
              {onExtendTime && (
                <button
                  type="button"
                  onClick={() => onExtendTime(question.id, 60)}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold border border-white/10 transition cursor-pointer"
                  title="Add +60s"
                >
                  +60s
                </button>
              )}
              {onCloseQuestion && (
                <button
                  type="button"
                  onClick={() => onCloseQuestion(question.id)}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition cursor-pointer"
                  title="End question now"
                >
                  End Time
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Question Text Alone */}
      <div className="text-sm sm:text-base font-black text-white leading-snug px-1">
        « {question.questionText} »
      </div>

      {/* Inline Quick Answer Box inside this card */}
      {isQuickReplying && canReply && (
        <form onSubmit={handleQuickSubmit} className="flex items-center gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
          <input
            type="text"
            autoFocus
            value={quickAnswerText}
            onChange={(e) => setQuickAnswerText(e.target.value)}
            placeholder="Type your official answer here (1 attempt only)..."
            className="flex-1 bg-slate-800/90 border border-amber-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <button
            type="submit"
            disabled={!quickAnswerText.trim() || isSubmitting}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-50"
          >
            <span>Submit</span>
            <Send className="w-3 h-3" />
          </button>
        </form>
      )}
    </div>
  );
};
