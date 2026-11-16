import React, { useEffect, useState } from 'react';
import { useApp } from '../../../../context/AppContext';
import {
  ArticleRewardProgress,
  BloggerRewardSummary,
  SchoolBlogArticle,
  SchoolBlogCategory,
  SchoolBlogContentBlock,
  SchoolBloggerAssignment,
  SchoolBlogRewardMilestone,
} from '../../../../types';
import {
  createSchoolBlogArticle,
  fetchBloggerRewards,
  fetchBloggerStudioArticles,
  updateSchoolBlogArticle,
  uploadSchoolBlogImage,
} from '../../../../lib/schoolBlogService';
import { compressProductImage } from '../../../../utils/imageCompressor';
import { renderFormattedBlogText } from './blogTextFormatter';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Bold,
  CheckCircle2,
  Coins,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Heading2,
  Image as ImageIcon,
  Italic,
  Loader2,
  PenTool,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react';

interface BloggerDashboardViewProps {
  institutionId: string;
  institutionName: string;
  onBackToBlog: () => void;
  onArticlesChanged: () => void;
}

const BLOG_CATEGORIES: SchoolBlogCategory[] = ['News', 'Events', 'Academics', 'Campus Life'];

export const BloggerDashboardView: React.FC<BloggerDashboardViewProps> = ({
  institutionId,
  institutionName,
  onBackToBlog,
  onArticlesChanged,
}) => {
  const { setIsWalletModalOpen, setWalletModalTab } = useApp();

  const [assignment, setAssignment] = useState<SchoolBloggerAssignment | null>(null);
  const [articles, setArticles] = useState<SchoolBlogArticle[]>([]);
  const [rewardSummary, setRewardSummary] = useState<BloggerRewardSummary | null>(null);
  const [articleProgress, setArticleProgress] = useState<ArticleRewardProgress[]>([]);
  const [rewardMilestones, setRewardMilestones] = useState<SchoolBlogRewardMilestone[]>([]);
  const [studioTab, setStudioTab] = useState<'articles' | 'rewards'>('articles');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Editor State
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState<SchoolBlogCategory>('News');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [blocks, setBlocks] = useState<SchoolBlogContentBlock[]>([
    { id: 'block-1', type: 'paragraph', text: '' },
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadStudio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [articlesRes, rewardsRes] = await Promise.all([
        fetchBloggerStudioArticles(),
        fetchBloggerRewards(),
      ]);

      if (articlesRes.success) {
        setAssignment(articlesRes.assignment || null);
        setArticles(articlesRes.articles || []);
      } else {
        setAssignment(null);
        setArticles([]);
        setError(articlesRes.error || 'Could not load Blogger Studio.');
      }

      if (rewardsRes.success) {
        setRewardSummary(rewardsRes.summary || null);
        setArticleProgress(rewardsRes.articleProgress || []);
        setRewardMilestones(rewardsRes.milestones || []);
      } else {
        setRewardSummary(null);
        setArticleProgress([]);
        setRewardMilestones([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to Blogger Studio.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudio();
  }, []);

  const handleOpenGpWallet = () => {
    setWalletModalTab('history');
    setIsWalletModalOpen(true);
  };

  const resetEditor = () => {
    setEditingArticleId(null);
    setTitle('');
    setExcerpt('');
    setCategory('News');
    setCoverImageUrl('');
    setBlocks([{ id: `block-${Date.now()}`, type: 'paragraph', text: '' }]);
    setShowPreview(false);
    setError(null);
  };

  const openCreateEditor = () => {
    resetEditor();
    setMode('editor');
  };

  const openEditEditor = (art: SchoolBlogArticle) => {
    setEditingArticleId(art.id);
    setTitle(art.title);
    setExcerpt(art.excerpt || '');
    setCategory(art.category);
    setCoverImageUrl(art.coverImageUrl || '');
    setBlocks(
      Array.isArray(art.contentBlocks) && art.contentBlocks.length > 0
        ? art.contentBlocks
        : [{ id: `block-${Date.now()}`, type: 'paragraph', text: art.contentText || '' }]
    );
    setShowPreview(false);
    setError(null);
    setMode('editor');
  };

  const handleCoverUpload = async (file: File) => {
    setIsUploadingCover(true);
    setError(null);
    try {
      const compressed = await compressProductImage(file, 1280, 0.85);
      const uploaded = await uploadSchoolBlogImage(compressed.dataUrl, file.name);
      if (uploaded.success && uploaded.imageUrl) {
        setCoverImageUrl(uploaded.imageUrl);
      } else {
        setError(uploaded.error || 'Cover image upload failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not process cover image.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleInlineImageUpload = async (blockId: string, file: File) => {
    setUploadingBlockId(blockId);
    setError(null);
    try {
      const compressed = await compressProductImage(file, 1200, 0.84);
      const uploaded = await uploadSchoolBlogImage(compressed.dataUrl, file.name);
      if (uploaded.success && uploaded.imageUrl) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, imageUrl: uploaded.imageUrl } : b))
        );
      } else {
        setError(uploaded.error || 'Inline image upload failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not process inline image.');
    } finally {
      setUploadingBlockId(null);
    }
  };

  const addBlock = (type: 'heading' | 'paragraph' | 'image') => {
    const newBlock: SchoolBlogContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      text: type === 'image' ? undefined : '',
      level: type === 'heading' ? 2 : undefined,
      imageUrl: type === 'image' ? '' : undefined,
      caption: type === 'image' ? '' : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= blocks.length) return;
    setBlocks((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== blockId) : prev));
  };

  const applyInlineFormatting = (blockId: string, marker: '**' | '*') => {
    const el = document.getElementById(`blog-block-input-${blockId}`) as
      | HTMLTextAreaElement
      | HTMLInputElement
      | null;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const current = b.text || '';
        if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const selected = current.slice(start, end);
          const wrapped =
            selected.length > 0
              ? `${marker}${selected}${marker}`
              : `${marker}${marker === '**' ? 'bold text' : 'italic text'}${marker}`;
          return {
            ...b,
            text: current.slice(0, start) + wrapped + current.slice(end),
          };
        }
        return {
          ...b,
          text: current + (current ? ' ' : '') + `${marker}${marker === '**' ? 'bold text' : 'italic text'}${marker}`,
        };
      })
    );
  };

  const handleSaveArticle = async (targetStatus: 'draft' | 'published') => {
    setError(null);
    setNotice(null);

    if (title.trim().length < 5) {
      setError('Please enter a descriptive headline (at least 5 characters).');
      return;
    }

    const cleanedBlocks = blocks.filter((b) =>
      b.type === 'image' ? Boolean(b.imageUrl) : Boolean(b.text && b.text.trim())
    );
    if (cleanedBlocks.length === 0) {
      setError('Please write at least one paragraph, heading, or image before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const targetInstId = assignment?.institutionId || institutionId;
      if (editingArticleId) {
        const res = await updateSchoolBlogArticle(editingArticleId, {
          title: title.trim(),
          excerpt: excerpt.trim(),
          category,
          coverImageUrl,
          contentBlocks: cleanedBlocks,
          status: targetStatus,
        });
        if (res.success) {
          setNotice(
            targetStatus === 'published'
              ? 'Article published to your School Blog!'
              : 'Draft saved.'
          );
          setMode('list');
          await loadStudio();
          onArticlesChanged();
        } else {
          setError(res.error || 'Failed to update article.');
        }
      } else {
        const res = await createSchoolBlogArticle({
          targetInstitutionId: targetInstId,
          title: title.trim(),
          excerpt: excerpt.trim(),
          category,
          coverImageUrl,
          contentBlocks: cleanedBlocks,
          status: targetStatus,
        });
        if (res.success) {
          setNotice(
            targetStatus === 'published'
              ? 'Article published to your School Blog!'
              : 'Draft saved.'
          );
          setMode('list');
          await loadStudio();
          onArticlesChanged();
        } else {
          setError(res.error || 'Failed to save article.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving article.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (art: SchoolBlogArticle, nextStatus: 'published' | 'unpublished') => {
    setError(null);
    setNotice(null);
    const res = await updateSchoolBlogArticle(art.id, { status: nextStatus });
    if (res.success) {
      setNotice(nextStatus === 'published' ? 'Article published.' : 'Article unpublished.');
      await loadStudio();
      onArticlesChanged();
    } else {
      setError(res.error || 'Failed to update article status.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Studio Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5" />
            <span>Official School Blogger Studio</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {assignment?.institutionName || institutionName}
          </h2>
          {assignment && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authorized Blogger: <strong className="text-slate-800 dark:text-slate-200">{assignment.userName}</strong> · {assignment.department} ({assignment.level})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onBackToBlog}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Public Blog</span>
          </button>

          {mode === 'list' ? (
            <button
              type="button"
              onClick={openCreateEditor}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Write New Article</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('list')}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              Back to My Articles
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading your editorial workspace...</p>
        </div>
      ) : !assignment ? (
        <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Active School Blogger Access Required
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {error ||
              'Subscribe to Premium or VIP and activate your School Blogger access to unlock Blogger Dashboard, article publishing, and GP reward tracking.'}
          </p>
        </div>
      ) : mode === 'list' ? (
        <div className="space-y-4">
          {/* Studio Section Tabs + Quick GP Reward Summary Strip */}
          <div className="p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStudioTab('articles')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  studioTab === 'articles'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>My Articles ({articles.length})</span>
              </button>
              <button
                type="button"
                id="blogger-my-gp-rewards-tab"
                onClick={() => setStudioTab('rewards')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  studioTab === 'rewards'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>My GP Rewards</span>
                {rewardSummary && (
                  <span
                    className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                      studioTab === 'rewards'
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300'
                    }`}
                  >
                    {rewardSummary.totalGpEarned.toLocaleString()} GP
                  </span>
                )}
              </button>
            </div>

            {rewardSummary && (
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between sm:justify-end gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                  {rewardSummary.totalEligibleViews.toLocaleString()} eligible views
                </span>
                <button
                  type="button"
                  onClick={handleOpenGpWallet}
                  className="text-blue-600 dark:text-blue-400 font-black hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Wallet ({rewardSummary.walletGpBalance.toLocaleString()} GP)</span>
                </button>
              </div>
            )}
          </div>

          {studioTab === 'rewards' ? (
            /* MY GP REWARDS SECTION */
            <div id="blogger-gp-rewards-section" className="space-y-5">
              {/* Top Reward Overview Banner (Grobaax Blue & White Identity) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="text-[11px] font-black uppercase tracking-wider text-blue-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>My GP Rewards · Automatic View Payouts</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      Campus Blogger View Earnings
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                      Earn 1,000 GP for every 250 genuine unique views on your published articles.
                      Each reader counts only once per article. Your GP rewards are credited
                      automatically to your Grobaax wallet.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenGpWallet}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-black shadow-sm flex items-center gap-2 shrink-0 self-start cursor-pointer transition-colors"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>View GP Wallet &amp; History</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4 Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-white/12 border border-white/20 backdrop-blur-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                      Eligible Unique Views
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums mt-1">
                      {(rewardSummary?.totalEligibleViews ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-blue-100/80 mt-0.5">
                      Across published articles
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/12 border border-white/20 backdrop-blur-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                      Total GP Earned
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums mt-1">
                      {(rewardSummary?.totalGpEarned ?? 0).toLocaleString()} GP
                    </div>
                    <div className="text-[11px] text-blue-100/80 mt-0.5">
                      Auto-credited to wallet
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/12 border border-white/20 backdrop-blur-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                      Published Articles
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums mt-1">
                      {rewardSummary?.publishedArticlesCount ?? 0}
                    </div>
                    <div className="text-[11px] text-blue-100/80 mt-0.5">
                      Active on {institutionName}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/12 border border-white/20 backdrop-blur-xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                      Milestones Achieved
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white tabular-nums mt-1">
                      {rewardSummary?.milestonesAchieved ?? 0}
                    </div>
                    <div className="text-[11px] text-blue-100/80 mt-0.5">
                      250 views = 1,000 GP
                    </div>
                  </div>
                </div>

                {/* Closest Next Milestone Progress Bar */}
                {rewardSummary && (
                  <div className="p-4 rounded-2xl bg-white/12 border border-white/20 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-blue-200 shrink-0" />
                        <span>
                          Next Milestone Progress
                          {rewardSummary.nextMilestoneProgress.articleTitle
                            ? ` · ${rewardSummary.nextMilestoneProgress.articleTitle}`
                            : ''}
                        </span>
                      </span>
                      <span className="font-black text-white tabular-nums">
                        {rewardSummary.nextMilestoneProgress.currentViews.toLocaleString()} /{' '}
                        {rewardSummary.nextMilestoneProgress.targetViews.toLocaleString()} views (
                        {rewardSummary.nextMilestoneProgress.remainingViews.toLocaleString()} left for +1,000 GP)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-300"
                        style={{
                          width: `${rewardSummary.nextMilestoneProgress.progressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Per-Article Reward Progress Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    Per-Article Reward Progress
                  </h4>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Minimum payout: 250 eligible views / article
                  </span>
                </div>

                {articleProgress.length === 0 ? (
                  <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <Coins className="w-8 h-8 text-blue-500 mx-auto opacity-75" />
                    <h5 className="text-sm font-black text-slate-900 dark:text-white">
                      No Published Articles Tracked Yet
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Publish your first article to start earning 1,000 GP automatically for every
                      250 eligible unique student views.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {articleProgress.map((item) => {
                      const pubDate = item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Draft';
                      return (
                        <div
                          key={item.articleId}
                          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                              <span className="text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                {item.category} · {pubDate}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 uppercase">
                                {item.status}
                              </span>
                            </div>
                            <h5 className="font-black text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2">
                              {item.title}
                            </h5>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                                Eligible Unique Views
                              </div>
                              <div className="font-black text-sm text-slate-900 dark:text-white tabular-nums mt-0.5">
                                {item.eligibleViews.toLocaleString()}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50">
                              <div className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold">
                                GP Earned
                              </div>
                              <div className="font-black text-sm text-blue-700 dark:text-blue-300 tabular-nums mt-0.5">
                                {item.gpEarned.toLocaleString()} GP
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                              <span className="text-slate-700 dark:text-slate-300">
                                Next milestone ({item.nextRewardGp.toLocaleString()} GP total)
                              </span>
                              <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                                {item.progressCurrent.toLocaleString()} /{' '}
                                {item.progressTarget.toLocaleString()} views
                              </span>
                            </div>

                            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                              <span>
                                {item.milestonesAchieved} milestone
                                {item.milestonesAchieved === 1 ? '' : 's'} credited
                              </span>
                              <span>
                                {item.remainingViews.toLocaleString()} view
                                {item.remainingViews === 1 ? '' : 's'} remaining for +1,000 GP
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Automatic GP Milestone Payouts */}
              {rewardMilestones.length > 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Automatic Milestone Credits ({rewardMilestones.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={handleOpenGpWallet}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Open Wallet Ledger
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rewardMilestones.map((m) => (
                      <div
                        key={m.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {m.articleTitle || 'School Blog Article'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Milestone #{m.milestoneNumber} · {m.eligibleViewThreshold.toLocaleString()}{' '}
                            eligible views · Ref: {m.transactionReference}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-blue-600 dark:text-blue-400 tabular-nums">
                            +{m.gpAmount.toLocaleString()} GP
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {articles.length === 0 ? (
                <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    No Articles Written Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Publish your first campus news dispatch, event spotlight, or academic notice for {institutionName}.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateEditor}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Article</span>
                  </button>
                </div>
              ) : (
                articles.map((art) => (
                  <div
                    key={art.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {art.coverImageUrl ? (
                        <img
                          src={art.coverImageUrl}
                          alt={art.title}
                          referrerPolicy="no-referrer"
                          className="w-20 h-14 rounded-xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
                        />
                      ) : (
                        <div className="w-20 h-14 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-[11px] font-bold flex-wrap">
                          <span
                            className={`uppercase tracking-wider ${
                              art.status === 'published'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : art.status === 'removed'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {art.status}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-blue-600 dark:text-blue-400">{art.category}</span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-500 tabular-nums">
                            {art.viewsCount} views · {art.reactionsCount} reactions
                          </span>
                        </div>
                        <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {art.title}
                        </h4>
                        {art.status === 'removed' && art.moderationReason && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400">
                            Removed by Admin: {art.moderationReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {art.status !== 'removed' && (
                        <button
                          type="button"
                          onClick={() => openEditEditor(art)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {(art.status === 'draft' || art.status === 'unpublished') && (
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(art, 'published')}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Publish
                        </button>
                      )}
                      {art.status === 'published' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(art, 'unpublished')}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer"
                        >
                          Unpublish
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Editor & Preview Mode */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {editingArticleId ? 'Edit Article' : 'Compose School Blog Article'}
            </h3>
            <button
              type="button"
              onClick={() => setShowPreview((p) => !p)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showPreview ? 'Back to Editor' : 'Preview Article'}</span>
            </button>
          </div>

          {showPreview ? (
            <div className="max-w-3xl mx-auto space-y-5 py-2">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {institutionName} · {category}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                {title || 'Untitled Headline'}
              </h1>
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full aspect-video object-cover rounded-2xl border border-slate-200 dark:border-slate-700"
                />
              )}
              <div className="space-y-4">
                {blocks.map((b) => {
                  if (b.type === 'heading') {
                    return (
                      <h2 key={b.id} className="text-xl font-black text-slate-900 dark:text-white pt-2">
                        {renderFormattedBlogText(b.text || '')}
                      </h2>
                    );
                  }
                  if (b.type === 'image' && b.imageUrl) {
                    return (
                      <figure key={b.id} className="space-y-1.5">
                        <img
                          src={b.imageUrl}
                          alt={b.caption || 'Article media'}
                          referrerPolicy="no-referrer"
                          className="w-full max-h-[420px] object-cover rounded-2xl"
                        />
                        {b.caption && (
                          <figcaption className="text-xs italic text-slate-500 text-center">
                            {b.caption}
                          </figcaption>
                        )}
                      </figure>
                    );
                  }
                  return (
                    <p
                      key={b.id}
                      className="text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line"
                    >
                      {renderFormattedBlogText(b.text || '')}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Headline & Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Article Headline
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a clear, compelling headline..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SchoolBlogCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {BLOG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Article Summary / Excerpt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Article Summary (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {excerpt.length}/260 · Auto-generated if left blank
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={260}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Write a brief 1–2 sentence summary displayed on feed cards..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Cover Image
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors self-start">
                    {isUploadingCover ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isUploadingCover ? 'Uploading Cover...' : 'Upload Cover Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingCover}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleCoverUpload(f);
                      }}
                    />
                  </label>
                  {coverImageUrl && (
                    <div className="flex items-center gap-3">
                      <img
                        src={coverImageUrl}
                        alt="Cover preview"
                        referrerPolicy="no-referrer"
                        className="w-24 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl('')}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove cover
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Structured Content Blocks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Article Content (Headings, Paragraphs &amp; Images)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => addBlock('heading')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Heading2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Heading</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('paragraph')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Paragraph</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addBlock('image')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Image</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {block.type === 'heading'
                            ? 'Section Heading'
                            : block.type === 'image'
                            ? 'Embedded Image'
                            : 'Paragraph'}
                        </span>
                        <div className="flex items-center gap-1">
                          {(block.type === 'paragraph' || block.type === 'heading') && (
                            <>
                              <button
                                type="button"
                                onClick={() => applyInlineFormatting(block.id, '**')}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Bold (**text**)"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => applyInlineFormatting(block.id, '*')}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Italic (*text*)"
                              >
                                <Italic className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlock(idx, 1)}
                            disabled={idx === blocks.length - 1}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-30 cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {blocks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 cursor-pointer"
                              title="Remove block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {block.type === 'heading' && (
                        <input
                          id={`blog-block-input-${block.id}`}
                          type="text"
                          value={block.text || ''}
                          onChange={(e) =>
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, text: e.target.value } : b
                              )
                            )
                          }
                          placeholder="Section heading..."
                          className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {block.type === 'paragraph' && (
                        <div className="space-y-1">
                          <textarea
                            id={`blog-block-input-${block.id}`}
                            rows={4}
                            value={block.text || ''}
                            onChange={(e) =>
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id ? { ...b, text: e.target.value } : b
                                )
                              )
                            }
                            placeholder="Write your paragraph here... Use **bold** or *italic* for emphasis."
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {block.type === 'image' && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <label className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1.5 cursor-pointer hover:border-blue-400">
                              {uploadingBlockId === block.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {uploadingBlockId === block.id ? 'Uploading...' : 'Upload Image'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingBlockId === block.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleInlineImageUpload(block.id, f);
                                }}
                              />
                            </label>
                            {block.imageUrl && (
                              <img
                                src={block.imageUrl}
                                alt="Inline block"
                                referrerPolicy="no-referrer"
                                className="h-16 w-28 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              />
                            )}
                          </div>
                          <input
                            type="text"
                            value={block.caption || ''}
                            onChange={(e) =>
                              setBlocks((prev) =>
                                prev.map((b) =>
                                  b.id === block.id ? { ...b, caption: e.target.value } : b
                                )
                              )
                            }
                            placeholder="Optional image caption..."
                            className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveArticle('draft')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveArticle('published')}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{editingArticleId ? 'Update & Publish' : 'Publish Article'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
