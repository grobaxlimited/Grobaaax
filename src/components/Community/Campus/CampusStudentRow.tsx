import React, { useState } from 'react';
import { CampusStudentCard } from '../../../types';
import {
  MessageSquare,
  Clock,
  Check,
  X,
  ExternalLink,
  Crown,
  Gem,
  Loader2,
  User,
  BadgeCheck,
} from 'lucide-react';

interface CampusStudentRowProps {
  student: CampusStudentCard;
  onSendRequest: (student: CampusStudentCard) => Promise<void>;
  onAcceptRequest: (requestId: string, student: CampusStudentCard) => Promise<void>;
  onRejectRequest: (requestId: string, student: CampusStudentCard) => Promise<void>;
  onOpenWhatsApp: (student: CampusStudentCard) => Promise<void>;
}

export const CampusStudentRow: React.FC<CampusStudentRowProps> = ({
  student,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onOpenWhatsApp,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 1. Profile Picture helper
  const avatarUrl =
    student.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(student.name || student.id)}`;

  // Determine if scholar qualifies for Blue Verified Check Badge
  const showBlueBadge =
    student.hasBlueBadge ||
    student.isVerified ||
    student.tier === 'premium' ||
    student.tier === 'vip';

  const handleSend = async () => {
    setIsActionLoading(true);
    try {
      await onSendRequest(student);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!student.requestId) return;
    setIsActionLoading(true);
    try {
      await onAcceptRequest(student.requestId, student);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!student.requestId) return;
    setIsActionLoading(true);
    try {
      await onRejectRequest(student.requestId, student);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleChat = async () => {
    setIsActionLoading(true);
    try {
      await onOpenWhatsApp(student);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div
      id={`campus-student-row-${student.id}`}
      className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-blue-500/30 dark:hover:border-blue-500/30 shadow-xs transition-all gap-2 sm:gap-4"
    >
      {/* LEFT BLOCK: EXACT ORDER [1. PROFILE PICTURE] [2. USER NAME + BLUE BADGE] [3. PRESENCE] [4. SUBSCRIPTION BADGE] */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* 1. PROFILE PICTURE (MUST BE FIRST) */}
        <div className="relative shrink-0">
          <img
            src={avatarUrl}
            alt={student.name}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(student.id)}`;
            }}
          />
        </div>

        {/* 2. USER NAME + BLUE VERIFIED BADGE */}
        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate max-w-[120px] sm:max-w-[200px]">
              {student.name}
            </span>
            {showBlueBadge && (
              <span title="Verified Scholar (Blue Badge)" className="inline-flex shrink-0">
                <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
              </span>
            )}
          </div>

          {/* 3. SMALL PRESENCE INDICATOR (🟢 small visual dot, no "Online" text) */}
          <span
            className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50 shrink-0"
            title="Active Scholar"
            aria-label="Presence indicator"
          />

          {/* 4. PREMIUM/VIP SUBSCRIPTION BADGE */}
          {student.tier === 'vip' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <Crown className="w-3 h-3 text-amber-500" />
              <span>VIP</span>
            </span>
          )}

          {student.tier === 'premium' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
              <Gem className="w-3 h-3 text-blue-500" />
              <span>Premium</span>
            </span>
          )}

          {/* 5. EQUIPPED HONOUR / SCHOLAR BADGE */}
          {(student as any).equippedBadge && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 shadow-2xs"
              title={`Equipped Honour: ${typeof (student as any).equippedBadge === 'string' ? (student as any).equippedBadge : (((student as any).equippedBadge as any).title || ((student as any).equippedBadge as any).name)}`}
            >
              <span className="text-xs">{typeof (student as any).equippedBadge === 'string' ? (student as any).equippedBadge.split(' ')[0] : (((student as any).equippedBadge as any).icon || '⭐')}</span>
              <span className="max-w-[100px] truncate">{typeof (student as any).equippedBadge === 'string' ? (student as any).equippedBadge.replace(/^\S+\s*/, '') : (((student as any).equippedBadge as any).title || ((student as any).equippedBadge as any).name)}</span>
            </span>
          )}
        </div>
      </div>

      {/* RIGHT BLOCK: [5. ACTION BUTTON] */}
      <div className="shrink-0 flex items-center gap-1.5">
        {student.connectionStatus === 'self' && (
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>You</span>
          </span>
        )}

        {student.connectionStatus === 'none' && (
          <button
            id={`campus-chat-req-btn-${student.id}`}
            type="button"
            onClick={handleSend}
            disabled={isActionLoading}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-96 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isActionLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5" />
            )}
            <span>Chat Request</span>
          </button>
        )}

        {student.connectionStatus === 'pending_sent' && (
          <button
            disabled
            className="px-3 sm:px-4 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-not-allowed opacity-90"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Request Pending</span>
          </button>
        )}

        {student.connectionStatus === 'pending_received' && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAccept}
              disabled={isActionLoading}
              title="Accept Request"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Accept</span>
            </button>
            <button
              onClick={handleReject}
              disabled={isActionLoading}
              title="Decline Request"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Decline</span>
            </button>
          </div>
        )}

        {student.connectionStatus === 'accepted' && (
          <button
            id={`campus-chat-whatsapp-btn-${student.id}`}
            type="button"
            onClick={handleChat}
            disabled={isActionLoading}
            className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-blue-500/20 transition-all active:scale-96 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isActionLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            <span>Chat</span>
          </button>
        )}

        {student.connectionStatus === 'rejected' && (
          <button
            type="button"
            onClick={handleSend}
            disabled={isActionLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all active:scale-96 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Request</span>
          </button>
        )}
      </div>
    </div>
  );
};
