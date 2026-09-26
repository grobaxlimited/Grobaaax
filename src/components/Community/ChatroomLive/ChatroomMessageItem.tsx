import React from 'react';
import {
  ChatroomLiveMessage,
} from '../../../types';
import {
  Reply,
  Trash2,
  VolumeX,
  Shield,
  Building2,
  Trophy,
  Sparkles,
  HelpCircle,
  Clock,
  Timer,
  CheckCircle2,
  Check,
  X,
  ScrollText,
} from 'lucide-react';
import { UserBadgeItem } from '../../ui/UserBadgeItem';
import { useApp } from '../../../context/AppContext';
import { getUserProfileDoc, isChatroomAnswerCorrect } from '../../../lib/firebase';
import { ChatroomRulesModal } from './ChatroomRulesModal';

interface ChatroomMessageItemProps {
  message: ChatroomLiveMessage;
  currentUserId?: string;
  isManagerOrAdmin?: boolean;
  hasRepliedToQuestion?: boolean;
  onReply?: (message: ChatroomLiveMessage) => void;
  onDelete?: (messageId: string) => void;
  onMuteUser?: (userId: string, userName: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onOpenUpgradeModal?: () => void;
}

const COMMON_EMOJIS = ['🔥', '❤️', '👏', '👍', '⚡', '💯'];
const userEquippedBadgeCache = new Map<string, any>();

export const ChatroomMessageItem: React.FC<ChatroomMessageItemProps> = ({
  message,
  currentUserId,
  isManagerOrAdmin,
  hasRepliedToQuestion,
  onReply,
  onDelete,
  onMuteUser,
  onReact,
  onOpenUpgradeModal,
}) => {
  const {
    currentUser,
    chatroomMessages,
    openWalletModal,
    setIsWalletModalOpen,
    setWalletModalTab,
  } = useApp();

  const [isRulesModalOpen, setIsRulesModalOpen] = React.useState(false);

  const handleOpenUpgrade = () => {
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal();
    } else if (openWalletModal) {
      openWalletModal('upgrade');
    } else if (setWalletModalTab && setIsWalletModalOpen) {
      setWalletModalTab('upgrade');
      setIsWalletModalOpen(true);
    }
  };

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

  // Live countdown timer for question challenges
  const [timeLeft, setTimeLeft] = React.useState<number>(() => {
    if (message.type !== 'question') return 0;
    const endAt =
      message.competitionRef?.endAt ||
      (message.competitionRef?.timeLimitSeconds
        ? message.timestamp + message.competitionRef.timeLimitSeconds * 1000
        : message.timestamp + 300000);
    return Math.max(0, Math.floor((endAt - Date.now()) / 1000));
  });

  React.useEffect(() => {
    if (message.type !== 'question') return;
    const endAt =
      message.competitionRef?.endAt ||
      (message.competitionRef?.timeLimitSeconds
        ? message.timestamp + message.competitionRef.timeLimitSeconds * 1000
        : message.timestamp + 300000);

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [message.type, message.competitionRef?.endAt, message.competitionRef?.timeLimitSeconds, message.timestamp]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveEquippedBadge =
    (message as any).equippedBadge ||
    (isSelf ? currentUser?.equippedBadge : resolvedBadge);
  const isCommunityManager =
    message.userName.toLowerCase().includes('manager') ||
    message.institution?.toLowerCase().includes('management') ||
    message.userName.toLowerCase().includes('community manager');

  const isStaffOrAdmin =
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
      ));

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

