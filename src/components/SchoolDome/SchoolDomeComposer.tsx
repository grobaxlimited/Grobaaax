import React, { useState, useRef, useEffect } from 'react';
import {
  SchoolDomeMessage,
} from '../../types';
import { useApp } from '../../context/AppContext';
import { isSubscriptionExpired } from '../../lib/firebase';
import {
  Send,
  X,
  Smile,
  Plus,
  VolumeX,
  AlertCircle,
  Sparkles,
  Swords,
  Lock,
} from 'lucide-react';

interface SchoolDomeComposerProps {
  onSendMessage: (text: string, replyTo?: SchoolDomeMessage['replyTo']) => void;
  replyToMessage?: SchoolDomeMessage | null;
  onCancelReply?: () => void;
  isChatMuted?: boolean;
  isPaused?: boolean;
  channelName?: string;
  isManagerOrAdmin?: boolean;
  hasRepliedToTarget?: boolean;
  isUserRegistered?: boolean;
  isUserStanding?: boolean;
  isRegistrationLocked?: boolean;
  onOpenUpgrade?: () => void;
  onOpenRegister?: () => void;
  onOpenCreateQuestion?: () => void;
}

const QUICK_EMOJIS = ['🔥', '⚡', '❤️', '👏', '🎯', '💯', '👍', '😊', '😂', '🎉'];

