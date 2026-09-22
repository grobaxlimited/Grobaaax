import React, { useState, useMemo } from 'react';
import { useApp, sortNotificationsNewestFirst, formatNotificationTime } from '../../context/AppContext';
import { useDevicePlatform } from '../../hooks/useDevicePlatform';
import { WalletButton } from '../Wallet/WalletButton';
import { NotificationBadge } from '../ui/NotificationBadge';
import { NotificationDetailModal } from './NotificationDetailModal';
import { AdvertisementTicker } from '../ui/AdvertisementTicker';
import { PRIMARY_SUPER_ADMIN_UID, NotificationItem } from '../../types';
import {
  Home,
  Building2,
  Trophy,
  Users,
  ShieldCheck,
  Bell,
  CheckCheck,
  Check,
  X,
  BookOpen,
  Sparkles,
  Wallet,
  Search,
  Swords,
  ShoppingBag,
  Gift,
  Smartphone,
  Shield,
  Megaphone,
  Lightbulb,
  GraduationCap,
} from 'lucide-react';

interface TopNavigationProps {
  onOpenAdminPanel?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ onOpenAdminPanel }) => {
  const {
    activeTab,
    setActiveTab,
    sectionNotifications,
    adminSectionNotifications,
    clearSectionNotification,
    currentUser,
    firebaseUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    openWalletModal,
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const { isIOS } = useDevicePlatform();

  const isSuperOrAdmin =
    firebaseUser?.uid === PRIMARY_SUPER_ADMIN_UID ||
    firebaseUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.email === 'grobaxycompany@gmail.com' ||
    firebaseUser?.email === 'basmock@gmail.com' ||
    currentUser?.email === 'basmock@gmail.com' ||
    currentUser?.role === 'admin' ||
    Boolean((currentUser as any)?.managerRole);

  const sortedNotifs = useMemo(() => {
    return sortNotificationsNewestFirst(notifications || []);
  }, [notifications]);

  const unreadCount = sortedNotifs.filter((n) => !n.isRead).length;

  const displayedNotifs = useMemo(() => {
    if (notifFilter === 'unread') {
      return sortedNotifs.filter((n) => !n.isRead);
    }
    return sortedNotifs;
  }, [sortedNotifs, notifFilter]);
  const adminTotalUnread: number = Object.values(adminSectionNotifications || {}).reduce<number>(
    (a, b) => a + Number(b || 0),
    0
  );

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, badgeKey: 'home' },
    { id: 'daily_qa', label: 'Daily GP Grab', icon: Trophy, badgeKey: 'daily_qa' },
    { id: 'school_dome', label: 'School Dome', icon: Swords, badgeKey: 'school_dome' },
    { id: 'hints', label: 'Hints', icon: Lightbulb, badgeKey: 'hints' },
    { id: 'library', label: 'Library', icon: BookOpen, badgeKey: 'library' },
    { id: 'community', label: 'Community', icon: Users, badgeKey: 'community' },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId as any);
    if (clearSectionNotification) {
      clearSectionNotification(tabId);
      if (tabId === 'daily_qa') {
        clearSectionNotification('chatroom');
      }
      if (tabId === 'school_dome') {
        clearSectionNotification('school_dome');
        clearSectionNotification('school_dome_results');
      }
      if (tabId === 'hints') {
        clearSectionNotification('hints');
      }
    }
  };

  const handleMarkAllRead = () => {
    if (markAllNotificationsRead) {
      markAllNotificationsRead();
    } else if (notifications && markNotificationRead) {
      notifications.forEach((n) => {
        if (!n.isRead) markNotificationRead(n.id);
      });
    }
  };

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

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-950/95 border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs backdrop-blur-xl transition-colors"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Top Header Row */}
          <div className="h-14 flex items-center justify-between gap-2 sm:gap-3">
            {/* Left Section: On iPhone/iOS, shows Brand Mark. On Android/Desktop, keeps Top Navigation */}
            {isIOS ? (
              <div className="flex items-center gap-2 select-none">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-950 via-blue-900 to-blue-800 border border-blue-700/50 flex items-center justify-center text-white font-black text-sm shadow-md">
                  G
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                    GROBAAX
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    ARENA
                  </span>
                </div>
              </div>
            ) : (
              <nav className="flex items-center gap-1 sm:gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const badgeCount = (sectionNotifications && sectionNotifications[item.badgeKey]) || 0;

                  return (
                    <button
                      key={item.id}
                      id={`nav-tab-${item.id}`}
                      onClick={() => handleTabClick(item.id)}
                      title={item.label}
                      className={`relative p-2 sm:px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 justify-center cursor-pointer ${
                        isActive
                          ? 'bg-blue-900 text-white shadow-md shadow-blue-950/30 border border-blue-700/50'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                      <span className="hidden md:inline text-xs font-bold whitespace-nowrap">
                        {item.label}
                      </span>
                      
                      {badgeCount > 0 && (
                        <NotificationBadge
                          count={badgeCount}
                          className="absolute -top-1 -right-1 shadow-sm"
                        />
                      )}

                      {isActive && (
                        <span className="absolute bottom-0 left-1.5 right-1.5 h-0.5 bg-blue-400 dark:bg-blue-400 rounded-full shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </nav>
            )}

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {isSuperOrAdmin && onOpenAdminPanel && (
              <button
                id="header-open-admin-btn"
                onClick={onOpenAdminPanel}
                className="relative px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:from-blue-900 hover:to-blue-700 border border-blue-700/40 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Admin Panel</span>
                {adminTotalUnread > 0 && (
                  <NotificationBadge
                    count={adminTotalUnread}
                    className="ml-1"
                  />
                )}
              </button>
            )}

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                title="Notifications"
                className={`relative p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition cursor-pointer flex items-center justify-center ${
                  isNotificationsOpen ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-xs"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] rounded-2xl bg-white dark:bg-[#021024] border border-slate-200 dark:border-blue-900/60 shadow-2xl z-[999] p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-blue-900/50">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-500" />
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          Notifications
                        </h4>
                        {unreadCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20">
                            {unreadCount} new
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                            All read
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            title="Mark all notifications as read"
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Read all
                          </button>
                        )}
                        <button
                          onClick={() => setIsNotificationsOpen(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick filter tabs: All vs Unread */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-[#011429]/80 rounded-xl text-xs font-bold border border-slate-200/50 dark:border-blue-950/60">
                      <button
                        onClick={() => setNotifFilter('all')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer ${
                          notifFilter === 'all'
                            ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        All ({sortedNotifs.length})
                      </button>
                      <button
                        onClick={() => setNotifFilter('unread')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          notifFilter === 'unread'
                            ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Unread</span>
                        {unreadCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            notifFilter === 'unread'
                              ? 'bg-rose-500 text-white'
                              : 'bg-rose-500/20 text-rose-500'
                          }`}>
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {displayedNotifs && displayedNotifs.length > 0 ? (
                        displayedNotifs.map((notif) => {
                          const isRead = Boolean(notif.isRead);
                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (markNotificationRead) markNotificationRead(notif.id);
                                setSelectedNotification({ ...notif, isRead: true });
                                setIsNotificationsOpen(false);
                              }}
                              className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                                !isRead
                                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/60 shadow-xs hover:border-blue-500'
                                  : 'bg-slate-50/50 dark:bg-[#011429]/40 border-slate-200/60 dark:border-blue-950/40 opacity-75 hover:opacity-100 hover:border-slate-300 dark:hover:border-blue-900'
                              }`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 border ${
                                !isRead
                                  ? 'bg-blue-100/60 dark:bg-[#04244d] border-blue-300 dark:border-blue-600/50 shadow-xs'
                                  : 'bg-slate-100/60 dark:bg-[#02142b] border-slate-200 dark:border-slate-800'
                              }`}>
                                {getNotifIcon(notif.type)}
                              </div>

                              <div className="flex-1 space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {!isRead && (
                                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                                    )}
                                    <h5 className={`text-xs truncate ${!isRead ? 'font-black text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                      {notif.title}
                                    </h5>
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

                                <p className={`text-[11px] leading-relaxed line-clamp-2 ${!isRead ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                                  {notif.message}
                                </p>

                                <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                  <span className="font-medium">
                                    {formatNotificationTime(notif)}
                                  </span>
                                  {(notif.senderInstitution || notif.senderDepartment) && (
                                    <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate max-w-[150px]">
                                      <GraduationCap className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {[notif.senderInstitution, notif.senderFaculty, notif.senderDepartment].filter(Boolean).join(' • ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : notifFilter === 'unread' ? (
                        <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                          <CheckCheck className="w-6 h-6 mx-auto text-emerald-500 dark:text-emerald-400" />
                          <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                          <p className="text-[10px] text-slate-500">You have no unread notifications.</p>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                          <Bell className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-700" />
                          <p className="font-semibold">No notifications yet</p>
                          <p className="text-[10px] text-slate-500">System updates and match alerts will appear here.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <WalletButton className="shrink-0" />
          </div>
        </div>
      </div>

      {/* Integrated Sticky Sponsor Ticker (Excluded from School Dome and School Dome Results) */}
      {activeTab !== 'school_dome' && activeTab !== 'school_dome_results' && (
        <AdvertisementTicker />
      )}

      {/* Full Notification Detail Modal */}
      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onMarkAsRead={(id) => markNotificationRead && markNotificationRead(id)}
        />
      )}
    </header>

    {/* iPhone/iOS Dedicated Bottom Navigation - Respects bottom safe-area / home indicator */}
    {isIOS && (
      <nav
        id="ios-bottom-navigation"
        aria-label="iOS Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200/90 dark:border-slate-800/90 shadow-2xl backdrop-blur-xl transition-colors select-none"
        style={{
          paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
          paddingTop: '0.45rem',
        }}
      >
        <div className="max-w-md mx-auto px-2 flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = (sectionNotifications && sectionNotifications[item.badgeKey]) || 0;

            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}-ios`}
                onClick={() => handleTabClick(item.id)}
                title={item.label}
                className={`relative min-w-[50px] py-1 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-md shadow-blue-950/30 border border-blue-700/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-bold tracking-tight text-center leading-tight truncate max-w-[62px]">
                  {item.label === 'Daily GP Grab' ? 'GP Grab' : item.label}
                </span>

                {badgeCount > 0 && (
                  <NotificationBadge
                    count={badgeCount}
                    className="absolute -top-1 right-0.5 shadow-sm scale-90"
                  />
                )}

                {isActive && (
                  <span className="absolute bottom-0.5 left-2 right-2 h-0.5 bg-blue-400 dark:bg-blue-400 rounded-full shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    )}
  </>
);
};
