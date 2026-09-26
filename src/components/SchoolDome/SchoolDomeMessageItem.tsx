import React from 'react';
import {
  SchoolDomeMessage,
  SchoolDomeQuestion,
} from '../../types';
import {
  Reply,
  Trash2,
  VolumeX,
  Building2,
  Trophy,
  Sparkles,
  Clock,
  CheckCircle2,
  Eye,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';
import { UserBadgeItem } from '../ui/UserBadgeItem';
import { useApp } from '../../context/AppContext';
import { getUserProfileDoc } from '../../lib/firebase';
import { isAnswerCorrect } from '../../lib/schoolDomeService';

interface SchoolDomeMessageItemProps {
  message: SchoolDomeMessage;
  currentUserId?: string;
  isManagerOrAdmin?: boolean;
  hasRepliedToQuestion?: boolean;
  isSpectator?: boolean;
  activeQuestion?: SchoolDomeQuestion | null;
  questions?: SchoolDomeQuestion[];
  onReply?: (message: SchoolDomeMessage) => void;
  onDelete?: (messageId: string) => void;
  onMuteUser?: (userId: string, userName: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onCloseQuestion?: (questionId: string) => void;
  onExtendTime?: (questionId: string, extraSeconds: number) => void;
}

const COMMON_EMOJIS = ['🔥', '❤️', '👏', '👍', '⚡', '💯'];
const userEquippedBadgeCache = new Map<string, any>();

const QuestionCardCountdown: React.FC<{
  competitionRef?: SchoolDomeMessage['competitionRef'];
  timestamp: number;
}> = ({ competitionRef, timestamp }) => {
  const timeLimit = competitionRef?.timeLimitSeconds || 300;
  const endAt = competitionRef?.endAt || (timestamp + timeLimit * 1000);
  const isExplicitClosed = competitionRef?.status === 'closed';

  const [remaining, setRemaining] = React.useState<number>(() => {
    if (isExplicitClosed) return 0;
    return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  });

  React.useEffect(() => {
    if (isExplicitClosed) {
      setRemaining(0);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [endAt, isExplicitClosed]);

  const isExpired = isExplicitClosed || remaining <= 0;
  const progressPercent = Math.max(0, Math.min(100, (remaining / timeLimit) * 100));

  const formatRemaining = (s: number) => {
    if (s <= 0) return 'Time Expired';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins > 0) {
      return `${mins}:${secs < 10 ? '0' : ''}${secs} remaining`;
    }
    return `${secs}s remaining`;
  };

  const limitText = timeLimit >= 60 ? `${Math.round(timeLimit / 60)} min` : `${timeLimit}s`;

  return (
    <div className="pt-1 space-y-1.5 w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-blue-200/90 text-[11px] font-semibold">
          <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span>Time Limit: <strong className="text-white font-black">{limitText}</strong> (Admin Set)</span>
        </div>

        <div
          className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1.5 border shadow-xs ${
            isExpired
              ? 'bg-slate-800/80 text-slate-400 border-slate-700'
              : remaining <= 15
              ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
              : remaining <= 30
              ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
              : 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${!isExpired ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span>{isExpired ? '⌛ Time Expired' : `⏱️ ${formatRemaining(remaining)}`}</span>
        </div>
      </div>

      {!isExpired && (
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              remaining <= 15
                ? 'bg-gradient-to-r from-rose-500 to-amber-400'
                : 'bg-gradient-to-r from-amber-400 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const SchoolDomeMessageItem: React.FC<SchoolDomeMessageItemProps> = ({
  message,
  currentUserId,
  isManagerOrAdmin,
  hasRepliedToQuestion,
  isSpectator = false,
  activeQuestion,
  questions,
  onReply,
  onDelete,
  onMuteUser,
  onReact,
  onCloseQuestion,
  onExtendTime,
}) => {
  const { currentUser } = useApp();

  if (message.isDeleted) {
    return (
      <div className="py-1 px-4 text-xs italic text-slate-400 dark:text-slate-500 bg-slate-100/40 dark:bg-slate-900/30 rounded-lg">
        [Message deleted]
      </div>
    );
  }

  const isSelf = (currentUserId && currentUserId === message.userId) || currentUser?.id === message.userId;

  // Resolve equipped badge for other users if not stamped on the message
  const [resolvedBadge, setResolvedBadge] = React.useState<any>(() => {
    if ((message as any).equippedBadge) return (message as any).equippedBadge;
    if (isSelf) return currentUser?.equippedBadge || null;
    if (message.userId && userEquippedBadgeCache.has(message.userId)) {
      return userEquippedBadgeCache.get(message.userId);
    }
    return null;
  });

  React.useEffect(() => {
    if ((message as any).equippedBadge) {
      setResolvedBadge((message as any).equippedBadge);
      return;
    }
    if (isSelf) {
      setResolvedBadge(currentUser?.equippedBadge || null);
      return;
    }
    if (!message.userId) return;

    if (userEquippedBadgeCache.has(message.userId)) {
      setResolvedBadge(userEquippedBadgeCache.get(message.userId));
      return;
    }

    let isMounted = true;
    getUserProfileDoc(message.userId)
      .then((prof) => {
        if (!isMounted) return;
        if (prof?.equippedBadge) {
          userEquippedBadgeCache.set(message.userId, prof.equippedBadge);
          setResolvedBadge(prof.equippedBadge);
        } else {
          userEquippedBadgeCache.set(message.userId, null);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [message.userId, (message as any).equippedBadge, isSelf, currentUser?.equippedBadge]);

  const effectiveEquippedBadge =
    (message as any).equippedBadge ||
    (isSelf ? currentUser?.equippedBadge : resolvedBadge);
  const isArbiter =
    message.userId === 'grobax_arbiter' ||
    message.userName.toLowerCase().includes('arbiter');

  const isCommunityManager =
    message.userName.toLowerCase().includes('manager') ||
    message.institution?.toLowerCase().includes('management') ||
    message.userName.toLowerCase().includes('community manager');

  const isStaffOrAdmin =
    isArbiter ||
    isCommunityManager ||
    message.userName.toLowerCase().includes('support') ||
    message.userName.toLowerCase().includes('staff') ||
    message.userName.toLowerCase().includes('admin') ||
    message.userId.includes('admin') ||
    message.userId.includes('barns');

  const tierString = (
    (message as any).membershipTier ||
    (message as any).tierName ||
    (message as any).subscriptionTier ||
    (message as any).subscriptionPlan ||
    ''
  ).toLowerCase();

  const isMessageUserExpired = !isStaffOrAdmin && (
    Boolean((message as any).isExpired) ||
    Boolean((message as any).subscriptionExpiry && new Date((message as any).subscriptionExpiry).getTime() <= Date.now())
  );

  const isVip =
    !isMessageUserExpired &&
    !tierString.includes('free') &&
    (Boolean((message as any).isVip) ||
      tierString.includes('vip') ||
      tierString.includes('titan') ||
      tierString.includes('annual'));

  const hasPremium =
    !isMessageUserExpired &&
    !tierString.includes('free') &&
    (isVip ||
      Boolean(message.isPremium) ||
      Boolean(
        (message as any).membershipTier &&
          !(message as any).membershipTier.toLowerCase().includes('free')
      ) ||
      (tierString.length > 0 && !tierString.includes('free')));

  const formattedTime = (() => {
    try {
      if (typeof message.timestamp === 'number') {
        return new Date(message.timestamp).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
        });
      }
      return 'Just now';
    } catch {
      return 'Just now';
    }
  })();

  const reactions = message.reactions || {};

  // Automated Marking Sign: Green check (✓) = Correct (Qualified/Survived), Red cross (✕) = Wrong (Eliminated)
  const answerStatus = React.useMemo<'correct' | 'wrong' | null>(() => {
    // 1. Direct evaluated status saved on message
    if (message.evalStatus === 'correct' || message.isCorrect === true) {
      return 'correct';
    }
    if (message.evalStatus === 'wrong' || message.isCorrect === false) {
      return 'wrong';
    }

    // 2. Identify target question if message references or replies to a question
    const replyMsgId = (message.replyTo as any)?.messageId || message.replyTo?.id || '';
    const qId =
      message.questionId ||
      (replyMsgId &&
        (replyMsgId.startsWith('msg_sdq_')
          ? replyMsgId.replace('msg_sdq_', '')
          : replyMsgId.startsWith('dome_msg_q_')
          ? replyMsgId.replace('dome_msg_q_', '')
          : null));

    const isReplyToQuestion = Boolean(
      message.replyTo &&
        (message.replyTo.messageSnippet?.includes('?') ||
          message.replyTo.userName?.toLowerCase().includes('arbiter') ||
          message.replyTo.userName?.toLowerCase().includes('moderator') ||
          message.replyTo.userName?.toLowerCase().includes('grobax') ||
          message.replyTo.messageSnippet?.toLowerCase().includes('challenge') ||
          qId)
    );

    let targetQuestion: SchoolDomeQuestion | null | undefined = null;
    if (qId) {
      targetQuestion = questions?.find((q) => q.id === qId) || (activeQuestion?.id === qId ? activeQuestion : null);
    }
    if (!targetQuestion && isReplyToQuestion) {
      targetQuestion =
        questions?.find(
          (q) =>
            message.replyTo?.messageSnippet &&
            q.questionText &&
            (message.replyTo.messageSnippet.includes(q.questionText.slice(0, 15)) ||
              q.questionText.includes(message.replyTo.messageSnippet.slice(0, 15)))
        ) || activeQuestion;
    }
    if (!targetQuestion && activeQuestion && activeQuestion.status === 'active') {
      if (message.type === 'normal' && message.timestamp >= activeQuestion.startAt && message.timestamp <= activeQuestion.endAt + 5000) {
        targetQuestion = activeQuestion;
      }
    }

    if (targetQuestion) {
      // Check if user is recorded as survivor or eliminated
      if (targetQuestion.survivorUserIds?.includes(message.userId)) {
        return 'correct';
      }
      if (targetQuestion.eliminatedUserIds?.includes(message.userId)) {
        return 'wrong';
      }
      // Or evaluate content against correct answer
      if (targetQuestion.correctAnswer && message.messageText) {
        const isCorr = isAnswerCorrect(
          message.messageText,
          targetQuestion.correctAnswer,
          targetQuestion.acceptedAlternativeAnswers
        );
        return isCorr ? 'correct' : 'wrong';
      }
    }

    return null;
  }, [message, questions, activeQuestion]);

  return (
    <div
      id={`dome-msg-${message.id}`}
      className="group relative flex flex-col px-2 sm:px-3 py-1.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors"
    >
      {/* Discord-style Curved Reply Header */}
      {message.replyTo && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-6 pb-1 relative">
          {/* L-shaped curved connector line */}
          <div className="absolute left-3 top-2 w-3 h-2.5 border-l-2 border-t-2 border-slate-300 dark:border-slate-600 rounded-tl-lg" />
          <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
            @{message.replyTo.userName}
          </span>
          <span className="truncate max-w-[240px] sm:max-w-md text-[11px] text-slate-500 dark:text-slate-400">
            {message.replyTo.messageSnippet}
          </span>
        </div>
      )}

      {/* Main Message Row */}
      <div className="flex gap-3 items-start">
        {/* User Avatar */}
        <div className="relative shrink-0 pt-0.5">
          <img
            src={
              message.userAvatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt={message.userName}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-1 ${
              isStaffOrAdmin
                ? 'ring-amber-500 shadow-xs'
                : 'ring-slate-200 dark:ring-slate-700'
            }`}
          />
        </div>

        {/* Message Content Body */}
        <div className="flex-1 min-w-0">
          {/* Top Line: Username & Twitter-style verified badge & Premium badge & Role Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <UserBadgeItem
              name={message.userName}
              verified={hasPremium || isStaffOrAdmin || (message as any).verified}
              isPremium={hasPremium}
              isVip={isVip}
              isExpired={isMessageUserExpired}
              membershipTier={
                isArbiter
                  ? 'OFFICIAL ARBITER'
                  : (message as any).membershipTier ||
                    (isVip ? 'VIP SCHOLAR' : isStaffOrAdmin ? 'VIP SCHOLAR' : hasPremium ? 'PREMIUM SCHOLAR' : 'FREE SCHOLAR')
              }
              subscriptionExpiry={(message as any).subscriptionExpiry}
              equippedBadge={effectiveEquippedBadge}
              role={(message as any).role}
              isStaffOrAdmin={isStaffOrAdmin}
              isCommunityManager={isCommunityManager}
              size="sm"
            />

            {/* Timestamp */}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-auto sm:ml-0">
              {formattedTime}
            </span>
          </div>

          {/* Subline: School / University & Department */}
          {message.institution && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">
                {message.institution}
                {message.department ? ` • ${message.department}` : ''}
              </span>
            </div>
          )}

          {/* Message Content: Question Challenge Card vs Announcement vs Normal */}
          {message.type === 'question' ? (
            <div className="mt-2 p-3.5 bg-gradient-to-br from-blue-950/80 via-indigo-950/80 to-slate-900 border-2 border-amber-400/60 rounded-2xl text-white shadow-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>SCHOOL DOME ELIMINATION CHALLENGE #{message.competitionRef?.questionNumber || 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-xs uppercase tracking-wider">
                    <span>⚔️ Survival Round</span>
                  </span>
                  {(() => {
                    const rawTargetTier =
                      (message as any).targetTier ||
                      message.competitionRef?.targetTier;
                    const rawPlanName =
                      (message as any).targetPlanName ||
                      message.competitionRef?.targetPlanName;
                    const rawSubPlan = (message as any).subscriptionPlan;

                    const effectivePlan = (rawPlanName || rawSubPlan || '').trim();
                    const planLower = effectivePlan.toLowerCase();

                    // Check if question allows Premium (which includes Premium & VIP)
                    const isPremiumLevel =
                      rawTargetTier === 'premium' ||
                      planLower.includes('premium') ||
                      planLower.includes('any paid') ||
                      planLower.includes('premium & vip') ||
                      planLower.includes('premium / vip');

                    // Check if question is strictly VIP / Titan only
                    const isStrictVip =
                      !isPremiumLevel &&
                      (rawTargetTier === 'vip' ||
                       planLower === 'vip only' ||
                       planLower === 'vip / titan only' ||
                       (planLower.includes('titan') && !planLower.includes('all') && !planLower.includes('free')));

                    if (isStrictVip) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/25 text-purple-200 font-black text-[10px] border border-purple-400/40 uppercase tracking-wide flex items-center gap-1 shadow-xs">
                          <span>👑 VIP Only</span>
                        </span>
                      );
                    }

                    if (isPremiumLevel) {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 font-black text-[10px] border border-amber-400/40 uppercase tracking-wide flex items-center gap-1 shadow-xs">
                          <span>⭐ Premium & VIP</span>
                        </span>
                      );
                    }

                    if (effectivePlan && effectivePlan !== 'Open to All' && effectivePlan !== 'All Contenders' && effectivePlan !== 'all') {
                      return (
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/25 text-cyan-200 font-black text-[10px] border border-cyan-400/40 uppercase tracking-wide flex items-center gap-1 shadow-xs">
                          <span>🎯 {effectivePlan}</span>
                        </span>
                      );
                    }

                    return (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-bold text-[10px] border border-emerald-400/30 uppercase tracking-wide flex items-center gap-1">
                        <span>🟢 All Contenders (Free)</span>
                      </span>
                    );
                  })()}
                  {(isStaffOrAdmin || isManagerOrAdmin) && (
                    <div className="flex items-center gap-1">
                      {onExtendTime && (
                        <button
                          type="button"
                          onClick={() => {
                            const qId = message.competitionRef?.questionId || message.id.replace(/^msg_sdq_/, '').replace(/^dome_msg_q_/, '');
                            onExtendTime(qId, 60);
                          }}
                          className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold border border-white/20 transition cursor-pointer"
                          title="Extend timer by 60 seconds"
                        >
                          +60s
                        </button>
                      )}
                      {onCloseQuestion && (
                        <button
                          type="button"
                          onClick={() => {
                            const qId = message.competitionRef?.questionId || message.id.replace(/^msg_sdq_/, '').replace(/^dome_msg_q_/, '');
                            onCloseQuestion(qId);
                          }}
                          className="px-2 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/30 transition cursor-pointer"
                          title="Close question challenge"
                        >
                          End Time
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-sm sm:text-base font-bold text-white leading-snug">
                {message.competitionRef?.questionText || message.messageText}
              </div>

              {/* Admin-Set Time Limit & Live Countdown Timer */}
              <QuestionCardCountdown
                competitionRef={message.competitionRef}
                timestamp={message.timestamp}
              />

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-blue-200/80 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  Type your answer in the chat (Correct = Survive • Wrong = Eliminated)
                </span>

                {hasRepliedToQuestion ? (
                  <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Answer Submitted (Evaluating Survival)</span>
                  </div>
                ) : isSpectator ? (
                  <div className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Spectator Mode</span>
                  </div>
                ) : onReply ? (
                  <button
                    onClick={() => onReply(message)}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1 shadow-md active:scale-95"
                  >
                    <Reply className="w-3.5 h-3.5 -scale-x-100" />
                    <span>Reply to Answer</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : message.type === 'announcement' || message.type === 'system' ? (
            <div className="mt-1 p-2.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-amber-100 leading-relaxed font-medium">
              {message.messageText}
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed break-words font-normal whitespace-pre-wrap mt-1 flex items-center flex-wrap gap-2">
              <span>{message.messageText}</span>
              {/* Automated Marking Sign: Green check (✓) = Qualified/Survived, Red cross (✕) = Eliminated */}
              {answerStatus === 'correct' && (
                <span
                  id={`dome-mark-correct-${message.id}`}
                  title="Marked Correct (Qualified & Survived)"
                  aria-label="Marked Correct"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs shrink-0 select-none animate-in zoom-in-75 duration-200"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
              {answerStatus === 'wrong' && (
                <span
                  id={`dome-mark-wrong-${message.id}`}
                  title="Marked Wrong (Eliminated)"
                  aria-label="Marked Wrong"
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 shadow-xs shrink-0 select-none animate-in zoom-in-75 duration-200"
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              )}
            </div>
          )}

          {/* Reactions Row + Inline Quick Reply / React Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* Existing Reactions */}
            {Object.entries(reactions).map(([emoji, count]) => {
              const numericCount = typeof count === 'number'
                ? count
                : (count && typeof count === 'object' && (count as any).value !== undefined
                  ? Number((count as any).value)
                  : Number(count));
              if (isNaN(numericCount) || numericCount <= 0) return null;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact && onReact(message.id, emoji);
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition active:scale-90 select-none"
                >
                  <span className="transform active:scale-125 transition-transform">{emoji}</span>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">{numericCount}</span>
                </button>
              );
            })}

            {/* Quick Emoji Reaction Buttons */}
            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition">
              {COMMON_EMOJIS.slice(0, 3).map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact && onReact(message.id, emoji);
                  }}
                  title={`React ${emoji}`}
                  className="text-xs px-1 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer active:scale-125 select-none"
                >
                  {emoji}
                </button>
              ))}

              {/* Quick Reply Button */}
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer font-medium"
                  title="Reply to message"
                >
                  <Reply className="w-3.5 h-3.5 -scale-x-100" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar on Hover (Discord style) */}
      <div className="absolute right-3 top-1 hidden group-hover:flex items-center gap-0.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md z-10">
        {/* Quick Emoji Reaction */}
        {COMMON_EMOJIS.slice(0, 3).map(emoji => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReact && onReact(message.id, emoji);
            }}
            title={`React with ${emoji}`}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm cursor-pointer transition active:scale-125 select-none"
          >
            {emoji}
          </button>
        ))}

        {/* Reply */}
        {onReply && (
          <button
            onClick={() => onReply(message)}
            title="Reply"
            className="p-1.5 text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5 -scale-x-100" />
          </button>
        )}

        {/* Mute User */}
        {isManagerOrAdmin && !isSelf && onMuteUser && (
          <button
            onClick={() => onMuteUser(message.userId, message.userName)}
            title="Mute User"
            className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete */}
        {(isManagerOrAdmin || isSelf) && onDelete && (
          <button
            onClick={() => onDelete(message.id)}
            title="Delete Message"
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
