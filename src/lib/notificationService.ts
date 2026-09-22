import {
  UserNavSectionKey,
  AdminNavSectionKey,
  UserSectionUnreadCounts,
  AdminSectionUnreadCounts,
  SectionReadState,
  SectionNotificationEvent,
  Post,
  Announcement,
  EventItem,
  QualificationCompetition,
  WithdrawalRecord,
  Transaction,
  CompetitionHint,
} from '../types';
import { grobaxDataService } from './dataAccess';
import { isMockFeedPost } from '../data/initialFeedPosts';
import { isMockAnnouncement } from '../data/mockData';
import { isMockMinimartProduct } from '../data/mockMinimartData';
import { isMockChatroomMessage } from '../data/mockChatroomData';

const isMockSchoolDomeMessage = (m: any): boolean => {
  if (!m || !m.id) return false;
  const mockIds = ['dome_msg_welcome', 'dome_msg_q_13', 'dome_msg_user_1', 'dome_msg_user_2', 'dome_msg_user_3'];
  return mockIds.includes(m.id) || m.id.startsWith('mock_') || m.isMock === true;
};

/**
 * ============================================================================
 * GROBAAX GLOBAL NOTIFICATION BADGE ENGINE
 * ============================================================================
 * Centralized, high-performance, and persistent notification service.
 * Manages per-section independent unread counts for both User App and Admin Panel.
 */

export interface NotificationDataSource {
  userId?: string;
  userRole?: string;
  posts?: Post[];
  announcements?: Announcement[];
  chatMessages?: Array<{ id: string; timestamp?: any; userId?: string; createdAt?: any }>;
  platformEvents?: EventItem[];
  qualifications?: QualificationCompetition[];
  minimartProducts?: Array<{ id: string; createdAt?: any; updatedAt?: any; sellerId?: string }>;
  libraryMaterials?: Array<{ id: string; createdAt?: any; createdBy?: string }>;
  withdrawals?: WithdrawalRecord[];
  transactions?: Transaction[];
  studentVerifications?: Array<{ id: string; status?: string; createdAt?: any }>;
  reportedPosts?: Array<{ id: string; status?: string }>;
  liveFixtures?: Array<{ id: string; status?: string }>;
  hints?: CompetitionHint[];
  schoolDomeMessages?: Array<{ id: string; timestamp?: any; userId?: string; createdAt?: any; isDeleted?: boolean }>;
}

type NotificationSubscriber = (state: {
  user: UserSectionUnreadCounts;
  admin: AdminSectionUnreadCounts;
}) => void;

class GrobaaxNotificationService {
  private subscribers: Set<NotificationSubscriber> = new Set();
  private lastReadState: SectionReadState = {};
  private currentUserId: string = 'guest';
  private currentDataSource: NotificationDataSource = {};
  private eventCounts: Record<string, number> = {};

  // Default initial unread counts
  private userCounts: UserSectionUnreadCounts = {
    home: 0,
    league: 0,
    gus: 0,
    daily_qa: 0,
    hints: 0,
    school_dome: 0,
    school_dome_results: 0,
    library: 0,
    community: 0,
    sug: 0,
    chatroom: 0,
    user: 0,
    minimart: 0,
    announcements: 0,
    campus: 0,
  };

  private adminCounts: AdminSectionUnreadCounts = {
    dashboard: 0,
    users: 0,
    managers: 0,
    transactions: 0,
    subscriptions: 0,
    airtime_data: 0,
    withdrawals: 0,
    wallet: 0,
    sug_management: 0,
    institutions: 0,
    gus: 0,
    group_battle: 0,
    community: 0,
    announcements: 0,
    sponsorship: 0,
    questions: 0,
    live_management: 0,
    chatroom_live: 0,
    school_dome: 0,
    notifications: 0,
    settings: 0,
    library: 0,
    events: 0,
    badges: 0,
    contact: 0,
    hints: 0,
  };

  constructor() {
    this.loadReadState();
  }

  /**
   * Set the active user ID and initialize local persistent storage
   */
  initUser(userId?: string) {
    const newUid = userId || 'guest';
    if (this.currentUserId !== newUid) {
      this.currentUserId = newUid;
      this.loadReadState();
      this.recalculate();
    }
  }

