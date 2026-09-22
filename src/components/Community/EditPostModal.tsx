import React, { useState, useRef } from 'react';
import { Post } from '../../types';
import { useApp } from '../../context/AppContext';
import { UserBadgeItem } from '../ui/UserBadgeItem';
import {
  X,
  Image as ImageIcon,
  Tag,
  Save,
  AlertCircle,
  Upload,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface EditPostModalProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ATTACHMENTS = [
  {
    name: 'Study Group',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'STEM Lab',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Campus Library',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Championship Trophy',
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&auto=format&fit=crop&q=80',
  },
];

export const EditPostModal: React.FC<EditPostModalProps> = ({ post, isOpen, onClose }) => {
  const { updatePost, currentUser } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState(post?.content || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [imageUrl, setImageUrl] = useState(post?.image || '');
  const [showImageInput, setShowImageInput] = useState(Boolean(post?.image));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync when post changes
  React.useEffect(() => {
    if (post) {
      setContent(post.content || '');
      setTags(post.tags || []);
      setImageUrl(post.image || '');
      setShowImageInput(Boolean(post.image));
      setError('');
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be 2MB or less.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setImageUrl(base64);
        setShowImageInput(true);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Post content cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await updatePost(post.id, content.trim(), tags, imageUrl || undefined);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving updated post:', err);
      setError(err?.message || 'Failed to update post. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <div
      id="edit-post-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        id="edit-post-modal-container"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Post</h3>
              <p className="text-[11px] text-slate-400">Update content, tags, or picture attachment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Author Details Preview */}
        <div className="flex items-center gap-3 mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-10 h-10 rounded-full object-cover border border-blue-900/30 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap">
              <UserBadgeItem
                name={post.author.name}
                verified={post.author.verified !== false}
                isPremium={Boolean(post.author.isPremium)}
                membershipTier={post.author.membershipTier || post.author.subscriptionTier}
                equippedBadge={post.author.equippedBadge}
                role={post.author.role}
                isStaffOrAdmin={post.author.isStaffOrAdmin}
                isCommunityManager={post.author.isCommunityManager}
                size="sm"
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {post.author.institution || 'Grobaax Scholar'} • {post.timestamp || 'Published'}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Post Content */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Post Content
            </label>
            <textarea
              id="edit-post-content-input"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What academic insight, question, or Grobaax competition update do you want to share?"
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden resize-none leading-relaxed"
            />
          </div>

          {/* Image Attachment Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> Picture Attachment
              </label>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" /> Upload File (Max 2MB)
                </button>
                {!showImageInput && (
                  <button
                    type="button"
                    onClick={() => setShowImageInput(true)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Add URL
                  </button>
                )}
              </div>
            </div>

            {showImageInput && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    id="edit-post-image-url-input"
                    type="url"
                    placeholder="Paste image URL (https://...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2.5 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-800 font-bold hover:bg-rose-100 cursor-pointer"
                      title="Clear picture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Preset Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                  {PRESET_ATTACHMENTS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[10px] font-semibold transition cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Box */}
            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden max-h-48 border border-slate-200 dark:border-slate-800 bg-slate-950">
                <img
                  src={imageUrl}
                  alt="Post attachment preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                  title="Remove picture"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hashtags</label>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-6">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-xs rounded-full flex items-center gap-1 font-bold"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="edit-post-tag-input"
                type="text"
                placeholder="Add hashtag (e.g. Science, League, UNILAG)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
