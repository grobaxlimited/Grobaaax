import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import {
  CampusStudentCard,
  SchoolBlogArticle,
  SchoolBlogCategory,
  SchoolBlogRecord,
} from '../../../../types';
import {
  fetchSchoolBlogHomepage,
  getCachedSchoolBlogHomepage,
  invalidateSchoolBlogHomepageCache,
  prefetchSchoolBlogArticle,
  SchoolBlogViewerStatus,
} from '../../../../lib/schoolBlogService';
import {
  fetchCampusStudentProfile,
  getSecureWhatsAppLink,
  respondCampusChatRequest,
  sendCampusChatRequest,
} from '../../../../lib/campusService';
import { openExternalWhatsApp } from '../../../../lib/whatsappUtils';
import { CampusStudentProfileModal } from '../CampusStudentProfileModal';
import { SchoolBlogArticleView } from './SchoolBlogArticleView';
import { BloggerApplicationModal } from './BloggerApplicationModal';
import { BloggerDashboardView } from './BloggerDashboardView';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  Newspaper,
  PenTool,
  Search,
  X,
} from 'lucide-react';

interface SchoolBlogPortalProps {
  institutionKey: string;
  institutionName: string;
  institutionCategory?: string;
  homeInstitutionName: string;
  onBackToCampus: () => void;
  backButtonLabel?: string;
  onSwitchBlogInstitution?: (instName: string, category?: string) => void;
}

const BLOG_CATEGORY_TABS: Array<'All Posts' | SchoolBlogCategory> = [
  'All Posts',
  'News',
  'Events',
  'Academics',
  'Campus Life',
];

const EMPTY_CATEGORY_COUNTS: Record<string, number> = {
  'All Posts': 0,
  News: 0,
  Events: 0,
  Academics: 0,
  'Campus Life': 0,
};

