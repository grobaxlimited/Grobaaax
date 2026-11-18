import React, { useEffect, useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import {
  SchoolBlogArticle,
  SchoolBlogCategory,
  SchoolBlogRecord,
} from '../../../../types';
import {
  fetchSchoolBlogHomepage,
  SchoolBlogViewerStatus,
} from '../../../../lib/schoolBlogService';
import { SchoolBlogArticleView } from './SchoolBlogArticleView';
import { BloggerApplicationModal } from './BloggerApplicationModal';
import { BloggerDashboardView } from './BloggerDashboardView';
import { BloggerSubscriptionGateModal } from './BloggerSubscriptionGateModal';
import { isSubscriptionExpired } from '../../../../lib/firebase';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  Loader2,
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

export const SchoolBlogPortal: React.FC<SchoolBlogPortalProps> = ({
  institutionKey,
  institutionName,
  institutionCategory,
  homeInstitutionName,
  onBackToCampus,
  backButtonLabel,
  onSwitchBlogInstitution,
}) => {
  const { currentUser } = useApp();

  const [activeSubView, setActiveSubView] = useState<'feed' | 'article' | 'studio'>('feed');
  const [selectedCategory, setSelectedCategory] = useState<'All Posts' | SchoolBlogCategory>(
    'All Posts'
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [blog, setBlog] = useState<SchoolBlogRecord | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({
    'All Posts': 0,
    News: 0,
    Events: 0,
    Academics: 0,
    'Campus Life': 0,
  });
  const [articles, setArticles] = useState<SchoolBlogArticle[]>([]);
  const [viewerStatus, setViewerStatus] = useState<SchoolBlogViewerStatus | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<SchoolBlogArticle | null>(null);

  const [isBlogSuspendedGate, setIsBlogSuspendedGate] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubGateOpen, setIsSubGateOpen] = useState(false);

  const loadHomepage = async () => {
    setIsLoading(true);
    setError(null);
    setIsBlogSuspendedGate(false);
    try {
      const res = await fetchSchoolBlogHomepage({
        institutionKey: institutionKey || institutionName,
        category: selectedCategory,
        search: searchQuery.trim() || undefined,
        institutionCategory,
      });

      if (res.blog) {
        setBlog(res.blog);
      }
      if (res.viewerStatus) {
        setViewerStatus(res.viewerStatus);
      }

      if (res.blogSuspended || res.code === 'BLOG_SUSPENDED') {
        setIsBlogSuspendedGate(true);
        setArticles([]);
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
        setArticles(res.articles || []);
      } else {
        setError(res.error || 'Could not load this School Blog.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load School Blog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setActiveSubView('feed');
    setSelectedArticle(null);
    loadHomepage();
  }, [institutionKey, institutionName]);

  useEffect(() => {
    if (activeSubView === 'feed') {
      loadHomepage();
    }
  }, [selectedCategory, searchQuery]);

  const handleOpenArticle = (article: SchoolBlogArticle) => {
    setSelectedArticle(article);
    setActiveSubView('article');
  };

  const showNotice = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const displayInstitutionName = blog?.institutionName || institutionName;

  const clientTierStr = String(
    currentUser.membershipTier || currentUser.subscriptionTier || ''
  ).toLowerCase();
  const isExplicitFreeClient =
    clientTierStr === 'free' ||
    clientTierStr === 'free scholar' ||
    clientTierStr.includes('starter');
  const clientSubActive = Boolean(
    currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      (!isSubscriptionExpired(currentUser) &&
        (currentUser.isPremium ||
          currentUser.isVip ||
          (currentUser.isSubscribed && !isExplicitFreeClient)))
  );
  const hasActiveBloggerSubscription = Boolean(
    viewerStatus?.hasActiveSubscription || clientSubActive
  );

  const handleApplyButtonClick = () => {
    if (viewerStatus?.myApplication?.status === 'Pending') {
      setIsApplyModalOpen(true);
      return;
    }
    if (!hasActiveBloggerSubscription) {
      setIsSubGateOpen(true);
      return;
    }
    setIsApplyModalOpen(true);
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
          setArticles((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
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
          loadHomepage();
        }}
        onArticlesChanged={() => {
          loadHomepage();
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
          {/* Publishing control strictly visible ONLY to authorized active blogger of this institution */}
          {!isBlogSuspendedGate && viewerStatus?.isActiveBloggerForThisSchool && (
            <button
              id="school-blog-open-studio-btn"
              type="button"
              onClick={() => setActiveSubView('studio')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Blogger Studio</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading {displayInstitutionName} Blog...
          </p>
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

      {/* SECTION D: Blogger Access Section */}
      <section className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {viewerStatus?.isHomeInstitution ? (
          viewerStatus.isActiveBloggerForThisSchool ? (
            <>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  You are an Active School Blogger for {displayInstitutionName}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use your Blogger Dashboard to create drafts, publish campus news, and track GP view rewards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubView('studio')}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                Open Blogger Dashboard
              </button>
            </>
          ) : viewerStatus.isSuspendedBloggerForThisSchool ? (
            <div className="space-y-1">
              <h4 className="text-sm font-black text-rose-600 dark:text-rose-400">
                Your School Blogger Access is Suspended or Revoked
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contact Grobaax administrators if you believe your publishing privileges should be restored.
              </p>
            </div>
          ) : viewerStatus.myApplication?.status === 'Pending' ? (
            <>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Application Pending Admin Review</span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Your Blogger Application for {displayInstitutionName} is Under Review
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Grobaax Administrators will review your application shortly and send you a notification once a decision is made.
                </p>
              </div>
              <button
                id="school-blog-apply-btn"
                type="button"
                onClick={() => setIsApplyModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>View / Withdraw Application</span>
              </button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Become a School Blogger for {displayInstitutionName}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  Are you a student of {displayInstitutionName} passionate about campus journalism, event coverage, and student updates? Subscribe to Premium or VIP to apply &amp; post articles (reading articles is free for everyone). Approved bloggers with 500+ followers earn GP view rewards!
                </p>
              </div>
              <button
                id="school-blog-apply-btn"
                type="button"
                onClick={handleApplyButtonClick}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>
                  {viewerStatus.myApplication?.status === 'Rejected'
                    ? 'Submit New Application'
                    : hasActiveBloggerSubscription
                    ? 'Apply to Become a Blogger'
                    : 'Subscribe & Apply to Blog'}
                </span>
              </button>
            </>
          )
        ) : (
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Reading {displayInstitutionName} Blog
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You can read articles from any registered school on Grobaax. Only verified students of{' '}
              <strong>{displayInstitutionName}</strong> can become School Bloggers for this blog (your home school is{' '}
              <strong>{homeInstitutionName}</strong>).
            </p>
          </div>
        )}
      </section>

      {/* School Blogger Application Modal (Subscription + Admin Approval Required) */}
      <BloggerApplicationModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        currentUser={currentUser}
        homeInstitutionId={viewerStatus?.homeInstitutionId || ''}
        homeInstitutionName={viewerStatus?.homeInstitutionName || homeInstitutionName}
        isSuspendedOrRevoked={Boolean(viewerStatus?.isSuspendedBloggerForThisSchool)}
        existingApplication={viewerStatus?.myApplication || null}
        onRequireSubscription={() => setIsSubGateOpen(true)}
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
          await loadHomepage();
        }}
      />

      {/* Subscription Gate for Free Users Clicking Apply to Become a Blogger */}
      <BloggerSubscriptionGateModal
        isOpen={isSubGateOpen}
        onClose={() => setIsSubGateOpen(false)}
        contextMode="apply"
        institutionName={displayInstitutionName}
        onSubscribed={async () => {
          setIsSubGateOpen(false);
          await loadHomepage();
          setIsApplyModalOpen(true);
        }}
      />
        </>
      )}
    </div>
  );
};
