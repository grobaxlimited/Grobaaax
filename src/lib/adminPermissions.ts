import { ManagerRole, AdminTabType, PRIMARY_SUPER_ADMIN_UID, ManagerActivityLog } from '../types';
import { db, cleanFirestoreData, collection, addDoc, serverTimestamp } from './firebase';

export const ALL_MANAGER_ROLES: ManagerRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUG_MANAGER',
  'GUS_MANAGER',
  'GROUP_BATTLE_MANAGER',
  'WALLET_MANAGER',
  'EVENTS_MANAGER',
  'COMMUNITY_ANNOUNCEMENT_MANAGER',
  'SPONSORSHIP_AD_MANAGER',
  'LIVE_COMPETITION_MANAGER',
  'CHATROOM_LIVE_MANAGER',
  'QUESTION_MANAGER',
  'NOTIFICATION_MANAGER',
  'USER_MANAGER',
  'INSTITUTIONAL_LEAGUE_MANAGER',
];

export const ROLE_LABELS: Record<ManagerRole, string> = {
  SUPER_ADMIN: 'Primary Super Admin',
  ADMIN: 'System Admin',
  SUG_MANAGER: 'Grobaax SUG Admin Manager',
  GUS_MANAGER: 'GUS Manager',
  GROUP_BATTLE_MANAGER: 'Group Battle Manager',
  WALLET_MANAGER: 'Wallet & Finance Manager',
  EVENTS_MANAGER: 'Events Manager',
  COMMUNITY_ANNOUNCEMENT_MANAGER: 'Community & Announcement Manager',
  SPONSORSHIP_AD_MANAGER: 'Sponsorship & Ads Manager',
  LIVE_COMPETITION_MANAGER: 'Live Competition Manager',
  CHATROOM_LIVE_MANAGER: 'Chatroom Live Manager',
  QUESTION_MANAGER: 'Question Bank Manager',
  NOTIFICATION_MANAGER: 'Notification Manager',
  USER_MANAGER: 'User Accounts Manager',
  INSTITUTIONAL_LEAGUE_MANAGER: 'Institutional League Manager',
};

export const ROLE_DESCRIPTIONS: Record<ManagerRole, string> = {
  SUPER_ADMIN: 'Full administrative authority over entire system, managers, settings, and database.',
  ADMIN: 'System administrator with access to all sections excluding Super Admin role overrides.',
  SUG_MANAGER: 'Controls SUG manager verification requests, approvals, institutional voting campaigns, sections, candidates, tie-breakers, and election audits.',
  GUS_MANAGER: 'Controls Global Ultimate Search seasons, elimination rounds, timers, and countdowns.',
  GROUP_BATTLE_MANAGER: 'Controls team search and group battle competitions and team rosters.',
  WALLET_MANAGER: 'Manages user GP wallets, manual adjustments, conversion rates, and withdrawal approvals.',
  EVENTS_MANAGER: 'Creates, edits, and publishes platform events on the Grobaax home page.',
  COMMUNITY_ANNOUNCEMENT_MANAGER: 'Oversees community posts, moderation, and official platform announcements.',
  SPONSORSHIP_AD_MANAGER: 'Manages sponsors, promotional banners, ticker campaigns, and ad schedules.',
  LIVE_COMPETITION_MANAGER: 'Executes live matches, real-time question releases, timers, and score sync.',
  CHATROOM_LIVE_MANAGER: 'Manages Chatroom Live questions, typed answers, winner rules, rewards, and room moderation.',
  QUESTION_MANAGER: 'Maintains master question banks across all competition categories and difficulty levels.',
  NOTIFICATION_MANAGER: 'Sends targeted push/system notifications to platform users.',
  USER_MANAGER: 'Views, searches, filters, inspects, and manages registered student user profiles.',
  INSTITUTIONAL_LEAGUE_MANAGER: 'Manages inter-institution league competitions, seasons, rankings, and match schedules.',
};

