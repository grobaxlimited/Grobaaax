import React, { useEffect, useState } from 'react';
import { CampusFollowUser, CampusStudentCard } from '../../../types';
import {
  fetchCampusFollowList,
  fetchCampusFollowStatus,
  followCampusStudent,
  unfollowCampusStudent,
} from '../../../lib/campusService';
import {
  ArrowLeft,
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
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface CampusStudentProfileModalProps {
  student: CampusStudentCard | null;
  currentUserId?: string;
  initialViewMode?: 'profile' | 'followers' | 'following';
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (student: CampusStudentCard) => Promise<void>;
  onAcceptRequest: (requestId: string, student: CampusStudentCard) => Promise<void>;
  onRejectRequest: (requestId: string, student: CampusStudentCard) => Promise<void>;
  onOpenWhatsApp: (student: CampusStudentCard) => Promise<void>;
  onFilterBySkill?: (skillName: string) => void;
  onFollowChanged?: (
    targetUserId: string,
    stats: { followersCount: number; followingCount: number; isFollowing: boolean }
  ) => void;
  onNotify?: (message: string, type?: 'success' | 'error') => void;
}

export const CampusStudentProfileModal: React.FC<CampusStudentProfileModalProps> = ({
  student,
  currentUserId,
  initialViewMode = 'profile',
  isOpen,
  onClose,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onOpenWhatsApp,
  onFilterBySkill,
  onFollowChanged,
  onNotify,
}) => {
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const [viewMode, setViewMode] = useState<'profile' | 'followers' | 'following'>('profile');
  const [followUsers, setFollowUsers] = useState<CampusFollowUser[]>([]);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [togglingListUserId, setTogglingListUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !student?.id) return;
    setViewMode(initialViewMode || 'profile');
    setFollowersCount(Number(student.followersCount || 0));
    setFollowingCount(Number(student.followingCount || 0));
    setIsFollowing(Boolean(student.isFollowing));

    let mounted = true;
    fetchCampusFollowStatus(student.id).then((res) => {
      if (!mounted || !res.success) return;
      setFollowersCount(res.followersCount);
      setFollowingCount(res.followingCount);
      setIsFollowing(res.isFollowing);
    });
    return () => {
      mounted = false;
    };
  }, [isOpen, student?.id, initialViewMode]);

  useEffect(() => {
    if (!isOpen || !student?.id || viewMode === 'profile') return;
    let mounted = true;
    setIsLoadingFollowList(true);
    fetchCampusFollowList(student.id, viewMode)
      .then((res) => {
        if (!mounted) return;
        setFollowUsers(res.success ? res.users : []);
      })
      .finally(() => {
        if (mounted) setIsLoadingFollowList(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, student?.id, viewMode]);

  if (!isOpen || !student) return null;

  const isSelf =
    student.connectionStatus === 'self' || Boolean(currentUserId && student.id === currentUserId);

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

  const handleToggleFollow = async () => {
    if (isSelf || isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      const res = isFollowing
        ? await unfollowCampusStudent(student.id)
        : await followCampusStudent(student.id);

      if (res.success) {
        const nextFollowers = Number(res.followersCount ?? (isFollowing ? Math.max(0, followersCount - 1) : followersCount + 1));
        const nextFollowing = Number(res.followingCount ?? followingCount);
        const nextIsFollowing = Boolean(res.isFollowing ?? !isFollowing);
        setFollowersCount(nextFollowers);
        setFollowingCount(nextFollowing);
        setIsFollowing(nextIsFollowing);
        onFollowChanged?.(student.id, {
          followersCount: nextFollowers,
          followingCount: nextFollowing,
          isFollowing: nextIsFollowing,
        });
        onNotify?.(
          nextIsFollowing
            ? `You are now following ${student.name}.`
            : `You unfollowed ${student.name}.`,
          'success'
        );
        if (viewMode === 'followers') {
          const refreshed = await fetchCampusFollowList(student.id, 'followers');
          if (refreshed.success) setFollowUsers(refreshed.users);
        }
      } else {
        onNotify?.(res.error || 'Could not update follow status.', 'error');
      }
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleToggleFollowInsideList = async (entry: CampusFollowUser) => {
    if (!currentUserId || entry.id === currentUserId || togglingListUserId) return;
    setTogglingListUserId(entry.id);
    try {
      const res = entry.isFollowing
        ? await unfollowCampusStudent(entry.id)
        : await followCampusStudent(entry.id);
      if (res.success) {
        const nextIsFollowing = Boolean(res.isFollowing ?? !entry.isFollowing);
        setFollowUsers((prev) =>
          prev.map((u) => (u.id === entry.id ? { ...u, isFollowing: nextIsFollowing } : u))
        );
        if (isSelf && viewMode === 'following') {
          setFollowingCount((c) => (nextIsFollowing ? c + 1 : Math.max(0, c - 1)));
        }
        onFollowChanged?.(entry.id, {
          followersCount: Number(res.followersCount ?? 0),
          followingCount: Number(res.followingCount ?? 0),
          isFollowing: nextIsFollowing,
        });
      } else {
        onNotify?.(res.error || 'Unable to update follow status.', 'error');
      }
    } finally {
      setTogglingListUserId(null);
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

        {/* Followers & Following Counters + Mode Tabs */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setViewMode('profile')}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              viewMode === 'profile'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            }`}
          >
            <span className="block text-[11px] font-black uppercase tracking-wider">Profile</span>
            <span className={`block text-[11px] font-semibold mt-0.5 ${viewMode === 'profile' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
              Overview
            </span>
          </button>

          <button
            id={`campus-followers-tab-${student.id}`}
            type="button"
            onClick={() => setViewMode('followers')}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              viewMode === 'followers'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-400'
            }`}
          >
            <span className="block text-sm sm:text-base font-black leading-tight">
              {followersCount.toLocaleString()}
            </span>
            <span className={`block text-[11px] font-bold uppercase tracking-wider ${viewMode === 'followers' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
              Followers
            </span>
          </button>

          <button
            id={`campus-following-tab-${student.id}`}
            type="button"
            onClick={() => setViewMode('following')}
            className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
              viewMode === 'following'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-blue-400'
            }`}
          >
            <span className="block text-sm sm:text-base font-black leading-tight">
              {followingCount.toLocaleString()}
            </span>
            <span className={`block text-[11px] font-bold uppercase tracking-wider ${viewMode === 'following' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
              Following
            </span>
          </button>
        </div>

        {viewMode !== 'profile' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMode('profile')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Profile</span>
              </button>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {viewMode === 'followers'
                  ? `Followers (${followersCount})`
                  : `Following (${followingCount})`}
              </span>
            </div>

            {isLoadingFollowList ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-500">Loading {viewMode}...</p>
              </div>
            ) : followUsers.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <Users className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {viewMode === 'followers'
                    ? `${student.name} does not have any followers yet.`
                    : `${student.name} is not following anyone yet.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {followUsers.map((u) => {
                  const uAvatar =
                    u.avatar ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.name || u.id)}`;
                  const isOwnRow = Boolean(currentUserId && u.id === currentUserId);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={uAvatar}
                          alt={u.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {u.name}
                            </span>
                            {u.hasBlueBadge && (
                              <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {[u.institution, u.department].filter(Boolean).join(' · ') || 'Campus Scholar'}
                          </p>
                        </div>
                      </div>

                      {!isOwnRow && currentUserId && (
                        <button
                          type="button"
                          disabled={togglingListUserId === u.id}
                          onClick={() => handleToggleFollowInsideList(u)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 disabled:opacity-50 ${
                            u.isFollowing
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {togglingListUserId === u.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : u.isFollowing ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          <span>{u.isFollowing ? 'Following' : 'Follow'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
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
          </>
        )}

        {/* Follow & Connection Action Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {isSelf ? (
              <span className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Your Campus Profile</span>
              </span>
            ) : (
              /* Independent Campus Follow / Unfollow Toggle */
              <button
                id={`campus-modal-follow-btn-${student.id}`}
                type="button"
                disabled={isFollowLoading}
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  isFollowing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                    : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-xs'
                }`}
              >
                {isFollowLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
              </button>
            )}

            {!isSelf && (student.connectionStatus === 'none' || student.connectionStatus === 'rejected') && (
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

            {!isSelf && student.connectionStatus === 'pending_sent' && (
              <button
                disabled
                className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Request Pending</span>
              </button>
            )}

            {!isSelf && student.connectionStatus === 'pending_received' && student.requestId && (
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

            {!isSelf && student.connectionStatus === 'accepted' && (
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
