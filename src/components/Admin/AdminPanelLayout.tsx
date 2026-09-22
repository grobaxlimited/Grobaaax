import React, { useState, useEffect } from 'react';
import { AdminTabType, PRIMARY_SUPER_ADMIN_UID, ManagerRole } from '../../types';
import { useApp } from '../../context/AppContext';
import { NotificationBadge } from '../ui/NotificationBadge';
import {
  hasTabAccess,
  isPrimarySuperAdmin,
  ROLE_LABELS,
} from '../../lib/adminPermissions';

// Subviews
import { AdminDashboardView } from './AdminDashboardView';
import { AdminManagersView } from './AdminManagersView';
import { AdminSubscriptionsView } from './AdminSubscriptionsView';
import { AdminUsersView } from './AdminUsersView';
import { AdminEventsView } from './AdminEventsView';
import { AdminCommunityView } from './AdminCommunityView';
import { AdminAnnouncementsView } from './AdminAnnouncementsView';
import { AdminSponsorshipView } from './AdminSponsorshipView';
import { AdminWalletView } from './AdminWalletView';
import { AdminWithdrawalsView } from './AdminWithdrawalsView';
import { AdminChatroomLiveView } from './AdminChatroomLiveView';
import { AdminNotificationsView } from './AdminNotificationsView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminLibraryView } from './AdminLibraryView';
import { AdminAirtimeDataView } from './AdminAirtimeDataView';
import { AdminTransactionsView } from './AdminTransactionsView';
import { AdminSchoolDomeView } from './AdminSchoolDomeView';
import { AdminContactSupportView } from './AdminContactSupportView';
import { AdminHintsView } from './AdminHintsView';

import {
  LayoutDashboard,
  ShieldCheck,
  Zap,
  Users,
  Calendar,
  MessageSquare,
  BookOpen,
  Tag,
  Wallet,
  Coins,
  Bell,
  Settings,
  Menu,
  X,
  Lock,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Receipt,
  Trophy,
  CheckCheck,
  Inbox,
  Swords,
  Headphones,
  Lightbulb,
} from 'lucide-react';

interface AdminPanelLayoutProps {
  onReturnToUserApp?: () => void;
}

