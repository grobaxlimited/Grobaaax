import React, { useState, useRef, useEffect } from 'react';
import {
  ChatroomLiveMessage,
} from '../../../types';
import {
  Send,
  X,
  Smile,
  Plus,
  VolumeX,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

interface ChatroomComposerProps {
  onSendMessage: (text: string, replyTo?: ChatroomLiveMessage['replyTo']) => void;
  replyToMessage?: ChatroomLiveMessage | null;
  onCancelReply?: () => void;
  isChatMuted?: boolean;
  isUserMuted?: boolean;
  channelName?: string;
  dailyLimit?: number;
  usedCount?: number;
  isLimitReached?: boolean;
  tierName?: 'free' | 'premium' | 'vip' | 'admin';
  isManagerOrAdmin?: boolean;
  hasRepliedToTarget?: boolean;
  isQuestionPlanIneligible?: boolean;
  questionPlanIneligibleReason?: string;
  onOpenUpgrade?: () => void;
  onOpenCreateQuestion?: () => void;
}

const QUICK_EMOJIS = ['🔥', '⚡', '❤️', '👏', '🎯', '💯', '👍', '😊', '😂', '🎉'];

export const ChatroomComposer: React.FC<ChatroomComposerProps> = ({
  onSendMessage,
  replyToMessage,
  onCancelReply,
  isChatMuted,
  isUserMuted,
  channelName = 'daily-qa',
  dailyLimit = 2,
  usedCount = 0,
  isLimitReached = false,
  tierName = 'free',
  isManagerOrAdmin = false,
  hasRepliedToTarget = false,
  isQuestionPlanIneligible = false,
  questionPlanIneligibleReason,
  onOpenUpgrade,
  onOpenCreateQuestion,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isQuestionReplyBlocked = Boolean(
    replyToMessage?.type === 'question' && (hasRepliedToTarget || isQuestionPlanIneligible)
  );

  useEffect(() => {
    if (replyToMessage && inputRef.current && !isQuestionReplyBlocked) {
      inputRef.current.focus();
    }
  }, [replyToMessage, isQuestionReplyBlocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached || isQuestionReplyBlocked) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const replyPayload = replyToMessage
      ? {
          id: replyToMessage.id,
          userName: replyToMessage.userName,
          messageSnippet: replyToMessage.messageText.slice(0, 80),
          institution: replyToMessage.institution,
        }
      : undefined;

    onSendMessage(trimmed, replyPayload);
    setInputText('');
    setShowEmojiBar(false);
    if (onCancelReply) onCancelReply();
  };

  const handleAddEmoji = (emoji: string) => {
    if (isLimitReached) return;
    setInputText(prev => prev + emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  if (isUserMuted) {
    return (
      <div className="p-3 bg-rose-500/10 border-t border-rose-500/20 text-center rounded-2xl">
        <div className="flex items-center justify-center gap-2 text-rose-500 text-xs font-bold">
          <VolumeX className="w-4 h-4" />
          <span>You have been muted in this room by a moderator.</span>
        </div>
      </div>
    );
  }

  if (isChatMuted) {
    return (
      <div className="p-3 bg-amber-500/10 border-t border-amber-500/20 text-center rounded-2xl">
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <VolumeX className="w-4 h-4" />
          <span>Daily Q&A is temporarily muted by the Admin.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-2.5 transition-all">
      {/* Limit Reached Warning Banner */}
      {isLimitReached && (
        <div className="mb-2.5 p-2.5 sm:p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Daily response limit reached.</strong> You have used all{' '}
              <span className="font-bold">{usedCount} / {dailyLimit}</span> responses for today.
            </span>
          </div>

          {(tierName === 'free' || tierName === 'premium') && onOpenUpgrade && (
            <button
              type="button"
              id="daily-qa-upgrade-btn"
              onClick={onOpenUpgrade}
              className="px-3 py-1 bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{tierName === 'free' ? 'Upgrade Plan (15-20/day)' : 'Upgrade to VIP (20/day)'}</span>
            </button>
          )}
        </div>
      )}

      {/* Question Reply Filtered (Subscription Plan Ineligible) Notice */}
      {replyToMessage?.type === 'question' && isQuestionPlanIneligible && (
        <div className="mb-2.5 p-2.5 sm:p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Subscription Plan Filtered:</strong> {questionPlanIneligibleReason || 'This question requires an upgraded subscription plan. You are filtered from replying without elimination.'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenUpgrade && (
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] cursor-pointer"
              >
                Upgrade Plan
              </button>
            )}
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-600 dark:hover:text-amber-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Question Reply Already Submitted Notice */}
      {replyToMessage?.type === 'question' && !isQuestionPlanIneligible && hasRepliedToTarget && (
        <div className="mb-2.5 p-2.5 sm:p-3 rounded-xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              You have already submitted an answer for this question. <strong>Only 1 attempt is allowed per scholar.</strong>
            </span>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Reply Banner */}
      {replyToMessage && !isQuestionReplyBlocked && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl border border-blue-500/30 text-xs text-blue-800 dark:text-blue-300 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold">Replying to @{replyToMessage.userName}:</span>
            <span className="truncate italic text-slate-500 dark:text-slate-400 text-[11px]">
              «{replyToMessage.messageText.slice(0, 60)}...»
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar (Toggled) */}
      {showEmojiBar && !isLimitReached && (
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar animate-in fade-in duration-150">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-lg hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Discord Style Composer Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Plus Action Button */}
        <button
          type="button"
          disabled={isLimitReached}
          onClick={() => setShowEmojiBar(!showEmojiBar)}
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition ${
            isLimitReached
              ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-50'
              : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer'
          }`}
          title="Add Reaction"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Input Pill Box */}
        <div className={`relative flex-1 flex items-center rounded-2xl border px-3 py-1.5 transition-all ${
          isLimitReached || isQuestionReplyBlocked
            ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
        }`}>
          <input
            ref={inputRef}
            type="text"
            disabled={isLimitReached || isQuestionReplyBlocked}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              isQuestionReplyBlocked
                ? 'You have already submitted an answer (1 attempt limit)...'
                : isLimitReached
                ? `Daily response limit reached (${dailyLimit}/${dailyLimit} used today)`
                : `Enter your response #${channelName}...`
            }
            className={`w-full bg-transparent text-xs sm:text-sm focus:outline-hidden py-1 ${
              isLimitReached || isQuestionReplyBlocked
                ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed placeholder-slate-400/80 dark:placeholder-slate-500/80'
                : 'text-slate-900 dark:text-slate-100 placeholder-slate-400'
            }`}
          />

          {/* Right Input Icons (Admin Q Button, Emoji, Send) */}
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Admin 'Q' Question Challenge Creator Button */}
            {(tierName === 'admin' || isManagerOrAdmin) && onOpenCreateQuestion && (
              <button
                type="button"
                onClick={onOpenCreateQuestion}
                id="admin-create-live-question-btn"
                className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer shrink-0 border border-amber-300 select-none"
                title="Launch Live Q&A Question Challenge (Instant GP Rewards)"
              >
                Q
              </button>
            )}

            <button
              type="button"
              disabled={isLimitReached || isQuestionReplyBlocked}
              onClick={() => setShowEmojiBar(!showEmojiBar)}
              className={`p-1 transition ${
                isLimitReached || isQuestionReplyBlocked
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer'
              }`}
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={isLimitReached || isQuestionReplyBlocked || !inputText.trim()}
              className={`p-1.5 rounded-xl transition-all ${
                !isLimitReached && !isQuestionReplyBlocked && inputText.trim()
                  ? 'text-blue-600 dark:text-blue-400 hover:scale-110 cursor-pointer'
                  : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
              title={
                isQuestionReplyBlocked
                  ? 'Single attempt limit reached for this question'
                  : isLimitReached
                  ? 'Daily response limit reached'
                  : 'Submit Response (Enter)'
              }
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Subtle status subtitle with Response Allowance Counter */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 pt-1.5">
        <div>
          {tierName === 'admin' ? (
            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>Admin Mode: Unlimited responses</span>
            </span>
          ) : (
            <span>
              Daily Response Allowance:{' '}
              <strong className={isLimitReached ? 'text-rose-500 font-bold' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                {usedCount} / {dailyLimit}
              </strong>{' '}
              responses used today
            </span>
          )}
        </div>
        <span>Press Enter to submit</span>
      </div>
    </div>
  );
};

