import React, { useEffect, useState } from 'react';
import {
  SchoolBlogArticle,
  SchoolBlogReactionType,
  SchoolBlogRecord,
} from '../../../../types';
import {
  fetchSchoolBlogArticle,
  reactToSchoolBlogArticle,
  reportSchoolBlogArticle,
  trackSchoolBlogArticleView,
} from '../../../../lib/schoolBlogService';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Eye,
  Flag,
  Heart,
  Lightbulb,
  Loader2,
  Newspaper,
  Sparkles,
  ThumbsUp,
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

export const SchoolBlogArticleView: React.FC<SchoolBlogArticleViewProps> = ({
  article: initialArticle,
  blog,
  onBack,
  onArticleUpdated,
}) => {
  const [article, setArticle] = useState<SchoolBlogArticle>(initialArticle);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setArticle(initialArticle);

    async function hydrateAndTrackView() {
      setIsLoadingFull(true);
      try {
        const res = await fetchSchoolBlogArticle(initialArticle.id);
        if (mounted && res.success && res.article) {
          setArticle(res.article);
        }
      } catch {}
      finally {
        if (mounted) setIsLoadingFull(false);
      }

      try {
        const viewRes = await trackSchoolBlogArticleView(initialArticle.id);
        if (mounted && viewRes.success && typeof viewRes.viewsCount === 'number') {
          setArticle((prev) => {
            const next = { ...prev, viewsCount: viewRes.viewsCount! };
            if (onArticleUpdated) onArticleUpdated(next);
            return next;
          });
        }
      } catch {}
    }

    hydrateAndTrackView();
    return () => {
      mounted = false;
    };
  }, [initialArticle.id]);

  const handleReact = async (reactionType: SchoolBlogReactionType) => {
    if (isReacting) return;
    setIsReacting(true);
    try {
      const res = await reactToSchoolBlogArticle(article.id, reactionType);
      if (res.success) {
        setArticle((prev) => {
          const next: SchoolBlogArticle = {
            ...prev,
            userReaction: res.userReaction ?? null,
            reactionsCount:
              typeof res.reactionsCount === 'number' ? res.reactionsCount : prev.reactionsCount,
            reactionBreakdown: res.reactionBreakdown || prev.reactionBreakdown,
          };
          if (onArticleUpdated) onArticleUpdated(next);
          return next;
        });
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
        setReportNotice('Report submitted to Grobaax administrators for review.');
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

      {reportNotice && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reportNotice}</span>
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

          <div className="flex items-center justify-between gap-4 pt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                By {article.authorName || 'School Blogger'}
              </span>
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
                    {block.text}
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
                  {block.text}
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
