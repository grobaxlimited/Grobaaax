import { AdminTabType, NotificationItem } from '../types';

export type ResolvedNotificationKind =
  | 'school_blog'
  | 'campus'
  | 'dome'
  | 'gus'
  | 'league'
  | 'wallet'
  | 'reward'
  | 'academic_library'
  | 'vtu'
  | 'minimart'
  | 'announcement'
  | 'hints'
  | 'system'
  | 'general';

export const PENDING_CAMPUS_VIEW_KEY = 'grobax_pending_campus_view';

export function resolveAdminNotificationTab(notification: NotificationItem): AdminTabType {
  const target = String(notification?.actionUrl || '').toLowerCase();
  if (target.includes('school_blog') || target.includes('school-blog')) return 'school_blogs';
  if (target.includes('corporate_ad')) return 'corporate_ads';
  if (target.includes('withdraw')) return 'withdrawals';
  if (target.includes('library')) return 'library';
  if (target.includes('hint')) return 'hints';
  if (target.includes('dome')) return 'school_dome';
  if (target.includes('gus')) return 'gus';
  if (target.includes('user')) return 'users';
  return 'dashboard';
}

export function resolveNotificationKind(notification: NotificationItem): ResolvedNotificationKind {
  const rawType = String(notification?.type || '').toLowerCase().trim();
  const target = String(notification?.actionUrl || '').toLowerCase().trim();
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();
  const id = String(notification?.id || '').toLowerCase();

  // Prioritize wallet / GP reward notifications even when emitted by blog/campus routers
  if (
    rawType === 'reward' ||
    title.includes('gp reward credited') ||
    (target.includes('wallet') && !target.includes('school_blog'))
  ) {
    return rawType === 'wallet' ? 'wallet' : 'reward';
  }
  if (rawType === 'wallet') {
    return 'wallet';
  }

  // Classify School Blog notifications (including historical rows stored with type: 'campus')
  const looksLikeSchoolBlog =
    rawType === 'school_blog' ||
    target.includes('school_blog') ||
    target.includes('school-blog') ||
    id.startsWith('notif_blog_') ||
    title.includes('school blog') ||
    title.includes('school blogger') ||
    title.includes('campus blogger') ||
    message.includes('school blog') ||
    message.includes('school blogger');

  if (looksLikeSchoolBlog) {
    return 'school_blog';
  }

  if (rawType === 'campus' || target.includes('campus') || target.includes('connection')) {
    return 'campus';
  }
  if (rawType === 'hints' || rawType === 'hint' || target.includes('hint')) {
    return 'hints';
  }
  if (rawType === 'dome' || rawType === 'arena' || target.includes('dome') || target.includes('school_dome')) {
    return 'dome';
  }
  if (rawType === 'gus' || target.includes('gus')) {
    return 'gus';
  }
  if (rawType === 'league') {
    return 'league';
  }
  if (rawType === 'academic_library' || rawType === 'library' || target.includes('library')) {
    return 'academic_library';
  }
  if (rawType === 'vtu') {
    return 'vtu';
  }
  if (rawType === 'minimart' || target.includes('minimart')) {
    return 'minimart';
  }
  if (rawType === 'announcement') {
    return 'announcement';
  }
  if (rawType === 'system') {
    return 'system';
  }
  return 'general';
}

export function setPendingCampusView(view: 'directory' | 'connections' | 'other_schools' | 'school_blog') {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_CAMPUS_VIEW_KEY, view);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('grobax_open_campus_view', { detail: view }));
  } catch {}
}

export function consumePendingCampusView(): 'directory' | 'connections' | 'other_schools' | 'school_blog' | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(PENDING_CAMPUS_VIEW_KEY);
    if (val === 'directory' || val === 'connections' || val === 'other_schools' || val === 'school_blog') {
      sessionStorage.removeItem(PENDING_CAMPUS_VIEW_KEY);
      return val;
    }
  } catch {}
  return null;
}

export interface PushNavigationHandlers {
  setActiveTab: (tab: any) => void;
  setViewMode: (mode: 'app' | 'admin') => void;
  openWalletModal: (tab?: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact') => void;
  setCommunitySubTab?: (tab: 'minimart' | 'announcements' | 'campus') => void;
  navigateToAdminTab?: (tab: AdminTabType) => void;
  isAdmin?: boolean;
}

export function navigateToPushDestination(rawDestination: string, handlers: PushNavigationHandlers) {
  const dest = String(rawDestination || '').trim();
  const target = dest.toLowerCase();

  if (!target || target === '/' || target === '/home' || target === 'home') {
    handlers.setViewMode('app');
    handlers.setActiveTab('home');
    return;
  }

  if (target.startsWith('/admin') || target === 'admin') {
    if (handlers.isAdmin && handlers.navigateToAdminTab) {
      handlers.navigateToAdminTab(
        resolveAdminNotificationTab({
          id: 'push_nav',
          title: '',
          message: '',
          timestamp: '',
          isRead: false,
          type: 'system',
          actionUrl: dest,
        })
      );
      return;
    }
    handlers.setViewMode('app');
    handlers.setActiveTab('home');
    return;
  }

  handlers.setViewMode('app');

  if (target.includes('school_dome_results') || target.includes('results')) {
    handlers.setActiveTab('school_dome_results');
    return;
  }

  if (
    target.includes('school_dome') ||
    target.includes('dome') ||
    target.includes('arena') ||
    target.includes('gus') ||
    target.includes('league')
  ) {
    handlers.setActiveTab('school_dome');
    return;
  }

  if (target.includes('school-blog') || target.includes('school_blog')) {
    handlers.setActiveTab('school_blog');
    return;
  }

  if (target.includes('hint')) {
    handlers.setActiveTab('hints');
    return;
  }

  if (target.includes('campus') || target.includes('connection')) {
    setPendingCampusView('connections');
    handlers.setCommunitySubTab?.('campus');
    handlers.setActiveTab('community');
    return;
  }

  if (target.includes('minimart')) {
    handlers.setCommunitySubTab?.('minimart');
    handlers.setActiveTab('community');
    return;
  }

  if (target.includes('community') || target.includes('announcement')) {
    handlers.setCommunitySubTab?.('announcements');
    handlers.setActiveTab('community');
    return;
  }

  if (target.startsWith('wallet:')) {
    const sub = target.split(':')[1] as any;
    handlers.openWalletModal(sub || 'profile');
    return;
  }

  if (target.includes('upgrade') || target.includes('membership') || target.includes('tier')) {
    handlers.openWalletModal('upgrade');
    return;
  }

  if (target.includes('privacy')) {
    handlers.openWalletModal('privacy');
    return;
  }

  if (target.includes('profile')) {
    handlers.openWalletModal('profile');
    return;
  }

  if (target.includes('wallet') || target.includes('reward') || target.includes('history')) {
    handlers.openWalletModal('history');
    return;
  }

  handlers.setActiveTab('home');
}