export const SchoolBlogPortal: React.FC<SchoolBlogPortalProps> = ({
  institutionKey,
  institutionName,
  institutionCategory,
  homeInstitutionName,
  onBackToCampus,
  backButtonLabel,
}) => {
  const { currentUser, markSectionAsRead } = useApp();
  const targetInstitutionKey = institutionKey || institutionName;
  const userId = currentUser?.id;

  const initialCached = useMemo(
    () => getCachedSchoolBlogHomepage(targetInstitutionKey, userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [activeSubView, setActiveSubView] = useState<'feed' | 'article' | 'studio'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<'All Posts' | SchoolBlogCategory>(
    'All Posts'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [blog, setBlog] = useState<SchoolBlogRecord | null>(() => initialCached?.blog || null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    () => initialCached?.categoryCounts || EMPTY_CATEGORY_COUNTS
  );
  const [allArticles, setAllArticles] = useState<SchoolBlogArticle[]>(
    () => initialCached?.articles || []
  );
  const [viewerStatus, setViewerStatus] = useState<SchoolBlogViewerStatus | null>(
    () => initialCached?.viewerStatus || null
  );
  const [selectedArticle, setSelectedArticle] = useState<SchoolBlogArticle | null>(null);

  const [isBlogSuspendedGate, setIsBlogSuspendedGate] = useState(false);

  const [isLoading, setIsLoading] = useState<boolean>(() => !(initialCached?.success && initialCached?.blog));
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [feedAuthorProfile, setFeedAuthorProfile] = useState<CampusStudentCard | null>(null);
  const [isFeedAuthorModalOpen, setIsFeedAuthorModalOpen] = useState(false);

  const requestSeqRef = useRef(0);
  const markReadRef = useRef(markSectionAsRead);
  markReadRef.current = markSectionAsRead;

  const loadHomepage = useCallback(
    async (opts?: { silent?: boolean; forceFresh?: boolean }) => {
      const seq = ++requestSeqRef.current;
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);
      setIsBlogSuspendedGate(false);

      try {
        if (opts?.forceFresh) {
          invalidateSchoolBlogHomepageCache(targetInstitutionKey);
        }
        const res = await fetchSchoolBlogHomepage({
          institutionKey: targetInstitutionKey,
          institutionCategory,
          userId,
        });

        if (seq !== requestSeqRef.current) return;

        if (res.blog) {
          setBlog(res.blog);
        }
        if (res.viewerStatus) {
          setViewerStatus(res.viewerStatus);
        }

        if (res.blogSuspended || res.code === 'BLOG_SUSPENDED') {
          setIsBlogSuspendedGate(true);
          setAllArticles([]);
          return;
        }

        if (res.success && res.blog) {
          setCategoryCounts(
            res.categoryCounts || {
              'All Posts': res.articles?.length || 0,
              News: 0,
              Events: 0,
              Academics: 0,
              'Campus Life': 0,
            }
          );
          setAllArticles(res.articles || []);
        } else if (!silent) {
          setError(res.error || 'Could not load this School Blog.');
        }
      } catch (err: any) {
        if (seq === requestSeqRef.current && !silent) {
          setError(err?.message || 'Unable to load School Blog.');
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [targetInstitutionKey, institutionCategory, userId]
  );

  useEffect(() => {
    setActiveSubView('feed');
    setSelectedArticle(null);
    markReadRef.current?.('school_blog');

    const cached = getCachedSchoolBlogHomepage(targetInstitutionKey, userId);
    if (cached?.success && cached.blog) {
      setBlog(cached.blog);
      setCategoryCounts(cached.categoryCounts || EMPTY_CATEGORY_COUNTS);
      setAllArticles(cached.articles || []);
      setViewerStatus(cached.viewerStatus || null);
      setIsBlogSuspendedGate(false);
      setError(null);
      setIsLoading(false);
      loadHomepage({ silent: true });
    } else {
      setBlog(null);
      setCategoryCounts(EMPTY_CATEGORY_COUNTS);
      setAllArticles([]);
      setViewerStatus(null);
      setIsLoading(true);
      loadHomepage({ silent: false });
    }
  }, [targetInstitutionKey, userId, loadHomepage]);

  // 0ms instantaneous local category and search filtering over loaded articles
  const articles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allArticles.filter((art) => {
      if (selectedCategory !== 'All Posts' && art.category !== selectedCategory) {
        return false;
      }
      if (q) {
        const matchesTitle = String(art.title || '').toLowerCase().includes(q);
        const matchesExcerpt = String(art.excerpt || '').toLowerCase().includes(q);
        const matchesAuthor = String(art.authorName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesExcerpt && !matchesAuthor) {
          return false;
        }
      }
      return true;
    });
  }, [allArticles, selectedCategory, searchQuery]);

  const handleOpenArticle = (article: SchoolBlogArticle) => {
    setSelectedArticle(article);
    setActiveSubView('article');
  };

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const displayInstitutionName = blog?.institutionName || institutionName;

  const handleApplyButtonClick = () => {
    setIsApplyModalOpen(true);
  };

  const handleOpenFeedAuthorProfile = async (
    e: React.MouseEvent,
    art: SchoolBlogArticle
  ) => {
    e.stopPropagation();
    if (!art.authorUserId) return;
    const fallbackName = art.authorName || 'School Blogger';
    setFeedAuthorProfile({
      id: art.authorUserId,
      name: fallbackName,
      username: art.authorUsername || '',
      avatar:
        art.authorAvatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
          fallbackName || art.authorUserId
        )}`,
      institution: art.institutionName || displayInstitutionName || 'Grobaax Campus',
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
      connectionStatus: currentUser?.id === art.authorUserId ? 'self' : 'none',
      joinedCampus: true,
      followersCount: Number(art.authorFollowersCount || 0),
      followingCount: Number(art.authorFollowingCount || 0),
      isFollowing: Boolean(art.authorIsFollowing),
    });
    setIsFeedAuthorModalOpen(true);

    const hydrated = await fetchCampusStudentProfile(art.authorUserId, currentUser?.id);
    if (hydrated) {
      setFeedAuthorProfile(hydrated);
    }
  };

  if (activeSubView === 'article' && selectedArticle) {
    return (
      <SchoolBlogArticleView
        article={selectedArticle}
        blog={blog}
        onBack={() => {
          setActiveSubView('feed');
          setSelectedArticle(null);
        }}
        onArticleUpdated={(updated) => {
          setAllArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }}
      />
    );
  }

  if (activeSubView === 'studio' && viewerStatus?.isActiveBloggerForThisSchool) {
    return (
      <BloggerDashboardView
        institutionId={blog?.institutionId || institutionKey}
        institutionName={displayInstitutionName}
        onBackToBlog={() => {
          setActiveSubView('feed');
          loadHomepage({ silent: true, forceFresh: true });
        }}
        onArticlesChanged={() => {
          loadHomepage({ silent: true, forceFresh: true });
        }}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onBackToCampus}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backButtonLabel || 'Back to Campus Directory'}</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {!isLoading && !isBlogSuspendedGate && viewerStatus?.isHomeInstitution && (
            viewerStatus.isActiveBloggerForThisSchool ? (
              <button
                id="school-blog-open-studio-btn"
                type="button"
                onClick={() => setActiveSubView('studio')}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Blogger Studio</span>
              </button>
            ) : viewerStatus.isSuspendedBloggerForThisSchool ? (
              <button
                id="school-blog-apply-btn"
                type="button"
                onClick={() => setIsApplyModalOpen(true)}
                title="Your School Blogger access is suspended or revoked"
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Blogger Suspended</span>
              </button>
            ) : viewerStatus.myApplication?.status === 'Pending' ? (
              <button
                id="school-blog-apply-btn"
                type="button"
                onClick={() => setIsApplyModalOpen(true)}
                title="View or withdraw your pending School Blogger application"
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Application Pending</span>
              </button>
            ) : (
              <button
                id="school-blog-apply-btn"
                type="button"
                onClick={handleApplyButtonClick}
                title={`Apply to Become a School Blogger for ${displayInstitutionName}`}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>
                  {viewerStatus.myApplication?.status === 'Rejected'
                    ? 'Reapply as Blogger'
                    : 'Apply as Blogger'}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-8 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0"
                />
              ))}
            </div>
            <div className="hidden lg:block h-9 w-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-24 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-5 w-4/5 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-full rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-2/3 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isBlogSuspendedGate ? (
        <section className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <Ban className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {displayInstitutionName} Blog Currently Suspended
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            This institutional School Blog has been temporarily deactivated by Grobaax Administrators.
          </p>
        </section>
      ) : (
        <>

      {/* SECTION B: Categories & Search Bar */}
      <section className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          {BLOG_CATEGORY_TABS.map((cat) => {
            const active = selectedCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-md ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px] lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${blog?.shortName || 'school'} articles...`}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION C: Article Feed */}
      {articles.length === 0 ? (
        <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Newspaper className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            No Published Articles Yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? `No articles matched "${searchQuery}" in ${displayInstitutionName} Blog.`
              : `${displayInstitutionName} Blog does not have published posts in "${selectedCategory}" yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art) => {
            const dateStr = art.publishedAt || art.createdAt;
            const prettyDate = dateStr
              ? new Date(dateStr).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '';
            return (
              <article
                key={art.id}
                onMouseEnter={() => prefetchSchoolBlogArticle(art.id, userId)}
                onTouchStart={() => prefetchSchoolBlogArticle(art.id, userId)}
                onClick={() => handleOpenArticle(art)}
                className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    {art.coverImageUrl ? (
                      <img
                        src={art.coverImageUrl}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white/85">
                        <Newspaper className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        {art.category}
                      </span>
                      {prettyDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{prettyDate}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {art.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {art.excerpt}
                    </p>

                    {art.authorUserId && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenFeedAuthorProfile(e, art)}
                        className="inline-flex items-center gap-1.5 pt-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline underline-offset-4 cursor-pointer"
                        title={`View ${art.authorName || 'Author'}'s profile & follow`}
                      >
                        <img
                          src={
                            art.authorAvatar ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                              art.authorName || art.authorUserId
                            )}`
                          }
                          alt={art.authorName || 'School Blogger'}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <span>By {art.authorName || 'School Blogger'}</span>
                        {art.authorHasBlueBadge && (
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{Number(art.viewsCount || 0).toLocaleString()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{Number(art.reactionsCount || 0).toLocaleString()}</span>
                    </span>
                  </div>

                  <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* School Blogger Application Modal (Admin Approval Required) */}
      <BloggerApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        currentUser={currentUser}
        homeInstitutionId={viewerStatus?.homeInstitutionId || ''}
        homeInstitutionName={viewerStatus?.homeInstitutionName || homeInstitutionName}
        isSuspendedOrRevoked={Boolean(viewerStatus?.isSuspendedBloggerForThisSchool)}
        existingApplication={viewerStatus?.myApplication || null}
        onSubmitted={async (application, msg) => {
          setIsApplyModalOpen(false);
          setViewerStatus((prev) =>
            prev
              ? {
                  ...prev,
                  myApplication: application,
                }
              : null
          );
          showNotice(msg);
          await loadHomepage({ silent: true, forceFresh: true });
        }}
      />

      {/* Author Profile & Follow Modal from Feed */}
      <CampusStudentProfileModal
        student={feedAuthorProfile}
        currentUserId={currentUser?.id}
        isOpen={isFeedAuthorModalOpen}
        onClose={() => setIsFeedAuthorModalOpen(false)}
        onSendRequest={async (student) => {
          if (!currentUser) {
            showNotice('Please sign in to connect with this author.');
            return;
          }
          const res = await sendCampusChatRequest(currentUser, student);
          if (res.success) {
            showNotice(res.message || 'Connection request sent!');
            setFeedAuthorProfile((prev) =>
              prev && prev.id === student.id ? { ...prev, connectionStatus: 'pending_sent' } : prev
            );
          } else {
            showNotice(res.error || 'Failed to send request.');
          }
        }}
        onAcceptRequest={async (requestId, student) => {
          if (!currentUser) return;
          const res = await respondCampusChatRequest(requestId, currentUser.id, 'ACCEPT');
          if (res.success) {
            showNotice(res.message || 'Connection accepted!');
            setFeedAuthorProfile((prev) =>
              prev && prev.id === student.id ? { ...prev, connectionStatus: 'accepted' } : prev
            );
          } else {
            showNotice(res.error || 'Failed to accept connection.');
          }
        }}
        onRejectRequest={async (requestId, student) => {
          if (!currentUser) return;
          const res = await respondCampusChatRequest(requestId, currentUser.id, 'REJECT');
          if (res.success) {
            showNotice(res.message || 'Connection request declined.');
            setFeedAuthorProfile((prev) =>
              prev && prev.id === student.id ? { ...prev, connectionStatus: 'none' } : prev
            );
          } else {
            showNotice(res.error || 'Failed to decline request.');
          }
        }}
        onOpenWhatsApp={async (student) => {
          if (!currentUser) return;
          const res = await getSecureWhatsAppLink(currentUser.id, student.id, student.requestId);
          if (res.success && res.whatsappUrl) {
            openExternalWhatsApp(res.whatsappUrl);
          } else {
            showNotice(res.error || 'Unable to open WhatsApp chat.');
          }
        }}
        onFollowChanged={(targetId, stats) => {
          setFeedAuthorProfile((prev) =>
            prev && prev.id === targetId
              ? {
                  ...prev,
                  followersCount: stats.followersCount,
                  followingCount: stats.followingCount,
                  isFollowing: stats.isFollowing,
                }
              : prev
          );
          setAllArticles((prev) =>
            prev.map((a) =>
              a.authorUserId === targetId
                ? {
                    ...a,
                    authorFollowersCount: stats.followersCount,
                    authorFollowingCount: stats.followingCount,
                    authorIsFollowing: stats.isFollowing,
                  }
                : a
            )
          );
        }}
        onNotify={(msg) => showNotice(msg)}
      />
        </>
      )}
    </div>
  );
};