export const SchoolDomeComposer: React.FC<SchoolDomeComposerProps> = ({
  onSendMessage,
  replyToMessage,
  onCancelReply,
  isChatMuted,
  isPaused = false,
  channelName = 'school-dome',
  isManagerOrAdmin = false,
  hasRepliedToTarget = false,
  isUserRegistered = false,
  isUserStanding = false,
  isRegistrationLocked = false,
  onOpenUpgrade,
  onOpenRegister,
  onOpenCreateQuestion,
}) => {
  const { currentUser, openWalletModal } = useApp();
  const [inputText, setInputText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isUserExpired = !isManagerOrAdmin && isSubscriptionExpired(currentUser);
  const uMem = ((currentUser?.membershipTier || (currentUser as any)?.tierName || '') + '').toLowerCase().trim();
  const uSub = ((currentUser?.subscriptionTier || '') + '').toLowerCase().trim();
  const uPlan = ((currentUser?.subscriptionPlan || '') + '').toLowerCase().trim();
  const rawP = ((currentUser?.activePlanId || currentUser?.planId || '') + '').toLowerCase().trim();

  const isUserVip = !isUserExpired && Boolean(
    isManagerOrAdmin ||
    currentUser?.isVip ||
    currentUser?.targetTier === 'vip' ||
    currentUser?.tierType === 'vip' ||
    currentUser?.gusTier === 'Titan' ||
    uMem.includes('vip') || uMem.includes('titan') ||
    uSub.includes('vip') || uSub.includes('titan') ||
    uPlan.includes('vip') || uPlan.includes('titan') ||
    rawP.includes('titan') || rawP.includes('vip')
  );

  const hasExplicitPaidPlan = Boolean(
    rawP === 'plan_basic_naira' ||
    rawP === 'plan_pro_naira' ||
    rawP === 'plan_titan_naira' ||
    rawP.includes('pro') ||
    rawP.includes('basic') ||
    uPlan.includes('champions pro') ||
    uPlan.includes('scholar starter plan') ||
    uPlan.includes('pro') ||
    uPlan.includes('premium') ||
    uMem.includes('premium') ||
    uSub.includes('premium') ||
    currentUser?.targetTier === 'premium' ||
    currentUser?.tierType === 'premium' ||
    currentUser?.isPremium === true ||
    currentUser?.isSubscribed === true ||
    (currentUser?.subscription && currentUser.subscription.status === 'active')
  );

  const isFreeMarker = Boolean(
    uMem.includes('free') ||
    uSub.includes('free') ||
    uPlan.includes('free') ||
    rawP.includes('free') ||
    uMem === 'starter scholar' ||
    uMem === 'free scholar' ||
    uMem === 'scholar' ||
    uSub === 'starter scholar' ||
    uSub === 'free scholar' ||
    uSub === 'scholar' ||
    uPlan === 'free scholar'
  );

  const isUserPremium = !isUserExpired && Boolean(
    isUserVip ||
    (hasExplicitPaidPlan && !isFreeMarker)
  );

  const isFreeScholar = !isManagerOrAdmin && !isUserVip && !isUserPremium;

  const isQuestionTargetForAll = Boolean(
    replyToMessage?.type === 'question' && (
      (replyToMessage.targetTier || '').toLowerCase() === 'all' ||
      (replyToMessage.targetTier || '').toLowerCase() === 'free' ||
      replyToMessage.allowFreeParticipation === true ||
      (replyToMessage.competitionRef?.targetTier || '').toLowerCase() === 'all' ||
      (replyToMessage.competitionRef?.targetTier || '').toLowerCase() === 'free' ||
      replyToMessage.competitionRef?.allowFreeParticipation === true ||
      (replyToMessage.targetPlanName || '').toLowerCase().includes('all user') ||
      (replyToMessage.targetPlanName || '').toLowerCase().includes('free + premium') ||
      (replyToMessage.targetPlanName || '').toLowerCase().includes('free users') ||
      (replyToMessage.targetPlanName || '').toLowerCase().includes('open to all') ||
      (replyToMessage.competitionRef?.targetPlanName || '').toLowerCase().includes('all user') ||
      (replyToMessage.competitionRef?.targetPlanName || '').toLowerCase().includes('free + premium') ||
      (replyToMessage.competitionRef?.targetPlanName || '').toLowerCase().includes('free users') ||
      (replyToMessage.competitionRef?.targetPlanName || '').toLowerCase().includes('open to all')
    )
  );

  const isFreeScholarRestrictedOnQuestion = isFreeScholar && !isQuestionTargetForAll;

  const isPausedForUser = Boolean(isPaused && !isManagerOrAdmin);
  const isQuestionReplyBlocked = Boolean(replyToMessage?.type === 'question' && (hasRepliedToTarget || isFreeScholarRestrictedOnQuestion));
  // Input should never be disabled for normal chatting; only disabled if season is paused
  const isInputDisabled = isPausedForUser;

  // If user already replied to this question card or is restricted, automatically cancel reply target so they can continue texting normally!
  useEffect(() => {
    if (replyToMessage?.type === 'question' && (hasRepliedToTarget || isFreeScholarRestrictedOnQuestion)) {
      if (onCancelReply) {
        onCancelReply();
      }
    }
  }, [replyToMessage?.id, hasRepliedToTarget, isFreeScholarRestrictedOnQuestion, onCancelReply]);

  useEffect(() => {
    if (replyToMessage && inputRef.current && !isQuestionReplyBlocked) {
      inputRef.current.focus();
    }
  }, [replyToMessage, isQuestionReplyBlocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (replyToMessage?.type === 'question' && isFreeScholarRestrictedOnQuestion) {
      alert('Question cards are exclusively reserved for Premium and VIP scholars. Free users cannot submit answers. Upgrade to Premium or VIP to participate in question challenges!');
      if (openWalletModal) openWalletModal('upgrade');
      if (onCancelReply) onCancelReply();
      return;
    }

    // If user already answered this question or is free, do not attach replyPayload so it sends as normal arena chat
    const replyPayload = (replyToMessage && !isQuestionReplyBlocked)
      ? {
          id: replyToMessage.id,
          userName: replyToMessage.userName,
          messageSnippet: replyToMessage.messageText.slice(0, 80),
          institution: replyToMessage.institution,
          questionId: (replyToMessage as any).questionId || replyToMessage.competitionRef?.questionId,
        }
      : undefined;

    onSendMessage(trimmed, replyPayload);
    setInputText('');
    setShowEmojiBar(false);
    if (onCancelReply) onCancelReply();
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  if (isChatMuted) {
    return (
      <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 text-center rounded-2xl">
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <AlertCircle className="w-4 h-4" />
          <span>The arena is currently in read-only arbiter mode.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 sm:px-4 py-2.5 space-y-2 shrink-0">
      {/* Quick Emoji Bar */}
      {showEmojiBar && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-base select-none no-scrollbar">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition hover:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Reply target preview */}
      {replyToMessage && (
        <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border ${
          replyToMessage.type === 'question'
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200/80 dark:border-blue-800/80'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {replyToMessage.type === 'question' ? (
              isFreeScholarRestrictedOnQuestion ? (
                <div className="flex items-center gap-1.5 shrink-0 text-amber-600 dark:text-amber-400 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>🔒 Premium & VIP Only:</span>
                </div>
              ) : isQuestionTargetForAll ? (
                <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                  <span>🌐 All Users Answer Mode:</span>
                </span>
              ) : (
                <span className="font-black text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-1">
                  <span>⚡ Official Answer Mode:</span>
                </span>
              )
            ) : (
              <span className="font-bold text-blue-700 dark:text-blue-400 shrink-0">
                Replying to @{replyToMessage.userName}:
              </span>
            )}
            <span className="text-slate-700 dark:text-slate-300 truncate font-semibold">
              {replyToMessage.competitionRef?.questionText || replyToMessage.messageText}
            </span>
            {replyToMessage.type === 'question' && isFreeScholarRestrictedOnQuestion ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenUpgrade) onOpenUpgrade();
                  else if (openWalletModal) openWalletModal('upgrade');
                }}
                className="px-2.5 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase shrink-0 border border-amber-500/40 cursor-pointer transition"
              >
                Upgrade to Answer
              </button>
            ) : replyToMessage.type === 'question' && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${isQuestionTargetForAll ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/25 text-amber-700 dark:text-amber-300'}`}>
                {isQuestionTargetForAll ? 'Free + VIP (1 Attempt)' : '1 Attempt'}
              </span>
            )}
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              title="Cancel reply (switch to regular chat)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Bottom Input Row */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Quick Reaction Plus Button */}
        <button
          type="button"
          onClick={() => setShowEmojiBar(!showEmojiBar)}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
          title="Quick Reaction"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Input Box */}
        <div className={`relative flex-1 flex items-center rounded-2xl border px-3 py-1.5 transition-all ${
          isInputDisabled
            ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            : replyToMessage?.type === 'question'
            ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/50 dark:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
        }`}>
          <input
            ref={inputRef}
            type="text"
            disabled={isInputDisabled}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              isPausedForUser
                ? '⏸️ Arena paused by Arbiter. Responses and chat are frozen...'
                : replyToMessage?.type === 'question'
                ? isFreeScholarRestrictedOnQuestion
                  ? '🔒 Admin set for Premium & VIP: Free users cannot reply to question cards...'
                  : `Type your official answer for Question #${replyToMessage.competitionRef?.questionNumber || (replyToMessage as any).questionNumber || ''} (1 attempt only)...`
                : !isUserRegistered && !isManagerOrAdmin
                ? `Enter spectator comment #${channelName}...`
                : isUserStanding
                ? `Enter arena message #${channelName} (casual chat does not count as question answer)...`
                : `Enter arena chat #${channelName}...`
            }
            className={`w-full bg-transparent text-xs sm:text-sm focus:outline-hidden py-1 ${
              isInputDisabled
                ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed placeholder-slate-400/80'
                : 'text-slate-900 dark:text-slate-100 placeholder-slate-400'
            }`}
          />

          {/* Right Input Icons (Admin Yellow Q Button, Emoji, Send) */}
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Admin 'Q' Question Challenge Creator Button */}
            {isManagerOrAdmin && onOpenCreateQuestion && (
              <button
                type="button"
                onClick={onOpenCreateQuestion}
                id="admin-create-school-dome-question-btn"
                className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer shrink-0 border border-amber-300 select-none"
                title="Launch School Dome Elimination Question (Live Arena Challenge)"
              >
                Q
              </button>
            )}

            <button
              type="button"
              disabled={isInputDisabled}
              onClick={() => setShowEmojiBar(!showEmojiBar)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={isInputDisabled || !inputText.trim()}
              className={`p-1.5 rounded-xl transition-all ${
                !isInputDisabled && inputText.trim()
                  ? 'text-blue-600 dark:text-blue-400 hover:scale-110 cursor-pointer'
                  : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
              title="Send Response (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
