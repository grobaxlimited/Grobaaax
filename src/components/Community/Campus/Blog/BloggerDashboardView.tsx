import React, { useEffect, useState } from 'react';
import {
  SchoolBlogArticle,
  SchoolBlogCategory,
  SchoolBlogContentBlock,
  SchoolBloggerAssignment,
} from '../../../../types';
import {
  createSchoolBlogArticle,
  fetchBloggerStudioArticles,
  updateSchoolBlogArticle,
  uploadSchoolBlogImage,
} from '../../../../lib/schoolBlogService';
import { compressProductImage } from '../../../../utils/imageCompressor';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Heading2,
  Image as ImageIcon,
  Loader2,
  PenTool,
  Plus,
  Send,
  Trash2,
  Upload,
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
  const [assignment, setAssignment] = useState<SchoolBloggerAssignment | null>(null);
  const [articles, setArticles] = useState<SchoolBlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Editor State
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
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
      const res = await fetchBloggerStudioArticles();
      if (res.success) {
        setAssignment(res.assignment || null);
        setArticles(res.articles || []);
      } else {
        setError(res.error || 'Could not load Blogger Studio.');
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

  const resetEditor = () => {
    setEditingArticleId(null);
    setTitle('');
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
      ) : mode === 'list' ? (
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
                        {b.text}
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
                      {b.text}
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
                        <textarea
                          rows={4}
                          value={block.text || ''}
                          onChange={(e) =>
                            setBlocks((prev) =>
                              prev.map((b) =>
                                b.id === block.id ? { ...b, text: e.target.value } : b
                              )
                            )
                          }
                          placeholder="Write your paragraph here..."
                          className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
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
