import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Announcement } from '../../types';
import { AdminMinimartManager } from '../Admin/AdminMinimartManager';
import {
  ShieldAlert,
  Megaphone,
  ShoppingBag,
  Trash2,
  Pin,
  Clock,
  Plus,
} from 'lucide-react';

export const AdminCommunityManager: React.FC = () => {
  const {
    announcements,
    minimartProducts,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    scheduleAnnouncement,
    unpublishAnnouncement,
    pinAnnouncement,
  } = useApp();

  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'minimart' | 'announcements'>('minimart');

  // Announcement Modal State
  const [isAnnounceModalOpen, setIsAnnounceModalOpen] = useState(false);
  const [editingAnnounce, setEditingAnnounce] = useState<Announcement | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annCategory, setAnnCategory] = useState<Announcement['category']>('Official');
  const [annPriority, setAnnPriority] = useState<Announcement['priority']>('Medium');
  const [annContent, setAnnContent] = useState('');

  const handleOpenAnnounceModal = (ann?: Announcement) => {
    if (ann) {
      setEditingAnnounce(ann);
      setAnnTitle(ann.title);
      setAnnCategory(ann.category);
      setAnnPriority(ann.priority || 'Medium');
      setAnnContent(ann.content);
    } else {
      setEditingAnnounce(null);
      setAnnTitle('');
      setAnnCategory('Official');
      setAnnPriority('Medium');
      setAnnContent('');
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
      });
    } else {
      addAnnouncement({
        title: annTitle,
        category: annCategory,
        priority: annPriority,
        content: annContent,
        author: 'Grobaax Central Intelligence',
        authorRole: 'Administrator',
        authorAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        important: annPriority === 'High' || annPriority === 'Urgent',
        status: 'Published',
      });
    }
    setIsAnnounceModalOpen(false);
  };

  return (
    <div className="space-y-6 bg-slate-900/90 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Community Admin Operations</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage minimart student marketplace listings and publish official platform broadcasts.
          </p>
        </div>

        {/* Subtab Toggle */}
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveAdminSubTab('minimart')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeAdminSubTab === 'minimart'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Minimart ({(minimartProducts || []).filter(p => p.status !== 'removed').length})</span>
          </button>
          <button
            onClick={() => setActiveAdminSubTab('announcements')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeAdminSubTab === 'announcements'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Announcements Control
          </button>
        </div>
      </div>

      {/* SUBTAB: MINIMART MODERATION */}
      {activeAdminSubTab === 'minimart' && (
        <div className="animate-in fade-in duration-150">
          <AdminMinimartManager />
        </div>
      )}

      {/* SUBTAB: ANNOUNCEMENTS MODERATION */}
      {activeAdminSubTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>Published Announcements ({(announcements || []).length})</span>
            </h3>
            <button
              onClick={() => handleOpenAnnounceModal()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Announcement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(announcements || []).map(ann => (
              <div
                key={ann.id}
                className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-800 text-slate-300">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{ann.date}</span>
                  </div>

                  <h4 className="font-bold text-sm text-white">{ann.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-3">{ann.content}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <span>By: {ann.author}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Pin/Unpin */}
                    <button
                      onClick={() => pinAnnouncement(ann.id)}
                      className={`p-1.5 rounded transition ${
                        ann.isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={ann.isPinned ? 'Unpin' : 'Pin to Top'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Publish/Unpublish status */}
                    {ann.status === 'Published' ? (
                      <button
                        onClick={() => unpublishAnnouncement(ann.id)}
                        className="px-2 py-1 text-[10px] font-semibold bg-rose-500/10 text-rose-400 rounded hover:bg-rose-500/20"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => publishAnnouncement(ann.id)}
                        className="px-2 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20"
                      >
                        Publish Now
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded transition"
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

      {/* Announcement Modal */}
      {isAnnounceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingAnnounce ? 'Edit Announcement' : 'New Platform Announcement'}
            </h3>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. System Maintenance & Season 2 Launch"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={annCategory}
                    onChange={e => setAnnCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="Official">Official</option>
                    <option value="League Rule">League Rule</option>
                    <option value="Grant Opportunity">Grant Opportunity</option>
                    <option value="System Update">System Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={annPriority}
                    onChange={e => setAnnPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Content Body</label>
                <textarea
                  rows={5}
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Detailed announcement text..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnnounceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