  // Automated Marking Sign: Green check (✓) with +GP earned if qualified/won, Red cross (✕) if wrong
  const { answerStatus, gpEarned } = React.useMemo<{
    answerStatus: 'correct' | 'wrong' | null;
    gpEarned: number;
  }>(() => {
    // Only normal user messages can be evaluated as answers (not system cards or Arbiter)
    if (message.type !== 'normal' || message.userId === 'grobax_arbiter') {
      return { answerStatus: null, gpEarned: 0 };
    }

    // 1. Direct evaluated status saved on message doc
    if (message.evalStatus === 'correct' || message.isCorrect === true || message.answerEvaluation?.isCorrect === true) {
      const awarded =
        typeof message.gpAwarded === 'number'
          ? message.gpAwarded
          : typeof message.answerEvaluation?.gpAwarded === 'number'
          ? message.answerEvaluation.gpAwarded
          : 0;
      return {
        answerStatus: 'correct',
        gpEarned: (!hasPremium && !isStaffOrAdmin) ? 0 : awarded,
      };
    }
    if (message.evalStatus === 'wrong' || message.isCorrect === false || (message.answerEvaluation && message.answerEvaluation.isCorrect === false)) {
      return { answerStatus: 'wrong', gpEarned: 0 };
    }

    // 2. Fallback resolution: identify question if replying to or submitted during active challenge
    const normMsgUser = (message.userName || '')
      .replace(/\s*(💎\s*\|\s*Moderator|🛡️|⭐|👑|⚡).*$/, '')
      .trim()
      .toLowerCase();

    const questionMessages = (chatroomMessages || []).filter(m => m.type === 'question' && m.competitionRef);

    let targetQuestionMsg: ChatroomLiveMessage | undefined;

    // Check if message explicitly replied to question card
    if (message.replyTo?.id) {
      const rawId = message.replyTo.id;
      const strippedId = rawId.replace(/^msg_q_/, '');
      targetQuestionMsg = questionMessages.find(
        qm =>
          qm.id === rawId ||
          qm.id === `msg_q_${strippedId}` ||
          qm.competitionRef?.questionId === strippedId ||
          qm.competitionRef?.questionId === rawId
      );
    }

    // Reply snippet check
    if (!targetQuestionMsg && message.replyTo?.messageSnippet) {
      targetQuestionMsg = questionMessages.find(
        qm =>
          qm.competitionRef?.questionText &&
          (message.replyTo!.messageSnippet.includes(qm.competitionRef.questionText.slice(0, 20)) ||
            qm.competitionRef.questionText.includes(message.replyTo!.messageSnippet.slice(0, 20)))
      );
    }

    // Time window check: question posted before message and message submitted within challenge window
    if (!targetQuestionMsg) {
      const candidateQuestions = questionMessages.filter(
        qm =>
          qm.timestamp <= message.timestamp + 5000 &&
          message.timestamp <= (qm.competitionRef?.endAt || qm.timestamp + 900000)
      );
      if (candidateQuestions.length > 0) {
        candidateQuestions.sort((a, b) => b.timestamp - a.timestamp);
        targetQuestionMsg = candidateQuestions[0];
      }
    }

    if (!targetQuestionMsg || !targetQuestionMsg.competitionRef) {
      return { answerStatus: null, gpEarned: 0 };
    }

    const comp = targetQuestionMsg.competitionRef;

    // Check confirmed winners list on question
    const winnerRecord = (comp.selectedWinners || []).find(
      w => w.userId === message.userId || (w.userName && w.userName.toLowerCase().trim() === normMsgUser && normMsgUser.length > 0)
    );
    if (winnerRecord) {
      return {
        answerStatus: 'correct',
        gpEarned: (!hasPremium && !isStaffOrAdmin) ? 0 : (winnerRecord.gpAwarded || comp.gpRewardPerWinner || 50),
      };
    }

    // Check free correct scholars list on question
    const freeRecord = ((comp as any).freeCorrectScholars || []).find(
      (f: any) => f.userId === message.userId || (f.userName && f.userName.toLowerCase().trim() === normMsgUser && normMsgUser.length > 0)
    );
    if (freeRecord) {
      return { answerStatus: 'correct', gpEarned: 0 };
    }

    // Dynamic answer check against question's correctAnswer and accepted alternatives
    if (comp.correctAnswer && message.messageText) {
      const isCorrect = isChatroomAnswerCorrect(
        message.messageText,
        comp.correctAnswer,
        (comp as any).acceptedAlternativeAnswers
      );

      if (isCorrect) {
        // Free scholars are correct but do not earn GP
        const isEligibleForGp = (hasPremium || isStaffOrAdmin);
        const withinTime = message.timestamp <= (comp.endAt || comp.startAt || message.timestamp + 300000);
        const currentWinnersCount = (comp.selectedWinners || []).length;
        const maxWinners = comp.winnerCountLimit || 5;
        const slotsAvailable = currentWinnersCount < maxWinners;

        const earned = (isEligibleForGp && withinTime && slotsAvailable) ? (comp.gpRewardPerWinner || 50) : 0;
        return {
          answerStatus: 'correct',
          gpEarned: earned,
        };
      }

      // If user specifically replied to this question or manager and answer was incorrect
      if (
        message.replyTo &&
        (message.replyTo.id?.includes('msg_q_') ||
          message.replyTo.userName?.toLowerCase().includes('manager') ||
          message.replyTo.userName?.toLowerCase().includes('arbiter'))
      ) {
        return { answerStatus: 'wrong', gpEarned: 0 };
      }
    }

    return { answerStatus: null, gpEarned: 0 };
  }, [message, chatroomMessages, hasPremium, isStaffOrAdmin]);

