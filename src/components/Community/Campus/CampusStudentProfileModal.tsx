import React, { useState } from 'react';
import { CampusStudentCard } from '../../../types';
import {
  BadgeCheck,
  BookOpen,
  Building2,
  Check,
  Clock,
  Crown,
  ExternalLink,
  Gem,
  GraduationCap,
  Loader2,
  MessageSquare,
  Sparkles,
  User,
  X,
} from 'lucide-react';

interface CampusStudentProfileModalProps {
  student: CampusStudentCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (student: CampusStudentCard) => Promise<void>;
  onAcceptRequest: (requestId: string, student: CampusStudentCard) => Promise<void>;
  onRejectRequest: (requestId: string, student: CampusStudentCard) => Promise<void>;
  onOpenWhatsApp: (student: CampusStudentCard) => Promise<void>;
  onFilterBySkill?: (skillName: string) => void;
}

export const CampusStudentProfileModal: React.FC<CampusStudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onOpenWhatsApp,
  onFilterBySkill,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (!isOpen || !student) return null;

  const avatarUrl =
    student.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(student.name || student.id)}`;

  const showBlueBadge =
    student.hasBlueBadge ||
    student.isVerified ||
    student.tier === 'premium' ||
    student.tier === 'vip';

  const skills = Array.isArray(student.skills) ? student.skills : [];

  const runAction = async (fn: () => Promise<void>) => {
    setIsActionLoading(true);
    try {
      await fn();
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={avatarUrl}
              alt={student.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/20 bg-slate-100 dark:bg-slate-800 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  student.id
                )}`;
              }}
            />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                  {student.name}
                </h3>
                {showBlueBadge && (
                  <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500/20 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {student.username && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {student.username}
                  </span>
                )}
                {student.tier === 'vip' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-500" />
                    VIP
                  </span>
                )}
                {student.tier === 'premium' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    <Gem className="w-3 h-3 text-blue-500" />
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Academic Details Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2">
          <div className="flex items-start gap-2.5 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <span>{student.institution}</span>
          </div>
          {student.faculty && (
            <div className="flex items-start gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <GraduationCap className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <span>{student.faculty}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{student.department || 'General Studies'}</span>
            {student.level && (
              <>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{student.level}</span>
              </>
            )}
          </div>
        </div>

        {student.bio && (
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {student.bio}
          </div>
        )}

        {/* Skills Section */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Skills</span>
          </div>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    if (onFilterBySkill) {
                      onFilterBySkill(skill);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  title={onFilterBySkill ? `Discover other students with ${skill}` : skill}
                >
                  {skill}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              No skills listed by this scholar yet.
            </p>
          )}
        </div>

        {/* Connection Action Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {student.connectionStatus === 'self' && (
              <span className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Your Campus Profile</span>
              </span>
            )}

            {(student.connectionStatus === 'none' || student.connectionStatus === 'rejected') && (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => runAction(() => onSendRequest(student))}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Request Pending</span>
              </button>
            )}

            {student.connectionStatus === 'pending_received' && student.requestId && (
              <>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => runAction(() => onAcceptRequest(student.requestId!, student))}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept</span>
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={() => runAction(() => onRejectRequest(student.requestId!, student))}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Decline</span>
                </button>
              </>
            )}

            {student.connectionStatus === 'accepted' && (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => runAction(() => onOpenWhatsApp(student))}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isActionLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span>Chat on WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
