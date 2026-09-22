import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Post, PostComment } from '../../types';
import { useApp } from '../../context/AppContext';
import { UserBadgeItem } from '../ui/UserBadgeItem';
import {
  X,
  Send,
  Heart,
  MessageSquare,
  CornerDownRight,
  Share2,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Smile,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PostCommentsModalProps {
  post: Post | null;
  onClose: () => void;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({ post, onClose }) => {
  const {
    currentUser,
    addCommentToPost,
    toggleLikeComment,
    deleteComment,
    toggleLikePost,
  } = useApp();

  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{
    commentId: string;
    parentCommentId: string;
    authorName: string;
    authorUsername: string;
  } | null>(null);

  const [sortBy, setSortBy] = useState<'newest' | 'top' | 'oldest'>('newest');
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const isUserAdminOrStaff = Boolean(
    currentUser.role === 'admin' ||
    currentUser.role === 'super_admin' ||
    currentUser.role === 'community_manager' ||
    currentUser.name?.toLowerCase().includes('admin') ||
    currentUser.name?.toLowerCase().includes('manager')
  );

  // Auto-focus input when replying
  useEffect(() => {
    if (replyTarget && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTarget]);

  const rawComments: PostComment[] = post?.commentsList || [];

  // Group top-level comments and child replies
  const { topLevelComments, repliesMap, totalCommentsCount } = useMemo(() => {
    const topLevel: PostComment[] = [];
    const replies: Record<string, PostComment[]> = {};

    rawComments.forEach((c) => {
      if (!c.parentId) {
        topLevel.push(c);
      } else {
        if (!replies[c.parentId]) {
          replies[c.parentId] = [];
        }
        replies[c.parentId].push(c);
      }
    });

    return {
      topLevelComments: topLevel,
      repliesMap: replies,
      totalCommentsCount: rawComments.length,
    };
  }, [rawComments]);

  // Filter and sort top-level comments
  const filteredAndSortedTopComments = useMemo(() => {
    let list = [...topLevelComments];

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter((c) => {
        const matchesSelf =
          c.content.toLowerCase().includes(q) ||
          c.author.name.toLowerCase().includes(q) ||
          c.author.username.toLowerCase().includes(q);
        const childReplies = repliesMap[c.id] || [];
        const matchesChild = childReplies.some(
          (r) =>
            r.content.toLowerCase().includes(q) ||
            r.author.name.toLowerCase().includes(q) ||
            r.author.username.toLowerCase().includes(q)
        );
        return matchesSelf || matchesChild;
      });
    }

    if (sortBy === 'top') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => (a.createdAtMillis || 0) - (b.createdAtMillis || 0));
    } else {
      // Newest
      list.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
    }

    return list;
  }, [topLevelComments, repliesMap, sortBy, searchFilter]);

  if (!post) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentText.trim()) return;

    if (replyTarget) {
      addCommentToPost(
        post.id,
        commentText.trim(),
        replyTarget.parentCommentId,
        {
          name: replyTarget.authorName,
          username: replyTarget.authorUsername,
          commentId: replyTarget.commentId,
        }
      );
      setReplyTarget(null);
    } else {
      addCommentToPost(post.id, commentText.trim(), null, null);
    }

    setCommentText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleThreadCollapse = (commentId: string) => {
    setCollapsedThreads((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleStartReply = (
    commentId: string,
    parentCommentId: string,
    authorName: string,
    authorUsername: string
  ) => {
    setReplyTarget({
      commentId,
      parentCommentId,
      authorName,
      authorUsername,
    });
  };

  const handleCopyPostLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const quickEmojis = ['👏', '🔥', '💡', '🎓', '💯', '📚', '✨', '🧠', '❤️', '👍'];

  return (
    <div
      id="post-threaded-comments-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-[92vh] max-h-[92vh] overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                  Threaded Discussion
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                  {totalCommentsCount} {totalCommentsCount === 1 ? 'response' : 'responses'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Engage in academic discussions, replies, and scholar debate threads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleCopyPostLink}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Share Discussion"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">Share</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Toast for Share */}
        {copiedToast && (
          <div className="absolute top-16 right-6 z-30 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Discussion link copied!</span>
          </div>
        )}

        {/* Scrollable Center Body: Post Details + Threaded Comments */}
        <div
          ref={commentsContainerRef}
          className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scroll-smooth"
        >
          {/* Main Original Post Spotlight */}
          <div className="p-4 sm:p-6 bg-slate-50/70 dark:bg-slate-950/40 space-y-3.5">
            {/* Post Author Bar */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <img
                    src={
                      post.author.avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                    }
                    alt={post.author.name}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover ring-2 ring-blue-500/20 border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                  {post.author.isRepresentative && (
                    <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-amber-500 text-slate-950 text-[8px] font-black uppercase tracking-wider shadow-xs">
                      REP
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <UserBadgeItem
                      name={post.author.name}
                      verified={post.author.verified !== false}
                      isPremium={Boolean(
                        post.author.isPremium ||
                          (post.author.membershipTier &&
                            !post.author.membershipTier.toLowerCase().includes('free'))
                      )}
                      membershipTier={post.author.membershipTier || post.author.subscriptionTier}
                      equippedBadge={post.author.equippedBadge}
                      role={post.author.role}
                      isStaffOrAdmin={post.author.isStaffOrAdmin}
                      isCommunityManager={post.author.isCommunityManager}
                      size="md"
                    />
                    <span className="text-xs text-slate-400 font-medium">
                      @{post.author.username}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {post.author.institution || 'Grobaax Scholar'}
                    </span>
                    {post.author.department && (
                      <>
                        <span>•</span>
                        <span>{post.author.department}</span>
                      </>
                    )}
                    {post.author.level && (
                      <>
                        <span>•</span>
                        <span>{post.author.level}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {post.timestamp}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Content */}
            <p className="text-sm sm:text-base text-slate-900 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap selection:bg-blue-500/20">
              {post.content}
            </p>

            {/* Attached Photo */}
            {post.image && (
              <div className="rounded-2xl overflow-hidden max-h-96 border border-slate-200 dark:border-slate-800 bg-slate-950/20">
                <img
                  src={post.image}
                  alt="Discussion Attachment"
                  className="w-full h-full object-contain max-h-96"
                />
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {post.tags.map((tag) => {
                  const formatted = tag.startsWith('#') ? tag : `#${tag}`;
                  return (
                    <span
                      key={tag}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 rounded-lg"
                    >
                      {formatted}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Engagement Action Strip */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleLikePost(post.id)}
                  className={`flex items-center gap-1.5 font-bold transition px-2.5 py-1.5 rounded-xl cursor-pointer ${
                    post.isLiked
                      ? 'text-rose-500 bg-rose-500/10'
                      : 'hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      post.isLiked ? 'fill-current text-rose-500' : ''
                    }`}
                  />
                  <span>{post.likes} Likes</span>
                </button>

                <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                  <span>{totalCommentsCount} Comments & Replies</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setReplyTarget(null);
                  inputRef.current?.focus();
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Write a response</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Discussion Threads Filter & Controls Bar */}
          <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sort by:
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sortBy === 'newest'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Newest
                </button>
                <button
                  onClick={() => setSortBy('top')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sortBy === 'top'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Top Liked
                </button>
                <button
                  onClick={() => setSortBy('oldest')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sortBy === 'oldest'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Oldest
                </button>
              </div>
            </div>

            {totalCommentsCount > 3 && (
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search in thread..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Comment Threads List */}
          <div className="p-4 sm:p-6 space-y-6">
            {filteredAndSortedTopComments.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center mx-auto shadow-inner">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {searchFilter
                    ? 'No comments match your search'
                    : 'No responses in this thread yet'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {searchFilter
                    ? 'Try adjusting your search keywords or clear the filter.'
                    : 'Be the first scholar to start the conversation! Share your insights below.'}
                </p>
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedTopComments.map((topComment) => {
                const childReplies = repliesMap[topComment.id] || [];
                const isCollapsed = collapsedThreads[topComment.id];
                const canDeleteTop =
                  currentUser.id === topComment.author.username ||
                  currentUser.name === topComment.author.name ||
                  isUserAdminOrStaff;

                return (
                  <div
                    key={topComment.id}
                    id={`comment-thread-${topComment.id}`}
                    className="space-y-3 group"
                  >
                    {/* Top Level Comment Item */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5 transition hover:border-slate-300 dark:hover:border-slate-600">
                      {/* Comment Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <img
                            src={
                              topComment.author.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                            }
                            alt={topComment.author.name}
                            className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                          />
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <UserBadgeItem
                                name={topComment.author.name}
                                verified={topComment.author.verified !== false}
                                isPremium={Boolean(
                                  topComment.author.isPremium ||
                                    (topComment.author.membershipTier &&
                                      !topComment.author.membershipTier
                                        .toLowerCase()
                                        .includes('free'))
                                )}
                                membershipTier={
                                  topComment.author.membershipTier ||
                                  topComment.author.subscriptionTier
                                }
                                equippedBadge={topComment.author.equippedBadge}
                                role={topComment.author.role}
                                isStaffOrAdmin={topComment.author.isStaffOrAdmin}
                                isCommunityManager={topComment.author.isCommunityManager}
                                size="sm"
                              />
                              <span className="text-[11px] text-slate-400 font-medium">
                                @{topComment.author.username}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{topComment.author.institution}</span>
                              {topComment.author.department && (
                                <>
                                  <span>•</span>
                                  <span>{topComment.author.department}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{topComment.timestamp}</span>
                            </div>
                          </div>
                        </div>

                        {canDeleteTop && (
                          <button
                            onClick={() => deleteComment(post.id, topComment.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition cursor-pointer"
                            title="Delete Comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Comment Content */}
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pl-10">
                        {topComment.content}
                      </p>

                      {/* Comment Actions Bar */}
                      <div className="flex items-center gap-3 pl-10 pt-1 text-xs">
                        <button
                          onClick={() => toggleLikeComment(post.id, topComment.id)}
                          className={`flex items-center gap-1.5 font-bold transition px-2 py-1 rounded-lg cursor-pointer ${
                            topComment.isLiked
                              ? 'text-rose-500 bg-rose-500/10'
                              : 'text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              topComment.isLiked ? 'fill-current text-rose-500' : ''
                            }`}
                          />
                          <span>{topComment.likes || 0}</span>
                        </button>

                        <button
                          onClick={() =>
                            handleStartReply(
                              topComment.id,
                              topComment.id,
                              topComment.author.name,
                              topComment.author.username
                            )
                          }
                          className="flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          <span>Reply</span>
                        </button>

                        {childReplies.length > 0 && (
                          <button
                            onClick={() => toggleThreadCollapse(topComment.id)}
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-extrabold px-2 py-1 rounded-lg hover:bg-blue-500/10 transition cursor-pointer ml-auto"
                          >
                            {isCollapsed ? (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>
                                  Show {childReplies.length}{' '}
                                  {childReplies.length === 1 ? 'reply' : 'replies'}
                                </span>
                              </>
                            ) : (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Hide replies</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Child Replies Thread Branch */}
                    {childReplies.length > 0 && !isCollapsed && (
                      <div className="border-l-2 border-blue-500/30 dark:border-blue-400/25 pl-3 sm:pl-5 ml-3 sm:ml-5 space-y-3">
                        {childReplies.map((reply) => {
                          const canDeleteChild =
                            currentUser.id === reply.author.username ||
                            currentUser.name === reply.author.name ||
                            isUserAdminOrStaff;

                          return (
                            <div
                              key={reply.id}
                              id={`comment-reply-${reply.id}`}
                              className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2 group/reply hover:border-slate-300 dark:hover:border-slate-600 transition"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5">
                                  <img
                                    src={
                                      reply.author.avatar ||
                                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                                    }
                                    alt={reply.author.name}
                                    className="w-7 h-7 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                                  />
                                  <div className="space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <UserBadgeItem
                                        name={reply.author.name}
                                        verified={reply.author.verified !== false}
                                        isPremium={Boolean(
                                          reply.author.isPremium ||
                                            (reply.author.membershipTier &&
                                              !reply.author.membershipTier
                                                .toLowerCase()
                                                .includes('free'))
                                        )}
                                        membershipTier={
                                          reply.author.membershipTier ||
                                          reply.author.subscriptionTier
                                        }
                                        equippedBadge={reply.author.equippedBadge}
                                        role={reply.author.role}
                                        isStaffOrAdmin={reply.author.isStaffOrAdmin}
                                        isCommunityManager={reply.author.isCommunityManager}
                                        size="xs"
                                      />
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        @{reply.author.username}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                      <span>{reply.author.institution}</span>
                                      <span>•</span>
                                      <span>{reply.timestamp}</span>
                                    </div>
                                  </div>
                                </div>

                                {canDeleteChild && (
                                  <button
                                    onClick={() => deleteComment(post.id, reply.id)}
                                    className="opacity-0 group-hover/reply:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded-lg transition cursor-pointer"
                                    title="Delete Reply"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* Replying To Tag & Content */}
                              <div className="pl-9 space-y-1.5">
                                {reply.replyTo && (
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                                    <span>Replying to</span>
                                    <span className="font-extrabold">
                                      @{reply.replyTo.username}
                                    </span>
                                  </div>
                                )}
                                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {reply.content}
                                </p>

                                {/* Child Reply Actions */}
                                <div className="flex items-center gap-3 pt-1 text-xs">
                                  <button
                                    onClick={() => toggleLikeComment(post.id, reply.id)}
                                    className={`flex items-center gap-1 font-bold transition px-2 py-0.5 rounded-lg cursor-pointer ${
                                      reply.isLiked
                                        ? 'text-rose-500 bg-rose-500/10'
                                        : 'text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    <Heart
                                      className={`w-3 h-3 ${
                                        reply.isLiked ? 'fill-current text-rose-500' : ''
                                      }`}
                                    />
                                    <span>{reply.likes || 0}</span>
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleStartReply(
                                        reply.id,
                                        topComment.id,
                                        reply.author.name,
                                        reply.author.username
                                      )
                                    }
                                    className="flex items-center gap-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  >
                                    <CornerDownRight className="w-3 h-3" />
                                    <span>Reply</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Thread Composer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-4 shrink-0 space-y-2.5 z-10">
          {/* Active Reply Banner */}
          {replyTarget && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 animate-in fade-in slide-in-from-bottom-1">
              <div className="flex items-center gap-2">
                <CornerDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Replying directly to{' '}
                  <strong className="font-extrabold">{replyTarget.authorName}</strong>{' '}
                  <span className="text-blue-500">(@{replyTarget.authorUsername})</span>
                </span>
              </div>
              <button
                onClick={() => setReplyTarget(null)}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400 transition cursor-pointer"
                title="Cancel reply"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Emoji Bar */}
          {showEmojiPicker && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar animate-in fade-in">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCommentText((prev) => prev + emoji)}
                  className="px-2.5 py-1 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500/20 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Main Input Composer Form */}
          <form onSubmit={handleSend} className="flex items-end gap-2 sm:gap-3">
            <img
              src={
                currentUser.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
              }
              alt={currentUser.name}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 hidden sm:block mb-0.5"
            />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  replyTarget
                    ? `Reply to @${replyTarget.authorUsername}...`
                    : 'Share your scholar insight or question in this thread... (Press Enter to post)'
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition resize-none min-h-[44px] max-h-32"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0 mb-0.5">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-2 rounded-xl transition cursor-pointer ${
                  showEmojiPicker
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Insert Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 hover:from-blue-900 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm rounded-2xl flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-blue-950/30"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {replyTarget ? 'Reply' : 'Respond'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
