import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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

  const { isIOS } = useDevicePlatform();

  const isSuperOrAdmin =
    firebaseUser?.uid === PRIMARY_SUPER_ADMIN_UID ||
    firebaseUser?.email === 'grobaxycompany@gmail.com' ||
    currentUser?.email === 'grobaxycompany@gmail.com' ||
    firebaseUser?.email === 'basmock@gmail.com' ||
    currentUser?.email === 'basmock@gmail.com' ||
    currentUser?.role === 'admin' ||
    Boolean((currentUser as any)?.managerRole);

  const unreadCount = notifications ? notifications.filter((n) => !n.isRead).length : 0;
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
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold border border-rose-500/20">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
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

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {notifications && notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (markNotificationRead) markNotificationRead(notif.id);
                              setSelectedNotification({ ...notif, isRead: true });
                              setIsNotificationsOpen(false);
                            }}
                            className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 hover:border-blue-400 dark:hover:border-blue-500 ${
                              !notif.isRead
                                ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60'
                                : 'bg-slate-50/60 dark:bg-[#011429]/60 border-slate-100 dark:border-blue-950/60 opacity-85 hover:opacity-100'
                            }`}
                          >
                            <div className="p-2 rounded-xl bg-white dark:bg-[#031b3b] border border-slate-200 dark:border-blue-900/50 shrink-0">
                              {getNotifIcon(notif.type)}
                            </div>

                            <div className="flex-1 space-y-0.5 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {notif.title}
                                </h5>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {notif.timestamp}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                                {notif.message}
                              </p>
                              {(notif.senderInstitution || notif.senderDepartment) && (
                                <div className="flex items-center gap-1 pt-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate">
                                  <GraduationCap className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {[notif.senderInstitution, notif.senderFaculty, notif.senderDepartment].filter(Boolean).join(' • ')}
                                  </span>
                                </div>
                              )}
                            </div>

                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                            )}
                          </div>
                        ))
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