  return (
    <div
      id={`chat-msg-${message.id}`}
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
                (message as any).membershipTier ||
                (isVip ? 'VIP SCHOLAR' : isStaffOrAdmin ? 'VIP SCHOLAR' : hasPremium ? 'PREMIUM' : 'FREE SCHOLAR')
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
            <div className="mt-2 p-3.5 sm:p-4 bg-gradient-to-br from-blue-950/90 via-indigo-950/90 to-slate-900 border-2 border-amber-400/60 rounded-2xl text-white shadow-lg space-y-3">
              {/* Header: Challenge Title, Countdown Timer, and Rewards */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>LIVE Q&A CHALLENGE #{message.competitionRef?.questionNumber || 1}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Real-Time Countdown Timer Configured by Admin */}
                  {message.competitionRef?.status === 'closed' || (message.competitionRef?.selectedWinners && message.competitionRef.selectedWinners.length >= (message.competitionRef?.winnerCountLimit || 5)) ? (
                    <span className="px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 font-bold text-[11px] flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Round Concluded</span>
                    </span>
                  ) : timeLeft <= 0 ? (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/25 border border-rose-500/50 text-rose-300 font-bold text-[11px] flex items-center gap-1.5 shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Time Expired (00:00)</span>
                    </span>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full font-black text-[11px] sm:text-xs flex items-center gap-1.5 shadow-md border transition-all ${
                      timeLeft <= 30
                        ? 'bg-rose-500/30 border-rose-400 text-rose-200 animate-pulse'
                        : timeLeft <= 60
                        ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                        : 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                    }`}>
                      <Timer className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>⏱️ Countdown: <span className="font-mono font-black tracking-wider text-white text-xs sm:text-sm">{formatCountdown(timeLeft)}</span></span>
                    </span>
                  )}

                  <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-xs">
                    <Trophy className="w-3 h-3" />
                    +{message.competitionRef?.gpRewardPerWinner || 50} GP each
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 font-bold text-[10px] border border-blue-400/30">
                    First {message.competitionRef?.winnerCountLimit || 5} scholars
                  </span>

                  {/* Daily GP Grab Rules Button */}
                  <button
                    type="button"
                    id={`question-rules-btn-${message.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRulesModalOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-full bg-indigo-500/25 hover:bg-indigo-500/45 border border-indigo-400/40 text-indigo-100 hover:text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer"
                    title="View Daily GP Grab Rules"
                  >
                    <ScrollText className="w-3 h-3 text-amber-300" />
                    <span>Rules</span>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm sm:text-base font-bold text-white leading-snug">
                {message.competitionRef?.questionText || message.messageText}
              </div>

              {/* Confirmed Winners List if any */}
              {message.competitionRef?.selectedWinners && message.competitionRef.selectedWinners.length > 0 && (
                <div className="p-2 bg-white/5 rounded-xl border border-white/10 space-y-1">
                  <div className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Confirmed Winners ({message.competitionRef.selectedWinners.length}/{message.competitionRef.winnerCountLimit || 5}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {message.competitionRef.selectedWinners.map((w, wIdx) => (
                      <span key={w.userId || wIdx} className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30 text-[11px] font-bold text-white flex items-center gap-1">
                        🏆 @{w.userName} <span className="text-amber-300">(+{w.gpAwarded || message.competitionRef?.gpRewardPerWinner || 50} GP)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer: Time status & Action Button */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-blue-200/90 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  {message.competitionRef?.status === 'closed' || (message.competitionRef?.selectedWinners && message.competitionRef.selectedWinners.length >= (message.competitionRef?.winnerCountLimit || 5)) ? (
                    <span>Round concluded • Submissions locked</span>
                  ) : timeLeft <= 0 ? (
                    <span className="text-rose-300 font-semibold">Time limit elapsed • Submissions locked</span>
                  ) : (
                    <span>
                      Time Limit: <strong>{message.competitionRef?.timeLimitSeconds ? (message.competitionRef.timeLimitSeconds >= 60 ? `${Math.round(message.competitionRef.timeLimitSeconds / 60)} min` : `${message.competitionRef.timeLimitSeconds}s`) : '5 min'}</strong> • <strong>{formatCountdown(timeLeft)}</strong> remaining
                    </span>
                  )}
                </span>

                {hasRepliedToQuestion ? (
                  <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Answer Submitted (1 Attempt Allowed)</span>
                  </div>
                ) : message.competitionRef?.status === 'closed' || (message.competitionRef?.selectedWinners && message.competitionRef.selectedWinners.length >= (message.competitionRef?.winnerCountLimit || 5)) ? (
                  <div className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold rounded-xl flex items-center gap-1">
                    <span>Round Ended</span>
                  </div>
                ) : timeLeft <= 0 ? (
                  <div className="px-3 py-1 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs font-semibold rounded-xl flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" />
                    <span>Time Expired</span>
                  </div>
                ) : onReply ? (
                  <button
                    onClick={() => onReply(message)}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Reply className="w-3.5 h-3.5 -scale-x-100" />
                    <span>Reply to Answer</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : message.type === 'announcement' ? (
            <div className="mt-1 p-2.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-amber-100 leading-relaxed font-medium">
              {message.messageText}
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed break-words font-normal whitespace-pre-wrap mt-1 flex items-center flex-wrap gap-2">
              <span>{message.messageText}</span>

              {/* Automated Marking Sign: Green check (✓) = Correct with +GP earned, Red cross (✕) = Wrong */}
              {answerStatus === 'correct' && (
                <span
                  id={`chat-mark-correct-${message.id}`}
                  title={gpEarned > 0 ? `Marked Correct (+${gpEarned} GP Earned)` : 'Marked Correct (Free Scholar — Upgrade for GP prizes)'}
                  aria-label="Marked Correct"
                  className="inline-flex items-center gap-1.5 shrink-0 select-none animate-in zoom-in-75 duration-200"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                  {gpEarned > 0 ? (
                    <span
                      id={`chat-mark-gp-${message.id}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-black tracking-wide shadow-xs"
                    >
                      +{gpEarned} GP
                    </span>
                  ) : (
                    <button
                      type="button"
                      id={`chat-mark-upgrade-${message.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenUpgrade();
                      }}
                      title="Upgrade to earn GP on live challenges"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 border border-amber-500/50 text-[11px] font-black tracking-tight shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer select-none"
                    >
                      <Sparkles className="w-3 h-3 text-slate-950 shrink-0" />
                      <span>Upgrade to earn GP</span>
                    </button>
                  )}
                </span>
              )}

              {answerStatus === 'wrong' && (
                <span
                  id={`chat-mark-wrong-${message.id}`}
                  title="Marked Wrong"
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
                  <Reply className="w-3 h-3 -scale-x-100" />
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

      {/* Daily GP Grab Rules Modal */}
      {isRulesModalOpen && (
        <ChatroomRulesModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
          onOpenUpgradeModal={handleOpenUpgrade}
          isPremium={currentUser?.isVip || (currentUser?.membershipTier || '').toLowerCase() === 'premium' || (currentUser?.membershipTier || '').toLowerCase() === 'vip'}
          isManagerOrAdmin={isManagerOrAdmin}
          adminUid={currentUser?.id}
          adminName={currentUser?.name}
        />
      )}
    </div>
  );
};
