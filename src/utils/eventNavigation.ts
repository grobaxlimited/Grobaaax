import { PlatformEventItem, TabType, PLATFORM_EVENT_CATEGORIES } from '../types';

export interface EventTargetChannelInfo {
  tab: TabType;
  subTab?: 'minimart' | 'announcements' | 'campus';
  label: string;
  actionText: string;
  url?: string;
  badgeClass: string;
}

/**
 * Accurately determines the destination channel and UI copy for any event.
 */
export function resolveEventChannel(event: PlatformEventItem): EventTargetChannelInfo {
  // 1. External custom URL or WhatsApp Group
  if (event.channelUrl && event.channelUrl.trim().startsWith('http')) {
    const trimmed = event.channelUrl.trim();
    const isWhatsApp = trimmed.includes('chat.whatsapp.com') || trimmed.includes('wa.me');
    return {
      tab: 'home',
      label: isWhatsApp ? 'WhatsApp Study Arena' : 'External Arena',
      actionText: isWhatsApp ? 'Join WhatsApp Group' : 'Open Live Stream / Link',
      url: trimmed,
      badgeClass: isWhatsApp
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    };
  }

  // 2. School Dome Category or explicit targetTab
  if (event.targetTab === 'school_dome' || event.category === 'school_dome') {
    return {
      tab: 'school_dome',
      label: 'School Dome Arena',
      actionText: 'Enter School Dome Arena',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    };
  }

  // 3. Explicit targetTab specified on the event
  if (event.targetTab) {
    if ((event.targetTab as string) === 'profile') {
      return {
        tab: 'home',
        label: 'Scholar Profile & ID',
        actionText: 'View Scholar Profile',
        badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    }
    if (event.targetTab === 'community') {
      const sub = event.targetSubTab || 'campus';
      const label =
        sub === 'campus'
          ? 'Campus Network'
          : sub === 'minimart'
          ? 'Campus Mini Mart'
          : 'Official Announcements';
      return {
        tab: 'community',
        subTab: sub,
        label,
        actionText: `Enter ${label}`,
        badgeClass:
          sub === 'campus'
            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
            : sub === 'minimart'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      };
    }
    if (event.targetTab === 'daily_qa' || (event.targetTab as string) === 'gus') {
      return {
        tab: 'daily_qa',
        label: 'Daily GP Grab',
        actionText: 'Enter Daily GP Grab',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    }
    if (event.targetTab === 'hints') {
      return {
        tab: 'hints',
        label: 'Competition Hints',
        actionText: 'View Competition Hints',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    }
  }

  // 3. Category metadata lookup
  const categoryMeta = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === event.category);
  if (categoryMeta) {
    if (categoryMeta.tabKey === 'daily_qa' || (categoryMeta.tabKey as string) === 'gus') {
      return {
        tab: 'daily_qa',
        label: categoryMeta.channelName || 'Daily GP Grab',
        actionText:
          event.category === 'gus'
            ? 'Enter Daily GP Grab'
            : event.category === 'chatroom_live'
            ? 'Enter Daily GP Grab Live'
            : 'Enter Academic Olympiad',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      };
    }
    if (categoryMeta.tabKey === 'community') {
      const sub = categoryMeta.subTab || 'campus';
      return {
        tab: 'community',
        subTab: sub,
        label: categoryMeta.channelName || 'Campus Network',
        actionText: 'Enter Campus Network',
        badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      };
    }
  }

  // 4. Fallback checking title and description content
  const lower = `${event.title} ${event.description || ''}`.toLowerCase();
  if (lower.includes('dome') || lower.includes('school dome')) {
    return {
      tab: 'school_dome',
      label: 'School Dome Arena',
      actionText: 'Enter School Dome Arena',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    };
  }
  if (lower.includes('mart') || lower.includes('product') || lower.includes('market') || lower.includes('trade')) {
    return {
      tab: 'community',
      subTab: 'minimart',
      label: 'Campus Mini Mart',
      actionText: 'Explore Mini Mart',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    };
  }
  if (lower.includes('announc') || lower.includes('circular') || lower.includes('official notice')) {
    return {
      tab: 'community',
      subTab: 'announcements',
      label: 'Official Announcements',
      actionText: 'View Official Notice',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    };
  }
  if (lower.includes('campus') || lower.includes('scholar') || lower.includes('student') || lower.includes('faculty') || lower.includes('department')) {
    return {
      tab: 'community',
      subTab: 'campus',
      label: 'Campus Network',
      actionText: 'Enter Campus Network',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    };
  }

  // Default: Daily GP Grab
  return {
    tab: 'daily_qa',
    label: 'Daily GP Grab',
    actionText: 'Enter Daily GP Grab',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };
}