  /**
   * Load read state from localStorage
   */
  private loadReadState() {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = `grobax_nav_last_read_${this.currentUserId}`;
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        this.lastReadState = JSON.parse(raw);
      } else {
        // If brand new user, initialize default read timestamp as now
        // so that existing history does not falsely show unread notifications
        const defaultTime = Date.now();
        this.lastReadState = {
          home: defaultTime,
          league: defaultTime,
          gus: defaultTime,
          library: defaultTime,
          sug: defaultTime,
          chatroom: defaultTime,
          user: defaultTime,
          minimart: defaultTime,
          announcements: defaultTime,
          campus: defaultTime,
          hints: defaultTime,
          school_dome: defaultTime,
          school_dome_results: defaultTime,
          admin_withdrawals: defaultTime,
          admin_rep_qualification: defaultTime,
          admin_sug_management: defaultTime,
          admin_community: defaultTime,
          admin_users: defaultTime,
          admin_transactions: defaultTime,
          admin_hints: defaultTime,
        };
      }
    } catch (e) {
      console.warn('[NotificationService] Failed to load read state:', e);
      this.lastReadState = {};
    }
  }

  /**
   * Persist read state to localStorage
   */
  private saveReadState() {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = `grobax_nav_last_read_${this.currentUserId}`;
      localStorage.setItem(storageKey, JSON.stringify(this.lastReadState));
    } catch (e) {
      console.warn('[NotificationService] Failed to save read state:', e);
    }
  }

  /**
   * Update data sources used for computing live unread badges
   */
  updateDataSource(data: Partial<NotificationDataSource>) {
    this.currentDataSource = {
      ...this.currentDataSource,
      ...data,
    };
    this.recalculate();
  }

  /**
   * Helper to parse arbitrary timestamp format into milliseconds
   */
  private parseTimestamp(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') {
      // If unix seconds (10 digits), convert to ms
      if (val > 0 && val < 10000000000) return val * 1000;
      return val;
    }
    if (val.toMillis && typeof val.toMillis === 'function') return val.toMillis();
    if (val.toDate && typeof val.toDate === 'function') return val.toDate().getTime();
    if (val.seconds && typeof val.seconds === 'number') return val.seconds * 1000;
    if (val._seconds && typeof val._seconds === 'number') return val._seconds * 1000;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const parsed = Date.parse(trimmed);
      if (!isNaN(parsed)) return parsed;

      // Handle relative strings (e.g., '10 mins ago', '2 hours ago', '1 day ago', 'just now')
      const now = Date.now();
      const lower = trimmed.toLowerCase();
      if (lower.includes('just now') || lower.includes('now') || lower.includes('moments ago')) {
        return now;
      }
      const match = lower.match(/^(\d+)\s*(min|minute|hr|hour|day|sec|second|week|month)s?\s*ago/);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        if (unit.startsWith('sec')) return now - amount * 1000;
        if (unit.startsWith('min')) return now - amount * 60 * 1000;
        if (unit.startsWith('hr') || unit.startsWith('hour')) return now - amount * 60 * 60 * 1000;
        if (unit.startsWith('day')) return now - amount * 24 * 60 * 60 * 1000;
        if (unit.startsWith('week')) return now - amount * 7 * 24 * 60 * 60 * 1000;
        if (unit.startsWith('month')) return now - amount * 30 * 24 * 60 * 60 * 1000;
      }
    }
    return 0;
  }

  /**
   * Mark an entire section as read
   * Crucial: Only affects the specific section without resetting other sections!
   */
  markSectionRead(sectionKey: string) {
    if (!sectionKey) return;
    const now = Date.now();
    this.lastReadState[sectionKey] = now;

    if (sectionKey === 'community' || sectionKey === 'admin_community') {
      this.lastReadState['community'] = now;
      this.lastReadState['user'] = now;
      this.lastReadState['minimart'] = now;
      this.lastReadState['announcements'] = now;
      this.lastReadState['campus'] = now;
      this.lastReadState['admin_community'] = now;
      this.eventCounts['community'] = 0;
      this.eventCounts['user'] = 0;
      this.eventCounts['minimart'] = 0;
      this.eventCounts['announcements'] = 0;
      this.eventCounts['campus'] = 0;
      this.eventCounts['admin_community'] = 0;
    } else if (sectionKey.startsWith('admin_')) {
      const stripped = sectionKey.replace(/^admin_/, '');
      this.lastReadState[stripped] = now;
      if (this.eventCounts[stripped]) {
        this.eventCounts[stripped] = 0;
      }
    } else {
      this.lastReadState[`admin_${sectionKey}`] = now;
      if (this.eventCounts[`admin_${sectionKey}`]) {
        this.eventCounts[`admin_${sectionKey}`] = 0;
      }
    }

    // Also clear manual event counts for this section
    if (this.eventCounts[sectionKey]) {
      this.eventCounts[sectionKey] = 0;
    }

    this.saveReadState();
    this.recalculate();
  }

  /**
   * Increment manual event count for a section (e.g. from push / real-time listener)
   */
  incrementSection(sectionKey: string, amount: number = 1) {
    this.eventCounts[sectionKey] = (this.eventCounts[sectionKey] || 0) + amount;
    this.recalculate();
  }

  /**
   * Emit an authoritative section event
   */
  async emitSectionNotification(event: Omit<SectionNotificationEvent, 'id' | 'timestamp'>) {
    const payload: SectionNotificationEvent = {
      ...event,
      id: 'event_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
    };

    // Increment local state immediately
    this.incrementSection(event.section);

    // Save to Firestore lightweight sectionEvents collection if needed
    try {
      await grobaxDataService.create('sectionEvents', payload, payload.id);
    } catch (err) {
      console.warn('[NotificationService] Emit notice:', err);
    }
  }

  /**
   * Recalculate independent counts for all User sections and Admin sections
   */
  private recalculate() {
    const lastRead = this.lastReadState;
    const ds = this.currentDataSource;
    const uid = this.currentUserId;

    // --- USER SECTION COUNTS ---

    // 1. Chatroom / Live Feed
    const chatReadTime = lastRead['chatroom'] || 0;
    let chatCount = this.eventCounts['chatroom'] || 0;
    if (ds.chatMessages && ds.chatMessages.length > 0) {
      const unreadChat = ds.chatMessages.filter((m) => {
        if (isMockChatroomMessage(m)) return false;
        if (m.userId && (m.userId === uid || m.userId === `@${uid}`)) return false;
        const time = this.parseTimestamp((m as any).updatedAt || (m as any).createdAt || (m as any).createdAtMillis || m.timestamp);
        return time > chatReadTime;
      }).length;
      chatCount += unreadChat;
    }

    // 3. User Feed / Community Posts
    const userFeedReadTime = lastRead['user'] || 0;
    let userFeedCount = this.eventCounts['user'] || 0;
    if (ds.posts && ds.posts.length > 0) {
      const unreadPosts = ds.posts.filter((p) => {
        if (isMockFeedPost(p)) return false;
        const authorId = (p.author as any)?.id || p.author?.username;
        if (authorId && (authorId === uid || authorId === `@${uid}`)) return false;
        if (p.status === 'Hidden' || p.status === 'Deleted') return false;
        const time = this.parseTimestamp((p as any).updatedAt || (p as any).createdAtMillis || (p as any).createdAt || (p as any).timestamp);
        return time > userFeedReadTime;
      }).length;
      userFeedCount += unreadPosts;
    }

    // 4. Minimart
    const minimartReadTime = lastRead['minimart'] || 0;
    let minimartCount = this.eventCounts['minimart'] || 0;
    if (ds.minimartProducts && ds.minimartProducts.length > 0) {
      const unreadProducts = ds.minimartProducts.filter((p) => {
        if (isMockMinimartProduct(p)) return false;
        if (p.sellerId && (p.sellerId === uid || p.sellerId === `@${uid}`)) return false;
        const time = this.parseTimestamp((p as any).updatedAt || p.createdAt);
        return time > minimartReadTime;
      }).length;
      minimartCount += unreadProducts;
    }

    // 5. Announcements
    const annReadTime = lastRead['announcements'] || 0;
    let annCount = this.eventCounts['announcements'] || 0;
    if (ds.announcements && ds.announcements.length > 0) {
      const unreadAnn = ds.announcements.filter((a) => {
        if (isMockAnnouncement(a)) return false;
        const time = this.parseTimestamp((a as any).updatedAt || (a as any).createdAt || (a as any).date);
        return time > annReadTime;
      }).length;
      annCount += unreadAnn;
    }

    // 6. AI Academic Library
    const libraryReadTime = lastRead['library'] || 0;
    let libraryCount = this.eventCounts['library'] || 0;
    if (ds.libraryMaterials && ds.libraryMaterials.length > 0) {
      const unreadLib = ds.libraryMaterials.filter((l) => {
        const time = this.parseTimestamp((l as any).updatedAt || l.createdAt);
        return time > libraryReadTime;
      }).length;
      libraryCount += unreadLib;
    }

    // 7. GUS Arena
    const gusReadTime = lastRead['gus'] || 0;
    let gusCount = this.eventCounts['gus'] || 0;

    // 8. Institutional League
    const leagueReadTime = lastRead['league'] || 0;
    let leagueCount = this.eventCounts['league'] || 0;
    if (ds.qualifications && ds.qualifications.length > 0) {
      const unreadQual = ds.qualifications.filter((q) => {
        const time = this.parseTimestamp((q as any).updatedAt || (q as any).createdAt || (q as any).startDate);
        return time > leagueReadTime && q.status === 'Open';
      }).length;
      leagueCount += unreadQual;
    }

    // 9. Home & Platform Tournaments
    const homeReadTime = lastRead['home'] || 0;
    let homeCount = this.eventCounts['home'] || 0;
    if (ds.platformEvents && ds.platformEvents.length > 0) {
      const unreadEvents = ds.platformEvents.filter((e) => {
        const time = this.parseTimestamp((e as any).updatedAt || (e as any).createdAt || (e as any).publishedAt || (e as any).startDate);
        return time > homeReadTime && (e.status === 'Published' || !e.status);
      }).length;
      homeCount += unreadEvents;
    }

    // 10. Community Overall (Sum of its sub-sections)
    const campusCount = this.eventCounts['campus'] || 0;
    const communityTotal = userFeedCount + minimartCount + annCount + campusCount;

    // 10. School Dome Arena & User Posts
    const schoolDomeReadTime = lastRead['school_dome'] || 0;
    let schoolDomeCount = this.eventCounts['school_dome'] || 0;
    if (ds.schoolDomeMessages && ds.schoolDomeMessages.length > 0) {
      const unreadSchoolDomeMsgs = ds.schoolDomeMessages.filter((m) => {
        if (isMockSchoolDomeMessage(m)) return false;
        const authorId = m.userId || (m as any).authorId;
        if (authorId && (authorId === uid || authorId === `@${uid}`)) return false;
        if ((m as any).isDeleted) return false;
        const time = this.parseTimestamp((m as any).updatedAt || (m as any).createdAt || (m as any).timestamp);
        return time > schoolDomeReadTime;
      }).length;
      schoolDomeCount += unreadSchoolDomeMsgs;
    }

    // Also include unread community posts tagged with School Dome
    if (ds.posts && ds.posts.length > 0) {
      const unreadDomePosts = ds.posts.filter((p) => {
        if (isMockFeedPost(p)) return false;
        const authorId = (p.author as any)?.id || p.author?.username;
        if (authorId && (authorId === uid || authorId === `@${uid}`)) return false;
        if (p.status === 'Hidden' || p.status === 'Deleted') return false;
        const hasDomeTag = Array.isArray(p.tags) && p.tags.some((t: string) => {
          const l = t.toLowerCase();
          return l.includes('dome') || l.includes('school dome') || l.includes('arena');
        });
        if (!hasDomeTag) return false;
        const time = this.parseTimestamp((p as any).updatedAt || (p as any).createdAtMillis || (p as any).createdAt || (p as any).timestamp);
        return time > schoolDomeReadTime;
      }).length;
      schoolDomeCount += unreadDomePosts;
    }

    const schoolDomeResultsCount = this.eventCounts['school_dome_results'] || 0;

    // 11. Hints Section (Strategic Preparation Hints)
    const hintsReadTime = lastRead['hints'] || Date.now();
    let hintsCount = this.eventCounts['hints'] || 0;
    if (ds.hints && ds.hints.length > 0) {
      const unreadHints = ds.hints.filter((h) => {
        if (h.status !== 'published') return false;
        const time = this.parseTimestamp((h as any).updatedAt || (h as any).createdAt);
        return hintsReadTime > 0 ? time > hintsReadTime : false;
      }).length;
      hintsCount = Math.max(hintsCount, unreadHints);
    }

    this.userCounts = {
      home: homeCount,
      league: leagueCount,
      gus: gusCount,
      daily_qa: chatCount,
      hints: hintsCount,
      school_dome: schoolDomeCount,
      school_dome_results: schoolDomeResultsCount,
      library: libraryCount,
      community: communityTotal,
      sug: 0,
      chatroom: chatCount,
      user: userFeedCount,
      minimart: minimartCount,
      announcements: annCount,
      campus: campusCount,
    };

    // --- ADMIN SECTION COUNTS ---

    // 1. Withdrawals
    const adminWithdrawalsRead = Math.max(
      lastRead['admin_withdrawals'] || 0,
      lastRead['withdrawals'] || 0
    );
    let pendingWithdrawals = (this.eventCounts['admin_withdrawals'] || 0) + (this.eventCounts['withdrawals'] || 0);
    if (ds.withdrawals && ds.withdrawals.length > 0) {
      pendingWithdrawals += ds.withdrawals.filter((w) => {
        const isPending = w.status === 'Pending' || (w as any).status === 'Processing';
        if (!isPending) return false;
        let time = this.parseTimestamp(
          (w as any).createdAtMillis ||
          (w as any).createdAt ||
          (w as any).timestamp ||
          (w as any).requestDate ||
          (w as any).updatedAt
        );
        // Guard against future mock dates
        if (time > Date.now() + 60000) {
          time = Date.now() - 86400000;
        }
        // Only count pending requests that arrived AFTER the admin last read/viewed the withdrawals tab
        return !adminWithdrawalsRead || time > adminWithdrawalsRead;
      }).length;
    }

    // 2. Student Verifications
    const adminVerifRead = lastRead['admin_users'] || 0;
    let pendingVerif = 0;
    if (ds.studentVerifications && ds.studentVerifications.length > 0) {
      pendingVerif += ds.studentVerifications.filter((v) => {
        const isPending = v.status === 'pending';
        const time = this.parseTimestamp(v.createdAt || (v as any).updatedAt || (v as any).timestamp);
        return isPending && (!adminVerifRead || time > adminVerifRead);
      }).length;
    }

    // 3. Community Moderation (Reported Posts)
    const adminCommRead = lastRead['admin_community'] || lastRead['community'] || 0;
    let reportedPostsCount = this.eventCounts['admin_community'] || 0;
    if (ds.posts && ds.posts.length > 0) {
      reportedPostsCount += ds.posts.filter((p) => {
        const isReported = (p.status as any) === 'Reported' || (p as any).isReported === true;
        const time = this.parseTimestamp((p as any).reportedAt || (p as any).updatedAt);
        return isReported && (!adminCommRead || time > adminCommRead);
      }).length;
    }

    // 5. Transactions / VTU Airtime Data
    const adminTxRead = lastRead['admin_transactions'] || lastRead['transactions'] || 0;
    let txCount = this.eventCounts['admin_transactions'] || 0;
    if (ds.transactions && ds.transactions.length > 0) {
      txCount += ds.transactions.filter((t) => {
        const time = this.parseTimestamp((t as any).createdAt || (t as any).timestamp);
        return time > adminTxRead;
      }).length;
    }

    // 6. Live Management
    let liveMatchCount = this.eventCounts['admin_live_management'] || 0;
    if (ds.liveFixtures && ds.liveFixtures.length > 0) {
      liveMatchCount += ds.liveFixtures.filter((f) => f.status === 'Live' || (f as any).isLive === true).length;
    }

    // 7. Admin Chatroom Live
    const adminChatRead = lastRead['admin_chatroom_live'] || lastRead['chatroom_live'] || lastRead['chatroom'] || 0;
    let adminChatCount = this.eventCounts['admin_chatroom_live'] || 0;
    if (ds.chatMessages && ds.chatMessages.length > 0) {
      adminChatCount += ds.chatMessages.filter((m) => {
        if (m.userId && m.userId === uid) return false;
        const time = this.parseTimestamp((m as any).createdAt || m.timestamp);
        return time > adminChatRead;
      }).length;
    }

    // 8. Admin Announcements
    const adminAnnRead = lastRead['admin_announcements'] || lastRead['announcements'] || 0;
    let adminAnnCount = this.eventCounts['admin_announcements'] || 0;
    if (ds.announcements && ds.announcements.length > 0) {
      adminAnnCount += ds.announcements.filter((a) => {
        const time = this.parseTimestamp((a as any).createdAt || (a as any).date);
        return time > adminAnnRead;
      }).length;
    }

    // 9. Admin Library Materials
    const adminLibRead = lastRead['admin_library'] || lastRead['library'] || 0;
    let adminLibCount = this.eventCounts['admin_library'] || 0;
    if (ds.libraryMaterials && ds.libraryMaterials.length > 0) {
      adminLibCount += ds.libraryMaterials.filter((l) => {
        const time = this.parseTimestamp((l as any).createdAt || (l as any).uploadedAt);
        const isPending = (l as any).status === 'pending' || !(l as any).status;
        return isPending && (!adminLibRead || time > adminLibRead);
      }).length;
    }

    // 10. Admin School Dome Activity & User Posts
    const adminDomeRead = lastRead['admin_school_dome'] || lastRead['school_dome'] || 0;
    let adminSchoolDomeCount = this.eventCounts['admin_school_dome'] || 0;
    if (ds.schoolDomeMessages && ds.schoolDomeMessages.length > 0) {
      adminSchoolDomeCount += ds.schoolDomeMessages.filter((m) => {
        if (m.userId && m.userId === uid) return false;
        if ((m as any).isDeleted) return false;
        const time = this.parseTimestamp((m as any).updatedAt || (m as any).createdAt || (m as any).timestamp);
        return time > adminDomeRead;
      }).length;
    }

    // Populate full admin counts map
    this.adminCounts = {
      dashboard: pendingWithdrawals + pendingVerif + reportedPostsCount + adminChatCount + adminLibCount,
      users: pendingVerif > 0 ? pendingVerif : (this.eventCounts['admin_users'] || 0),
      managers: this.eventCounts['admin_managers'] || 0,
      transactions: txCount,
      subscriptions: this.eventCounts['admin_subscriptions'] || 0,
      airtime_data: this.eventCounts['admin_airtime_data'] || 0,
      withdrawals: pendingWithdrawals,
      wallet: this.eventCounts['admin_wallet'] || 0,
      sug_management: 0,
      institutions: this.eventCounts['admin_institutions'] || 0,
      gus: this.eventCounts['admin_gus'] || 0,
      group_battle: this.eventCounts['admin_group_battle'] || 0,
      community: reportedPostsCount + adminChatCount,
      announcements: adminAnnCount,
      sponsorship: this.eventCounts['admin_sponsorship'] || 0,
      questions: this.eventCounts['admin_questions'] || 0,
      live_management: liveMatchCount,
      chatroom_live: adminChatCount,
      school_dome: adminSchoolDomeCount,
      notifications: this.eventCounts['admin_notifications'] || 0,
      settings: this.eventCounts['admin_settings'] || 0,
      library: adminLibCount,
      events: this.eventCounts['admin_events'] || 0,
      badges: this.eventCounts['admin_badges'] || 0,
      contact: this.eventCounts['admin_contact'] || 0,
      hints: this.eventCounts['admin_hints'] || 0,
    };

    // Broadcast to all active subscribers
    this.notifySubscribers();
  }

  private lastEmittedUser: string = '';
  private lastEmittedAdmin: string = '';

  private areCountsEqual(a: Record<string, number>, b: Record<string, number>): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }

  /**
   * Subscribe to unread state changes
   */
  subscribe(listener: NotificationSubscriber): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  private notifySubscribers() {
    const userPayload = { ...this.userCounts };
    const adminPayload = { ...this.adminCounts };

    const userStr = JSON.stringify(userPayload);
    const adminStr = JSON.stringify(adminPayload);

    if (userStr === this.lastEmittedUser && adminStr === this.lastEmittedAdmin) {
      return; // No change in unread counts, skip emitting to avoid unnecessary re-renders
    }

    this.lastEmittedUser = userStr;
    this.lastEmittedAdmin = adminStr;

    const payload = {
      user: userPayload,
      admin: adminPayload,
    };

    // Use queueMicrotask to ensure notification callbacks run outside the active React render phase
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        this.subscribers.forEach((sub) => {
          try {
            sub(payload);
          } catch (err) {
            console.warn('[NotificationService] Subscriber notify notice:', err);
          }
        });
      });
    } else {
      setTimeout(() => {
        this.subscribers.forEach((sub) => {
          try {
            sub(payload);
          } catch (err) {
            console.warn('[NotificationService] Subscriber notify notice:', err);
          }
        });
      }, 0);
    }
  }

  /**
   * Get current snapshot of unread counts
   */
  getSnapshot() {
    return {
      user: { ...this.userCounts },
      admin: { ...this.adminCounts },
    };
  }
}

export const grobaxNotificationService = new GrobaaxNotificationService();
export const grobaaxNotificationService = grobaxNotificationService;
export const NotificationService = grobaxNotificationService;