export function AdminPanelLayout({ onReturnToUserApp }: AdminPanelLayoutProps) {
  const {
    userProfile,
    theme,
    toggleTheme,
    logout,
    adminSectionNotifications,
    markSectionAsRead,
    adminActiveTab,
    setAdminActiveTab,
    notifications,
    markNotificationRead,
  } = useApp();

  const activeTab = adminActiveTab || 'dashboard';
  const setActiveTab = setAdminActiveTab;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Filter alerts relevant to administrators (including Past Question submissions)
  const adminAlerts = (notifications || []).filter(
    (n) =>
      n.targetRole === 'admin' ||
      n.type === 'academic_library' ||
      n.actionUrl?.includes('admin') ||
      n.actionUrl?.includes('library')
  );
  const unreadAlertsCount = adminAlerts.filter((n) => !n.isRead).length;

  // Clear unread badge for the currently active tab
  useEffect(() => {
    if (markSectionAsRead && activeTab) {
      markSectionAsRead(activeTab);
      markSectionAsRead('admin_' + activeTab);
    }
  }, [activeTab, markSectionAsRead]);

  // User details & Role
  const currentUid = userProfile?.id || '';
  const isSuper = isPrimarySuperAdmin(currentUid, userProfile?.email);

  // Determine user role (SUPER_ADMIN or ManagerRole from profile)
  const managerRole: ManagerRole | 'SUPER_ADMIN' = isSuper
    ? 'SUPER_ADMIN'
    : (userProfile as any)?.managerRole || 'INSTITUTIONAL_LEAGUE_MANAGER';

  // Check tab permission
  const canAccessCurrentTab = hasTabAccess(managerRole, activeTab);

  const navigationSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard' as AdminTabType, label: 'Dashboard Overview', icon: LayoutDashboard },
        { id: 'users' as AdminTabType, label: 'User Accounts & Wallets', icon: Users },
      ],
    },
    {
      title: 'ACCESS CONTROL',
      items: [
        { id: 'managers' as AdminTabType, label: 'Managers & RBAC Roles', icon: ShieldCheck, badge: 'Master' },
      ],
    },
    {
      title: 'MONETIZATION & WALLET',
      items: [
        { id: 'transactions' as AdminTabType, label: 'All Platform Transactions', icon: Receipt, badge: 'Live Log' },
        { id: 'subscriptions' as AdminTabType, label: 'Subscription Plans (₦)', icon: Zap },
        { id: 'airtime_data' as AdminTabType, label: 'Airtime & Mobile Data (VTU)', icon: Smartphone, badge: 'VTU' },
        { id: 'withdrawals' as AdminTabType, label: 'Withdrawal Requests', icon: Wallet },
        { id: 'wallet' as AdminTabType, label: 'GP Manager & Rates', icon: Coins },
      ],
    },
    {
      title: 'EVENTS & COMPETITIONS',
      items: [
        { id: 'events' as AdminTabType, label: 'Official Events Catalog', icon: Calendar, badge: 'Live' },
        { id: 'school_dome' as AdminTabType, label: 'School Dome Arena', icon: Swords, badge: 'Arena' },
      ],
    },
    {
      title: 'HINT MANAGEMENT',
      items: [
        { id: 'hints' as AdminTabType, label: 'Hints Management', icon: Lightbulb, badge: 'New' },
      ],
    },
    {
      title: 'COMMUNITY & MARKETING',
      items: [
        { id: 'chatroom_live' as AdminTabType, label: 'Daily GP Grab Chat', icon: Trophy, badge: 'Live' },
        { id: 'announcements' as AdminTabType, label: 'Admin Announcements', icon: MessageSquare },
        { id: 'sponsorship' as AdminTabType, label: 'Sponsorship & Ticker', icon: Tag },
      ],
    },
    {
      title: 'OPERATIONS & SYSTEM',
      items: [
        { id: 'library' as AdminTabType, label: 'AI Handout Library', icon: BookOpen, badge: 'AI' },
        { id: 'notifications' as AdminTabType, label: 'Notifications Dispatcher', icon: Bell },
        { id: 'contact' as AdminTabType, label: 'Contact Channels & Support', icon: Headphones, badge: 'Channels' },
        { id: 'settings' as AdminTabType, label: 'System Settings', icon: Settings },
      ],
    },
  ];

  const renderActiveTabContent = () => {
    if (!canAccessCurrentTab) {
      return (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto my-12 space-y-4">
          <div className="p-4 rounded-full bg-rose-500/10 text-rose-500 w-16 h-16 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your assigned administrative role (<span className="font-bold text-blue-600">{ROLE_LABELS[managerRole] || managerRole}</span>) does not have permission to access the <span className="font-bold">{activeTab}</span> section.
          </p>
          <p className="text-[11px] text-slate-400">
            Contact the Primary Super Admin (<span className="font-mono">{PRIMARY_SUPER_ADMIN_UID}</span>) if you believe you require access to this module.
          </p>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardView onNavigateTab={(tab) => setActiveTab(tab)} />;
      case 'managers':
        return <AdminManagersView />;
      case 'subscriptions':
        return <AdminSubscriptionsView />;
      case 'users':
        return <AdminUsersView />;
      case 'events':
        return <AdminEventsView />;
      case 'school_dome':
        return <AdminSchoolDomeView />;
      case 'community':
        return <AdminCommunityView />;
      case 'announcements':
        return <AdminAnnouncementsView />;
      case 'sponsorship':
        return <AdminSponsorshipView />;
      case 'transactions':
        return <AdminTransactionsView />;
      case 'wallet':
        return <AdminWalletView />;
      case 'airtime_data':
        return <AdminAirtimeDataView />;
      case 'withdrawals':
        return <AdminWithdrawalsView />;
      case 'chatroom_live':
        return <AdminChatroomLiveView />;
      case 'notifications':
        return <AdminNotificationsView />;
      case 'settings':
        return <AdminSettingsView />;
      case 'contact':
        return <AdminContactSupportView />;
      case 'library':
        return <AdminLibraryView />;
      case 'hints':
        return <AdminHintsView />;
      default:
        return <AdminDashboardView onNavigateTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-950 via-blue-900 to-blue-800 border border-blue-700/50 flex items-center justify-center text-white font-extrabold text-lg shadow-md">
              G
            </div>
            <div>
              <div className="font-black text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                GROBAAX <span className="text-blue-600 dark:text-blue-400">ADMIN</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Platform Management Dashboard</div>
            </div>
          </div>
        </div>

        {/* Right Admin Controls */}
        <div className="flex items-center space-x-3">
          {isSuper && (
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
              Primary Super Admin
            </span>
          )}

          <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-slate-200 dark:border-slate-800">
            <img
              src={userProfile?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=admin`}
              className="w-8 h-8 rounded-full border border-blue-500/30 bg-slate-100 object-cover"
              alt="Admin Avatar"
            />
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {userProfile?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                {ROLE_LABELS[managerRole] || managerRole}
              </div>
            </div>
          </div>

          {/* Admin Notifications Bell & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Administrative Notifications & Upload Alerts"
              aria-label="View administrative alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs animate-pulse">
                  {unreadAlertsCount > 99 ? '99+' : unreadAlertsCount}
                </span>
              )}
            </button>

            {isAlertsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsAlertsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Admin Alerts ({unreadAlertsCount})
                      </span>
                    </div>
                    {unreadAlertsCount > 0 && (
                      <button
                        onClick={() => {
                          adminAlerts.forEach((a) => markNotificationRead(a.id));
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {adminAlerts.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-semibold">No recent alerts</p>
                        <p className="text-[11px] opacity-75">All scholar submissions and vault queues are clear.</p>
                      </div>
                    ) : (
                      adminAlerts.slice(0, 8).map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            !alert.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {alert.title}
                                </h4>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {alert.timestamp || 'Just now'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                                {alert.message}
                              </p>
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    markNotificationRead(alert.id);
                                    setActiveTab('library');
                                    setIsAlertsOpen(false);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs cursor-pointer transition"
                                >
                                  <span>Review in Vault</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('notifications');
                        setIsAlertsOpen(false);
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Open Broadcast Dispatcher
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User App Switcher */}
          {onReturnToUserApp && (
            <button
              onClick={onReturnToUserApp}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Switch to User Application View"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Go to User App</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            title="Sign out of admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {navigationSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  {section.title}
                </div>

                <div className="space-y-0.5 pt-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const hasAccess = hasTabAccess(managerRole, item.id);
                    const unreadBadgeCount = (adminSectionNotifications as any)?.[item.id] || 0;

                    return (
                      <button
                        key={item.id}
                        id={`admin-nav-${item.id}`}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsSidebarOpen(false);
                        }}
                        disabled={!hasAccess}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm font-bold'
                            : hasAccess
                            ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                            : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {unreadBadgeCount > 0 && (
                            <NotificationBadge count={unreadBadgeCount} />
                          )}
                          {!hasAccess && <Lock className="w-3 h-3 text-slate-400" />}
                          {item.badge && hasAccess && unreadBadgeCount === 0 && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                                isActive
                                  ? 'bg-blue-700 text-blue-100'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
              <span>Grobaax Core v4.0</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live System
              </span>
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-xs lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
