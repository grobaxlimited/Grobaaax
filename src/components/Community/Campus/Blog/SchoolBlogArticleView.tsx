import React, { useEffect, useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import {
  CampusStudentCard,
  SchoolBlogArticle,
  SchoolBlogReactionType,
  SchoolBlogRecord,
} from '../../../../types';
import {
  fetchSchoolBlogArticle,
  getCachedSchoolBlogArticle,
  reactToSchoolBlogArticle,
  reportSchoolBlogArticle,
  trackSchoolBlogArticleView,
} from '../../../../lib/schoolBlogService';
import {
  fetchCampusStudentProfile,
  followCampusStudent,
  getSecureWhatsAppLink,
  respondCampusChatRequest,
  sendCampusChatRequest,
  unfollowCampusStudent,
} from '../../../../lib/campusService';
import { openExternalWhatsApp } from '../../../../lib/whatsappUtils';
import { CampusStudentProfileModal } from '../CampusStudentProfileModal';
import { renderFormattedBlogText } from './blogTextFormatter';
import { SponsoredBlogAdCard } from './SponsoredBlogAdCard';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BadgeCheck,
  CheckCircle2,
  Eye,
  Flag,
  Heart,
  Lightbulb,
  Loader2,
  Newspaper,
  Sparkles,
  ThumbsUp,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';

interface SchoolBlogArticleViewProps {
  article: SchoolBlogArticle;
  blog?: SchoolBlogRecord | null;
  onBack: () => void;
  onArticleUpdated?: (updated: SchoolBlogArticle) => void;
}

const REACTION_OPTIONS: Array<{
  type: SchoolBlogReactionType;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { type: 'like', label: 'Like', icon: ThumbsUp },
  { type: 'helpful', label: 'Helpful', icon: Heart },
  { type: 'insightful', label: 'Insightful', icon: Lightbulb },
  { type: 'celebrate', label: 'Celebrate', icon: Award },
];

function buildFallbackAuthorCard(
  art: SchoolBlogArticle,
  currentUserId?: string,
  followersCount?: number,
  followingCount?: number,
  isFollowing?: boolean
): CampusStudentCard {
  const fallbackName = art.authorName || 'School Blogger';
  const avatar =
    art.authorAvatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      fallbackName || art.authorUserId || 'blogger'
    )}`;
  return {
    id: art.authorUserId,
    name: fallbackName,
    username: art.authorUsername || '',
    avatar,
    institution: art.institutionName || 'Grobaax Campus',
    faculty: '',
    department: '',
    level: 'School Blogger',
    bio: '',
    skills: [],
    skillIds: [],
    tier: art.authorTier || 'free',
    hasBlueBadge: Boolean(art.authorHasBlueBadge),
    isVerified: Boolean(art.authorHasBlueBadge),
    isOnline: true,
    connectionStatus: currentUserId && currentUserId === art.authorUserId ? 'self' : 'none',
    joinedCampus: true,
    followersCount: followersCount ?? Number(art.authorFollowersCount || 0),
    followingCount: followingCount ?? Number(art.authorFollowingCount || 0),
    isFollowing: isFollowing ?? Boolean(art.authorIsFollowing),
  };
}

export const SchoolBlogArticleView: React.FC<SchoolBlogArticleViewProps> = ({
  article: initialArticle,
  blog,
  onBack,
  onArticleUpdated,
}) => {
  const { currentUser } = useApp();
  const cachedFull = getCachedSchoolBlogArticle(initialArticle.id, currentUser?.id)?.article;
  const startingArticle = cachedFull || initialArticle;

  const [article, setArticle] = useState<SchoolBlogArticle>(startingArticle);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Author Profile & Follow state
  const [authorFollowersCount, setAuthorFollowersCount] = useState<number>(
    Number(startingArticle.authorFollowersCount || 0)
  );
  const [authorFollowingCount, setAuthorFollowingCount] = useState<number>(
    Number(startingArticle.authorFollowingCount || 0)
  );
  const [authorIsFollowing, setAuthorIsFollowing] = useState<boolean>(
    Boolean(startingArticle.authorIsFollowing)
  );
  const [isInlineFollowLoading, setIsInlineFollowLoading] = useState(false);
  const [authorProfileStudent, setAuthorProfileStudent] = useState<CampusStudentCard | null>(null);
  const [authorProfileModalOpen, setAuthorProfileModalOpen] = useState(false);
  const [authorModalInitialView, setAuthorModalInitialView] = useState<
    'profile' | 'followers' | 'following'
  >('profile');

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    let mounted = true;
    const preCached = getCachedSchoolBlogArticle(initialArticle.id, currentUser?.id)?.article;
    const baseArt = preCached || initialArticle;
    setArticle(baseArt);
    setAuthorFollowersCount(Number(baseArt.authorFollowersCount || 0));
    setAuthorFollowingCount(Number(baseArt.authorFollowingCount || 0));
    setAuthorIsFollowing(Boolean(baseArt.authorIsFollowing));

    async function hydrateAndTrackView() {
      if (!preCached) {
        setIsLoadingFull(true);
      }
      let latestArticle = baseArt;
      try {
        const res = await fetchSchoolBlogArticle(initialArticle.id, { userId: currentUser?.id });
        if (mounted && res.success && res.article) {
          latestArticle = res.article;
          setArticle(res.article);
          if (typeof res.article.authorFollowersCount === 'number') {
            setAuthorFollowersCount(res.article.authorFollowersCount);
          }
          if (typeof res.article.authorFollowingCount === 'number') {
            setAuthorFollowingCount(res.article.authorFollowingCount);
          }
          if (typeof res.article.authorIsFollowing === 'boolean') {
            setAuthorIsFollowing(res.article.authorIsFollowing);
          }
        }
      } catch {}
      finally {
        if (mounted) setIsLoadingFull(false);
      }

      try {
        const viewRes = await trackSchoolBlogArticleView(initialArticle.id);
        if (mounted && viewRes.success && typeof viewRes.viewsCount === 'number') {
          const next: SchoolBlogArticle = { ...latestArticle, viewsCount: viewRes.viewsCount };
          setArticle(next);
          if (onArticleUpdated) onArticleUpdated(next);
        }
      } catch {}
    }

    hydrateAndTrackView();
    return () => {
      mounted = false;
    };
  }, [initialArticle.id, currentUser?.id]);

  const handleOpenAuthorProfile = async (
    initialView: 'profile' | 'followers' | 'following' = 'profile'
  ) => {
    if (!article.authorUserId) return;
    setAuthorModalInitialView(initialView);
    setAuthorProfileStudent(
      buildFallbackAuthorCard(
        article,
        currentUser?.id,
        authorFollowersCount,
        authorFollowingCount,
        authorIsFollowing
      )
    );
    setAuthorProfileModalOpen(true);

    const hydrated = await fetchCampusStudentProfile(article.authorUserId, currentUser?.id);
    if (hydrated) {
      setAuthorProfileStudent(hydrated);
      if (typeof hydrated.followersCount === 'number') {
        setAuthorFollowersCount(hydrated.followersCount);
      }
      if (typeof hydrated.followingCount === 'number') {
        setAuthorFollowingCount(hydrated.followingCount);
      }
      if (typeof hydrated.isFollowing === 'boolean') {
        setAuthorIsFollowing(hydrated.isFollowing);
      }
    }
  };

  const handleInlineToggleFollow = async () => {
    if (!article.authorUserId || isInlineFollowLoading) return;
    if (!currentUser?.id) {
      showNotice('Please sign in to follow this School Blogger.', 'error');
      return;
    }
    if (currentUser.id === article.authorUserId) return;

    setIsInlineFollowLoading(true);
    try {
      const res = authorIsFollowing
        ? await unfollowCampusStudent(article.authorUserId)
        : await followCampusStudent(article.authorUserId);

      if (res.success) {
        const nextFollowers = Number(
          res.followersCount ??
            (authorIsFollowing ? Math.max(0, authorFollowersCount - 1) : authorFollowersCount + 1)
        );
        const nextFollowing = Number(res.followingCount ?? authorFollowingCount);
        const nextIsFollowing = Boolean(res.isFollowing ?? !authorIsFollowing);

        setAuthorFollowersCount(nextFollowers);
        setAuthorFollowingCount(nextFollowing);
        setAuthorIsFollowing(nextIsFollowing);

        const nextArticle: SchoolBlogArticle = {
          ...article,
          authorFollowersCount: nextFollowers,
          authorFollowingCount: nextFollowing,
          authorIsFollowing: nextIsFollowing,
        };
        setArticle(nextArticle);
        if (onArticleUpdated) onArticleUpdated(nextArticle);

        setAuthorProfileStudent((prev) =>
          prev && prev.id === article.authorUserId
            ? {
                ...prev,
                followersCount: nextFollowers,
                followingCount: nextFollowing,
                isFollowing: nextIsFollowing,
              }
            : prev
        );

        showNotice(
          nextIsFollowing
            ? `You are now following ${article.authorName || 'this author'}.`
            : `You unfollowed ${article.authorName || 'this author'}.`
        );
      } else {
        showNotice(res.error || 'Could not update follow status.', 'error');
      }
    } finally {
      setIsInlineFollowLoading(false);
    }
  };

  const handleAuthorSendRequest = async (student: CampusStudentCard) => {
    if (!currentUser) {
      showNotice('Please sign in to connect with this author.', 'error');
      return;
    }
    const res = await sendCampusChatRequest(currentUser, student);
    if (res.success) {
      showNotice(res.message || 'Connection request sent!');
      setAuthorProfileStudent((prev) =>
        prev && prev.id === student.id ? { ...prev, connectionStatus: 'pending_sent' } : prev
      );
    } else {
      showNotice(res.error || 'Failed to send request.', 'error');
    }
  };

  const handleAuthorAcceptRequest = async (requestId: string, student: CampusStudentCard) => {
    if (!currentUser) return;
    const res = await respondCampusChatRequest(requestId, currentUser.id, 'ACCEPT');
    if (res.success) {
      showNotice(res.message || 'Connection accepted! You can now chat on WhatsApp.');
      setAuthorProfileStudent((prev) =>
        prev && prev.id === student.id ? { ...prev, connectionStatus: 'accepted' } : prev
      );
    } else {
      showNotice(res.error || 'Failed to accept connection.', 'error');
    }
  };

  const handleAuthorRejectRequest = async (requestId: string, student: CampusStudentCard) => {
    if (!currentUser) return;
    const res = await respondCampusChatRequest(requestId, currentUser.id, 'REJECT');
    if (res.success) {
      showNotice(res.message || 'Connection request declined.');
      setAuthorProfileStudent((prev) =>
        prev && prev.id === student.id ? { ...prev, connectionStatus: 'none' } : prev
      );
    } else {
      showNotice(res.error || 'Failed to decline request.', 'error');
    }
  };

  const handleAuthorOpenWhatsApp = async (student: CampusStudentCard) => {
    if (!currentUser) return;
    const res = await getSecureWhatsAppLink(currentUser.id, student.id, student.requestId);
    if (res.success && res.whatsappUrl) {
      openExternalWhatsApp(res.whatsappUrl);
    } else {
      showNotice(res.error || 'Unable to open WhatsApp chat.', 'error');
    }
  };

  const handleReact = async (reactionType: SchoolBlogReactionType) => {
    if (isReacting) return;
    setIsReacting(true);
    try {
      const res = await reactToSchoolBlogArticle(article.id, reactionType);
      if (res.success) {
        const next: SchoolBlogArticle = {
          ...article,
          userReaction: res.userReaction ?? null,
          reactionsCount:
            typeof res.reactionsCount === 'number' ? res.reactionsCount : article.reactionsCount,
          reactionBreakdown: res.reactionBreakdown || article.reactionBreakdown,
        };
        setArticle(next);
        if (onArticleUpdated) onArticleUpdated(next);
      }
    } finally {
      setIsReacting(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportReason.trim().length < 5) return;
    setIsReporting(true);
    try {
      const res = await reportSchoolBlogArticle(article.id, reportReason.trim());
      if (res.success) {
        showNotice('Report submitted to Grobaax administrators for review.');
        setIsReportOpen(false);
        setReportReason('');
      }
    } finally {
      setIsReporting(false);
    }
  };

  const publishedDate = article.publishedAt || article.createdAt;
  const formattedDate = publishedDate
    ? new Date(publishedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const authorAvatarUrl =
    article.authorAvatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      article.authorName || article.authorUserId || 'blogger'
    )}`;

  const isOwnArticle = Boolean(currentUser?.id && article.authorUserId === currentUser.id);

  const blocks =
    Array.isArray(article.contentBlocks) && article.contentBlocks.length > 0
      ? article.contentBlocks
      : (article.contentText || '')
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((p, idx) => ({
            id: `p-${idx}`,
            type: 'paragraph' as const,
            text: p,
          }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {article.institutionName} Blog</span>
        </button>

        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-300 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Report Article</span>
        </button>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            notice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
          }`}
        >
          {notice.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Editorial Article Container */}
      <article className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header Metadata & Headline */}
        <header className="px-5 sm:px-10 pt-7 sm:pt-10 pb-6 border-b border-slate-100 dark:border-slate-800 space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex-wrap">
            <span>{blog?.logo || '🏛️'}</span>
            <span>{article.institutionName}</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span>{article.category}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
            {article.title}
          </h1>

          <div className="flex items-center justify-between gap-3 pt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id={`school-blog-author-profile-btn-${article.id}`}
                type="button"
                onClick={() => handleOpenAuthorProfile('profile')}
                title={`View ${article.authorName || 'Author'}'s profile & follow`}
                className="inline-flex items-center gap-2 group text-left cursor-pointer rounded-xl pr-2 py-0.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors"
              >
                <img
                  src={authorAvatarUrl}
                  alt={article.authorName || 'School Blogger'}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      article.authorUserId || 'blogger'
                    )}`;
                  }}
                />
                <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline underline-offset-4 transition-colors">
                  By {article.authorName || 'School Blogger'}
                </span>
                {article.authorHasBlueBadge && (
                  <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                )}
              </button>

              {!isOwnArticle && article.authorUserId && (
                <button
                  id={`school-blog-inline-follow-btn-${article.authorUserId}`}
                  type="button"
                  disabled={isInlineFollowLoading}
                  onClick={handleInlineToggleFollow}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                    authorIsFollowing
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {isInlineFollowLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : authorIsFollowing ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>{authorIsFollowing ? 'Following' : 'Follow'}</span>
                </button>
              )}

              {formattedDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formattedDate}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 tabular-nums font-semibold">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>{Number(article.viewsCount || 0).toLocaleString()} views</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>{Number(article.reactionsCount || 0).toLocaleString()} reactions</span>
              </span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        <div className="max-w-4xl mx-auto px-5 sm:px-10 pt-6">
          {article.coverImageUrl ? (
            <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 aspect-video">
              <img
                src={article.coverImageUrl}
                alt={article.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 flex items-center justify-center aspect-video text-white/90">
              <div className="text-center space-y-2">
                <Newspaper className="w-10 h-10 mx-auto opacity-80" />
                <div className="text-sm font-bold">{article.institutionName} Dispatch</div>
              </div>
            </div>
          )}
        </div>

        {/* Reading Body */}
        <div className="px-5 sm:px-10 py-8 max-w-3xl mx-auto space-y-5">
          {isLoadingFull && blocks.length === 0 ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading article...</span>
            </div>
          ) : (
            blocks.map((block, index) => {
              if (block.type === 'heading') {
                const HeadingTag = block.level === 3 ? 'h3' : 'h2';
                return (
                  <HeadingTag
                    key={block.id || index}
                    className={`font-black text-slate-900 dark:text-white tracking-tight pt-2 ${
                      block.level === 3 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {renderFormattedBlogText(block.text || '')}
                  </HeadingTag>
                );
              }

              if (block.type === 'image' && block.imageUrl) {
                return (
                  <figure key={block.id || index} className="my-4 space-y-2">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={block.imageUrl}
                        alt={block.caption || article.title}
                        referrerPolicy="no-referrer"
                        className="w-full max-h-[480px] object-cover"
                      />
                    </div>
                    {block.caption && (
                      <figcaption className="text-xs text-slate-500 dark:text-slate-400 italic text-center">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return (
                <p
                  key={block.id || index}
                  className="text-base sm:text-[17px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line"
                >
                  {renderFormattedBlogText(block.text || '')}
                </p>
              );
            })
          )}
        </div>

        {/* Reaction Footer (No Comments / Social Threads) */}
        <footer className="px-5 sm:px-10 py-6 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                React to this Article
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {Number(article.reactionsCount || 0).toLocaleString()} total reactions
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {REACTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = article.userReaction === opt.type;
                const count = Number(article.reactionBreakdown?.[opt.type] || 0);
                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={isReacting}
                    onClick={() => handleReact(opt.type)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                    <span
                      className={`tabular-nums text-[11px] px-1.5 py-0.5 rounded-md ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </footer>
      </article>

      {/* Sponsored Corporate Placement — Strictly After Full Article Content */}
      <SponsoredBlogAdCard
        articleId={article.id}
        institutionId={article.blogInstitutionId}
      />

      {/* Author Profile & Follow Modal */}
      <CampusStudentProfileModal
        student={authorProfileStudent}
        currentUserId={currentUser?.id}
        initialViewMode={authorModalInitialView}
        isOpen={authorProfileModalOpen}
        onClose={() => setAuthorProfileModalOpen(false)}
        onSendRequest={handleAuthorSendRequest}
        onAcceptRequest={handleAuthorAcceptRequest}
        onRejectRequest={handleAuthorRejectRequest}
        onOpenWhatsApp={handleAuthorOpenWhatsApp}
        onFollowChanged={(targetId, stats) => {
          if (targetId === article.authorUserId) {
            setAuthorFollowersCount(stats.followersCount);
            setAuthorFollowingCount(stats.followingCount);
            setAuthorIsFollowing(stats.isFollowing);
            const nextArticle: SchoolBlogArticle = {
              ...article,
              authorFollowersCount: stats.followersCount,
              authorFollowingCount: stats.followingCount,
              authorIsFollowing: stats.isFollowing,
            };
            setArticle(nextArticle);
            if (onArticleUpdated) onArticleUpdated(nextArticle);
          }
          setAuthorProfileStudent((prev) =>
            prev && prev.id === targetId
              ? {
                  ...prev,
                  followersCount: stats.followersCount,
                  followingCount: stats.followingCount,
                  isFollowing: stats.isFollowing,
                }
              : prev
          );
        }}
        onNotify={(msg, type) => showNotice(msg, type || 'success')}
      />

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Report Article
              </h4>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="space-y-3">
              <textarea
                rows={3}
                required
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe why this article violates campus editorial guidelines..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReporting || reportReason.trim().length < 5}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

