import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  sendBroadcastNotificationToFirestore,
  deleteNotificationFromFirestore,
} from '../../lib/firebase';
import { NotificationItem } from '../../types';
import { NotificationDetailModal } from '../Navigation/NotificationDetailModal';
import {
  Bell,
  Send,
  Trash2,
  Eye,
  CheckCircle2,
  Sparkles,
  Swords,
  Trophy,
  Building2,
  Wallet,
  ShieldAlert,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

export function AdminNotificationsView() {
  const { notifications, firebaseUser, currentUser, setAdminActiveTab } = useApp();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'announcement' | 'dome' | 'gus' | 'league' | 'wallet' | 'system'>('announcement');
  const [targetRole, setTargetRole] = useState('ALL');
  const [targetUserId, setTargetUserId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMsg, setSentMsg] = useState(false);
  const [previewNotif, setPreviewNotif] = useState<NotificationItem | null>(null);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    try {
      await sendBroadcastNotificationToFirestore(
        {
          title: title.trim(),
          message: message.trim(),
          type,
          targetRole: targetUserId.trim() ? undefined : targetRole,
          targetUserId: targetUserId.trim() ? targetUserId.trim() : undefined,
          userId: targetUserId.trim() ? targetUserId.trim() : undefined,
        },
        firebaseUser?.uid || currentUser.id,
        currentUser.name || 'Grobaax Super Admin'
      );
      setSentMsg(true);
      setTitle('');
      setMessage('');
      setTargetUserId('');
      setTimeout(() => setSentMsg(false), 4000);
    } catch (err) {
      console.error('Error sending notification:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Are you sure you want to retract/delete this notification?')) return;
    try {
      await deleteNotificationFromFirestore(
        id,
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotifIcon = (t: string) => {
    switch (t) {
      case 'dome':
      case 'arena':
        return <Swords className="w-4 h-4 text-blue-400" />;
      case 'gus':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'league':
        return <Building2 className="w-4 h-4 text-emerald-400" />;
      case 'wallet':
        return <Wallet className="w-4 h-4 text-blue-400" />;
      case 'system':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'academic_library':
      case 'library':
      case 'past_question':
        return <BookOpen className="w-4 h-4 text-teal-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-blue-950/40">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-blue-400" /> Notifications & Broadcast Dispatcher
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Dispatch authoritative push & system broadcast notifications directly to scholars and representatives.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-950/40 border border-blue-800/50 px-3 py-1.5 rounded-xl text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-blue-100">Live Firebase Synchronization Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dispatch Form (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" /> Dispatch New Broadcast
          </h2>

          {sentMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Notification broadcasted successfully to all platform users!
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Broadcast Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'announcement', label: 'Announcement', icon: Sparkles },
                  { id: 'league', label: 'League', icon: Building2 },
                  { id: 'gus', label: 'GUS Arena', icon: Trophy },
                  { id: 'dome', label: 'Arena Match', icon: Swords },
                  { id: 'wallet', label: 'Wallet/GP', icon: Wallet },
                  { id: 'system', label: 'Security/System', icon: ShieldAlert },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as any)}
                    className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      type === item.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Target Scholar Audience
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                disabled={Boolean(targetUserId.trim())}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium disabled:opacity-50"
              >
                <option value="ALL">All Users & Scholars</option>
                <option value="student">Undergraduate & College Scholars</option>
                <option value="representative">Official Institution Representatives</option>
                <option value="admin">Administrative Managers Only</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Target Specific Scholar (Optional User ID / Username)
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Leave blank for group broadcast, or enter User A ID / @scholar"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              />
              {targetUserId.trim() && (
                <p className="text-[10px] text-blue-500 font-semibold mt-1">
                  🎯 This notification will only appear to scholar: {targetUserId.trim()}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Notification Headline / Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Official Institutional League Kickoff Announced"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Full Notification Message *
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write the complete broadcast message details sent by the administrator..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white rounded-xl font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Broadcasting to Firebase...' : 'Send Broadcast Notification'}</span>
            </button>
          </form>
        </div>

        {/* Live Broadcasts Feed & History (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" /> Active Platform Broadcasts ({notifications.length})
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Click item to test student message view</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications && notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 flex items-start justify-between gap-3 hover:border-blue-400 dark:hover:border-blue-600 transition"
                >
                  <div
                    onClick={() => setPreviewNotif(notif)}
                    className="flex items-start gap-3 flex-1 cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {notif.type}
                        </span>
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {notif.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 pt-0.5">
                        <span>🕒 {notif.timestamp}</span>
                        <span>•</span>
                        <span className="text-blue-500 font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Click to view full modal
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    {(notif.type === 'academic_library' || notif.actionUrl?.includes('library')) && (
                      <button
                        onClick={() => setAdminActiveTab('library')}
                        title="Review in Vault"
                        className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-[11px] flex items-center gap-1 transition shadow-xs cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Vault</span>
                      </button>
                    )}
                    <button
                      onClick={() => setPreviewNotif(notif)}
                      title="Preview Notification Modal"
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      title="Delete / Retract Notification"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="font-bold">No active notifications</p>
                <p className="text-slate-500">Dispatch your first broadcast using the form on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Preview Modal */}
      {previewNotif && (
        <NotificationDetailModal
          notification={previewNotif}
          onClose={() => setPreviewNotif(null)}
        />
      )}
    </div>
  );
}

