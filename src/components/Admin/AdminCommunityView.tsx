import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Announcement,
  ChatroomLiveMessage,
} from '../../types';
import { ChatroomMessageItem } from '../Community/ChatroomLive/ChatroomMessageItem';
import { ChatroomComposer } from '../Community/ChatroomLive/ChatroomComposer';
import { CreateLiveQuestionModal } from '../Community/ChatroomLive/CreateLiveQuestionModal';
import { AdminMinimartManager } from './AdminMinimartManager';
import {
  MessageSquare,
  ShoppingBag,
  Megaphone,
  Shield,
  Search,
  Plus,
  Trash2,
  Pin,
  Volume2,
  VolumeX,
  X,
  Edit3,
  Hash,
  Flame,
} from 'lucide-react';

interface AdminCommunityViewProps {
  defaultSubTab?: 'chatroom' | 'minimart' | 'announcements';
}

export const AdminCommunityView: React.FC<AdminCommunityViewProps> = ({
  defaultSubTab = 'chatroom',
}) => {
  const {
    currentUser,
    userProfile,
    announcements,
    minimartProducts,
    chatroomMessages,
    sendChatroomMessage,
    deleteChatroomMessage,
    reactChatroomMessage,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    pinAnnouncement,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'chatroom' | 'minimart' | 'announcements'>(defaultSubTab);

  // -------------------------------------------------------------
  // 1. CHATROOM LIVE STATE & HANDLERS
  // -------------------------------------------------------------
  const [chatSearch, setChatSearch] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [replyTarget, setReplyTarget] = useState<ChatroomLiveMessage | null>(null);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSubTab === 'chatroom') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatroomMessages.length, activeSubTab]);

  // Admin post message to Live Chatroom
  const handleAdminSendMessage = async (text: string, replyTo?: ChatroomLiveMessage['replyTo']) => {
    const managerName = userProfile?.name || currentUser?.name || 'Community Manager';
    const managerId = userProfile?.id || currentUser?.id || 'mgr_admin';

    const newMessage: ChatroomLiveMessage = {
      id: 'msg_adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: managerId,
      userName: `${managerName} 🛡️`,
      userAvatar:
        userProfile?.avatar ||
        currentUser?.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Community Management',
      department: 'Head Moderator',
      level: 'Admin',
      isPremium: true,
      membershipTier: 'VIP SCHOLAR',
      equippedBadge: (currentUser as any)?.equippedBadge || (userProfile as any)?.equippedBadge,
      messageText: text,
      timestamp: Date.now(),
      type: 'normal',
      replyTo,
      reactions: {},
    };

    try {
      await sendChatroomMessage(newMessage);
    } catch (err) {
      console.warn('Admin chatroom send notice:', err);
    }
  };

  const handleAdminDeleteMessage = async (msgId: string) => {
    try {
      await deleteChatroomMessage(msgId);
    } catch (err) {
      console.warn('Admin delete message notice:', err);
    }
  };

  const handleAdminReactMessage = async (msgId: string, emoji: string) => {
    try {
      await reactChatroomMessage(msgId, emoji);
    } catch (err) {
      console.warn('Admin react message notice:', err);
    }
  };

  const filteredChatMessages = chatroomMessages.filter(m => {
    if (!chatSearch) return true;
    const q = chatSearch.toLowerCase();
    return (
      m.messageText.toLowerCase().includes(q) ||
      m.userName.toLowerCase().includes(q) ||
      m.institution?.toLowerCase().includes(q)
    );
  });

  // -------------------------------------------------------------
  // 2. ANNOUNCEMENTS STATE & HANDLERS
  // -------------------------------------------------------------
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [editingAnnounce, setEditingAnnounce] = useState<Announcement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState<Announcement['category']>('Official');
  const [annPriority, setAnnPriority] = useState<Announcement['priority']>('Medium');
  const [annContent, setAnnContent] = useState('');
  const [annIsPinned, setAnnIsPinned] = useState(false);

  const handleOpenAnnounceModal = (ann?: Announcement) => {
    if (ann) {
      setEditingAnnounce(ann);
      setAnnTitle(ann.title);
      setAnnCategory(ann.category);
      setAnnPriority(ann.priority || 'Medium');
      setAnnContent(ann.content);
      setAnnIsPinned(Boolean(ann.isPinned));
    } else {
      setEditingAnnounce(null);
      setAnnTitle('');
      setAnnCategory('Official');
      setAnnPriority('Medium');
      setAnnContent('');
      setAnnIsPinned(false);
    }
    setIsAnnounceModalOpen(true);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    if (editingAnnounce) {
      updateAnnouncement(editingAnnounce.id, {
        title: annTitle,
        category: annCategory,
        priority: annPriority,
        content: annContent,
        isPinned: annIsPinned,
      });
    } else {
      addAnnouncement({
        title: annTitle,
        category: annCategory,
        priority: annPriority,
        content: annContent,
        isPinned: annIsPinned,
        author: userProfile?.name || currentUser?.name || 'Community Manager',
        authorRole: 'Community Manager',
        authorAvatar:
          userProfile?.avatar ||
          currentUser?.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        important: annPriority === 'High' || annPriority === 'Urgent',
        status: 'Published',
      });
    }
    setIsAnnounceModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. MASTER HEADER & SUB-NAVIGATION */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Community & Chatroom Operations</h1>
          </div>
          <p className="text-xs sm:text-sm text-blue-200 mt-1">
            Real-time chatroom moderation, minimart management, and official platform broadcasts.
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
          {/* Chatroom Live Tab */}
          <button
            onClick={() => setActiveSubTab('chatroom')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'chatroom'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Chatroom Live</span>
          </button>

          {/* Minimart Marketplace Tab */}
          <button
            onClick={() => setActiveSubTab('minimart')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'minimart'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Minimart ({(minimartProducts || []).filter(p => p.status !== 'removed').length})</span>
          </button>

          {/* Official Announcements Tab */}
          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'announcements'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements ({(announcements || []).length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHATROOM LIVE (DISCORD-STYLE REAL-TIME MODERATION & POSTING)       */}
      {/* ========================================================================= */}
      {activeSubTab === 'chatroom' && (
        <div className="w-full animate-in fade-in duration-150">
          {/* Main Live Discord Chat Window */}
          <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[640px] max-h-[960px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Top Discord Channel Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-slate-400" />
                <span className="font-bold text-slate-900 dark:text-white text-base">live-chat</span>
                <span className="text-xs text-slate-400 hidden sm:inline">| Community Chat Stream</span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ml-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Live Active Feed</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Launch Live Q&A Question Challenge Button */}
                <button
                  type="button"
                  onClick={() => setIsCreateQuestionModalOpen(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-amber-300"
                  title="Launch Live Q&A Question Challenge"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Launch Live Q&A</span>
                </button>

                {/* Search Bar */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search chat..."
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    className="w-32 sm:w-48 pl-8 pr-3 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  {chatSearch && (
                    <button
                      onClick={() => setChatSearch('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Sound Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Message Stream */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 bg-slate-50/50 dark:bg-slate-950/40"
            >
              {filteredChatMessages.map(msg => (
                <ChatroomMessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={userProfile?.id || currentUser?.id || 'admin_user'}
                  isManagerOrAdmin={true}
                  onReply={m => setReplyTarget(m)}
                  onDelete={handleAdminDeleteMessage}
                  onReact={handleAdminReactMessage}
                />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Discord Bottom Composer with Manager Badge */}
            <div className="bg-amber-500/10 dark:bg-amber-500/5 px-4 py-1.5 border-t border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <span className="font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Posting as: <strong className="text-amber-600 dark:text-amber-400">{userProfile?.name || currentUser?.name || 'Community Manager'} [Community Manager 🛡️]</strong></span>
              </span>
              <span className="text-[10px] text-slate-400">Posts render with official Community Manager badge for all scholars</span>
            </div>

            <ChatroomComposer
              onSendMessage={handleAdminSendMessage}
              replyToMessage={replyTarget}
              onCancelReply={() => setReplyTarget(null)}
              channelName="live-chat"
              tierName="admin"
              isManagerOrAdmin={true}
              onOpenCreateQuestion={() => setIsCreateQuestionModalOpen(true)}
            />
          </div>

          {/* Admin Live Question Modal */}
          {isCreateQuestionModalOpen && (
            <CreateLiveQuestionModal
              isOpen={isCreateQuestionModalOpen}
              onClose={() => setIsCreateQuestionModalOpen(false)}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MINIMART STUDENT MARKETPLACE MODERATION & CATEGORIES               */}
      {/* ========================================================================= */}
      {activeSubTab === 'minimart' && (
        <div className="animate-in fade-in duration-150">
          <AdminMinimartManager />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OFFICIAL ANNOUNCEMENTS (CREATE & PUBLISH TO COMMUNITY HUB)          */}
      {/* ========================================================================= */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Official Broadcasts & Grants</h3>
              <p className="text-xs text-slate-400">
                Announcements created here appear instantly with official Community Manager designation.
              </p>
            </div>

            <button
              onClick={() => handleOpenAnnounceModal()}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-blue-700 hover:from-amber-400 hover:to-blue-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Announcement</span>
            </button>
          </div>

          {/* Announcements Grid */}
          <div className="space-y-4">
            {(announcements || []).map(ann => (
              <div
                key={ann.id}
                className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all space-y-3 relative overflow-hidden ${
                  ann.isPinned
                    ? 'border-amber-500/50 dark:border-amber-500/40 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {ann.isPinned && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 px-3 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-current" /> PINNED ANNOUNCEMENT
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg">
                    {ann.category}
                  </span>
                  {ann.priority && (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                        ann.priority === 'Urgent' || ann.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {ann.priority} Priority
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">{ann.date}</span>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{ann.title}</h3>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>

                {/* Footer: Author & Moderation Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={ann.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                      alt={ann.author}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-400"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {ann.author} <span className="text-amber-500 font-normal">({ann.authorRole || 'Community Manager'})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Pin / Unpin */}
                    <button
                      onClick={() => pinAnnouncement(ann.id)}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        ann.isPinned
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={ann.isPinned ? 'Unpin' : 'Pin to Top'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleOpenAnnounceModal(ann)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete announcement "${ann.title}"?`)) {
                          deleteAnnouncement(ann.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT ANNOUNCEMENT                                         */}
      {/* ========================================================================= */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                <span>{editingAnnounce ? 'Edit Announcement' : 'Post Official Announcement'}</span>
              </h2>
              <button
                onClick={() => setIsAnnounceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Published announcements display directly on the scholar Community Hub under the <strong>Announcements</strong> tab with the official <strong>Community Manager 🛡️</strong> badge.
            </p>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. ₦10,000,000 Academic Research Grants & Season 2 Launch"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={annCategory}
                    onChange={e => setAnnCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="Official">Official</option>
                    <option value="League Rule">League Rule</option>
                    <option value="Grant Opportunity">Grant Opportunity</option>
                    <option value="System Update">System Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={annPriority}
                    onChange={e => setAnnPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Content Body
                </label>
                <textarea
                  rows={6}
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Detailed announcement content with instructions, eligibility, and links..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinAnnouncement"
                  checked={annIsPinned}
                  onChange={e => setAnnIsPinned(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pinAnnouncement" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Pin to top of student announcements feed
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnnounceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-blue-700 hover:from-amber-400 hover:to-blue-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition"
                >
                  {editingAnnounce ? 'Update Announcement' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
