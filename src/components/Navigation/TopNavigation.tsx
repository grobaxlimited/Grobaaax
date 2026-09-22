import React, { useState, useMemo } from 'react';
import { useApp, sortNotificationsNewestFirst } from '../../context/AppContext';
import { useDevicePlatform } from '../../hooks/useDevicePlatform';
import { WalletButton } from '../Wallet/WalletButton';
import { NotificationBadge } from '../ui/NotificationBadge';
import { NotificationDetailModal } from './NotificationDetailModal';
import { NotificationsModal } from './NotificationsModal';
import { AdvertisementTicker } from '../ui/AdvertisementTicker';
import { PRIMARY_SUPER_ADMIN_UID, NotificationItem } from '../../types';
import {
  Home,
  Building2,
  Trophy,
  Users,
  ShieldCheck,
  Bell,
  BookOpen,
  Wallet,
  Search,
  Swords,
  Shield,
  Lightbulb,
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

  const sortedNotifs = useMemo(() => {
    return sortNotificationsNewestFirst(notifications || []);
  }, [notifications]);

  const unreadCount = sortedNotifs.filter((n) => !n.isRead).length;

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

            {/* Notification Bell Button */}
            <div>
              <button
                type="button"
                id="btn-open-notifications-pop-card"
                onClick={() => setIsNotificationsOpen(true)}
                title="View Notifications"
                aria-label="View Notifications"
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
            </div>

            <WalletButton className="shrink-0" />
          </div>
        </div>
      </div>

      {/* Integrated Sticky Sponsor Ticker (Excluded from School Dome and School Dome Results) */}
      {activeTab !== 'school_dome' && activeTab !== 'school_dome_results' && (
        <AdvertisementTicker />
      )}

      {/* Notifications Pop-up Modal for all phone screens and desktop */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={sortedNotifs}
        onSelectNotification={(notif) => {
          setSelectedNotification(notif);
          setIsNotificationsOpen(false);
        }}
        onMarkAllRead={handleMarkAllRead}
        onMarkAsRead={(id) => {
          if (markNotificationRead) markNotificationRead(id);
        }}
      />

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
