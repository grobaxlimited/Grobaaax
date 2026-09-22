import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NotificationItem } from '../../types';
import { useApp, formatNotificationTime } from '../../context/AppContext';
import {
  Bell,
  X,
  CheckCheck,
  Check,
  GraduationCap,
  Building2,
  Wallet,
  Gift,
  Trophy,
  Swords,
  BookOpen,
  Smartphone,
  ShoppingBag,
  Megaphone,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onSelectNotification: (notification: NotificationItem) => void;
  onMarkAllRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectNotification,
  onMarkAllRead,
  onMarkAsRead,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const displayedNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  if (!isOpen) return null;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'campus':
        return <GraduationCap className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'league':
        return <Building2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case 'wallet':
        return <Wallet className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'reward':
        return <Gift className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case 'gus':
        return <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'dome':
      case 'arena':
        return <Swords className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'academic_library':
      case 'library':
        return <BookOpen className="w-4 h-4 text-teal-500 dark:text-teal-400" />;
      case 'vtu':
        return <Smartphone className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
      case 'minimart':
        return <ShoppingBag className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      case 'hints':
      case 'hint':
        return <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
      case 'system':
        return <ShieldCheck className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#021024] border border-slate-200/90 dark:border-blue-900/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-blue-900/40 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-[#011429]/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  id="notifications-modal-title"
                  className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight"
                >
                  Notifications
                </h3>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20 animate-pulse">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                    All read
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Real-time updates, rewards, dome questions & alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-2.5 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Read all</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer"
              aria-label="Close notifications pop-up"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-[#02142b]/80 border-b border-slate-100 dark:border-blue-950/60 shrink-0 flex items-center gap-2">
          <div className="flex-1 flex items-center p-0.5 bg-slate-200/60 dark:bg-[#011429] rounded-xl text-xs font-bold border border-slate-200 dark:border-blue-950">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                filter === 'unread'
                  ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    filter === 'unread'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/20 text-rose-500'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications Scroll List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 divide-y-0">
          {displayedNotifications && displayedNotifications.length > 0 ? (
            displayedNotifications.map((notif) => {
              const isRead = Boolean(notif.isRead);
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    onSelectNotification(notif);
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 active:scale-[0.99] ${
                    !isRead
                      ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md'
                      : 'bg-white dark:bg-[#011429]/40 border-slate-200/70 dark:border-blue-950/50 opacity-80 hover:opacity-100 hover:border-slate-300 dark:hover:border-blue-900 hover:bg-slate-50/70 dark:hover:bg-[#021833]/60'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 border ${
                      !isRead
                        ? 'bg-blue-100/80 dark:bg-[#04244d] border-blue-300 dark:border-blue-600/50 shadow-xs'
                        : 'bg-slate-100 dark:bg-[#02142b] border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                        )}
                        <h4
                          className={`text-xs sm:text-sm truncate ${
                            !isRead
                              ? 'font-black text-slate-900 dark:text-white'
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {notif.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!isRead ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                            NEW
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                            <Check className="w-3 h-3 text-emerald-500" /> Read
                          </span>
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        !isRead
                          ? 'text-slate-700 dark:text-slate-200 font-medium'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <span className="font-medium">
                        {formatNotificationTime(notif)}
                      </span>

                      <div className="flex items-center gap-2">
                        {(notif.senderInstitution || notif.senderDepartment) && (
                          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate max-w-[160px]">
                            <GraduationCap className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {[
                                notif.senderInstitution,
                                notif.senderFaculty,
                                notif.senderDepartment,
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          </div>
                        )}
                        <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : filter === 'unread' ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20">
                <CheckCheck className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                All caught up!
              </p>
              <p className="text-[11px] text-slate-500">
                You have no unread notifications at this time.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Bell className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                No notifications yet
              </p>
              <p className="text-[11px] text-slate-500">
                System updates, School Dome alerts, and match notifications will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer with quick dismiss for mobile thumb */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#011429]/90 border-t border-slate-100 dark:border-blue-900/40 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {displayedNotifications.length} notification{displayedNotifications.length === 1 ? '' : 's'}
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 dark:bg-blue-950/80 hover:bg-slate-300 dark:hover:bg-blue-900 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
