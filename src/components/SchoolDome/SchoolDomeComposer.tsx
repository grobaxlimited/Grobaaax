import React, { useState, useRef, useEffect } from 'react';
import {
  SchoolDomeMessage,
} from '../../types';
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
  channelName?: string;
  isManagerOrAdmin?: boolean;
  hasRepliedToTarget?: boolean;
  isUserRegistered?: boolean;
  isUserStanding?: boolean;
  isRegistrationLocked?: boolean;
  onOpenRegister?: () => void;
  onOpenCreateQuestion?: () => void;
}

const QUICK_EMOJIS = ['🔥', '⚡', '❤️', '👏', '🎯', '💯', '👍', '😊', '😂', '🎉'];

export const SchoolDomeComposer: React.FC<SchoolDomeComposerProps> = ({
  onSendMessage,
  replyToMessage,
  onCancelReply,
  isChatMuted,
  channelName = 'school-dome',
  isManagerOrAdmin = false,
  hasRepliedToTarget = false,
  isUserRegistered = false,
  isUserStanding = false,
  isRegistrationLocked = false,
  onOpenRegister,
  onOpenCreateQuestion,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isQuestionReplyBlocked = Boolean(replyToMessage?.type === 'question' && hasRepliedToTarget);

  useEffect(() => {
    if (replyToMessage && inputRef.current && !isQuestionReplyBlocked) {
      inputRef.current.focus();
    }
  }, [replyToMessage, isQuestionReplyBlocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isQuestionReplyBlocked) return;
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
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80 rounded-xl text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-blue-700 dark:text-blue-400 shrink-0">
              Replying to @{replyToMessage.userName}:
            </span>
            <span className="text-slate-600 dark:text-slate-300 truncate">
              {replyToMessage.messageText}
            </span>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer"
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
          isQuestionReplyBlocked
            ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
        }`}>
          <input
            ref={inputRef}
            type="text"
            disabled={isQuestionReplyBlocked}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              isQuestionReplyBlocked
                ? 'Answer submitted for this question (1 attempt limit)...'
                : !isUserRegistered && !isManagerOrAdmin
                ? `Enter spectator comment #${channelName}...`
                : isUserStanding
                ? `Enter your response #${channelName}...`
                : `Enter arena chat #${channelName}...`
            }
            className={`w-full bg-transparent text-xs sm:text-sm focus:outline-hidden py-1 ${
              isQuestionReplyBlocked
                ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed placeholder-slate-400/80'
                : 'text-slate-900 dark:text-slate-100 placeholder-slate-400'
            }`}
          />

          {/* Right Input Icons (Admin Yellow Q Button, Emoji, Send) */}
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Admin 'Q' Question Challenge Creator Button - Exact same as Daily GP Grab */}
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
              onClick={() => setShowEmojiBar(!showEmojiBar)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={isQuestionReplyBlocked || !inputText.trim()}
              className={`p-1.5 rounded-xl transition-all ${
                !isQuestionReplyBlocked && inputText.trim()
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