export function isPrimarySuperAdmin(uid?: string | null, email?: string | null): boolean {
  if (!uid && !email) return false;
  const cleanUid = (uid || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();

  return (
    cleanUid === '4403bd2b-e385-479b-af16-058582fa4ee3' ||
    cleanUid === PRIMARY_SUPER_ADMIN_UID ||
    cleanEmail === 'grobaxycompany@gmail.com' ||
    cleanUid.toLowerCase() === 'grobaxycompany@gmail.com' ||
    cleanUid === 'iH02BTcB4B0BV2YLA60WwFAi50CJ3' ||
    cleanUid === 'aGZBTsB4BBNvlY1A69hwfAb5DCJ3' ||
    cleanEmail === 'basmock@gmail.com' ||
    cleanUid.toLowerCase() === 'basmock@gmail.com'
  );
}

export function getTabsForRole(role?: ManagerRole | null, uid?: string | null): AdminTabType[] {
  if (isPrimarySuperAdmin(uid) || role === 'SUPER_ADMIN') {
    return [
      'dashboard',
      'users',
      'managers',
      'sug_management',
      'institutions',
      'gus',
      'group_battle',
      'events',
      'school_dome',
      'community',
      'chatroom_live',
      'announcements',
      'sponsorship',
      'questions',
      'live_management',
      'wallet',
      'airtime_data',
      'transactions',
      'badges',
      'withdrawals',
      'notifications',
      'subscriptions',
      'hints',
      'settings',
      'contact',
    ];
  }

  if (role === 'ADMIN') {
    return [
      'dashboard',
      'users',
      'managers',
      'sug_management',
      'institutions',
      'gus',
      'group_battle',
      'events',
      'school_dome',
      'community',
      'chatroom_live',
      'announcements',
      'sponsorship',
      'questions',
      'live_management',
      'wallet',
      'airtime_data',
      'transactions',
      'badges',
      'withdrawals',
      'notifications',
      'subscriptions',
      'hints',
      'settings',
      'contact',
    ];
  }

  const tabs: Set<AdminTabType> = new Set(['dashboard']);

  switch (role) {
    case 'SUG_MANAGER':
      tabs.add('sug_management');
      tabs.add('institutions');
      break;
    case 'GUS_MANAGER':
      tabs.add('gus');
      tabs.add('questions');
      tabs.add('live_management');
      tabs.add('hints');
      break;
    case 'GROUP_BATTLE_MANAGER':
      tabs.add('group_battle');
      tabs.add('questions');
      tabs.add('live_management');
      break;
    case 'WALLET_MANAGER':
      tabs.add('wallet');
      tabs.add('airtime_data');
      tabs.add('transactions');
      tabs.add('withdrawals');
      tabs.add('users');
      break;
    case 'EVENTS_MANAGER':
      tabs.add('events');
      tabs.add('school_dome');
      tabs.add('hints');
      break;
    case 'COMMUNITY_ANNOUNCEMENT_MANAGER':
      tabs.add('community');
      tabs.add('chatroom_live');
      tabs.add('announcements');
      break;
    case 'CHATROOM_LIVE_MANAGER':
      tabs.add('chatroom_live');
      tabs.add('community');
      break;
    case 'SPONSORSHIP_AD_MANAGER':
      tabs.add('sponsorship');
      break;
    case 'LIVE_COMPETITION_MANAGER':
      tabs.add('live_management');
      tabs.add('questions');
      tabs.add('hints');
      break;
    case 'QUESTION_MANAGER':
      tabs.add('questions');
      tabs.add('hints');
      break;
    case 'NOTIFICATION_MANAGER':
      tabs.add('notifications');
      break;
    case 'USER_MANAGER':
      tabs.add('users');
      break;
    case 'INSTITUTIONAL_LEAGUE_MANAGER':
      tabs.add('institutions');
      tabs.add('live_management');
      tabs.add('questions');
      break;
    default:
      break;
  }

  return Array.from(tabs);
}

export function isTabAllowed(tab: AdminTabType, role?: ManagerRole | null, uid?: string | null): boolean {
  const allowedTabs = getTabsForRole(role, uid);
  return allowedTabs.includes(tab);
}

export function hasTabAccess(role?: ManagerRole | null, tab?: AdminTabType, uid?: string | null): boolean {
  if (!tab) return false;
  return isTabAllowed(tab, role, uid);
}

export async function logManagerActivity(activity: {
  managerUid: string;
  managerName: string;
  managerEmail: string;
  role: ManagerRole | string;
  action: string;
  target: string;
  targetId: string;
  previousValue?: any;
  newValue?: any;
}) {
  try {
    const now = new Date();
    const rawData = {
      managerUid: activity.managerUid || PRIMARY_SUPER_ADMIN_UID,
      managerName: activity.managerName || 'Manager',
      managerEmail: activity.managerEmail || 'admin@grobaax.app',
      role: activity.role || 'SUPER_ADMIN',
      action: activity.action || 'ACTION',
      target: activity.target || '',
      targetId: activity.targetId || '',
      previousValue: activity.previousValue !== undefined ? cleanFirestoreData(activity.previousValue) : null,
      newValue: activity.newValue !== undefined ? cleanFirestoreData(activity.newValue) : null,
      date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
      createdAt: serverTimestamp(),
    };
    const logData = cleanFirestoreData(rawData);
    await addDoc(collection(db, 'managerActivityLogs'), logData);
  } catch (err) {
    console.error('Failed to log manager activity in Firebase:', err);
  }
}
