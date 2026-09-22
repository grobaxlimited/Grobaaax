import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  grobaxDataService,
  institutionRepo,
  minimartRepo,
  gusRepo,
  financeRepo,
} from '../lib/dataAccess';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  FirebaseUser,
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  auth,
  db,
  getUserProfileDoc,
  ensureUserInFirestore,
  updateUserProfileInFirestore,
  deductUserGpInFirestore,
  adjustUserGpInFirestore,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SYSTEM_SETTINGS,
  DEFAULT_GP_CONVERSION,
  sendBroadcastNotificationToFirestore,
  saveSystemSettingsToFirestore,
  fetchSystemSettingsFromFirestore,
  saveGpConversionConfigToFirestore,
  submitWithdrawalRequestInFirestore,
  deleteCommunityPostFromFirestore,
  recordWalletTransactionInFirestore,
  saveCommunityPostToFirestore,
  updateCommunityPostInFirestore,
  deletePlatformEventFromFirestore,
  savePlatformEventToFirestore,
  togglePlatformEventStatusInFirestore,
  toggleLikeCommunityPostInFirestore,
  addCommentToCommunityPostInFirestore,
  sendChatroomMessageToFirestore,
  deleteChatroomMessageFromFirestore,
  reactChatroomMessageInFirestore,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  saveSponsorshipCampaignToFirestore,
  deleteSponsorshipCampaignFromFirestore,
  isMockSponsorshipCampaign,
  cleanupMockSponsorshipCampaignsFromFirestore,
  assignRepresentativeInFirestore,
  removeRepresentativeInFirestore,
  isSubscriptionExpired,
} from '../lib/firebase';
import { isPrimarySuperAdmin } from '../lib/adminPermissions';
import {
  UserRole,
  ThemeMode,
  TabType,
  UserProfile,
  Post,
  EventItem,
  PlatformEventItem,
  Announcement,
  BadgeStoreItem,
  MasterInstitution,
  LeagueFixture,
  WithdrawalRecord,
  PrivacySettings,
  SystemSettings,
  LeagueSeason,
  QuestionSet,
  QualificationCompetition,
  RepresentativeRecord,
  RepresentativeAssignment,
  InstitutionCategory,
  InstitutionRank,
  QuestionItem,
  GusSeason,
  GusRound,
  GusPrizeConfig,
  GusWinner,
  GusParticipantRecord,
  GusLiveClockState,
  DomeSession,
  DomeQuestionItem,
  DomeUserProgress,
  DomeScoreboardEntry,
  DomeHistoryItem,
  DomeLiveClockState,
  Transaction,
  OFFICIAL_EVENT_HOST,
  SubscriptionPlan,
  UserSubscriptionRecord,
  ChatroomLiveMessage,
  SchoolDomeMessage,
  AdminTabType,
  PRIMARY_SUPER_ADMIN_UID,
  PlatformEventStatus,
  PLATFORM_EVENT_CATEGORIES,
  sortSubscriptionPlans,
} from '../types';
import { verifyPaystackTransaction } from '../lib/paystackService';
import { resolveEventChannel } from '../utils/eventNavigation';
import {
  MOCK_USERS,
  MOCK_POSTS,
  MOCK_EVENTS,
  MOCK_ANNOUNCEMENTS,
  MOCK_BADGES_STORE,
  MOCK_MASTER_INSTITUTIONS,
  MOCK_FIXTURES,
  MOCK_WITHDRAWALS,
  MOCK_SEASONS,
  MOCK_QUESTION_SETS,
  MOCK_QUALIFICATION_COMPETITIONS,
  MOCK_REPRESENTATIVE_RECORDS,
  MOCK_GUS_SEASONS,
  MOCK_GUS_PARTICIPANTS,
  MOCK_GUS_PRIZES,
  MOCK_DOME_SESSIONS,
  MOCK_DOME_SCOREBOARD,
  MOCK_DOME_USER_PROGRESS,
  MOCK_DOME_HISTORY,
  MOCK_SPONSORSHIP_CAMPAIGNS,
  MOCK_TRANSACTIONS,
  MOCK_GP_CONVERSION,
  MOCK_UPGRADE_PLANS,
  MOCK_NOTIFICATIONS,
} from '../data/mockData';
import { MOCK_CHATROOM_MESSAGES } from '../data/mockChatroomData';
import {
  DEFAULT_MINIMART_CONFIG,
  INITIAL_MINIMART_CATEGORIES,
  INITIAL_MINIMART_PRODUCTS,
} from '../data/mockMinimartData';
import { INITIAL_FEED_POSTS } from '../data/initialFeedPosts';
import {
  GpConversionConfig,
  SponsorshipCampaign,
  UpgradePlan,
  NotificationItem,
  PostReport,
  PostComment,
  MinimartProduct,
  MinimartCategory,
  MinimartReport,
  MinimartConfig,
  MinimartProductStatus,
  MinimartReportReason,
  UserListingEligibility,
  UserPostEligibility,
  UserSectionUnreadCounts,
  AdminSectionUnreadCounts,
  CompetitionHint,
} from '../types';
import { grobaxNotificationService } from '../lib/notificationService';
import { subscribeToCompetitionHints, getCachedCompetitionHints } from '../lib/hintsService';
import {
  saveMinimartProductToFirestore,
  updateMinimartProductStatusInFirestore,
  deleteMinimartProductFromFirestore,
  submitMinimartReportToFirestore,
  moderateMinimartReportInFirestore,
  saveMinimartCategoryToFirestore,
  deleteMinimartCategoryFromFirestore,
  saveMinimartConfigToFirestore,
  seedInitialMinimartDataToFirestore,
  cleanupMockMinimartProductsFromFirestore,
  cleanupDuplicateWalletTransactionsInFirestore,
  cleanupDuplicateUserSubscriptionsInFirestore,
} from '../lib/firebase';
import { isMockFeedPost } from '../data/initialFeedPosts';
import { isMockAnnouncement } from '../data/mockData';
import { isMockMinimartProduct } from '../data/mockMinimartData';
import { isMockChatroomMessage } from '../data/mockChatroomData';
import {
  subscribeSchoolDomeMessages,
  DEFAULT_INITIAL_MESSAGES as DEFAULT_SCHOOL_DOME_MESSAGES,
} from '../lib/schoolDomeService';

export function extractTxPaymentReference(tx: { description?: string; meta?: any } | null | undefined): string | null {
  if (!tx) return null;
  const metaRef = tx.meta?.paymentReference || tx.meta?.reference;
  if (metaRef) return String(metaRef).trim();
  const desc = String(tx.description || '');
  const match = desc.match(/\((GRBX_[A-Z0-9_-]+|GP_SUB_[A-Z0-9_-]+|trx_[A-Z0-9_-]+)\)/i);
  if (match) return match[1].trim();
  return null;
}

export function deduplicateTransactionList(txList: Transaction[]): Transaction[] {
  if (!Array.isArray(txList)) return [];
  const seenPaymentRefs = new Set<string>();
  const seenTxIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const deduped: Transaction[] = [];

  for (const t of txList) {
    if (t.id) {
      if (seenTxIds.has(t.id)) continue;
      seenTxIds.add(t.id);
    }
    if (t.transactionId) {
      if (seenTxIds.has(t.transactionId)) continue;
      seenTxIds.add(t.transactionId);
    }

    const payRef = extractTxPaymentReference(t);
    const uId = String(t.userId || '');
    if (payRef) {
      const pKey = `${uId}_${payRef.toLowerCase()}`;
      if (seenPaymentRefs.has(pKey)) continue;
      seenPaymentRefs.add(pKey);
    }

    const time = t.createdAt?.toMillis
      ? t.createdAt.toMillis()
      : t.createdAt?.seconds
      ? t.createdAt.seconds * 1000
      : 0;
    const timeBucket = time ? Math.floor(time / (2 * 60 * 1000)) : 0;
    const sigKey = `${uId}_${t.type}_${t.amount}_${t.isCredit}_${timeBucket}_${t.title}`;
    if (timeBucket > 0) {
      if (seenSignatures.has(sigKey)) continue;
      seenSignatures.add(sigKey);
    }

    deduped.push(t);
  }

  return deduped;
}

interface AppContextType {
  isAuthReady: boolean;
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRepresentativeStatus: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'dark' | 'light';
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  communitySubTab: 'minimart' | 'announcements' | 'campus';
  setCommunitySubTab: (tab: 'minimart' | 'announcements' | 'campus') => void;
  navigateToCommunitySubTab: (subTab: 'minimart' | 'announcements' | 'campus') => void;
  navigateToEventChannel: (event: PlatformEventItem) => void;
  currentUser: UserProfile;
  userProfile: UserProfile;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  toggleTheme: () => void;
  isWalletModalOpen: boolean;
  setIsWalletModalOpen: (open: boolean) => void;
  walletModalTab: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact';
  setWalletModalTab: (tab: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact') => void;
  openWalletModal: (initialTab?: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact') => void;
  subscriptionPlans: SubscriptionPlan[];
  activeSubscriptionPlans: SubscriptionPlan[];
  freeScholarPlan: SubscriptionPlan;
  subscribeToPlan: (
    plan: SubscriptionPlan,
    paymentMethod?: 'GP' | 'CARD' | 'TRANSFER',
    paymentReference?: string
  ) => Promise<{ success: boolean; message: string }>;
  registerPendingPayment: (data: {
    reference: string;
    plan: SubscriptionPlan;
    userId?: string;
    userName?: string;
    userEmail?: string;
    channel?: string;
  }) => void;
  activePaymentSensor: {
    isMonitoring: boolean;
    pendingReference: string | null;
    planName: string | null;
    lastCheckedAt: number | null;
  };
  triggerSubscriptionSensorCheck: () => Promise<void>;
  isUserSubscribed: boolean;
  isSubscriber: boolean;
  isUpgradePromoVisible: boolean;
  dismissUpgradePromo: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD') => void;
  login: (profile: UserProfile) => void;
  logout: () => Promise<void>;
  firebaseUser: FirebaseUser | null;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  events: EventItem[];
  toggleEventRegistration: (id: string) => void;
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
  createPost: (content: string, tags: string[], attachmentData?: string) => Promise<void>;
  updatePost: (postId: string, content: string, tags: string[], image?: string) => Promise<void>;
  deletePlatformEvent: (eventId: string) => Promise<void>;
  savePlatformEvent: (eventData: Partial<PlatformEventItem>) => Promise<string>;
  togglePlatformEventStatus: (eventId: string, newStatus: PlatformEventStatus) => Promise<void>;
  toggleLikePost: (id: string) => void;
  claimReward: (amount: number, unit: 'GRBX' | 'GP', reason: string) => void;
  badgeStore: BadgeStoreItem[];
  buyBadge: (badge: BadgeStoreItem) => Promise<boolean> | boolean;
  withdrawals: WithdrawalRecord[];
  requestGpWithdrawal: (gpAmount: number, bankName: string, accountNumber: string, accountName?: string) => boolean;
  updatePrivacy: (newPrivacy: Partial<PrivacySettings>) => void;
  isBalanceHidden: boolean;
  toggleBalanceHidden: () => void;
  
  // Master Institutions & Departments
  masterInstitutions: MasterInstitution[];
  addMasterInstitution: (inst: Omit<MasterInstitution, 'id' | 'activeInSeason' | 'hidden'>) => void;
  updateMasterInstitution: (id: string, data: Partial<MasterInstitution>) => void;
  addDepartmentToInstitution: (instId: string, departmentName: string) => void;
  removeDepartmentFromInstitution: (instId: string, departmentName: string) => void;
  toggleInstitutionSeason: (id: string) => void;
  toggleInstitutionHidden: (id: string) => void;

  // Seasons
  seasons: LeagueSeason[];
  addSeason: (season: Omit<LeagueSeason, 'id'>) => void;
  updateSeasonStatus: (seasonId: string, status: LeagueSeason['status']) => void;
  toggleSeasonParticipation: (seasonId: string, instId: string) => void;

  // Question Bank
  questionSets: QuestionSet[];
  addQuestionSet: (qSet: Omit<QuestionSet, 'id'>) => void;
  addQuestionToSet: (qSetId: string, question: Omit<QuestionItem, 'id'>) => void;

  // Qualifications & Representatives
  qualificationCompetitions: QualificationCompetition[];
  addQualificationCompetition: (qual: Omit<QualificationCompetition, 'id'>) => void;
  representativeRecords: RepresentativeRecord[];
  representativeAssignments: RepresentativeAssignment[];
  assignRepresentative: (student: {
    studentId: string;
    studentName: string;
    studentUsername?: string;
    avatar?: string;
    institutionId: string;
    institutionName?: string;
    department?: string;
    level?: string;
    seasonId?: string;
    score?: number;
  }) => Promise<void> | void;
  removeRepresentative: (repIdOrInstId: string) => Promise<void> | void;

  // Fixtures & Match Control
  fixtures: LeagueFixture[];
  updateFixtureScore: (id: string, homeScore: number, awayScore: number, status: 'Live' | 'Upcoming' | 'Completed') => void;
  addFixture: (fix: Omit<LeagueFixture, 'id'>) => void;
  updateFixtureState: (id: string, patch: Partial<LeagueFixture>) => void;

  // Calculated Standings
  calculateStandings: (category: InstitutionCategory, seasonId?: string) => InstitutionRank[];

  // GUS (Global Ultimate Search) System
  gusSeasons: GusSeason[];
  activeGusSeason: GusSeason | null;
  gusParticipants: GusParticipantRecord[];
  userGusRecord: GusParticipantRecord | null;
  gusLiveClock: GusLiveClockState | null;
  registerForGusSeason: (seasonId: string) => boolean;
  submitGusAnswer: (seasonId: string, roundNumber: number, questionIndex: number, selectedOptionIndex: number) => { isCorrect: boolean; isEliminated: boolean };
  addGusSeason: (season: Omit<GusSeason, 'id' | 'registeredParticipantIds' | 'activeParticipantIds' | 'eliminatedParticipantIds' | 'winners'>) => void;
  updateGusSeason: (seasonId: string, patch: Partial<GusSeason>) => void;
  addGusRoundToSeason: (seasonId: string, round: Omit<GusRound, 'id'>) => void;
  updateGusRoundInSeason: (seasonId: string, roundId: string, patch: Partial<GusRound>) => void;
  addQuestionToGusRound: (seasonId: string, roundId: string, question: Omit<QuestionItem, 'id'>) => void;
  updateGusPrizes: (seasonId: string, prizes: GusPrizeConfig[]) => void;
  adminControlGusCompetition: (seasonId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_ROUND' | 'START_NEXT_ROUND' | 'END_COMPETITION') => void;

  // DOME (Live Non-Eliminatory Quiz) System
  domeSessions: DomeSession[];
  activeDomeSession: DomeSession | null;
  domeScoreboard: DomeScoreboardEntry[];
  domeUserProgress: DomeUserProgress;
  domeHistory: DomeHistoryItem[];
  domeLiveClock: DomeLiveClockState | null;
  submitDomeAnswer: (sessionId: string, questionIndex: number, selectedOptionIndex: number | null) => { isCorrect: boolean; gpEarned: number };
  addDomeSession: (session: Omit<DomeSession, 'id' | 'participantsCount' | 'totalGpDistributed' | 'currentQuestionIndex'>) => void;
  updateDomeSession: (sessionId: string, patch: Partial<DomeSession>) => void;
  addQuestionToDomeSession: (sessionId: string, question: Omit<DomeQuestionItem, 'id'>) => void;
  adminControlDomeSession: (sessionId: string, action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_SESSION') => void;

  // Community, Feed & Announcements
  chatroomMessages: ChatroomLiveMessage[];
  schoolDomeMessages: SchoolDomeMessage[];
  sendChatroomMessage: (message: ChatroomLiveMessage) => Promise<void>;
  deleteChatroomMessage: (messageId: string) => Promise<void>;
  reactChatroomMessage: (messageId: string, emoji: string) => Promise<void>;
  minimartProducts: MinimartProduct[];
  minimartCategories: MinimartCategory[];
  minimartConfig: MinimartConfig;
  minimartReports: MinimartReport[];
  addMinimartProduct: (productData: Omit<MinimartProduct, 'id' | 'productId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'reportsCount' | 'viewsCount'>) => Promise<{ success: boolean; error?: string; product?: MinimartProduct }>;
  updateMinimartProduct: (productId: string, updates: Partial<MinimartProduct>) => Promise<{ success: boolean; error?: string; product?: MinimartProduct }>;
  deleteMinimartProduct: (productId: string) => Promise<{ success: boolean; error?: string }>;
  reportMinimartProduct: (productId: string, reason: MinimartReportReason, description: string) => Promise<{ success: boolean; error?: string }>;
  updateMinimartProductStatus: (productId: string, status: MinimartProductStatus) => Promise<{ success: boolean; error?: string }>;
  saveMinimartCategory: (category: MinimartCategory) => Promise<{ success: boolean; error?: string }>;
  addMinimartCategory: (categoryData: Omit<MinimartCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; error?: string }>;
  updateMinimartCategory: (categoryId: string, updates: Partial<MinimartCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteMinimartCategory: (categoryId: string) => Promise<{ success: boolean; error?: string }>;
  saveMinimartConfig: (config: Partial<MinimartConfig>) => Promise<{ success: boolean; error?: string }>;
  updateMinimartConfig: (config: Partial<MinimartConfig>) => Promise<{ success: boolean; error?: string }>;
  moderateMinimartReport: (reportId: string, action: 'dismiss' | 'resolve' | 'suspend_product', adminNotes?: string) => Promise<{ success: boolean; error?: string }>;
  resolveMinimartReport: (reportId: string, action: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  checkUserListingEligibility: (userId?: string) => UserListingEligibility;
  checkUserPostEligibility: (userId?: string) => UserPostEligibility;
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;
  publishAnnouncement: (id: string) => void;
  scheduleAnnouncement: (id: string, scheduleDate: string) => void;
  unpublishAnnouncement: (id: string) => void;
  pinAnnouncement: (id: string) => void;
  hidePost: (postId: string) => void;
  deletePost: (postId: string) => void;
  restorePost: (postId: string) => void;
  reportPost: (postId: string, reason: string) => void;
  addCommentToPost: (
    postId: string,
    content: string,
    parentId?: string | null,
    replyTo?: { name: string; username: string; commentId: string } | null
  ) => void;
  toggleLikeComment: (postId: string, commentId: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  suspendUserPosting: (userId: string) => void;

  // Wallet, Transactions & Conversion Admin
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'date' | 'status' | 'transactionId'>) => void;
  gpConversionConfig: GpConversionConfig;
  updateGpConversionConfig: (config: Partial<GpConversionConfig>) => void;
  updateWithdrawalStatus: (id: string, status: WithdrawalRecord['status'], notes?: string) => void;
  adminAdjustGpBalance: (amount: number, reason: string) => void;
  adminAdjustTargetUserGp: (targetUserId: string, amount: number, reason: string) => Promise<void>;

  // GP Store Badges
  addBadgeToStore: (badge: Omit<BadgeStoreItem, 'id'>) => void;
  deleteBadgeFromStore: (id: string) => Promise<void>;
  updateBadgeInStore: (id: string, patch: Partial<BadgeStoreItem>) => void;
  equipBadge: (badgeId: string) => void;

  // Sponsorship & Advertisements
  sponsorshipCampaigns: SponsorshipCampaign[];
  addSponsorshipCampaign: (campaign: Omit<SponsorshipCampaign, 'id'>) => void;
  updateSponsorshipCampaign: (id: string, patch: Partial<SponsorshipCampaign>) => void;
  deleteSponsorshipCampaign: (id: string) => void;

  // Upgrade Plans
  upgradePlans: UpgradePlan[];
  updateUpgradePlan: (id: string, patch: Partial<UpgradePlan>) => void;

  // Notifications & Global Badges
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead?: () => void;
  sendNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void;
  addNotification?: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => void;
  sectionNotifications: UserSectionUnreadCounts;
  adminSectionNotifications: AdminSectionUnreadCounts;
  clearSectionNotification: (sectionKey: string) => void;
  markSectionAsRead: (sectionKey: string) => void;
  emitSectionNotification: (event: { section: string; title: string; message?: string; targetRole?: 'USER' | 'ADMIN' | 'ALL' }) => Promise<void>;

  // System Configuration & Health
  systemSettings: SystemSettings;
  updateSystemSettings: (settings: Partial<SystemSettings>) => Promise<void>;

  // User Profile
  updateUserProfile: (data: Partial<UserProfile>) => void;

  // View & Admin Mode Navigation
  viewMode: 'app' | 'admin';
  setViewMode: (mode: 'app' | 'admin') => void;
  adminActiveTab: AdminTabType;
  setAdminActiveTab: (tab: AdminTabType) => void;
  navigateToAdminTab: (tab: AdminTabType) => void;
  pendingPastQuestionsCount: number;
  pendingPastQuestions: any[];

  triggerAiBroadcast: (message: string) => void;
  selectedRoleUser: UserProfile;
}

export const DEFAULT_FREE_SCHOLAR_PLAN: SubscriptionPlan = {
  id: 'plan_free_scholar',
  planId: 'plan_free_scholar',
  name: 'Free Scholar',
  shortDescription: 'Standard academic access to campus discussions and basic quizzes.',
  fullDescription: 'Included default membership tier for all registered scholars on Grobaax.',
  priceNaira: 0,
  currency: 'NGN',
  targetTier: 'free',
  tierType: 'free',
  durationValue: 1,
  durationUnit: 'Years',
  benefits: [
    'Daily GP Grab — 2 Responses',
    'Browse Campus Minimart (Discovery Only)',
    'Withdrawal Eligibility — Not Available',
    'SchoolDome',
    'Campus connect — Limited Access',
    'Competition - Hint — Not Available',
    'GbX Ads — Available',
  ],
  features: ['Lifetime Validity', 'Standard Access', 'Ad-Supported'],
  badgeLabel: 'FREE FOREVER',
  featured: false,
  active: true,
  displayOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan_basic_naira',
    planId: 'plan_basic_naira',
    name: 'Scholar Starter Plan',
    shortDescription: 'Essential premium academic privileges & competition access',
    fullDescription: 'Essential premium plan for scholars wanting daily GP grab, withdrawal eligibility, AI library handouts, and minimart listings.',
    priceNaira: 1000,
    currency: 'NGN',
    targetTier: 'premium',
    tierType: 'premium',
    durationValue: 30,
    durationUnit: 'Days',
    benefits: [
      'Daily GP Grab — 15 Responses',
      'Withdrawal Eligibility — Available',
      'AI Library — 5 Handout Generations',
      'Campus Minimart Products Listing (3 / Day)',
      'No Grobaax Pop-up Upgrade Ads',
      'Profile Verification Badge — Available',
      'Premium Badge — Available',
    ],
    features: ['30 Days Validity', '15 Daily Searches', '5 AI Handouts/Day', '3 Minimart Listings/Day', 'No Pop-up Ads', 'Premium Badge'],
    badgeLabel: 'POPULAR',
    featured: false,
    active: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_pro_naira',
    planId: 'plan_pro_naira',
    name: 'Champions Pro Scholar',
    shortDescription: 'Enhanced privileges, 2x GP boost & exclusive arena access',
    fullDescription: 'Designed for high-performing scholars competing in the Institutional Champions League and Global Ultimate Search.',
    priceNaira: 2500,
    currency: 'NGN',
    targetTier: 'premium',
    tierType: 'premium',
    durationValue: 30,
    durationUnit: 'Days',
    benefits: [
      'Daily GP Grab — 15 Responses',
      'Withdrawal Eligibility — Available',
      'AI Library — 5 Handout Generations',
      'Campus Minimart Products Listing (3 / Day)',
      'No Grobaax Pop-up Upgrade Ads',
      '2x GP Reward Multiplier on all Competitions',
      'Profile Badge & Premium Badge — Available',
      'Priority Live Match Queue & Arena Access',
    ],
    features: ['30 Days Validity', '15 Daily Searches', '2x GP Multiplier', '5 AI Handouts/Day', '3 Minimart Listings/Day', 'Premium Badge'],
    badgeLabel: 'RECOMMENDED',
    featured: true,
    active: true,
    displayOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_titan_naira',
    planId: 'plan_titan_naira',
    name: 'Grobaax Titan Annual VIP',
    shortDescription: 'Ultimate academic VIP access for 1 Full Year',
    fullDescription: 'Comprehensive annual subscription for institution representatives and top scholars with full VIP status, 20 searches, unlimited handouts, 6 listings/day, and maximum rewards.',
    priceNaira: 25000,
    currency: 'NGN',
    targetTier: 'vip',
    tierType: 'vip',
    durationValue: 365,
    durationUnit: 'Days',
    benefits: [
      'Daily GP Grab — 20 Responses',
      'Withdrawal Eligibility — Available (Zero Processing Fees)',
      'AI Library — Unlimited Handouts Generation',
      'Campus Minimart Products Listing (6 / Day)',
      'No Grobaax Pop-up Upgrade Ads',
      'Profile Badge & VIP Gold Crown Badge — Available',
      '3x GP Reward Multiplier across all League & GUS Rounds',
      'Instant Representative Fast-Track Review',
    ],
    features: ['365 Days Validity', '20 Daily Searches', 'Unlimited AI Handouts', '6 Minimart Listings/Day', '3x GP Multiplier', 'Gold VIP Crown'],
    badgeLabel: 'VIP ANNUAL',
    featured: false,
    active: true,
    displayOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper function to check if a user is currently an active paid subscriber
export const checkIsUserSubscribed = (user: UserProfile | null | undefined): boolean => {
  if (!user) return false;

  const isStaffOrAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    (user.role as string) === 'staff' ||
    user.role === 'community_manager' ||
    Boolean(user.name && user.name.toLowerCase().includes('admin'));

  if (isStaffOrAdmin) return true;

  // Check if subscription has expired - if expired, all benefits revoked and user is automatically free
  if (isSubscriptionExpired(user)) {
    return false;
  }

  if ((user as any).isExpired === true || (user as any).isSubscribed === false) {
    return false;
  }

  // Active plan ID present and valid
  if (
    user.activePlanId &&
    user.activePlanId.trim().length > 0 &&
    !user.activePlanId.toLowerCase().includes('free')
  ) {
    return true;
  }

  // Active subscription object
  if (user.subscription && user.subscription.status === 'active') {
    return true;
  }

  if (user.isPremium) return true;
  if ((user as any).isSubscribed) return true;

  if (user.membershipTier) {
    const tier = user.membershipTier.toLowerCase().trim();
    if (
      tier &&
      !tier.includes('free') &&
      tier !== 'starter scholar' &&
      !tier.includes('scholar (starter)')
    ) {
      return true;
    }
  }

  if (user.subscriptionTier) {
    const tier = user.subscriptionTier.toLowerCase().trim();
    if (tier && !tier.includes('free') && tier !== 'starter scholar' && !tier.includes('scholar (starter)')) {
      return true;
    }
  }

  const planStr = (
    ((user as any).subscriptionPlan ||
      (user as any).planId ||
      (user as any).tier ||
      (user as any).plan ||
      '') + ''
  ).toLowerCase().trim();

  if (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.length > 0) {
    return true;
  }

  return false;
};

// Canonical resolver for user subscription benefits, badges, and tier
export const resolveUserSubscriptionStatus = (user: Partial<UserProfile> | null | undefined): {
  isSubscribed: boolean;
  isExpired: boolean;
  effectiveTier: string;
  tierType: 'free' | 'premium' | 'vip';
  isPremium: boolean;
} => {
  if (!user) {
    return { isSubscribed: false, isExpired: false, effectiveTier: 'Free Scholar', tierType: 'free', isPremium: false };
  }

  const isSuperAdminUser =
    Boolean(user.id && isPrimarySuperAdmin(user.id, user.email)) ||
    Boolean(user.uid && isPrimarySuperAdmin(user.uid, user.email)) ||
    user.email === 'grobaxycompany@gmail.com' ||
    user.id === PRIMARY_SUPER_ADMIN_UID ||
    user.uid === PRIMARY_SUPER_ADMIN_UID;

  const isStaffOrAdmin =
    isSuperAdminUser ||
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    (user.role as string) === 'SUPER_ADMIN' ||
    (user.role as string) === 'ADMIN' ||
    (user.role as string) === 'staff' ||
    (user.name && (user.name.toLowerCase().includes('admin') || user.name.toLowerCase().includes('staff') || user.name.toLowerCase().includes('directorate')));

  const isCommunityManager =
    user.role === 'community_manager' ||
    (user.name && user.name.toLowerCase().includes('community manager'));

  if (isStaffOrAdmin || isCommunityManager) {
    return {
      isSubscribed: true,
      isExpired: false,
      effectiveTier: 'Grobaax Titan Annual VIP',
      tierType: 'vip',
      isPremium: true,
    };
  }

  const isExpired = isSubscriptionExpired(user);

  if (isExpired) {
    // When expired, all benefits, badges, and VIP/premium privileges are automatically removed
    return {
      isSubscribed: false,
      isExpired: true,
      effectiveTier: 'Free Scholar',
      tierType: 'free',
      isPremium: false,
    };
  }

  // If user is explicitly not subscribed
  if (user.isSubscribed === false && !user.isPremium && !user.isVip) {
    return {
      isSubscribed: false,
      isExpired: false,
      effectiveTier: 'Free Scholar',
      tierType: 'free',
      isPremium: false,
    };
  }

  const membership = (user.membershipTier || '').toLowerCase();
  const subTier = (user.subscriptionTier || '').toLowerCase();
  const planStr = (((user as any).subscriptionPlan || (user as any).planId || (user as any).tier || user.activePlanId || '') + '').toLowerCase();

  const userTargetTier = (user as any).targetTier || (user as any).tierType;
  const isVip =
    userTargetTier === 'vip' ||
    Boolean(user.isVip) ||
    membership.includes('vip') ||
    membership.includes('titan') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    planStr.includes('vip') ||
    planStr.includes('titan') ||
    planStr.includes('annual');

  if (isVip) {
    return {
      isSubscribed: true,
      isExpired: false,
      effectiveTier: user.membershipTier || user.subscriptionTier || 'VIP SCHOLAR',
      tierType: 'vip',
      isPremium: true,
    };
  }

  const isPrem = Boolean(
    userTargetTier === 'premium' ||
    user.isPremium ||
    (user as any).isSubscribed ||
    (user.activePlanId && !user.activePlanId.toLowerCase().includes('free')) ||
    (user.subscription && user.subscription.status === 'active') ||
    (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
    (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
    (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.trim().length > 0)
  );

  if (isPrem) {
    const resolvedTier =
      (user.membershipTier && !user.membershipTier.toLowerCase().includes('free') && user.membershipTier) ||
      (user.subscriptionTier && !user.subscriptionTier.toLowerCase().includes('free') && user.subscriptionTier) ||
      ((user as any).subscriptionPlan && !(user as any).subscriptionPlan.toLowerCase().includes('free') && (user as any).subscriptionPlan) ||
      (user.activePlanId && (DEFAULT_SUBSCRIPTION_PLANS.find(p => p.planId === user.activePlanId)?.name)) ||
      'PREMIUM SCHOLAR';

    return {
      isSubscribed: true,
      isExpired: false,
      effectiveTier: resolvedTier,
      tierType: 'premium',
      isPremium: true,
    };
  }

  return {
    isSubscribed: false,
    isExpired: false,
    effectiveTier: 'Free Scholar',
    tierType: 'free',
    isPremium: false,
  };
};

export const getReadNotifSet = (uid?: string, fallbackUid?: string, fbUid?: string | null): Set<string> => {
  const set = new Set<string>();
  const keys = [
    ...(uid ? [`grobax_read_notifs_${uid}`] : []),
    ...(fallbackUid ? [`grobax_read_notifs_${fallbackUid}`] : []),
    ...(fbUid ? [`grobax_read_notifs_${fbUid}`] : []),
    'grobax_read_notifs',
    'grobax_read_notifs_global',
  ];
  keys.forEach((k) => {
    try {
      const stored = localStorage.getItem(k);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((x: string) => {
            if (typeof x === 'string' && x.trim()) set.add(x.trim());
          });
        }
      }
    } catch {}
  });
  return set;
};

export const persistReadNotifKeys = (
  keysToAdd: string[],
  uid?: string,
  fallbackUid?: string,
  fbUid?: string | null
) => {
  const set = getReadNotifSet(uid, fallbackUid, fbUid);
  keysToAdd.forEach((k) => {
    if (k && typeof k === 'string' && k.trim()) set.add(k.trim());
  });
  const arr = Array.from(set);
  const keys = [
    ...(uid ? [`grobax_read_notifs_${uid}`] : []),
    ...(fallbackUid ? [`grobax_read_notifs_${fallbackUid}`] : []),
    ...(fbUid ? [`grobax_read_notifs_${fbUid}`] : []),
    'grobax_read_notifs',
    'grobax_read_notifs_global',
  ];
  keys.forEach((k) => {
    try {
      localStorage.setItem(k, JSON.stringify(arr));
    } catch {}
  });
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('student');
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('grobax_theme') as ThemeMode) || 'dark';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [communitySubTab, setCommunitySubTab] = useState<'minimart' | 'announcements' | 'campus'>('minimart');

  const navigateToCommunitySubTab = useCallback((subTab: 'minimart' | 'announcements' | 'campus') => {
    setCommunitySubTab(subTab);
    setActiveTab('community');
  }, []);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const activeUid = auth.currentUser?.uid;
      if (activeUid) {
        const userSpecific = typeof window !== 'undefined' ? localStorage.getItem(`grobax_user_profile_${activeUid}`) : null;
        if (userSpecific) {
          const parsed = JSON.parse(userSpecific);
          if (parsed && (parsed.id === activeUid || parsed.uid === activeUid)) {
            return parsed;
          }
        }
      }
      const cached = typeof window !== 'undefined' ? localStorage.getItem('grobax_cached_user_profile') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id && parsed.id !== 'user_student') {
          if (activeUid && activeUid !== parsed.id && activeUid !== parsed.uid) {
            return MOCK_USERS.student;
          }
          return parsed;
        }
      }
    } catch {}
    return MOCK_USERS.student;
  });
  const [viewMode, setViewMode] = useState<'app' | 'admin'>('app');
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTabType>('dashboard');
  const [pendingPastQuestions, setPendingPastQuestions] = useState<any[]>([]);

  const navigateToAdminTab = useCallback((tab: AdminTabType) => {
    setViewMode('admin');
    setAdminActiveTab(tab);
  }, []);

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletModalTab, setWalletModalTab] = useState<
    'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact'
  >('profile');
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('grobax_saved_subscription_plans') : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sortSubscriptionPlans(parsed);
      }
    } catch {}
    return sortSubscriptionPlans(DEFAULT_SUBSCRIPTION_PLANS);
  });

  // Active Subscription Plan Sensor state (tracks background polling for Paystack payments)
  const [activePaymentSensor, setActivePaymentSensor] = useState<{
    isMonitoring: boolean;
    pendingReference: string | null;
    planName: string | null;
    lastCheckedAt: number | null;
  }>({
    isMonitoring: false,
    pendingReference: null,
    planName: null,
    lastCheckedAt: null,
  });

  // Balance privacy visibility state (persisted locally)
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('grobax_hide_balance') === 'true';
    } catch {
      return false;
    }
  });

  const toggleBalanceHidden = useCallback(() => {
    setIsBalanceHidden(prev => {
      const next = !prev;
      try {
        localStorage.setItem('grobax_hide_balance', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Authoritative real subscription status
  const isUserSubscribed = useMemo(() => {
    return checkIsUserSubscribed(currentUser);
  }, [currentUser]);

  // Central Upgrade Promotional Card State
  // Appears every 10 minutes for free users, with a continuous 10-minute recurrence interval after dismissal
  const [isUpgradePromoVisible, setIsUpgradePromoVisible] = useState<boolean>(false);
  const dismissedAtRef = useRef<number | null>(null);
  const initialTriggerDoneRef = useRef<boolean>(false);

  // Synchronize promotion visibility when subscription status changes
  useEffect(() => {
    if (isUserSubscribed) {
      setIsUpgradePromoVisible(false);
      dismissedAtRef.current = null;
    }
  }, [isUserSubscribed]);

  // Initial 10-minute entrance timer for free users
  useEffect(() => {
    if (isUserSubscribed || initialTriggerDoneRef.current) return;

    const initialTimer = setTimeout(() => {
      if (!checkIsUserSubscribed(currentUser)) {
        setIsUpgradePromoVisible(true);
        initialTriggerDoneRef.current = true;
      }
    }, 10 * 60 * 1000); // 10 minutes initial delay

    return () => clearTimeout(initialTimer);
  }, [isUserSubscribed, currentUser]);

  // 10-minute continuous recurrence timer for free users after dismissal
  useEffect(() => {
    if (isUserSubscribed) return;

    const intervalId = setInterval(() => {
      // Re-verify real subscription status from context user
      if (checkIsUserSubscribed(currentUser)) {
        setIsUpgradePromoVisible(false);
        return;
      }

      // If promo is already active/visible, do not duplicate
      if (isUpgradePromoVisible) return;

      // Check if 10-minute interval (600,000 ms) has elapsed since dismissal
      if (dismissedAtRef.current !== null) {
        const now = Date.now();
        const timeSinceDismiss = now - dismissedAtRef.current;

        // Re-display promotion every 10 minutes for free users
        if (timeSinceDismiss >= 10 * 60 * 1000) {
          setIsUpgradePromoVisible(true);
          dismissedAtRef.current = null;
        }
      }
    }, 2000); // Check every 2s

    return () => clearInterval(intervalId);
  }, [isUserSubscribed, isUpgradePromoVisible, currentUser]);

  const dismissUpgradePromo = useCallback(() => {
    setIsUpgradePromoVisible(false);
    dismissedAtRef.current = Date.now();
  }, []);

  const openWalletModal = (
    initialTab: 'profile' | 'airtime_data' | 'privacy' | 'withdraw' | 'history' | 'upgrade' | 'contact' = 'profile'
  ) => {
    setWalletModalTab(initialTab);
    setIsWalletModalOpen(true);
  };

  const navigateToEventChannel = useCallback((event: PlatformEventItem) => {
    const channelInfo = resolveEventChannel(event);
    if (channelInfo.url) {
      window.open(channelInfo.url, '_blank');
      return;
    }
    if ((channelInfo.tab as string) === 'profile') {
      openWalletModal('profile');
      return;
    }
    if (channelInfo.tab === 'community' && channelInfo.subTab) {
      navigateToCommunitySubTab(channelInfo.subTab);
    } else {
      setActiveTab(channelInfo.tab);
    }
  }, [navigateToCommunitySubTab]);

  // Auth Modal & Firebase User State
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' = 'LOGIN') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const clearLocalUserCaches = () => {
    try {
      if (typeof window === 'undefined') return;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('grobax_user_profile_') ||
           key.startsWith('grobax_academic_completed_') ||
           key.startsWith('grobax_daily_qa_') ||
           key.startsWith('grobax_read_notifs_') ||
           key.startsWith('grobax_cached_user_profile') ||
           key.startsWith('grobax_saved_wallet_txs') ||
           key.startsWith('grobax_saved_notifications') ||
           key.startsWith('grobax_saved_withdrawals') ||
           key.startsWith('grobax_active_handout_') ||
           key.startsWith('grobax_last_viewed_handout_') ||
           key.startsWith('grobax_handout_library_cache_'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Cache clearance notice:', e);
    }
  };

  const login = (profile: UserProfile) => {
    setCurrentUser(profile);
    if (profile.role) {
      setRoleState(profile.role);
    }
    try {
      localStorage.setItem('grobax_cached_user_profile', JSON.stringify(profile));
      if (profile.id) {
        localStorage.setItem(`grobax_user_profile_${profile.id}`, JSON.stringify(profile));
      }
    } catch {}
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('grobax_theme', newTheme);
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(MOCK_USERS.student);
      setRoleState('student');
      setTransactions([]);
      setNotifications([]);
      setWithdrawals([]);
      clearLocalUserCaches();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Firebase Auth State Listener & Real-time Profile Listener
  useEffect(() => {
    let unsubscribeProfileSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfileSnapshot) {
        unsubscribeProfileSnapshot();
        unsubscribeProfileSnapshot = null;
      }

      setFirebaseUser(user);

      if (user) {
        // If switching from another active user on the same device, immediately flush previous user lists
        setCurrentUser(prev => {
          if (prev.id && prev.id !== 'user_student' && prev.id !== user.uid) {
            setTransactions([]);
            setNotifications([]);
            setWithdrawals([]);
            try {
              localStorage.removeItem('grobax_cached_user_profile');
              localStorage.removeItem('grobax_saved_notifications');
              localStorage.removeItem('grobax_saved_wallet_txs');
              localStorage.removeItem('grobax_saved_withdrawals');
            } catch {}
            return MOCK_USERS.student;
          }
          return prev;
        });

        // Guarantee user document exists in Firestore and is fully populated
        try {
          const profileDoc = await ensureUserInFirestore(user);
          if (!auth.currentUser || auth.currentUser.uid === user.uid) {
            setCurrentUser(profileDoc);
            setRoleState(profileDoc.role || 'student');
            try {
              localStorage.setItem('grobax_cached_user_profile', JSON.stringify(profileDoc));
              localStorage.setItem(`grobax_user_profile_${user.uid}`, JSON.stringify(profileDoc));
            } catch {}
          }

          if (profileDoc.dailyQaUsage?.date && profileDoc.dailyQaUsage?.count !== undefined) {
            try {
              localStorage.setItem(`grobax_daily_qa_${user.uid}_${profileDoc.dailyQaUsage.date}`, String(profileDoc.dailyQaUsage.count));
            } catch {}
          }
          if (profileDoc.academicProfileCompleted) {
            try {
              localStorage.setItem(`grobax_academic_completed_${user.uid}`, 'true');
            } catch {}
          }
        } catch (initErr) {
          console.warn('Initial profile load notice:', initErr);
        } finally {
          setIsAuthReady(true);
        }

        // Real-time snapshot listener on user document with error handling
        try {
          const userDocRef = doc(db, 'users', user.uid);
          unsubscribeProfileSnapshot = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                const isLocallyDone = typeof window !== 'undefined' && localStorage.getItem(`grobax_academic_completed_${user.uid}`) === 'true';
                const academicProfileCompleted = data.academicProfileCompleted === true || isLocallyDone;

                if (academicProfileCompleted) {
                  try {
                    localStorage.setItem(`grobax_academic_completed_${user.uid}`, 'true');
                  } catch {}
                }

                setCurrentUser(prev => {
                  const isSameUser = prev.id === user.uid;
                  const isSuper =
                    isPrimarySuperAdmin(user.uid, user.email || data.email) ||
                    user.email === 'grobaxycompany@gmail.com' ||
                    data.email === 'grobaxycompany@gmail.com' ||
                    user.uid === PRIMARY_SUPER_ADMIN_UID;
                  const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'Scholar');
                  
                  const resolvedName = data.fullName || data.name || (isSameUser ? prev.name : fallbackName);
                  const resolvedFullName = data.fullName || data.name || (isSameUser ? prev.fullName : fallbackName);
                  const resolvedEmail = data.email || user.email || (isSameUser ? prev.email : '');
                  const resolvedUsername = data.username || (isSameUser ? prev.username : (user.displayName ? user.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) : (user.email ? user.email.split('@')[0] : `scholar_${user.uid.substring(0, 5)}`)));
                  const resolvedAvatar = data.profileImage || data.avatar || user.photoURL || (isSameUser ? prev.avatar : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`);
                  const resolvedRole = data.role || (isSuper ? 'admin' : (isSameUser ? prev.role : 'student'));
                  const userIsExpired = !isSuper && isSubscriptionExpired(data);

                  // If user subscription is expired, update Firestore if needed to clean up any stale active flags
                  if (
                    userIsExpired &&
                    (data.isSubscribed ||
                      data.isPremium ||
                      data.isVip ||
                      (data.membershipTier && !data.membershipTier.toLowerCase().includes('free')) ||
                      (data.subscriptionTier && !data.subscriptionTier.toLowerCase().includes('free')) ||
                      data.activePlanId)
                  ) {
                    try {
                      updateDoc(doc(db, 'users', user.uid), {
                        isSubscribed: false,
                        isPremium: false,
                        isVip: false,
                        membershipTier: 'Free Scholar',
                        subscriptionTier: 'Free Scholar',
                        activePlanId: '',
                        planId: '',
                        subscriptionPlan: '',
                        'subscription.status': 'expired',
                      }).catch(() => {});
                    } catch {}
                  }

                  const nextUser: UserProfile = {
                    ...(isSameUser ? prev : MOCK_USERS.student),
                    ...data,
                    id: user.uid,
                    uid: user.uid,
                    name: resolvedName,
                    fullName: resolvedFullName,
                    email: resolvedEmail,
                    username: resolvedUsername,
                    avatar: resolvedAvatar,
                    profileImage: resolvedAvatar,
                    role: resolvedRole,
                    accountStatus: data.accountStatus || 'active',
                    academicProfileCompleted,
                    institution: data.institutionName || data.institution || (isSuper ? 'Grobaax Systems Administration' : (isSameUser ? prev.institution : '')),
                    institutionName: data.institutionName || data.institution || (isSuper ? 'Grobaax Systems Administration' : (isSameUser ? prev.institutionName : '')),
                    institutionCategory: data.institutionCategory || (isSameUser ? prev.institutionCategory : 'University'),
                    faculty: data.facultyName || data.faculty || (isSuper ? 'HQ Overseer' : (isSameUser ? prev.faculty : '')),
                    facultyName: data.facultyName || data.faculty || (isSuper ? 'HQ Overseer' : (isSameUser ? prev.facultyName : '')),
                    facultyId: data.facultyId || (isSameUser ? prev.facultyId : ''),
                    department: data.departmentName || data.department || (isSuper ? 'HQ Overseer' : (isSameUser ? prev.department : '')),
                    departmentName: data.departmentName || data.department || (isSuper ? 'HQ Overseer' : (isSameUser ? prev.departmentName : '')),
                    departmentId: data.departmentId || (isSameUser ? prev.departmentId : ''),
                    level: data.level || (isSuper ? 'Executive Level' : (isSameUser ? prev.level : '100 Level')),
                    gpBalance: data.gpBalance !== undefined && !isNaN(Number(data.gpBalance))
                      ? Number(data.gpBalance)
                      : (isSameUser && typeof prev.gpBalance === 'number' && prev.gpBalance > 0
                          ? prev.gpBalance
                          : (isSuper ? 100000 : 0)),
                    grbxTokens: data.grbxTokens !== undefined ? Number(data.grbxTokens) : (isSameUser ? prev.grbxTokens : 0),
                    stakedTokens: data.stakedTokens !== undefined ? Number(data.stakedTokens) : (isSameUser ? prev.stakedTokens : 0),
                    reputationPoints: data.reputationPoints !== undefined ? Number(data.reputationPoints) : (isSameUser ? prev.reputationPoints : 100),
                    gusRank: data.gusRank !== undefined ? Number(data.gusRank) : (isSameUser ? prev.gusRank : 0),
                    gusTier: data.gusTier || (isSuper ? 'Grandmaster' : (isSameUser ? prev.gusTier : 'Scholar')),
                    walletAddress: data.walletAddress || (isSameUser ? prev.walletAddress : `0x${user.uid.substring(0, 10)}`),
                    activePlanId: isSuper ? 'plan_titan_naira' : (
                      userIsExpired
                        ? ''
                        : (data.activePlanId || (isSameUser ? prev.activePlanId : '') || '')
                    ),
                    membershipTier: isSuper ? 'Grobaax Titan Annual VIP' : (
                      userIsExpired
                        ? 'Free Scholar'
                        : (data.membershipTier || data.subscriptionTier || (isSameUser ? prev.membershipTier : 'Free Scholar') || 'Free Scholar')
                    ),
                    subscriptionTier: isSuper ? 'Grobaax Titan Annual VIP' : (
                      userIsExpired
                        ? 'Free Scholar'
                        : (data.subscriptionTier || data.membershipTier || (isSameUser ? prev.subscriptionTier : 'Free Scholar') || 'Free Scholar')
                    ),
                    subscriptionPlan: isSuper ? 'Grobaax Titan Annual VIP' : (
                      userIsExpired
                        ? ''
                        : (data.subscriptionPlan || data.membershipTier || (isSameUser ? prev.subscriptionPlan : '') || '')
                    ),
                    planId: isSuper ? 'plan_titan_naira' : (
                      userIsExpired
                        ? ''
                        : (data.planId || data.activePlanId || (isSameUser ? prev.planId : '') || '')
                    ),
                    tier: isSuper ? 'Grobaax Titan Annual VIP' : (
                      userIsExpired
                        ? 'Free Scholar'
                        : (data.tier || data.membershipTier || (isSameUser ? prev.tier : 'Free Scholar') || 'Free Scholar')
                    ),
                    plan: isSuper ? 'Grobaax Titan Annual VIP' : (
                      userIsExpired
                        ? ''
                        : (data.plan || data.membershipTier || (isSameUser ? prev.plan : '') || '')
                    ),
                    isSubscribed: isSuper || Boolean(
                      !userIsExpired &&
                      (data.isSubscribed || data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free')) || (data.membershipTier && !data.membershipTier.toLowerCase().includes('free') && data.membershipTier.toLowerCase() !== 'starter scholar') || (isSameUser && prev.isSubscribed))
                    ),
                    isPremium: isSuper || Boolean(
                      !userIsExpired &&
                      (data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free')) || (data.membershipTier && !data.membershipTier.toLowerCase().includes('free') && data.membershipTier.toLowerCase() !== 'starter scholar') || (isSameUser && prev.isPremium))
                    ),
                    isVip: isSuper || Boolean(
                      !userIsExpired &&
                      (data.isVip === true ||
                       (data.membershipTier && (data.membershipTier.toLowerCase().includes('vip') || data.membershipTier.toLowerCase().includes('titan') || data.membershipTier.toLowerCase().includes('annual'))) ||
                       (data.activePlanId && (data.activePlanId.toLowerCase().includes('titan') || data.activePlanId.toLowerCase().includes('vip'))) ||
                       (data.subscriptionTier && (data.subscriptionTier.toLowerCase().includes('vip') || data.subscriptionTier.toLowerCase().includes('titan'))) ||
                       data.gusTier === 'Titan' ||
                       (isSameUser && prev.isVip))
                    ),
                    verified: isSuper || Boolean(
                      data.manualVerified ||
                      data.role === 'admin' ||
                      data.role === 'super_admin' ||
                      (!userIsExpired && (data.verified || data.isVip || data.isPremium || (data.activePlanId && !data.activePlanId.toLowerCase().includes('free'))))
                    ),
                    subscriptionExpiry: isSuper ? '2099-12-31T23:59:59.999Z' : (data.subscriptionExpiry || (isSameUser ? prev.subscriptionExpiry : '') || ''),
                    subscription: isSuper ? {
                      planId: 'plan_titan_naira',
                      name: 'Grobaax Titan Annual VIP',
                      planName: 'Grobaax Titan Annual VIP',
                      price: 25000,
                      currency: 'NGN',
                      duration: '1 Years',
                      startDate: '2025-01-01T00:00:00.000Z',
                      expiryDate: '2099-12-31T23:59:59.999Z',
                      status: 'active',
                    } : (userIsExpired && data.subscription ? { ...data.subscription, status: 'expired' } : (data.subscription || (isSameUser ? prev.subscription : undefined))),
                    privacy: data.privacy || (isSameUser ? prev.privacy : undefined) || {
                      showInstitution: true,
                      showFaculty: true,
                      showDepartment: true,
                      showLevel: true,
                      institutionVisibility: 'Public',
                      departmentVisibility: 'Public',
                      levelVisibility: 'Public',
                      showAcademicInfoOnPosts: true,
                    },
                    badges: data.badges || (isSameUser ? prev.badges : []) || [],
                    purchasedBadgeIds: data.purchasedBadgeIds || (isSameUser ? prev.purchasedBadgeIds : []) || [],
                    dailyQaUsage: data.dailyQaUsage || (isSameUser ? prev.dailyQaUsage : undefined),
                  };

                  try {
                    localStorage.setItem('grobax_cached_user_profile', JSON.stringify(nextUser));
                    localStorage.setItem(`grobax_user_profile_${user.uid}`, JSON.stringify(nextUser));
                  } catch {}

                  return nextUser;
                });

                if (data.dailyQaUsage?.date && data.dailyQaUsage?.count !== undefined) {
                  try {
                    localStorage.setItem(`grobax_daily_qa_${user.uid}_${data.dailyQaUsage.date}`, String(data.dailyQaUsage.count));
                  } catch {}
                }

                if (data.role) {
                  setRoleState(data.role);
                }
              }
            },
            (error) => {
              console.warn('User profile snapshot listener notice:', error.message || error);
            }
          );
        } catch (e) {
          console.warn('Could not establish user profile snapshot:', e);
        }
      } else {
        // Reset to guest / default
        setFirebaseUser(null);
        setCurrentUser(MOCK_USERS.student);
        setRoleState('student');
        setTransactions([]);
        setNotifications([]);
        setWithdrawals([]);
        clearLocalUserCaches();
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfileSnapshot) {
        unsubscribeProfileSnapshot();
      }
    };
  }, []);

  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_community_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(p => !isMockFeedPost(p));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return [];
  });
  const [chatroomMessages, setChatroomMessages] = useState<ChatroomLiveMessage[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_chatroom_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(m => !isMockChatroomMessage(m));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return [];
  });
  const [schoolDomeMessages, setSchoolDomeMessages] = useState<SchoolDomeMessage[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_school_dome_cached_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SCHOOL_DOME_MESSAGES;
  });
  const [events, setEvents] = useState<EventItem[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_platform_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [badgeStore, setBadgeStore] = useState<BadgeStoreItem[]>(MOCK_BADGES_STORE);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [masterInstitutions, setMasterInstitutions] = useState<MasterInstitution[]>([]);
  const [seasons, setSeasons] = useState<LeagueSeason[]>(MOCK_SEASONS);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(MOCK_QUESTION_SETS);
  const [qualificationCompetitions, setQualificationCompetitions] = useState<QualificationCompetition[]>(MOCK_QUALIFICATION_COMPETITIONS);
  const [representativeRecords, setRepresentativeRecords] = useState<RepresentativeRecord[]>(MOCK_REPRESENTATIVE_RECORDS);
  const [representativeAssignments, setRepresentativeAssignments] = useState<RepresentativeAssignment[]>([]);
  const [fixtures, setFixtures] = useState<LeagueFixture[]>(MOCK_FIXTURES);

  // Grobaax Minimart State
  const [minimartProducts, setMinimartProducts] = useState<MinimartProduct[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_minimart_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(p => !isMockMinimartProduct(p));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
    return [];
  });
  const [minimartCategories, setMinimartCategories] = useState<MinimartCategory[]>(INITIAL_MINIMART_CATEGORIES);
  const [minimartConfig, setMinimartConfig] = useState<MinimartConfig>(DEFAULT_MINIMART_CONFIG);
  const [minimartReports, setMinimartReports] = useState<MinimartReport[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [sponsorshipCampaigns, setSponsorshipCampaigns] = useState<SponsorshipCampaign[]>(() => {
    try {
      const saved = localStorage.getItem('grobax_saved_sponsorships');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c: any) => !isMockSponsorshipCampaign(c));
        }
      }
    } catch {}
    return [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gpConversionConfig, setGpConversionConfig] = useState<GpConversionConfig>(() => {
    try {
      const cachedMin = localStorage.getItem('grobax_min_withdrawal_gp');
      const cachedRate = localStorage.getItem('grobax_gp_fiat_rate');
      return {
        ...MOCK_GP_CONVERSION,
        ...(cachedMin ? { minimumWithdrawalGP: Number(cachedMin) } : {}),
        ...(cachedRate ? { gpToFiatRate: Number(cachedRate) } : {}),
      };
    } catch {
      return MOCK_GP_CONVERSION;
    }
  });
  const [upgradePlans, setUpgradePlans] = useState<UpgradePlan[]>(MOCK_UPGRADE_PLANS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const cached = localStorage.getItem('grobax_saved_notifications');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const readSet = getReadNotifSet();
          return parsed.map((n: any) => ({
            ...n,
            isRead: Boolean(n.isRead) || readSet.has(n.id) || readSet.has(`${n.title || ''}_${n.message || ''}`),
          }));
        }
      }
    } catch {}
    return DEFAULT_NOTIFICATIONS;
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const cached = localStorage.getItem('grobax_system_settings_cache');
      const cachedMin = localStorage.getItem('grobax_min_withdrawal_gp');
      const cachedRate = localStorage.getItem('grobax_gp_fiat_rate');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...parsed,
          ...(cachedMin ? { minWithdrawalAmountGp: Number(cachedMin) } : {}),
          ...(cachedRate ? { gpToFiatRate: Number(cachedRate) } : {}),
        };
      }
      if (cachedMin || cachedRate) {
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...(cachedMin ? { minWithdrawalAmountGp: Number(cachedMin) } : {}),
          ...(cachedRate ? { gpToFiatRate: Number(cachedRate) } : {}),
        };
      }
    } catch {}
    return DEFAULT_SYSTEM_SETTINGS;
  });

  // GUS State
  const [gusSeasons, setGusSeasons] = useState<GusSeason[]>(MOCK_GUS_SEASONS);
  const [gusParticipants, setGusParticipants] = useState<GusParticipantRecord[]>(MOCK_GUS_PARTICIPANTS);

  const activeGusSeason = gusSeasons.find(s => s.status === 'Live' || s.status === 'Registration Open') || gusSeasons[0] || null;

  const userGusRecord = gusParticipants.find(p => p.userId === currentUser.id) || null;

  // Active question calculation for live clock
  const currentRound = activeGusSeason?.rounds[activeGusSeason.currentRoundIndex] || null;
  const currentQ = currentRound?.questions[activeGusSeason?.currentQuestionIndex || 0] || null;

  const gusLiveClock: GusLiveClockState | null = activeGusSeason ? {
    seasonId: activeGusSeason.id,
    roundNumber: currentRound ? currentRound.roundNumber : 1,
    questionNumber: (activeGusSeason.currentQuestionIndex || 0) + 1,
    totalQuestionsInRound: currentRound ? currentRound.questions.length : 0,
    currentQuestion: currentQ,
    questionStartAt: Date.now(),
    questionEndAt: Date.now() + (currentQ?.timeLimitSeconds || 15) * 1000,
    secondsRemaining: currentQ?.timeLimitSeconds || 15,
    competitionStatus: activeGusSeason.status === 'Live' ? 'QUESTION_LIVE' : 'WAITING',
    totalParticipantsCount: activeGusSeason.registeredParticipantIds.length + 35000,
    activeParticipantsCount: activeGusSeason.activeParticipantIds.length + 28400,
    eliminatedParticipantsCount: activeGusSeason.eliminatedParticipantIds.length + 6600,
  } : null;

  const registerForGusSeason = (seasonId: string): boolean => {
    const targetSeason = gusSeasons.find(s => s.id === seasonId);
    if (targetSeason && targetSeason.registeredParticipantIds.includes(currentUser.id)) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`gus_registered_${seasonId}_${currentUser.id}`, 'true');
        }
      } catch {}
      return false; // Already registered
    }

    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      if (s.registeredParticipantIds.includes(currentUser.id)) return s;
      return {
        ...s,
        registeredParticipantIds: [...s.registeredParticipantIds, currentUser.id],
        activeParticipantIds: [...s.activeParticipantIds, currentUser.id],
      };
    }));

    setGusParticipants(prev => {
      const existing = prev.find(p => p.userId === currentUser.id);
      if (existing) {
        return prev.map(p => p.userId === currentUser.id ? { ...p, registrationStatus: 'REGISTERED', status: 'ACTIVE', seasonId } : p);
      }
      const newRec: GusParticipantRecord = {
        userId: currentUser.id,
        competitionId: seasonId,
        seasonId,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        institution: currentUser.institution,
        department: currentUser.department,
        level: currentUser.level,
        registrationStatus: 'REGISTERED',
        status: 'ACTIVE',
        currentRound: 1,
        currentQuestion: 1,
        questionsCompleted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        registeredAt: new Date().toISOString().split('T')[0],
      };
      return [...prev, newRec];
    });

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`gus_registered_${seasonId}_${currentUser.id}`, 'true');
      }
    } catch {}

    sendNotification({
      title: '⚔️ GUS Olympiad Registration Confirmed!',
      message: `You are officially registered for ${targetSeason?.title || 'Global Ultimate Search'}. Get ready for elimination rounds!`,
      type: 'gus',
      actionUrl: 'gus',
      targetUserId: currentUser.id,
      userId: currentUser.id,
    });

    return true;
  };

  const submitGusAnswer = (
    seasonId: string,
    roundNumber: number,
    questionIndex: number,
    selectedOptionIndex: number
  ) => {
    const season = gusSeasons.find(s => s.id === seasonId);
    if (!season) return { isCorrect: false, isEliminated: true };

    const round = season.rounds.find(r => r.roundNumber === roundNumber) || season.rounds[0];
    const q = round?.questions[questionIndex];
    if (!q) return { isCorrect: false, isEliminated: true };

    const isCorrect = selectedOptionIndex === (q.correctOptionIndex ?? 0);

    if (isCorrect) {
      setGusParticipants(prev => prev.map(p => {
        if (p.userId !== currentUser.id) return p;
        return {
          ...p,
          questionsCompleted: p.questionsCompleted + 1,
          correctAnswers: p.correctAnswers + 1,
          currentQuestion: questionIndex + 2,
        };
      }));
      return { isCorrect: true, isEliminated: false };
    } else {
      setGusParticipants(prev => prev.map(p => {
        if (p.userId !== currentUser.id) return p;
        return {
          ...p,
          questionsCompleted: p.questionsCompleted + 1,
          incorrectAnswers: p.incorrectAnswers + 1,
          status: 'ELIMINATED',
          eliminatedAtRound: roundNumber,
          eliminatedAtQuestion: questionIndex + 1,
          eliminationReason: 'Wrong Answer',
        };
      }));

      setGusSeasons(prev => prev.map(s => {
        if (s.id !== seasonId) return s;
        return {
          ...s,
          activeParticipantIds: s.activeParticipantIds.filter(id => id !== currentUser.id),
          eliminatedParticipantIds: [...s.eliminatedParticipantIds.filter(id => id !== currentUser.id), currentUser.id],
        };
      }));

      return { isCorrect: false, isEliminated: true };
    }
  };

  const addGusSeason = (seasonData: Omit<GusSeason, 'id' | 'registeredParticipantIds' | 'activeParticipantIds' | 'eliminatedParticipantIds' | 'winners'>) => {
    const newId = 'gus_s_' + Date.now();
    const newSeason: GusSeason = {
      ...seasonData,
      id: newId,
      registeredParticipantIds: [],
      activeParticipantIds: [],
      eliminatedParticipantIds: [],
      winners: [],
    };
    setGusSeasons(prev => [newSeason, ...prev]);
  };

  const updateGusSeason = (seasonId: string, patch: Partial<GusSeason>) => {
    setGusSeasons(prev => prev.map(s => s.id === seasonId ? { ...s, ...patch } : s));
  };

  const addGusRoundToSeason = (seasonId: string, roundData: Omit<GusRound, 'id'>) => {
    const newRoundId = 'rnd_' + Date.now();
    const newRound: GusRound = { ...roundData, id: newRoundId };
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      return { ...s, rounds: [...s.rounds, newRound] };
    }));
  };

  const updateGusRoundInSeason = (seasonId: string, roundId: string, patch: Partial<GusRound>) => {
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        rounds: s.rounds.map(r => r.id === roundId ? { ...r, ...patch } : r),
      };
    }));
  };

  const addQuestionToGusRound = (seasonId: string, roundId: string, questionData: Omit<QuestionItem, 'id'>) => {
    const qId = 'gus_q_' + Date.now();
    const newQ: QuestionItem = { ...questionData, id: qId };
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      return {
        ...s,
        rounds: s.rounds.map(r => {
          if (r.id !== roundId) return r;
          return { ...r, questions: [...r.questions, newQ as any] };
        }),
      };
    }));
  };

  const updateGusPrizes = (seasonId: string, prizes: GusPrizeConfig[]) => {
    setGusSeasons(prev => prev.map(s => s.id === seasonId ? { ...s, prizes } : s));
  };

  const adminControlGusCompetition = (
    seasonId: string,
    action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_ROUND' | 'START_NEXT_ROUND' | 'END_COMPETITION'
  ) => {
    setGusSeasons(prev => prev.map(s => {
      if (s.id !== seasonId) return s;
      if (action === 'START') {
        return { ...s, status: 'Live', currentRoundIndex: 0, currentQuestionIndex: 0 };
      }
      if (action === 'NEXT_QUESTION') {
        const curRound = s.rounds[s.currentRoundIndex];
        if (curRound && s.currentQuestionIndex + 1 < curRound.questions.length) {
          return { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 };
        }
      }
      if (action === 'START_NEXT_ROUND') {
        if (s.currentRoundIndex + 1 < s.rounds.length) {
          return { ...s, currentRoundIndex: s.currentRoundIndex + 1, currentQuestionIndex: 0 };
        }
      }
      if (action === 'END_COMPETITION') {
        return { ...s, status: 'Completed' };
      }
      return s;
    }));
  };

  // ==========================================
  // DOME State & Logic
  // ==========================================
  const [domeSessions, setDomeSessions] = useState<DomeSession[]>(MOCK_DOME_SESSIONS);
  const [domeScoreboard, setDomeScoreboard] = useState<DomeScoreboardEntry[]>(MOCK_DOME_SCOREBOARD);
  const [domeUserProgress, setDomeUserProgress] = useState<DomeUserProgress>(MOCK_DOME_USER_PROGRESS);
  const [domeHistory] = useState<DomeHistoryItem[]>(MOCK_DOME_HISTORY);

  const activeDomeSession = domeSessions.find(s => s.status === 'Live' || s.status === 'Scheduled') || domeSessions[0] || null;

  const currentDomeQ = activeDomeSession?.questions[activeDomeSession?.currentQuestionIndex || 0] || null;

  const domeLiveClock: DomeLiveClockState | null = activeDomeSession ? {
    sessionId: activeDomeSession.id,
    questionNumber: (activeDomeSession.currentQuestionIndex || 0) + 1,
    totalQuestions: activeDomeSession.questions.length || activeDomeSession.totalQuestions,
    currentQuestion: currentDomeQ,
    questionStartAt: activeDomeSession.questionStartAt || Date.now(),
    questionEndAt: activeDomeSession.questionEndAt || (Date.now() + 15000),
    secondsRemaining: currentDomeQ?.timeLimitSeconds || 15,
    sessionStatus: activeDomeSession.status,
    activeParticipantsCount: activeDomeSession.participantsCount,
    answersReceivedCount: Math.floor(activeDomeSession.participantsCount * 0.88),
    correctCount: Math.floor(activeDomeSession.participantsCount * 0.62),
    incorrectCount: Math.floor(activeDomeSession.participantsCount * 0.26),
    avgResponseTimeSeconds: 4.8,
    totalGpDistributed: activeDomeSession.totalGpDistributed,
  } : null;

  const submitDomeAnswer = (
    sessionId: string,
    questionIndex: number,
    selectedOptionIndex: number | null
  ) => {
    const session = domeSessions.find(s => s.id === sessionId);
    if (!session) return { isCorrect: false, gpEarned: 0 };

    const q = session.questions[questionIndex];
    if (!q) return { isCorrect: false, gpEarned: 0 };

    const isCorrect = selectedOptionIndex !== null && selectedOptionIndex === q.correctOptionIndex;
    const gpEarned = isCorrect ? (q.gpReward || session.gpRewardPerQuestion || 10) : 0;

    // 1. Update user progress in Dome
    setDomeUserProgress(prev => {
      const isMissed = selectedOptionIndex === null;
      const newAnswered = prev.questionsAnswered + 1;
      const newCorrect = prev.correct + (isCorrect ? 1 : 0);
      const newIncorrect = prev.incorrect + (!isCorrect && !isMissed ? 1 : 0);
      const newMissed = prev.missed + (isMissed ? 1 : 0);
      const newGp = prev.gpEarned + gpEarned;
      const accuracy = Math.round((newCorrect / newAnswered) * 100);

      return {
        ...prev,
        questionsAnswered: newAnswered,
        correct: newCorrect,
        incorrect: newIncorrect,
        missed: newMissed,
        gpEarned: newGp,
        accuracy,
        userAnswers: {
          ...prev.userAnswers,
          [questionIndex]: {
            selectedOption: selectedOptionIndex,
            isCorrect,
            gpEarned,
          },
        },
      };
    });

    // 2. Authoritatively award GP via verified backend endpoint
    if (isCorrect && gpEarned > 0) {
      const activeUid = firebaseUser?.uid || currentUser.id;
      fetch('/api/wallet/credit-quiz-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUid,
          sessionId,
          questionIndex,
          selectedOptionIndex,
          rewardAmount: gpEarned,
        }),
      })
        .then(async res => {
          const data = await res.json().catch(() => null);
          if (data && data.success && typeof data.newBalance === 'number') {
            setCurrentUser(prev => ({
              ...prev,
              gpBalance: data.newBalance,
            }));
          }
        })
        .catch(err => {
          console.warn('Backend quiz reward verification notice:', err);
        });

      sendNotification({
        title: `⚡ Speed Quiz Achievement: +${gpEarned} GP!`,
        message: `Sharp intellect! You correctly solved the Speed Quiz challenge and earned +${gpEarned} GP directly to your wallet.`,
        type: 'dome',
        actionUrl: 'wallet:history',
        targetUserId: activeUid,
        userId: activeUid,
      });

      // Update session total GP distributed
      setDomeSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        return { ...s, totalGpDistributed: s.totalGpDistributed + gpEarned };
      }));

      // Update user's score on live scoreboard
      setDomeScoreboard(prev => {
        const existing = prev.find(p => p.userId === currentUser.id);
        if (existing) {
          const updated = prev.map(p => {
            if (p.userId !== currentUser.id) return p;
            return {
              ...p,
              correctAnswers: p.correctAnswers + 1,
              questionsAnswered: p.questionsAnswered + 1,
              gpEarned: p.gpEarned + gpEarned,
            };
          });
          return updated.sort((a, b) => b.gpEarned - a.gpEarned).map((p, idx) => ({ ...p, rank: idx + 1 }));
        } else {
          const newEntry: DomeScoreboardEntry = {
            rank: prev.length + 1,
            userId: currentUser.id,
            username: currentUser.name,
            avatar: currentUser.avatar,
            institution: currentUser.institution,
            correctAnswers: 1,
            questionsAnswered: 1,
            gpEarned,
          };
          return [...prev, newEntry].sort((a, b) => b.gpEarned - a.gpEarned).map((p, idx) => ({ ...p, rank: idx + 1 }));
        }
      });
    }

    return { isCorrect, gpEarned };
  };

  const addDomeSession = (sessionData: Omit<DomeSession, 'id' | 'participantsCount' | 'totalGpDistributed' | 'currentQuestionIndex'>) => {
    const newId = 'dome_s_' + Date.now();
    const newSession: DomeSession = {
      ...sessionData,
      id: newId,
      participantsCount: 0,
      totalGpDistributed: 0,
      currentQuestionIndex: 0,
    };
    setDomeSessions(prev => [newSession, ...prev]);
  };

  const updateDomeSession = (sessionId: string, patch: Partial<DomeSession>) => {
    setDomeSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...patch } : s));
  };

  const addQuestionToDomeSession = (sessionId: string, questionData: Omit<DomeQuestionItem, 'id'>) => {
    const qId = 'dq_' + Date.now();
    const newQ: DomeQuestionItem = { ...questionData, id: qId };
    setDomeSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updatedQuestions = [...s.questions, newQ];
      return {
        ...s,
        questions: updatedQuestions,
        totalQuestions: updatedQuestions.length,
      };
    }));
  };

  const adminControlDomeSession = (
    sessionId: string,
    action: 'START' | 'PAUSE' | 'RESUME' | 'NEXT_QUESTION' | 'END_QUESTION' | 'END_SESSION'
  ) => {
    setDomeSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;

      if (action === 'START') {
        const firstQ = s.questions[0];
        return {
          ...s,
          status: 'Live',
          currentQuestionIndex: 0,
          questionStartAt: Date.now(),
          questionEndAt: Date.now() + (firstQ?.timeLimitSeconds || 15) * 1000,
        };
      }
      if (action === 'PAUSE') {
        return { ...s, status: 'Paused' };
      }
      if (action === 'RESUME') {
        const curQ = s.questions[s.currentQuestionIndex];
        return {
          ...s,
          status: 'Live',
          questionStartAt: Date.now(),
          questionEndAt: Date.now() + (curQ?.timeLimitSeconds || 15) * 1000,
        };
      }
      if (action === 'NEXT_QUESTION') {
        if (s.currentQuestionIndex + 1 < s.questions.length) {
          const nextIdx = s.currentQuestionIndex + 1;
          const nextQ = s.questions[nextIdx];
          return {
            ...s,
            currentQuestionIndex: nextIdx,
            questionStartAt: Date.now(),
            questionEndAt: Date.now() + (nextQ?.timeLimitSeconds || 15) * 1000,
          };
        } else {
          return { ...s, status: 'Completed' };
        }
      }
      if (action === 'END_SESSION') {
        return { ...s, status: 'Completed' };
      }

      return s;
    }));
  };

  // Sync current user profile whenever role changes
  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    // SECURITY GUARD: Only verified Super Admins can write and persist role modifications to Firestore
    const isCallerSuperAdmin = isPrimarySuperAdmin(firebaseUser?.uid || currentUser.id, firebaseUser?.email || currentUser.email);
    if (firebaseUser?.uid && isCallerSuperAdmin) {
      setCurrentUser(prev => ({
        ...prev,
        role: newRole,
      }));
      updateUserProfileInFirestore(firebaseUser.uid, { role: newRole }).catch(err => {
        console.warn('Could not update role in Firestore:', err);
      });
    } else {
      // For all other users, role switching is strictly an in-memory preview state for UI testing
      setCurrentUser(prev => ({
        ...prev,
        role: newRole,
      }));
      if (!firebaseUser && MOCK_USERS[newRole]) {
        setCurrentUser(MOCK_USERS[newRole]);
      }
    }
  };

  const toggleRepresentativeStatus = () => {
    setCurrentUser(prev => ({
      ...prev,
      isRepresentative: !prev.isRepresentative,
    }));
  };

  // Theme resolution logic
  useEffect(() => {
    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let effectiveTheme: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      effectiveTheme = theme;
    }

    setResolvedTheme(effectiveTheme);

    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handle system preference changes if in system theme
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const effective = e.matches ? 'dark' : 'light';
      setResolvedTheme(effective);
      if (effective === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Master Institutions Listener using Grobaax Master Data Access Layer
  // Institutions & Academic Master Data - Cached single fetch with localStorage persistence
  useEffect(() => {
    try {
      const cached = localStorage.getItem('grobax_saved_institutions_list');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMasterInstitutions(parsed);
        }
      }
    } catch {}

    // Efficient list fetch with in-memory cache and 1-hour TTL
    institutionRepo.list({ useCache: true, ttlMs: 3600000 }).then((list) => {
      if (list && list.length > 0) {
        setMasterInstitutions(list);
        try {
          localStorage.setItem('grobax_saved_institutions_list', JSON.stringify(list));
        } catch {}
      }
    }).catch((err) => {
      console.warn('Institutions fetch notice (using cache):', err);
    });
  }, []);

  // System Settings & Platform Configuration using Grobaax Master Data Engine
  useEffect(() => {
    try {
      const unsubSettings = grobaxDataService.subscribeDoc<SystemSettings>(
        'system_settings',
        'config',
        (data) => {
          if (data) {
            setSystemSettings(prev => ({ ...DEFAULT_SYSTEM_SETTINGS, ...prev, ...data }));
            const minGp = typeof data.minWithdrawalAmountGp === 'number' && data.minWithdrawalAmountGp > 0 ? data.minWithdrawalAmountGp : undefined;
            const rate = typeof data.gpToFiatRate === 'number' && data.gpToFiatRate > 0 ? data.gpToFiatRate : undefined;
            if (minGp !== undefined || rate !== undefined) {
              setGpConversionConfig(prev => ({
                ...prev,
                ...(minGp !== undefined ? { minimumWithdrawalGP: minGp } : {}),
                ...(rate !== undefined ? { gpToFiatRate: rate } : {}),
              }));
              try {
                if (minGp !== undefined) localStorage.setItem('grobax_min_withdrawal_gp', String(minGp));
                if (rate !== undefined) localStorage.setItem('grobax_gp_fiat_rate', String(rate));
              } catch {}
            }
          }
        },
        (error) => {
          console.warn('System settings live snapshot notice:', error);
        }
      );

      const unsubGp = grobaxDataService.subscribeDoc<GpConversionConfig>(
        'system_settings',
        'gp_conversion',
        (data) => {
          if (data) {
            setGpConversionConfig(prev => {
              const incomingMin = (typeof data.minimumWithdrawalGP === 'number' && data.minimumWithdrawalGP > 0)
                ? data.minimumWithdrawalGP
                : (typeof (data as any).minWithdrawalAmountGp === 'number' && (data as any).minWithdrawalAmountGp > 0)
                  ? (data as any).minWithdrawalAmountGp
                  : prev.minimumWithdrawalGP;
              const incomingRate = (typeof data.gpToFiatRate === 'number' && data.gpToFiatRate > 0)
                ? data.gpToFiatRate
                : prev.gpToFiatRate;
              
              if (incomingMin) {
                try {
                  localStorage.setItem('grobax_min_withdrawal_gp', String(incomingMin));
                } catch {}
              }
              return {
                ...DEFAULT_GP_CONVERSION,
                ...prev,
                ...data,
                ...(incomingMin ? { minimumWithdrawalGP: incomingMin } : {}),
                ...(incomingRate ? { gpToFiatRate: incomingRate } : {}),
              };
            });
          }
        },
        (error) => {
          console.warn('GP conversion live snapshot notice:', error);
        }
      );

      return () => {
        unsubSettings();
        unsubGp();
      };
    } catch (err) {
      console.warn('Live settings subscription init notice:', err);
    }
  }, []);

  // Firestore Real-Time Listener for Notifications & Admin Broadcasts (User-Scoped, limit 20)
  useEffect(() => {
    try {
      const currentUid = firebaseUser?.uid || currentUser.id;
      const currentRole = currentUser.role || 'student';
      const isUserRep = Boolean(currentUser.isRepresentative);
      const isUserAdmin =
        (currentRole as string) === 'admin' ||
        (currentRole as string) === 'super_admin' ||
        (currentRole as string) === 'SUPER_ADMIN' ||
        (currentRole as string) === 'ADMIN' ||
        Boolean((currentUser as any)?.managerRole) ||
        currentUid === PRIMARY_SUPER_ADMIN_UID ||
        firebaseUser?.email === 'grobaxycompany@gmail.com' ||
        currentUser?.email === 'grobaxycompany@gmail.com' ||
        firebaseUser?.email === 'basmock@gmail.com' ||
        currentUser?.email === 'basmock@gmail.com';

      const notifQuery = query(collection(db, 'notifications'), limit(20));
      const unsubNotifs = onSnapshot(
        notifQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            // Read stored read-notification ids & fingerprints from localStorage
            const readSet = getReadNotifSet(currentUid, currentUser.id, firebaseUser?.uid);

            const rawNotifs: NotificationItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const fp = `${data.title || ''}_${data.message || ''}`;
              const isRead = Boolean(data.isRead) || readSet.has(docSnap.id) || (Boolean(fp) && readSet.has(fp));
              return {
                id: docSnap.id,
                title: data.title || 'Platform Notification',
                message: data.message || '',
                type: data.type || 'system',
                timestamp: data.timestamp || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'),
                isRead,
                actionUrl: data.actionUrl || '',
                userId: data.userId || undefined,
                targetUserId: data.targetUserId || data.userId || undefined,
                targetRole: data.targetRole || undefined,
                excludeUserId: data.excludeUserId || undefined,
                senderUserId: data.senderUserId || undefined,
                senderName: data.senderName || undefined,
                senderAvatar: data.senderAvatar || undefined,
                senderInstitution: data.senderInstitution || undefined,
                senderFaculty: data.senderFaculty || undefined,
                senderDepartment: data.senderDepartment || undefined,
                senderLevel: data.senderLevel || undefined,
                senderTier: data.senderTier || undefined,
                requestId: data.requestId || undefined,
                createdAtMs: data.createdAtMillis || (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()),
              };
            });

            // Cleanup: Any prize distribution notification in Firestore that was saved without a target user is invalid and must be purged
            snapshot.docs.forEach((docSnap) => {
              const dData = docSnap.data();
              const lowerT = (dData?.title || '').toLowerCase();
              const lowerM = (dData?.message || '').toLowerCase();
              const isPrize =
                lowerT.includes('prize distributed') ||
                lowerT.includes('prize credited') ||
                lowerT.includes('champion prize') ||
                lowerT.includes('prize split') ||
                lowerM.includes('deposited directly into your wallet') ||
                lowerM.includes('gp has been deposited') ||
                lowerM.includes('equal share of') ||
                lowerM.includes('equal split of');
              if (isPrize && !dData.targetUserId && !dData.userId) {
                deleteDoc(docSnap.ref).catch(() => {});
              }
            });

            // Filter strictly for this specific user so User A and User B receive isolated notifications
            const userScopedNotifs = rawNotifs.filter((notif) => {
              // Exclude creator if set
              if (notif.excludeUserId && notif.excludeUserId === currentUid) return false;

              const lowerTitle = (notif.title || '').toLowerCase();
              const lowerMsg = (notif.message || '').toLowerCase();

              const isPrizeNotification =
                lowerTitle.includes('prize distributed') ||
                lowerTitle.includes('prize credited') ||
                lowerTitle.includes('champion prize') ||
                lowerTitle.includes('prize split') ||
                lowerTitle.includes('prize won') ||
                lowerMsg.includes('deposited directly into your wallet') ||
                lowerMsg.includes('gp has been deposited') ||
                lowerMsg.includes('deposited into your wallet') ||
                lowerMsg.includes('equal share of') ||
                lowerMsg.includes('equal split of');

              // CRITICAL: School Dome prize split & wallet deposit notifications MUST ONLY go to the users that the GP is distributed to!
              if (isPrizeNotification) {
                const target = notif.targetUserId || notif.userId;
                if (!target) return false; // Strictly discard untargeted broadcasts
                return target === currentUid || target === currentUser.username || target === currentUser.id;
              }

              // If targeted to a specific user ID
              if (notif.targetUserId || notif.userId) {
                const target = notif.targetUserId || notif.userId;
                return target === currentUid || target === currentUser.username || target === currentUser.id;
              }

              // Filter out legacy or untargeted personal upgrade / account activity items
              if (
                lowerTitle.includes('upgraded to') ||
                lowerMsg.includes('membership has been upgraded') ||
                lowerTitle.includes('recharge successful') ||
                lowerTitle.includes('withdrawal request') ||
                lowerTitle.includes('reward claimed')
              ) {
                return false;
              }

              // If targeted to a specific role
              if (notif.targetRole && notif.targetRole !== 'ALL') {
                if (notif.targetRole === 'admin') return isUserAdmin;
                if (notif.targetRole === 'representative') return isUserRep;
                if (notif.targetRole === 'student') return !isUserAdmin;
                return notif.targetRole === currentRole;
              }

              // Broadcast for all users (genuine platform announcements, league alerts, arena matches)
              return notif.type === 'announcement' || notif.type === 'dome' || notif.type === 'league' || notif.type === 'gus';
            });

            // Sort newest first
            userScopedNotifs.sort((a, b) => ((b as any).createdAtMs || 0) - ((a as any).createdAtMs || 0));

            const finalNotifs = userScopedNotifs.length > 0 ? userScopedNotifs : DEFAULT_NOTIFICATIONS;
            setNotifications(finalNotifs);
            try {
              localStorage.setItem('grobax_saved_notifications', JSON.stringify(finalNotifs));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_saved_notifications');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const readSet = getReadNotifSet(currentUid, currentUser.id, firebaseUser?.uid);
                  const cleaned = parsed
                    .map((notif: any) => {
                      const fp = `${notif.title || ''}_${notif.message || ''}`;
                      return {
                        ...notif,
                        isRead: Boolean(notif.isRead) || readSet.has(notif.id) || (Boolean(fp) && readSet.has(fp)),
                      };
                    })
                    .filter((notif: any) => {
                      const lowerTitle = (notif.title || '').toLowerCase();
                      const lowerMsg = (notif.message || '').toLowerCase();
                      const isPrize =
                        lowerTitle.includes('prize distributed') ||
                        lowerTitle.includes('prize credited') ||
                        lowerTitle.includes('champion prize') ||
                        lowerTitle.includes('prize split') ||
                        lowerMsg.includes('deposited directly into your wallet') ||
                        lowerMsg.includes('gp has been deposited');
                      if (isPrize) {
                        const target = notif.targetUserId || notif.userId;
                        return target === currentUid || target === currentUser.username || target === currentUser.id;
                      }
                      return true;
                    });
                  setNotifications(cleaned);
                  return;
                }
              }
            } catch {}
            setNotifications(DEFAULT_NOTIFICATIONS);
          }
        },
        (error) => {
          console.warn('Notifications live snapshot notice (using fallback):', error);
          try {
            const cached = localStorage.getItem('grobax_saved_notifications');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const readSet = getReadNotifSet(currentUid, currentUser.id, firebaseUser?.uid);
                const cleaned = parsed
                  .map((notif: any) => {
                    const fp = `${notif.title || ''}_${notif.message || ''}`;
                    return {
                      ...notif,
                      isRead: Boolean(notif.isRead) || readSet.has(notif.id) || (Boolean(fp) && readSet.has(fp)),
                    };
                  })
                  .filter((notif: any) => {
                    const lowerTitle = (notif.title || '').toLowerCase();
                    const lowerMsg = (notif.message || '').toLowerCase();
                    const isPrize =
                      lowerTitle.includes('prize distributed') ||
                      lowerTitle.includes('prize credited') ||
                      lowerTitle.includes('champion prize') ||
                      lowerTitle.includes('prize split') ||
                      lowerMsg.includes('deposited directly into your wallet') ||
                      lowerMsg.includes('gp has been deposited');
                    if (isPrize) {
                      const target = notif.targetUserId || notif.userId;
                      return target === currentUid || target === currentUser.username || target === currentUser.id;
                    }
                    return true;
                  });
                setNotifications(cleaned);
                return;
              }
            }
          } catch {}
          setNotifications(DEFAULT_NOTIFICATIONS);
        }
      );
      return () => unsubNotifs();
    } catch (err) {
      console.warn('Live notifications subscription init notice:', err);
      setNotifications(DEFAULT_NOTIFICATIONS);
    }
  }, [currentUser.id, currentUser.role, currentUser.isRepresentative, currentUser.username, firebaseUser?.uid]);

  // Firestore Real-Time Listener for Platform Events Catalog (limit 50 with cache)
  useEffect(() => {
    let unsubEvents = () => {};

    // 1. Direct initial query from Supabase to guarantee events populate immediately
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'platformEvents'), limit(50)));
        if (!snap.empty) {
          const loadedEvents: EventItem[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const resolvedTargetTab: TabType =
              data.targetTab ||
              (data.category === 'school_dome'
                ? 'school_dome'
                : data.category === 'gus' || data.category === 'academic_olympiad' || data.category === 'chatroom_live'
                ? 'daily_qa'
                : 'community');

            return {
              id: docSnap.id,
              eventId: docSnap.id,
              title: data.title || '',
              category: data.category || (resolvedTargetTab === 'school_dome' ? 'school_dome' : 'gus'),
              categoryLabel: data.categoryLabel,
              host: data.host || OFFICIAL_EVENT_HOST,
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              eventTime: data.eventTime || data.time || '18:00 UTC',
              prizeReward: data.prizeReward || data.prizePool || '',
              audience: data.audience || 'all_users',
              description: data.description || '',
              imageUrl: data.imageUrl || data.image || '',
              imageStoragePath: data.imageStoragePath || '',
              status: data.status || 'Published',
              targetTab: resolvedTargetTab,
              targetSubTab: data.targetSubTab || undefined,
              channelName: data.channelName || undefined,
              channelUrl: data.channelUrl || undefined,
              targetChannel: data.targetChannel || resolvedTargetTab,
              createdBy: data.createdBy,
              createdByName: data.createdByName,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              publishedAt: data.publishedAt,
              date: data.startDate && data.endDate ? `${data.startDate} to ${data.endDate}` : data.date || '',
              time: data.eventTime || data.time || '18:00 UTC',
              prizePool: data.prizeReward || data.prizePool || '',
              institutionHost: data.host || OFFICIAL_EVENT_HOST,
              image: data.imageUrl || data.image || '',
              participantsCount: data.participantsCount || 0,
              maxParticipants: data.maxParticipants || 0,
              isRegistered: data.isRegistered || false,
            };
          });
          setEvents(loadedEvents);
          try {
            localStorage.setItem('grobax_saved_platform_events', JSON.stringify(loadedEvents));
          } catch {}
        }
      } catch (err) {
        console.warn('Direct events fetch notice:', err);
      }
    })();

    // 2. Real-time snapshot listener
    try {
      const eventsQuery = query(collection(db, 'platformEvents'), limit(50));
      unsubEvents = onSnapshot(
        eventsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveEvents: EventItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const resolvedTargetTab: TabType =
                data.targetTab ||
                (data.category === 'school_dome'
                  ? 'school_dome'
                  : data.category === 'gus' || data.category === 'academic_olympiad' || data.category === 'chatroom_live'
                  ? 'daily_qa'
                  : 'community');

              return {
                id: docSnap.id,
                eventId: docSnap.id,
                title: data.title || '',
                category: data.category || (resolvedTargetTab === 'school_dome' ? 'school_dome' : 'gus'),
                categoryLabel: data.categoryLabel,
                host: data.host || OFFICIAL_EVENT_HOST,
                startDate: data.startDate || '',
                endDate: data.endDate || '',
                eventTime: data.eventTime || data.time || '18:00 UTC',
                prizeReward: data.prizeReward || data.prizePool || '',
                audience: data.audience || 'all_users',
                description: data.description || '',
                imageUrl: data.imageUrl || data.image || '',
                imageStoragePath: data.imageStoragePath || '',
                status: data.status || 'Published',
                targetTab: resolvedTargetTab,
                targetSubTab: data.targetSubTab || undefined,
                channelName: data.channelName || undefined,
                channelUrl: data.channelUrl || undefined,
                targetChannel: data.targetChannel || resolvedTargetTab,
                createdBy: data.createdBy,
                createdByName: data.createdByName,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                publishedAt: data.publishedAt,
                // Backward compatibility aliases
                date: data.startDate && data.endDate ? `${data.startDate} to ${data.endDate}` : data.date || '',
                time: data.eventTime || data.time || '18:00 UTC',
                prizePool: data.prizeReward || data.prizePool || '',
                institutionHost: data.host || OFFICIAL_EVENT_HOST,
                image: data.imageUrl || data.image || '',
                participantsCount: data.participantsCount || 0,
                maxParticipants: data.maxParticipants || 0,
                isRegistered: data.isRegistered || false,
              };
            });
            setEvents(liveEvents);
            try {
              localStorage.setItem('grobax_saved_platform_events', JSON.stringify(liveEvents));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_saved_platform_events');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setEvents(parsed);
                  return;
                }
              }
            } catch {}
          }
        },
        (error) => {
          console.warn('Platform Events live snapshot notice:', error);
          try {
            const cached = localStorage.getItem('grobax_saved_platform_events');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEvents(parsed);
              }
            }
          } catch {}
        }
      );
    } catch (err) {
      console.warn('Platform Events subscription init notice:', err);
    }

    // 3. In-window synchronous event listener for instant updates
    const handleEventsChanged = () => {
      try {
        const cached = localStorage.getItem('grobax_saved_platform_events');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEvents(parsed);
          }
        }
      } catch {}
    };
    window.addEventListener('grobax_events_changed', handleEventsChanged);

    return () => {
      unsubEvents();
      window.removeEventListener('grobax_events_changed', handleEventsChanged);
    };
  }, []);

  // Firestore Real-Time Listener for Central Representative System (limit 30)
  useEffect(() => {
    try {
      const repQuery = query(collection(db, 'representativeAssignments'), limit(30));
      const unsubRep = onSnapshot(
        repQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveAssignments: RepresentativeAssignment[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              liveAssignments.push({
                id: docSnap.id,
                assignmentId: docSnap.id,
                userId: data.userId || '',
                userName: data.userName || 'Representative',
                userUsername: data.userUsername || '',
                userAvatar: data.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
                institutionId: data.institutionId || '',
                institutionName: data.institutionName || 'Member Institution',
                department: data.department || '',
                level: data.level || '',
                seasonId: data.seasonId || '',
                seasonName: data.seasonName || '',
                category: data.category || 'University',
                qualificationScore: data.qualificationScore || 0,
                qualificationRank: data.qualificationRank || 1,
                selectedByAdminId: data.selectedByAdminId || '',
                selectedByAdminName: data.selectedByAdminName || '',
                selectedAt: data.selectedAt || new Date().toISOString(),
                status: data.status || 'active',
              });
            });
            setRepresentativeAssignments(liveAssignments);

            // Synchronize legacy representativeRecords
            const activeReps: RepresentativeRecord[] = liveAssignments
              .filter((a) => a.status === 'active')
              .map((a) => ({
                id: a.id || a.assignmentId,
                studentId: a.userId,
                studentName: a.userName,
                avatar: a.userAvatar,
                institutionId: a.institutionId,
                institutionName: a.institutionName,
                department: a.department,
                level: a.level,
                seasonId: a.seasonId,
                qualificationScore: a.qualificationScore || 100,
                selectionStatus: 'Selected',
                selectionDate: a.selectedAt ? a.selectedAt.split('T')[0] : new Date().toISOString().split('T')[0],
              }));
            if (activeReps.length > 0) {
              setRepresentativeRecords(activeReps);
            }
          }
        },
        (error) => {
          console.warn('Representative Assignments snapshot notice:', error);
        }
      );
      return () => unsubRep();
    } catch (err) {
      console.warn('Representative Assignments subscription init notice:', err);
    }
  }, []);

  // Firestore Real-Time Listener for Community Posts, Announcements & Chatroom (Optimized Quota Limits)
  useEffect(() => {
    try {
      // Community Posts (Quota-optimized limit 30 for high performance live feed)
      const postsQuery = query(collection(db, 'posts'), limit(30));
      const unsubPosts = onSnapshot(
        postsQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const livePosts: Post[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              const authData = data.author || {};
              const isPrem = Boolean(
                authData.isPremium ||
                (authData.membershipTier && !authData.membershipTier.toLowerCase().includes('free')) ||
                (authData.subscriptionTier && !authData.subscriptionTier.toLowerCase().includes('free'))
              );
              const isCm = Boolean(
                authData.isCommunityManager ||
                authData.role === 'community_manager' ||
                (authData.name && authData.name.toLowerCase().includes('community manager'))
              );
              const isStaff = Boolean(
                authData.isStaffOrAdmin ||
                authData.role === 'admin' ||
                authData.role === 'super_admin' ||
                (authData.name && (authData.name.toLowerCase().includes('admin') || authData.name.toLowerCase().includes('staff')))
              );

              const createdAtMillis =
                data.createdAt?.toMillis ? data.createdAt.toMillis() :
                (typeof data.createdAtMillis === 'number' ? data.createdAtMillis :
                (docSnap.id.startsWith('post_') && !isNaN(Number(docSnap.id.split('_')[1])) ? Number(docSnap.id.split('_')[1]) :
                (data.timestamp === 'Just now' ? Date.now() : 0)));

              return {
                id: docSnap.id,
                author: {
                  name: authData.name || 'Anonymous Scholar',
                  username: authData.username || '@scholar',
                  avatar: authData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                  role: authData.role || 'student',
                  isRepresentative: authData.isRepresentative,
                  institution: authData.institution || 'Grobaax Scholar',
                  department: authData.department,
                  level: authData.level,
                  privacy: authData.privacy,
                  badges: Array.isArray(authData.badges) ? authData.badges : [],
                  equippedBadge: authData.equippedBadge,
                  membershipTier: authData.membershipTier || authData.subscriptionTier,
                  subscriptionTier: authData.subscriptionTier,
                  isPremium: isPrem,
                  isStaffOrAdmin: isStaff,
                  isCommunityManager: isCm,
                  verified: authData.verified !== undefined ? authData.verified : (isPrem || isStaff || isCm),
                },
                content: data.content || '',
                image: data.image || (data.attachments?.type === 'image' ? data.attachments.data : undefined),
                timestamp: data.timestamp || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'),
                tags: Array.isArray(data.tags) ? data.tags : [],
                likes: typeof data.likes === 'number' ? data.likes : 0,
                commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : (Array.isArray(data.commentsList) ? data.commentsList.length : 0),
                commentsList: Array.isArray(data.commentsList) ? data.commentsList : [],
                shares: typeof data.shares === 'number' ? data.shares : 0,
                isLiked: Boolean(data.isLiked),
                status: data.status || 'Published',
                attachments: data.attachments,
                reports: Array.isArray(data.reports) ? data.reports : [],
                isAiGenerated: Boolean(data.isAiGenerated),
                createdAtMillis,
              } as Post;
            });

            // Sort posts by creation time descending (latest posts at the top)
            livePosts.sort((a: any, b: any) => {
              const timeA = a.createdAtMillis || 0;
              const timeB = b.createdAtMillis || 0;
              return timeB - timeA;
            });

            setPosts(livePosts);
            try {
              localStorage.setItem('grobax_saved_community_posts', JSON.stringify(livePosts));
            } catch {}
          } else {
            try {
              const cached = localStorage.getItem('grobax_saved_community_posts');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setPosts(parsed);
                  return;
                }
              }
            } catch {}
            setPosts(INITIAL_FEED_POSTS);
          }
        },
        (error) => {
          console.warn('Community posts live snapshot notice:', error);
          try {
            const cached = localStorage.getItem('grobax_saved_community_posts');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setPosts(parsed);
              }
            }
          } catch {}
        }
      );

      // Announcements (Limit 15)
      const annQuery = query(collection(db, 'announcements'), limit(15));
      const unsubAnn = onSnapshot(
        annQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveAnn: Announcement[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                title: data.title || '',
                content: data.content || '',
                category: data.category || 'Official',
                author: data.author || 'Admin Desk',
                authorRole: data.authorRole || 'Academic Affairs',
                authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                date: data.date || 'Recent',
                status: data.status || 'Published',
                priority: data.priority || 'Medium',
                isPinned: Boolean(data.isPinned),
                image: data.image,
                important: data.important,
              };
            });
            setAnnouncements(liveAnn);
          }
        },
        (error) => {
          console.warn('Announcements live snapshot notice:', error);
        }
      );

      // Chatroom Live Messages (Order by timestamp desc, quota-optimized limit 35 for live chat preview)
      const chatQuery = query(
        collection(db, 'chatroom_live_messages'),
        orderBy('timestamp', 'desc'),
        limit(35)
      );
      const unsubChat = onSnapshot(
        chatQuery,
        (snapshot) => {
          if (!snapshot.empty) {
            const liveMsgs: ChatroomLiveMessage[] = snapshot.docs
              .map((d) => {
                const data = d.data();
                const parsedTimestamp =
                  typeof data.timestamp === 'number'
                    ? data.timestamp
                    : typeof data.createdAtMillis === 'number'
                    ? data.createdAtMillis
                    : data.createdAt?.toMillis
                    ? data.createdAt.toMillis()
                    : typeof data.createdAt === 'number'
                    ? data.createdAt
                    : (d.id.startsWith('msg_') && !isNaN(Number(d.id.split('_')[1])) ? Number(d.id.split('_')[1]) : Date.now());

                const cleanReactions: Record<string, number> = {};
                if (data.reactions && typeof data.reactions === 'object') {
                  for (const [em, count] of Object.entries(data.reactions)) {
                    let num = 0;
                    if (typeof count === 'number') {
                      num = count;
                    } else if (count && typeof count === 'object' && (count as any).__op === 'increment') {
                      num = Number((count as any).value) || 1;
                    } else if (!isNaN(Number(count))) {
                      num = Number(count);
                    }
                    if (num > 0) cleanReactions[em] = num;
                  }
                }

                return {
                  id: d.id,
                  ...data,
                  reactions: cleanReactions,
                  timestamp: parsedTimestamp,
                } as ChatroomLiveMessage;
              })
              .filter((m) => !m.isDeleted)
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            setChatroomMessages(prev => {
              // Merge snapshot with recent optimistic in-flight messages so newly sent messages and rapid reactions never disappear
              const map = new Map<string, ChatroomLiveMessage>();
              liveMsgs.forEach(m => map.set(m.id, m));
              prev.forEach(p => {
                if (!map.has(p.id)) {
                  if ((Date.now() - (p.timestamp || 0)) < 45000 && !p.isDeleted) {
                    map.set(p.id, p);
                  }
                } else {
                  // Merge reactions so rapid multi-clicks never get rolled back by intermediate snapshots
                  const existing = map.get(p.id)!;
                  const mergedReactions = { ...(existing.reactions || {}) };
                  if (p.reactions) {
                    for (const [em, cnt] of Object.entries(p.reactions)) {
                      mergedReactions[em] = Math.max(Number(mergedReactions[em]) || 0, Number(cnt) || 0);
                    }
                  }
                  map.set(p.id, { ...existing, reactions: mergedReactions });
                }
              });
              const combined = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              try {
                localStorage.setItem('grobax_chatroom_messages', JSON.stringify(combined));
              } catch {}
              return combined;
            });
          } else {
            try {
              const cached = localStorage.getItem('grobax_chatroom_messages');
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setChatroomMessages(parsed);
                  return;
                }
              }
            } catch {}
            setChatroomMessages(MOCK_CHATROOM_MESSAGES);
          }
        },
        (error) => {
          console.warn('Chatroom live snapshot notice:', error);
          try {
            const cached = localStorage.getItem('grobax_chatroom_messages');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChatroomMessages(parsed);
              }
            }
          } catch {}
        }
      );

      // Global School Dome message listener to keep notification signals updated based on users' posts
      const unsubSchoolDome = subscribeSchoolDomeMessages('season_dome_1', (msgs) => {
        setSchoolDomeMessages((prev) => {
          const map = new Map<string, SchoolDomeMessage>();
          msgs.forEach((m) => map.set(m.id, m));
          prev.forEach((p) => {
            if (map.has(p.id)) {
              const existing = map.get(p.id)!;
              const mergedReactions = { ...(existing.reactions || {}) };
              if (p.reactions) {
                for (const [em, cnt] of Object.entries(p.reactions)) {
                  mergedReactions[em] = Math.max(Number(mergedReactions[em]) || 0, Number(cnt) || 0);
                }
              }
              map.set(p.id, { ...existing, reactions: mergedReactions });
            }
          });
          const combined = Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          try {
            localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify(combined));
          } catch {}
          return combined;
        });
      });

      const handleDomeMessagePosted = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.id) {
          setSchoolDomeMessages((prev) => {
            if (prev.some((m) => m.id === detail.id)) return prev;
            const updated = [...prev, detail];
            try {
              localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      };
      window.addEventListener('school_dome_message_posted', handleDomeMessagePosted);

      return () => {
        unsubPosts();
        unsubAnn();
        unsubChat();
        unsubSchoolDome();
        window.removeEventListener('school_dome_message_posted', handleDomeMessagePosted);
      };
    } catch (err) {
      console.warn('Community posts and announcements listener init notice:', err);
    }
  }, []);

  // Real-Time Listeners for Grobaax Minimart & Wallet Engine (Quota-Optimized & Scoped)
  useEffect(() => {
    const currentUid = firebaseUser?.uid || currentUser.id;
    const currentRole = currentUser.role || 'student';
    const isUserAdmin = currentRole === 'admin' || currentRole === 'super_admin' || Boolean((currentUser as any)?.managerRole);

    // Only run initial seeding check once per session and only for admins
    if (isUserAdmin && typeof window !== 'undefined' && !sessionStorage.getItem('grobax_minimart_seed_checked')) {
      sessionStorage.setItem('grobax_minimart_seed_checked', 'true');
      seedInitialMinimartDataToFirestore();
      cleanupMockMinimartProductsFromFirestore();
    } else if (typeof window !== 'undefined' && !sessionStorage.getItem('grobax_mock_minimart_cleaned')) {
      sessionStorage.setItem('grobax_mock_minimart_cleaned', 'true');
      cleanupMockMinimartProductsFromFirestore();
    }

    // Clean up any mock sponsorships in background
    cleanupMockSponsorshipCampaignsFromFirestore().catch(() => {});

    // 1. Minimart Config Listener
    const unsubConfig = minimartRepo.subscribeConfig((config) => {
      if (config) {
        setMinimartConfig(config);
      }
    });

    // 2. Minimart Categories Listener
    const unsubCategories = minimartRepo.subscribeCategories((cats) => {
      if (cats && cats.length > 0) {
        setMinimartCategories(cats);
      }
    });

    // Helper to identify legacy mock minimart products
    const isMockMinimartProduct = (p: any): boolean => {
      if (!p) return false;
      const id = String(p.id || p.productId || '');
      const mockIds = ['prod_1', 'prod_2', 'prod_3', 'prod_4', 'prod_5', 'prod_6', 'prod_7', 'prod_8', 'prod_9'];
      if (mockIds.includes(id)) return true;
      const mockSellerIds = ['usr_unilag_101', 'usr_ui_202', 'usr_covenant_303', 'usr_oau_404', 'usr_unn_505', 'usr_abu_606', 'usr_futa_707', 'usr_unilorin_808'];
      if (p.sellerId && mockSellerIds.includes(p.sellerId)) return true;
      return false;
    };

    // 3. Minimart Products Listener (Limit 30 with sorting)
    const unsubProducts = grobaxDataService.subscribe<any>(
      'minimartProducts',
      { limit: 30, orderBy: [{ field: 'createdAt', direction: 'desc' }] },
      (prods) => {
        let deletedIds = new Set<string>();
        try {
          deletedIds = new Set(JSON.parse(localStorage.getItem('grobax_deleted_minimart_products') || '[]'));
        } catch {}

        // Check if any mock products came through from remote and remove them
        const hasMock = prods.some(isMockMinimartProduct);
        if (hasMock) {
          cleanupMockMinimartProductsFromFirestore();
        }

        const activeProds = prods.filter(
          (p: any) => p.status !== 'removed' && !isMockMinimartProduct(p) && !deletedIds.has(p.id) && !deletedIds.has(p.productId)
        );

        // Auto-mark expired products
        const now = Date.now();
        const processed = activeProds.map((p: any) => {
          if (p.status === 'active' && p.expiresAt) {
            const expTime = new Date(p.expiresAt).getTime();
            if (now >= expTime) {
              return { ...p, status: 'expired' as const };
            }
          }
          return p;
        });
        processed.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMinimartProducts(processed);
      },
      (err) => console.warn('Minimart products snapshot notice:', err)
    );

    // 4. Minimart Reports Listener (Admin-Only)
    let unsubReports = () => {};
    if (isUserAdmin) {
      unsubReports = grobaxDataService.subscribe<MinimartReport>(
        'minimartReports',
        { limit: 30 },
        (reps) => {
          const sorted = [...reps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setMinimartReports(sorted);
        },
        (err) => console.warn('Minimart reports snapshot notice:', err)
      );
    }

    // 5. User Subscriptions Listener (Strictly Scoped: Only own subscription for students)
    let unsubSubs = () => {};
    if (isUserAdmin) {
      unsubSubs = grobaxDataService.subscribe<any>(
        'userSubscriptions',
        { limit: 50 },
        (subs) => {
          setUserSubscriptions(subs);
        },
        (err) => console.warn('User subscriptions snapshot notice:', err)
      );
    } else if (currentUid && currentUid !== 'user_student') {
      unsubSubs = grobaxDataService.subscribe<any>(
        'userSubscriptions',
        { where: [['userId', '==', currentUid]], limit: 5 },
        (subs) => {
          setUserSubscriptions(subs);
        },
        (err) => console.warn('User subscriptions snapshot notice:', err)
      );
    }

    // 6. Admin Subscription Plans Listener (Limit 25 + Cache)
    const unsubPlans = onSnapshot(
      query(collection(db, 'subscriptionPlans'), limit(25)),
      (snap) => {
        if (!snap.empty) {
          const loaded: SubscriptionPlan[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              planId: data.planId || docSnap.id,
              name: data.name || '',
              shortDescription: data.shortDescription || '',
              fullDescription: data.fullDescription || '',
              priceNaira: typeof data.priceNaira === 'number' ? data.priceNaira : Number(data.priceNaira || 0),
              currency: 'NGN',
              durationValue: typeof data.durationValue === 'number' ? data.durationValue : Number(data.durationValue || 30),
              durationUnit: data.durationUnit || 'Days',
              benefits: Array.isArray(data.benefits) ? data.benefits : [],
              features: Array.isArray(data.features) ? data.features : [],
              badgeLabel: data.badgeLabel || '',
              featured: Boolean(data.featured),
              active: data.active !== false,
              displayOrder: typeof data.displayOrder === 'number' ? data.displayOrder : Number(data.displayOrder || 1),
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            });
          });
          const sorted = sortSubscriptionPlans(loaded);
          setSubscriptionPlans(sorted);
          try {
            localStorage.setItem('grobax_saved_subscription_plans', JSON.stringify(sorted));
            const freeP = loaded.find(p => p.planId === 'plan_free_scholar' || p.id === 'plan_free_scholar');
            if (freeP) {
              localStorage.setItem('grobax_saved_free_scholar_plan', JSON.stringify(freeP));
            }
          } catch {}
        }
      },
      (err) => console.warn('Subscription plans snapshot notice:', err)
    );

    // 7. Authoritative Wallet Transactions (Scoped: user gets own 25, admin gets top 50)
    const txQuery = isUserAdmin
      ? query(collection(db, 'walletTransactions'), limit(50))
      : (currentUid && currentUid !== 'user_student')
      ? query(collection(db, 'walletTransactions'), where('userId', '==', currentUid), limit(25))
      : query(collection(db, 'walletTransactions'), limit(10));

    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        if (!snap.empty) {
          const loadedTxs: Transaction[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const formattedDate = data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }) : 'Recent');

            return {
              id: docSnap.id,
              type: data.type || 'reward',
              amount: typeof data.amount === 'number' ? data.amount : Number(data.amount || 0),
              unit: data.unit || 'GP',
              title: data.title || 'Wallet Transaction',
              description: data.description || '',
              date: formattedDate,
              status: data.status || 'completed',
              isCredit: Boolean(data.isCredit),
              transactionId: data.transactionId || docSnap.id,
              userId: data.userId || '',
              userName: data.userName || '',
              userEmail: data.userEmail || '',
              userAvatar: data.userAvatar || '',
              institutionName: data.institutionName || '',
              adminUid: data.adminUid || '',
              adminName: data.adminName || '',
              reason: data.reason || '',
              createdAt: data.createdAt,
              meta: data.meta || null,
            };
          });

          // Sort newest first
          loadedTxs.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            if (timeA && timeB) return timeB - timeA;
            return 0;
          });

          const dedupedTxs = deduplicateTransactionList(loadedTxs);
          setTransactions(dedupedTxs);
          try {
            localStorage.setItem('grobax_saved_wallet_txs', JSON.stringify(dedupedTxs));
          } catch {}
        }
      },
      (err) => {
        console.warn('Wallet transactions live snapshot notice:', err);
        try {
          const cached = localStorage.getItem('grobax_saved_wallet_txs');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTransactions(deduplicateTransactionList(parsed));
            }
          }
        } catch {}
      }
    );

    // 8. One-time Sponsor Ticker Fetch (getDocs exactly once on component load, preventing Firebase read leaks)
    const spQuery = query(collection(db, 'sponsors'), limit(20));
    getDocs(spQuery)
      .then((snap) => {
        const loadedSponsors: SponsorshipCampaign[] = snap.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              sponsorName: data.sponsorName || '',
              title: data.title || '',
              text: data.text || '',
              logo: data.logo || '📢',
              banner: data.banner || '',
              destinationUrl: data.destinationUrl || '',
              ctaText: data.ctaText || 'Learn More',
              tag: data.tag || '',
              badgeLabel: data.badgeLabel || 'Sponsored',
              placement: data.placement || 'Ticker',
              priority: data.priority || 'High',
              status: data.status || 'Active',
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              impressions: typeof data.impressions === 'number' ? data.impressions : 0,
              clicks: typeof data.clicks === 'number' ? data.clicks : 0,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
              createdBy: data.createdBy || 'Admin',
            } as SponsorshipCampaign;
          })
          .filter((c) => !isMockSponsorshipCampaign(c));

        setSponsorshipCampaigns(loadedSponsors);
        try {
          localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(loadedSponsors));
        } catch {}
      })
      .catch((err) => {
        console.warn('One-time sponsors getDocs notice:', err);
      });

    // 8b. Real-time GP Store Badges catalog synchronization (Quota-optimized limit 20)
    const gpStoreQuery = query(collection(db, 'gpStore'), limit(20));
    const unsubGpStore = onSnapshot(
      gpStoreQuery,
      (snap) => {
        if (!snap.empty) {
          const loadedBadges: BadgeStoreItem[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name || data.title || 'Honour Badge',
              image: data.image || data.icon || '🏆',
              gpPrice: typeof data.gpPrice === 'number' ? data.gpPrice : (Number(data.gpPrice) || 100),
              description: data.description || '',
              active: data.active !== false,
              color: data.color || 'bg-amber-500/20 text-amber-400 border-amber-500/30',
              createdDate: data.createdDate || new Date().toISOString().split('T')[0],
              purchasesCount: data.purchasesCount || 0,
            };
          });

          const merged = [...loadedBadges];
          MOCK_BADGES_STORE.forEach((defBadge) => {
            if (!merged.some((b) => b.id === defBadge.id || b.name.toLowerCase() === defBadge.name.toLowerCase())) {
              merged.push(defBadge);
            }
          });
          setBadgeStore(merged);
        }
      },
      (err) => {
        console.warn('gpStore onSnapshot notice:', err);
      }
    );

    // 9. Authoritative Student GP Withdrawals Listener (Scoped: user gets own 15, admin gets 50)
    const wdQuery = isUserAdmin
      ? query(collection(db, 'withdrawals'), limit(50))
      : (currentUid && currentUid !== 'user_student')
      ? query(collection(db, 'withdrawals'), where('userId', '==', currentUid), limit(15))
      : query(collection(db, 'withdrawals'), limit(10));

    const unsubWithdrawals = onSnapshot(
      wdQuery,
      (snap) => {
        if (!snap.empty) {
          const loadedWds: WithdrawalRecord[] = snap.docs.map((docSnap) => {
            const data = docSnap.data();
            const createdAtMillis = data.createdAt?.toMillis
              ? data.createdAt.toMillis()
              : (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : (typeof data.createdAtMillis === 'number' ? data.createdAtMillis : Date.now()));
            return {
              id: docSnap.id,
              userId: data.userId || '',
              username: data.username || data.accountName || 'Scholar',
              userAvatar: data.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
              amountGP: Number(data.amountGP || 0),
              fiatValue: data.fiatValue || `₦${(Number(data.amountGP || 0) * 1).toLocaleString()}`,
              requestDate: data.requestDate || (data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent'),
              status: data.status || 'Pending',
              bankName: data.bankName || 'Bank',
              accountNumber: data.accountNumber || '',
              accountName: data.accountName || 'Student Account',
              reference: data.reference || docSnap.id.substring(0, 10),
              adminNotes: data.adminNotes || '',
              createdAtMillis,
            } as unknown as WithdrawalRecord;
          });
          setWithdrawals(loadedWds);
          try {
            localStorage.setItem('grobax_saved_withdrawals', JSON.stringify(loadedWds));
          } catch {}
        }
      },
      (err) => {
        console.warn('Withdrawals live snapshot notice:', err);
        try {
          const cached = localStorage.getItem('grobax_saved_withdrawals');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) setWithdrawals(parsed);
          }
        } catch {}
      }
    );

    // Past questions collection query removed (replaced by AI Handout generation library)
    const unsubPastQuestions = () => {};

    return () => {
      unsubConfig();
      unsubCategories();
      unsubProducts();
      unsubReports();
      unsubSubs();
      unsubPlans();
      unsubTx();
      unsubWithdrawals();
      unsubPastQuestions();
      unsubGpStore();
    };
  }, [currentUser.id, currentUser.role, firebaseUser?.uid]);

  const toggleEventRegistration = (eventId: string) => {
    setEvents(prev =>
      prev.map(ev => {
        if (ev.id === eventId) {
          const isRegistered = !ev.isRegistered;
          return {
            ...ev,
            isRegistered,
            participantsCount: isRegistered ? ev.participantsCount + 1 : ev.participantsCount - 1,
          };
        }
        return ev;
      })
    );
  };

  const addAnnouncement = (newAnn: Omit<Announcement, 'id' | 'date'>) => {
    const item: Announcement = {
      ...newAnn,
      id: 'ann_' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    };
    setAnnouncements(prev => [item, ...prev]);
    saveAnnouncementToFirestore(item).catch(err => console.warn('Notice saving announcement to Firestore:', err));
  };

  const checkUserPostEligibility = (targetUserId?: string): UserPostEligibility => {
    const uid = targetUserId || currentUser.id;
    const isTargetCurrentUser = uid === currentUser.id;
    const userRole = isTargetCurrentUser ? (currentUser.role || 'student').toLowerCase() : 'student';

    // 1. Staff and Admins always get VIP unlimited posting capabilities
    if (
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole === 'community_manager' ||
      userRole === 'staff' ||
      (currentUser.name && currentUser.name.toLowerCase().includes('admin')) ||
      (currentUser.name && currentUser.name.toLowerCase().includes('staff'))
    ) {
      return {
        userId: uid,
        postCountLast24h: 0,
        dailyLimit: 'unlimited',
        remainingPosts: 'unlimited',
        userTier: 'vip',
        canCreatePost: true,
      };
    }

    // 2. Evaluate Subscription Tier
    let tier: 'free' | 'premium' | 'vip' = 'free';
    const isTargetUserExpired = isTargetCurrentUser && currentUser.subscriptionExpiry
      ? new Date(currentUser.subscriptionExpiry).getTime() <= Date.now()
      : false;

    if (!isTargetUserExpired) {
      const activeSub = userSubscriptions.find(
        s => (s.userId === uid || (isTargetCurrentUser && s.userId === currentUser.id)) && s.status === 'active'
      );

      if (activeSub) {
        if (activeSub.targetTier === 'vip' || activeSub.tierType === 'vip' || activeSub.isVip) {
          tier = 'vip';
        } else if (activeSub.targetTier === 'premium' || activeSub.tierType === 'premium') {
          tier = 'premium';
        } else {
          const pName = (activeSub.planNameSnapshot || '').toLowerCase();
          const pId = (activeSub.planId || '').toLowerCase();
          if (pName.includes('vip') || pName.includes('titan') || pName.includes('annual') || pId.includes('vip') || pId.includes('titan')) {
            tier = 'vip';
          } else {
            tier = 'premium';
          }
        }
      } else if (isTargetCurrentUser) {
        const membership = (currentUser.membershipTier || '').toLowerCase();
        const subTier = (currentUser.subscriptionTier || '').toLowerCase();
        const planStr = ((currentUser.subscriptionPlan || (currentUser as any).planId || (currentUser as any).tier || currentUser.activePlanId || '') + '').toLowerCase();
        const isActivelySubscribed = isUserSubscribed || checkIsUserSubscribed(currentUser);

        const isVipTier =
          (currentUser as any).targetTier === 'vip' ||
          (currentUser as any).tierType === 'vip' ||
          Boolean(currentUser.isVip) ||
          membership.includes('vip') ||
          membership.includes('titan') ||
          subTier.includes('vip') ||
          subTier.includes('titan') ||
          planStr.includes('vip') ||
          planStr.includes('titan') ||
          planStr.includes('annual');

        if (isVipTier) {
          tier = 'vip';
        } else if (
          isActivelySubscribed ||
          currentUser.isPremium ||
          (currentUser.activePlanId && !currentUser.activePlanId.toLowerCase().includes('free')) ||
          (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
          (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
          (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.trim().length > 0)
        ) {
          tier = 'premium';
        }
      }
    }

    // 3. VIP tier: Unlimited posts!
    if (tier === 'vip') {
      return {
        userId: uid,
        postCountLast24h: 0,
        dailyLimit: 'unlimited',
        remainingPosts: 'unlimited',
        userTier: 'vip',
        canCreatePost: true,
      };
    }

    // 4. Calculate posts made in the last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const currentUsername = (currentUser.username || '').toLowerCase().trim();
    const currentFullName = (currentUser.name || currentUser.fullName || '').toLowerCase().trim();

    // Count user posts in memory
    const userPosts = posts.filter(p => {
      if (p.status === 'Deleted') return false;
      const authorAny = p.author as any;
      const isMatch =
        (p as any).userId === uid ||
        authorAny?.id === uid ||
        authorAny?.userId === uid ||
        (authorAny?.username && currentUsername && authorAny.username.toLowerCase().trim() === currentUsername) ||
        (authorAny?.name && currentFullName && authorAny.name.toLowerCase().trim() === currentFullName);
      if (!isMatch) return false;
      const time = p.createdAtMillis || (p.id.startsWith('post_') && !isNaN(Number(p.id.split('_')[1])) ? Number(p.id.split('_')[1]) : 0);
      return time >= oneDayAgo;
    });

    // Also check localStorage post log for reliable client-side enforcement
    let localLog: number[] = [];
    try {
      const stored = localStorage.getItem(`grobax_post_log_${uid}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localLog = parsed.filter(t => typeof t === 'number' && t >= oneDayAgo);
        }
      }
    } catch {}

    const postCount = Math.max(userPosts.length, localLog.length);
    const limit = tier === 'premium' ? 3 : 1;
    const remaining = Math.max(0, limit - postCount);
    const canCreate = remaining > 0;

    let reason: string | undefined;
    let hoursRemaining: number | undefined;
    let nextEligibleDate: string | null = null;

    if (!canCreate) {
      const timestamps = [
        ...userPosts.map(p => p.createdAtMillis || (p.id.startsWith('post_') && !isNaN(Number(p.id.split('_')[1])) ? Number(p.id.split('_')[1]) : Date.now())),
        ...localLog,
      ].filter(t => t >= oneDayAgo).sort((a, b) => a - b);

      if (timestamps.length > 0) {
        const oldestTime = timestamps[0];
        const nextTime = oldestTime + 24 * 60 * 60 * 1000;
        const diffMs = Math.max(0, nextTime - Date.now());
        hoursRemaining = Math.max(1, Math.ceil(diffMs / (60 * 60 * 1000)));
        nextEligibleDate = new Date(nextTime).toISOString();
      }

      if (tier === 'free') {
        reason = `Free scholars can only post once in 24 hours. Your next post is available in ${hoursRemaining || 24}h. Upgrade to Premium (3 posts/24h) or VIP (Unlimited) to post now!`;
      } else {
        reason = `You have reached your limit of 3 posts in 24 hours. Your next post is available in ${hoursRemaining || 24}h. Upgrade to VIP for unlimited posts!`;
      }
    }

    return {
      userId: uid,
      postCountLast24h: postCount,
      dailyLimit: limit,
      remainingPosts: remaining,
      userTier: tier,
      canCreatePost: canCreate,
      hoursRemaining,
      nextEligibleDate,
      reason,
    };
  };

  const createPost = async (content: string, tags: string[], attachmentData?: string): Promise<void> => {
    // 1. Enforce 24-hour post allowance per subscription tier (Free: 1, Premium: 3, VIP: Unlimited)
    const eligibility = checkUserPostEligibility(currentUser.id);
    if (!eligibility.canCreatePost) {
      throw new Error(eligibility.reason || 'You have reached your 24-hour post limit.');
    }

    const subInfo = resolveUserSubscriptionStatus(currentUser);
    const hasUpgradedPlan = subInfo.isSubscribed;
    const effectiveTier = subInfo.effectiveTier;

    const isStaffOrAdmin =
      currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      currentUser.name.toLowerCase().includes('admin') ||
      currentUser.name.toLowerCase().includes('staff');

    const isCommunityManager =
      currentUser.role === 'community_manager' ||
      currentUser.name.toLowerCase().includes('community manager');

    const nowMillis = Date.now();
    const newPost: Post = {
      id: 'post_' + nowMillis + '_' + Math.random().toString(36).substring(2, 6),
      author: {
        id: currentUser.id,
        name: currentUser.name || currentUser.fullName || 'Grobaax Scholar',
        username: currentUser.username || '@scholar',
        avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: currentUser.role || 'student',
        isRepresentative: currentUser.isRepresentative,
        institution: currentUser.institution || currentUser.institutionName || 'Grobaax Scholar',
        department: currentUser.department || currentUser.departmentName,
        level: currentUser.level,
        privacy: currentUser.privacy,
        badges: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager ? (currentUser.badges || []) : [],
        equippedBadge: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager ? currentUser.equippedBadge : undefined,
        membershipTier: effectiveTier,
        subscriptionTier: effectiveTier,
        subscriptionExpiry: currentUser.subscriptionExpiry,
        isPremium: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager,
        isStaffOrAdmin,
        isCommunityManager,
        verified: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager || currentUser.verified,
      } as any,
      content,
      image: attachmentData && (attachmentData.startsWith('http') || attachmentData.startsWith('data:')) ? attachmentData : undefined,
      timestamp: 'Just now',
      tags,
      likes: 0,
      commentsCount: 0,
      shares: 0,
      isLiked: false,
      status: 'Published',
      attachments: attachmentData ? { type: attachmentData.startsWith('http') ? 'image' : 'code', data: attachmentData } : undefined,
      createdAtMillis: nowMillis,
    } as Post;

    setPosts(prev => {
      const updated = [newPost, ...prev];
      try {
        localStorage.setItem('grobax_saved_community_posts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Record user post in local log for instant quota caching
    try {
      const key = `grobax_post_log_${currentUser.id}`;
      const stored = localStorage.getItem(key);
      const log: number[] = stored ? JSON.parse(stored) : [];
      log.push(nowMillis);
      localStorage.setItem(key, JSON.stringify(log));
    } catch {}

    try {
      await saveCommunityPostToFirestore(newPost);
    } catch (err) {
      console.warn('Notice saving post to Firestore:', err);
    }
  };

  const toggleLikePost = (id: string) => {
    let updatedLikes = 0;
    let nextIsLiked = false;
    setPosts(prev =>
      prev.map(p => {
        if (p.id === id) {
          nextIsLiked = !p.isLiked;
          updatedLikes = nextIsLiked ? p.likes + 1 : Math.max(0, p.likes - 1);
          return {
            ...p,
            isLiked: nextIsLiked,
            likes: updatedLikes,
          };
        }
        return p;
      })
    );
    toggleLikeCommunityPostInFirestore(id, updatedLikes, nextIsLiked).catch(err =>
      console.warn('Notice toggling post like in Firestore:', err)
    );
  };

  const claimReward = async (amount: number, unit: 'GRBX' | 'GP', reason: string) => {
    // SECURITY GUARD: Direct client-side currency creation is neutralized
    console.warn('[SECURITY DEFENSE] Direct client reward claiming is disabled. Rewards must be authoritatively issued by backend services.');
    return;
  };

  const buyBadge = async (badge: BadgeStoreItem): Promise<boolean> => {
    const currentGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
    if (currentGp < badge.gpPrice) {
      return false;
    }
    if (currentUser.purchasedBadgeIds.includes(badge.id)) {
      return false; // Already purchased
    }

    const updatedBadges = [
      ...currentUser.badges,
      {
        id: badge.id,
        title: badge.name,
        icon: badge.image,
        color: badge.color,
      },
    ];
    const updatedPurchasedIds = [...currentUser.purchasedBadgeIds, badge.id];
    const newGpBalance = Math.max(0, currentGp - badge.gpPrice);

    setCurrentUser(prev => ({
      ...prev,
      gpBalance: newGpBalance,
      purchasedBadgeIds: updatedPurchasedIds,
      badges: updatedBadges,
    }));

    const targetUid = firebaseUser?.uid || currentUser.id;
    if (targetUid) {
      try {
        await updateUserProfileInFirestore(targetUid, {
          gpBalance: newGpBalance,
          purchasedBadgeIds: updatedPurchasedIds,
          badges: updatedBadges,
        });
      } catch (e) {
        console.warn('buyBadge firestore sync notice:', e);
      }
    }

    addTransaction({
      type: 'badge_purchase',
      amount: badge.gpPrice,
      unit: 'GP',
      title: `Badge Acquired: ${badge.name}`,
      description: `Unlocked and equipped ${badge.name} badge`,
      isCredit: false,
    });

    // Send real-time push notification for achievement badge acquisition
    sendNotification({
      title: `🏆 Achievement Unlocked: ${badge.name}!`,
      message: `Congratulations! You've unlocked the "${badge.name}" achievement badge. It is now preserved in your Trophy Cabinet.`,
      type: 'announcement',
      actionUrl: 'wallet:profile',
      targetUserId: targetUid,
      userId: targetUid,
    });

    return true;
  };

  const requestGpWithdrawal = (
    gpAmount: number,
    bankName: string,
    accountNumber: string,
    accountName?: string
  ): boolean => {
    const currentGp = typeof currentUser.gpBalance === 'number' ? currentUser.gpBalance : Number(currentUser.gpBalance || 0);
    if (currentGp < gpAmount) return false;
    const rate = gpConversionConfig.gpToFiatRate || 1;
    const fiatNumber = gpAmount * rate;
    const fiatVal = `₦${fiatNumber.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NGN`;
    const newGpBalance = Math.max(0, currentGp - gpAmount);

    setCurrentUser(prev => ({
      ...prev,
      gpBalance: newGpBalance,
    }));

    const targetUid = firebaseUser?.uid || currentUser.id || 'scholar';

    const newRecord: WithdrawalRecord = {
      id: 'w_' + Date.now(),
      userId: targetUid,
      username: currentUser.name || currentUser.fullName || 'Scholar',
      userAvatar: currentUser.avatar,
      amountGP: gpAmount,
      fiatValue: fiatVal,
      requestDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: 'Pending',
      bankName,
      accountNumber,
      accountName: accountName || currentUser.name || 'Scholar',
      reference: 'TX-WD-' + Math.floor(100000 + Math.random() * 900000),
    };

    setWithdrawals(prev => [newRecord, ...prev]);

    submitWithdrawalRequestInFirestore(newRecord).catch(e => {
      console.warn('Firestore withdrawal request submission notice:', e);
    });

    if (targetUid) {
      try {
        deductUserGpInFirestore(targetUid, gpAmount, {
          type: 'withdrawal',
          title: 'GP Cash Out Request',
          description: `Cash out request of ${gpAmount.toLocaleString()} GP (${fiatVal}) to ${bankName} (${accountNumber})`,
          skipTransactionDoc: true, // addTransaction handles recording below
        }).catch(e => console.warn('requestGpWithdrawal user balance sync notice:', e));
      } catch (e) {
        console.warn('requestGpWithdrawal firestore sync notice:', e);
      }
    }

    addTransaction({
      type: 'gp_withdrawal',
      amount: gpAmount,
      unit: 'GP',
      title: 'GP Cash Out Request',
      description: `Converted ${gpAmount.toLocaleString()} GP to ${fiatVal} payout (${bankName} - ${accountNumber})`,
      isCredit: false,
    });

    if (targetUid) {
      sendNotification({
        title: '💸 Withdrawal Request Submitted',
        message: `Your cash out request of ${gpAmount.toLocaleString()} GP (${fiatVal}) to ${bankName} (${accountNumber}) has been submitted for processing.`,
        type: 'wallet',
        targetUserId: targetUid,
        userId: targetUid,
        actionUrl: '#wallet',
      });
    }

    return true;
  };

  const updatePrivacy = async (newPrivacy: Partial<PrivacySettings>) => {
    const updatedPrivacy = {
      ...currentUser.privacy,
      ...newPrivacy,
    };
    setCurrentUser(prev => ({
      ...prev,
      privacy: updatedPrivacy,
    }));

    if (firebaseUser) {
      try {
        await updateUserProfileInFirestore(firebaseUser.uid, {
          privacy: updatedPrivacy,
        });
      } catch (e) {
        console.warn('updatePrivacy firestore sync notice:', e);
      }
    }
  };

  const addMasterInstitution = (inst: Omit<MasterInstitution, 'id' | 'activeInSeason' | 'hidden'>) => {
    const newInst: MasterInstitution = {
      ...inst,
      id: 'inst_' + Date.now(),
      activeInSeason: true,
      hidden: false,
    };
    setMasterInstitutions(prev => [...prev, newInst]);
  };

  const updateMasterInstitution = (id: string, data: Partial<MasterInstitution>) => {
    setMasterInstitutions(prev =>
      prev.map(i => (i.id === id ? { ...i, ...data } : i))
    );
  };

  const addDepartmentToInstitution = (instId: string, departmentName: string) => {
    setMasterInstitutions(prev =>
      prev.map(inst => {
        if (inst.id === instId && !inst.departments.includes(departmentName)) {
          return { ...inst, departments: [...inst.departments, departmentName] };
        }
        return inst;
      })
    );
  };

  const removeDepartmentFromInstitution = (instId: string, departmentName: string) => {
    setMasterInstitutions(prev =>
      prev.map(inst => {
        if (inst.id === instId) {
          return { ...inst, departments: inst.departments.filter(d => d !== departmentName) };
        }
        return inst;
      })
    );
  };

  const toggleInstitutionSeason = (id: string) => {
    setMasterInstitutions(prev =>
      prev.map(i => (i.id === id ? { ...i, activeInSeason: !i.activeInSeason } : i))
    );
  };

  const toggleInstitutionHidden = (id: string) => {
    setMasterInstitutions(prev =>
      prev.map(i => (i.id === id ? { ...i, hidden: !i.hidden } : i))
    );
  };

  // Seasons Manager
  const addSeason = (season: Omit<LeagueSeason, 'id'>) => {
    const newSeason: LeagueSeason = {
      ...season,
      id: 'sea_' + Date.now(),
    };
    setSeasons(prev => [...prev, newSeason]);
  };

  const updateSeasonStatus = (seasonId: string, status: LeagueSeason['status']) => {
    setSeasons(prev =>
      prev.map(s => (s.id === seasonId ? { ...s, status } : s))
    );
  };

  const toggleSeasonParticipation = (seasonId: string, instId: string) => {
    setSeasons(prev =>
      prev.map(s => {
        if (s.id === seasonId) {
          const currentList = s.participatingInstitutionIds || [];
          const exists = currentList.includes(instId);
          return {
            ...s,
            participatingInstitutionIds: exists
              ? currentList.filter(id => id !== instId)
              : [...currentList, instId],
          };
        }
        return s;
      })
    );
  };

  // Question Set Manager
  const addQuestionSet = (qSet: Omit<QuestionSet, 'id'>) => {
    const newSet: QuestionSet = {
      ...qSet,
      id: 'qset_' + Date.now(),
    };
    setQuestionSets(prev => [...prev, newSet]);
  };

  const addQuestionToSet = (qSetId: string, question: Omit<QuestionItem, 'id'>) => {
    const newQuestion: QuestionItem = {
      ...question,
      id: 'q_' + Date.now(),
    };
    setQuestionSets(prev =>
      prev.map(qs => (qs.id === qSetId ? { ...qs, questions: [...qs.questions, newQuestion] } : qs))
    );
  };

  // Qualifications & Representatives
  const addQualificationCompetition = (qual: Omit<QualificationCompetition, 'id'>) => {
    const newQual: QualificationCompetition = {
      ...qual,
      id: 'qual_' + Date.now(),
    };
    setQualificationCompetitions(prev => [...prev, newQual]);
  };

  const assignRepresentative = async (studentData: {
    studentId: string;
    studentName: string;
    studentUsername?: string;
    avatar?: string;
    institutionId: string;
    institutionName?: string;
    department?: string;
    level?: string;
    seasonId?: string;
    score?: number;
  }) => {
    try {
      await assignRepresentativeInFirestore(
        {
          userId: studentData.studentId,
          userName: studentData.studentName,
          userUsername: studentData.studentUsername,
          userAvatar: studentData.avatar,
          institutionId: studentData.institutionId,
          institutionName: studentData.institutionName,
          department: studentData.department,
          level: studentData.level,
          seasonId: studentData.seasonId || 'sea_univ_1',
          qualificationScore: studentData.score || 100,
          status: 'active',
        },
        currentUser?.id || 'admin_sys',
        currentUser?.name || 'Super Admin'
      );

      if (currentUser?.id === studentData.studentId || currentUser?.name === studentData.studentName) {
        setCurrentUser((prev) => ({ ...prev, isRepresentative: true, role: (prev.role === 'student' ? 'representative' : prev.role) as any }));
      }
    } catch (err) {
      console.error('Failed to assign central representative in AppContext:', err);
    }
  };

  const removeRepresentative = async (repIdOrInstId: string) => {
    try {
      await removeRepresentativeInFirestore(
        repIdOrInstId,
        currentUser?.id || 'admin_sys',
        currentUser?.name || 'Super Admin'
      );
    } catch (err) {
      console.error('Failed to remove representative in AppContext:', err);
    }
  };

  const updateFixtureScore = (id: string, homeScore: number, awayScore: number, status: 'Live' | 'Upcoming' | 'Completed') => {
    setFixtures(prev =>
      prev.map(f => (f.id === id ? { ...f, homeScore, awayScore, status } : f))
    );
  };

  const addFixture = (fix: Omit<LeagueFixture, 'id'>) => {
    const newFix: LeagueFixture = {
      ...fix,
      id: 'fix_' + Date.now(),
    };
    setFixtures(prev => [newFix, ...prev]);
  };

  const updateFixtureState = (id: string, patch: Partial<LeagueFixture>) => {
    setFixtures(prev =>
      prev.map(f => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  // Dynamic Standings Calculation from Master Institutions and Fixtures
  const calculateStandings = (category: InstitutionCategory, seasonId?: string): InstitutionRank[] => {
    const insts = masterInstitutions.filter(i => i.type === category && !i.hidden);
    
    // Relevant completed fixtures
    const completedFixes = fixtures.filter(f => {
      const matchCat = f.category === category;
      const matchCompleted = f.status === 'Completed';
      const matchSeason = seasonId ? f.seasonId === seasonId : true;
      return matchCat && matchCompleted && matchSeason;
    });

    const statsMap: Record<string, { played: number; won: number; lost: number; points: number; scored: number; conceded: number }> = {};

    insts.forEach(inst => {
      statsMap[inst.name] = { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };
      // Also map by shortName
      statsMap[inst.shortName] = statsMap[inst.name];
    });

    completedFixes.forEach(fix => {
      const homeStats = statsMap[fix.homeInst] || { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };
      const awayStats = statsMap[fix.awayInst] || { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };

      homeStats.played += 1;
      awayStats.played += 1;

      homeStats.scored += fix.homeScore;
      homeStats.conceded += fix.awayScore;

      awayStats.scored += fix.awayScore;
      awayStats.conceded += fix.homeScore;

      if (fix.homeScore > fix.awayScore) {
        homeStats.won += 1;
        homeStats.points += 3;
        awayStats.lost += 1;
      } else if (fix.awayScore > fix.homeScore) {
        awayStats.won += 1;
        awayStats.points += 3;
        homeStats.lost += 1;
      } else {
        homeStats.points += 1;
        awayStats.points += 1;
      }

      statsMap[fix.homeInst] = homeStats;
      statsMap[fix.awayInst] = awayStats;
    });

    const list: InstitutionRank[] = insts.map(inst => {
      const st = statsMap[inst.name] || { played: 0, won: 0, lost: 0, points: 0, scored: 0, conceded: 0 };
      const repRecord = representativeRecords.find(r => r.institutionId === inst.id);

      return {
        id: inst.id,
        rank: 0,
        name: inst.name,
        shortName: inst.shortName,
        logo: inst.logo,
        type: inst.type as any,
        played: st.played,
        won: st.won,
        lost: st.lost,
        points: st.points,
        scoreDiff: st.scored - st.conceded,
        goldMedals: st.won * 2,
        silverMedals: st.lost,
        bronzeMedals: 1,
        representative: repRecord ? repRecord.studentName : 'Official Delegate',
        trend: 'same',
        region: inst.state,
        scholarsCount: 150 + st.points * 10,
      };
    });

    // Sort by Points DESC, then scoreDiff DESC, then played ASC
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      return a.played - b.played;
    });

    // Assign rank positions
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  };

  const triggerAiBroadcast = (content: string) => {
    const aiPost: Post = {
      id: 'ai_post_' + Date.now(),
      author: {
        name: 'GRBX AI Academic Sentinel',
        username: '@grbx_ai_sentinel',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        role: 'admin',
        institution: 'GRBX Central Intelligence',
        verified: true,
      },
      content: `🤖 AUTOMATED BROADCAST: ${content}`,
      timestamp: 'Just now',
      tags: ['AIBroadcast', 'LeagueNotice', 'Automated'],
      likes: 0,
      commentsCount: 0,
      shares: 0,
      isLiked: false,
      isAiGenerated: true,
    };
    setPosts(prev => [aiPost, ...prev]);
  };

  // =========================================================================
  // GROBAAX MINIMART HANDLERS
  // =========================================================================

  const checkUserListingEligibility = (targetUserId?: string): UserListingEligibility => {
    const uid = targetUserId || currentUser.id;
    const isTargetCurrentUser = uid === currentUser.id;
    const userRole = isTargetCurrentUser ? (currentUser.role || 'student').toLowerCase() : 'student';

    // 1. Staff and Admins always get VIP listing capabilities
    if (
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole === 'community_manager' ||
      userRole === 'staff' ||
      currentUser.name?.toLowerCase().includes('admin')
    ) {
      const todayListings = minimartProducts.filter(p => {
        if (p.sellerId !== uid) return false;
        if (p.status === 'removed' || p.status === 'archived') return false;
        const createdTime = new Date(p.createdAt).getTime();
        return createdTime >= Date.now() - 24 * 60 * 60 * 1000;
      });
      const count = todayListings.length;
      const limit = minimartConfig.vipDailyListingLimit || 6;
      const remaining = Math.max(0, limit - count);
      return {
        userId: uid,
        todayCount: count,
        dailyLimit: limit,
        remainingToday: remaining,
        userTier: 'vip',
        canCreateProduct: remaining > 0 && minimartConfig.enabled,
        listingDurationHours: minimartConfig.vipListingDurationHours || 12,
        reason: remaining <= 0 ? `VIP daily listing limit reached (${count}/${limit}). You can list another product tomorrow.` : undefined,
      };
    }

    // 2. Evaluate Subscription Tier & Status for standard users
    let tier: 'free' | 'premium' | 'vip' = 'free';

    // Check expiration if present
    const isTargetUserExpired = isTargetCurrentUser && currentUser.subscriptionExpiry
      ? new Date(currentUser.subscriptionExpiry).getTime() <= Date.now()
      : false;

    if (!isTargetUserExpired) {
      // Check userSubscriptions collection
      const activeSub = userSubscriptions.find(
        s => (s.userId === uid || (isTargetCurrentUser && s.userId === currentUser.id)) && s.status === 'active'
      );

      if (activeSub) {
        if (activeSub.targetTier === 'vip' || activeSub.tierType === 'vip' || activeSub.isVip) {
          tier = 'vip';
        } else if (activeSub.targetTier === 'premium' || activeSub.tierType === 'premium') {
          tier = 'premium';
        } else {
          const pName = (activeSub.planNameSnapshot || '').toLowerCase();
          const pId = (activeSub.planId || '').toLowerCase();
          if (pName.includes('vip') || pName.includes('titan') || pName.includes('annual') || pId.includes('vip') || pId.includes('titan')) {
            tier = 'vip';
          } else {
            tier = 'premium';
          }
        }
      } else if (isTargetCurrentUser) {
        const membership = (currentUser.membershipTier || '').toLowerCase();
        const subTier = (currentUser.subscriptionTier || '').toLowerCase();
        const planStr = ((currentUser.subscriptionPlan || (currentUser as any).planId || (currentUser as any).tier || currentUser.activePlanId || '') + '').toLowerCase();
        const isActivelySubscribed = isUserSubscribed || checkIsUserSubscribed(currentUser);

        const isVipTier =
          (currentUser as any).targetTier === 'vip' ||
          (currentUser as any).tierType === 'vip' ||
          Boolean(currentUser.isVip) ||
          membership.includes('vip') ||
          membership.includes('titan') ||
          subTier.includes('vip') ||
          subTier.includes('titan') ||
          planStr.includes('vip') ||
          planStr.includes('titan') ||
          planStr.includes('annual');

        if (isVipTier) {
          tier = 'vip';
        } else if (
          isActivelySubscribed ||
          currentUser.isPremium ||
          (currentUser.activePlanId && !currentUser.activePlanId.toLowerCase().includes('free')) ||
          (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
          (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
          (planStr && !planStr.includes('free') && planStr !== 'starter scholar' && planStr.trim().length > 0)
        ) {
          tier = 'premium';
        }
      }
    }

    // 3. Free Users cannot create or publish listings
    if (tier === 'free') {
      return {
        userId: uid,
        todayCount: 0,
        dailyLimit: 0,
        remainingToday: 0,
        userTier: 'free',
        canCreateProduct: false,
        listingDurationHours: 0,
        reason: 'Selling on Grobaax Minimart is exclusive to Premium (3/day, 12hrs) and VIP (6/day, 12hrs) subscribers. Free accounts are discovery-only.',
      };
    }

    // 4. Premium & VIP limits calculation
    const limit = tier === 'vip' ? (minimartConfig.vipDailyListingLimit || 6) : (minimartConfig.premiumDailyListingLimit || 3);
    const durationHours = tier === 'vip' ? (minimartConfig.vipListingDurationHours || 12) : (minimartConfig.premiumListingDurationHours || 12);

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const todayListings = minimartProducts.filter(p => {
      if (p.sellerId !== uid) return false;
      if (p.status === 'removed' || p.status === 'archived') return false;
      const createdTime = new Date(p.createdAt).getTime();
      return createdTime >= oneDayAgo;
    });

    const count = todayListings.length;
    const remaining = Math.max(0, limit - count);
    const canCreate = remaining > 0 && minimartConfig.enabled;

    let reason: string | undefined;
    if (!minimartConfig.enabled) {
      reason = 'Minimart listings are temporarily paused by administrators.';
    } else if (remaining <= 0) {
      reason = `${tier.toUpperCase()} daily limit reached (${count}/${limit}). You can list another product tomorrow.`;
    }

    return {
      userId: uid,
      todayCount: count,
      dailyLimit: limit,
      remainingToday: remaining,
      userTier: tier,
      canCreateProduct: canCreate,
      listingDurationHours: durationHours,
      reason,
    };
  };

  const addMinimartProduct = async (
    productData: Omit<MinimartProduct, 'id' | 'productId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'reportsCount' | 'viewsCount'>
  ): Promise<{ success: boolean; error?: string; product?: MinimartProduct }> => {
    try {
      const eligibility = checkUserListingEligibility(productData.sellerId);
      if (!eligibility.canCreateProduct) {
        return {
          success: false,
          error: eligibility.reason || 'You are not eligible to list products at this time.',
        };
      }

      const now = Date.now();
      const durationHours = eligibility.listingDurationHours || 12;
      const expiresAt = new Date(now + durationHours * 60 * 60 * 1000).toISOString();
      const generatedId = `prod_${now}_${Math.random().toString(36).substring(2, 6)}`;

      const newProduct: MinimartProduct = {
        ...productData,
        id: generatedId,
        productId: generatedId,
        status: 'active',
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        expiresAt,
        subscriptionPlan: eligibility.userTier,
        listingDurationHours: durationHours,
        reportsCount: 0,
        viewsCount: 0,
      };

      // 1. Optimistic Local State Update
      setMinimartProducts(prev => [newProduct, ...prev]);

      // 2. Persist to Firestore
      await saveMinimartProductToFirestore(newProduct);

      // 3. Sync with backend API
      try {
        await fetch('/api/minimart/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newProduct,
            userRole: currentUser.role,
          }),
        });
      } catch (apiErr) {
        console.warn('Minimart backend API sync notice:', apiErr);
      }

      return { success: true, product: newProduct };
    } catch (err: any) {
      console.error('Error adding Minimart product:', err);
      return { success: false, error: err.message || 'Failed to list product.' };
    }
  };

  const updateMinimartProduct = async (
    productId: string,
    updates: Partial<MinimartProduct>
  ): Promise<{ success: boolean; error?: string; product?: MinimartProduct }> => {
    try {
      let updatedProduct: MinimartProduct | undefined;

      setMinimartProducts(prev =>
        prev.map(p => {
          if (p.id === productId || p.productId === productId) {
            updatedProduct = {
              ...p,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            return updatedProduct;
          }
          return p;
        })
      );

      if (updatedProduct) {
        await saveMinimartProductToFirestore(updatedProduct);

        try {
          await fetch(`/api/minimart/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...updates,
              userId: currentUser.id,
              userRole: currentUser.role,
            }),
          });
        } catch (apiErr) {
          console.warn('Minimart update backend sync notice:', apiErr);
        }
      }

      return { success: true, product: updatedProduct };
    } catch (err: any) {
      console.error('Error updating Minimart product:', err);
      return { success: false, error: err.message || 'Failed to update product.' };
    }
  };

  const deleteMinimartProduct = async (productId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Record in local deleted set for persistence across fallback/reloads
      try {
        const deletedArr: string[] = JSON.parse(localStorage.getItem('grobax_deleted_minimart_products') || '[]');
        if (!deletedArr.includes(productId)) {
          deletedArr.push(productId);
          localStorage.setItem('grobax_deleted_minimart_products', JSON.stringify(deletedArr));
        }
      } catch {}

      // Immediately purge from UI state
      setMinimartProducts(prev => prev.filter(p => p.id !== productId && p.productId !== productId));
      setMinimartReports(prev => prev.filter(r => r.productId !== productId));

      await deleteMinimartProductFromFirestore(productId);

      try {
        await fetch(`/api/minimart/products/${productId}?userId=${currentUser.id}&userRole=${currentUser.role}`, {
          method: 'DELETE',
        });
      } catch (apiErr) {
        console.warn('Minimart delete backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting Minimart product:', err);
      return { success: false, error: err.message || 'Failed to delete product.' };
    }
  };

  const reportMinimartProduct = async (
    productId: string,
    reason: MinimartReportReason,
    description: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const product = minimartProducts.find(p => p.id === productId || p.productId === productId);
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newReport: MinimartReport = {
        id: reportId,
        reportId,
        productId,
        productName: product?.productName || 'Minimart Listing',
        sellerId: product?.sellerId,
        sellerName: product?.sellerName,
        reportedBy: currentUser.id,
        reporterName: currentUser.name,
        reason,
        description,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      setMinimartReports(prev => [newReport, ...prev]);
      await submitMinimartReportToFirestore(newReport);

      try {
        await fetch(`/api/minimart/products/${productId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReport),
        });
      } catch (apiErr) {
        console.warn('Minimart report backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error submitting report:', err);
      return { success: false, error: err.message || 'Failed to submit report.' };
    }
  };

  const updateMinimartProductStatus = async (
    productId: string,
    status: MinimartProductStatus
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartProducts(prev =>
        prev.map(p => (p.id === productId || p.productId === productId ? { ...p, status, updatedAt: new Date().toISOString() } : p))
      );

      await updateMinimartProductStatusInFirestore(productId, status);

      try {
        await fetch('/api/minimart/admin/moderate-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, status }),
        });
      } catch (apiErr) {
        console.warn('Minimart moderate backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating product status:', err);
      return { success: false, error: err.message || 'Failed to update status.' };
    }
  };

  const saveMinimartCategory = async (category: MinimartCategory): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartCategories(prev => {
        const idx = prev.findIndex(c => c.id === category.id || c.categoryId === category.categoryId);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = category;
          return clone;
        }
        return [...prev, category];
      });

      await saveMinimartCategoryToFirestore(category);

      try {
        await fetch('/api/minimart/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(category),
        });
      } catch (apiErr) {
        console.warn('Minimart save category backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving category:', err);
      return { success: false, error: err.message || 'Failed to save category.' };
    }
  };

  const deleteMinimartCategory = async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartCategories(prev => prev.filter(c => c.id !== categoryId && c.categoryId !== categoryId));
      await deleteMinimartCategoryFromFirestore(categoryId);

      try {
        await fetch(`/api/minimart/categories/${categoryId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Minimart delete category backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting category:', err);
      return { success: false, error: err.message || 'Failed to delete category.' };
    }
  };

  const saveMinimartConfig = async (configUpdates: Partial<MinimartConfig>): Promise<{ success: boolean; error?: string }> => {
    try {
      const merged = { ...minimartConfig, ...configUpdates };
      setMinimartConfig(merged);
      await saveMinimartConfigToFirestore(merged);

      try {
        await fetch('/api/minimart/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
      } catch (apiErr) {
        console.warn('Minimart save config backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving Minimart config:', err);
      return { success: false, error: err.message || 'Failed to update config.' };
    }
  };

  const moderateMinimartReport = async (
    reportId: string,
    action: 'dismiss' | 'resolve' | 'suspend_product',
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setMinimartReports(prev =>
        prev.map(r => {
          if (r.id === reportId || r.reportId === reportId) {
            return {
              ...r,
              status: action === 'dismiss' ? ('dismissed' as const) : ('resolved' as const),
              reviewedAt: new Date().toISOString(),
              reviewedBy: currentUser.name,
              adminNotes,
            };
          }
          return r;
        })
      );

      await moderateMinimartReportInFirestore(reportId, action, adminNotes, currentUser.id);

      if (action === 'suspend_product') {
        const rep = minimartReports.find(r => r.id === reportId || r.reportId === reportId);
        if (rep?.productId) {
          updateMinimartProductStatus(rep.productId, 'suspended');
        }
      }

      try {
        await fetch(`/api/minimart/admin/reports/${reportId}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, adminNotes, adminId: currentUser.id }),
        });
      } catch (apiErr) {
        console.warn('Minimart moderate report backend sync notice:', apiErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error moderating report:', err);
      return { success: false, error: err.message || 'Failed to moderate report.' };
    }
  };

  const updateMinimartConfig = saveMinimartConfig;

  const addMinimartCategory = async (categoryData: Omit<MinimartCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; error?: string }> => {
    const newCategory: MinimartCategory = {
      ...categoryData,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return saveMinimartCategory(newCategory);
  };

  const updateMinimartCategory = async (categoryId: string, updates: Partial<MinimartCategory>): Promise<{ success: boolean; error?: string }> => {
    const existing = minimartCategories.find(c => c.id === categoryId || c.categoryId === categoryId);
    if (!existing) return { success: false, error: 'Category not found' };
    const updated: MinimartCategory = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return saveMinimartCategory(updated);
  };

  const resolveMinimartReport = async (reportId: string, action: string, notes?: string): Promise<{ success: boolean; error?: string }> => {
    const actionNormalized =
      action === 'dismissed' || action === 'dismiss'
        ? 'dismiss'
        : action === 'resolved' || action === 'resolve'
        ? 'resolve'
        : 'suspend_product';
    return moderateMinimartReport(reportId, actionNormalized as any, notes);
  };

  const updateAnnouncement = (id: string, patch: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    deleteAnnouncementFromFirestore(id).catch(err => console.warn('Notice removing announcement from Firestore:', err));
  };

  const publishAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, status: 'Published', publishDate: new Date().toISOString().split('T')[0] } : a));
  };

  const scheduleAnnouncement = (id: string, scheduleDate: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, status: 'Scheduled', scheduleDate } : a));
  };

  const unpublishAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, status: 'Draft' } : a));
  };

  const pinAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
  };

  const hidePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'Hidden' } : p));
  };

  const deletePost = (postId: string) => {
    const postToDelete = posts.find(p => p.id === postId);
    setPosts(prev => {
      const updated = prev.filter(p => p.id !== postId);
      try {
        localStorage.setItem('grobax_saved_community_posts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    deleteCommunityPostFromFirestore(
      postId,
      postToDelete?.content,
      currentUser?.id || 'admin_user',
      currentUser?.name || 'Administrator'
    ).catch(err => console.warn('Notice removing community post from Firestore:', err));
  };

  const updatePost = async (postId: string, content: string, tags: string[], image?: string) => {
    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            content,
            tags,
            image: image !== undefined ? image : p.image,
            attachments: image ? ({ type: 'image', data: image } as any) : p.attachments,
          };
        }
        return p;
      });
      try {
        localStorage.setItem('grobax_saved_community_posts', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await updateCommunityPostInFirestore(postId, {
        content,
        tags,
        image: image !== undefined ? image : '',
        attachments: image ? { type: 'image', data: image } : undefined,
      });
    } catch (err) {
      console.warn('Notice updating community post in Firestore:', err);
    }
  };

  const deletePlatformEvent = async (eventId: string) => {
    const ev = events.find(e => e.id === eventId || e.eventId === eventId);
    setEvents(prev => {
      const updated = prev.filter(e => e.id !== eventId && e.eventId !== eventId);
      try {
        localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await deletePlatformEventFromFirestore(
        eventId,
        ev?.title || 'Platform Event',
        ev?.imageStoragePath,
        currentUser?.id || PRIMARY_SUPER_ADMIN_UID,
        currentUser?.name || 'Administrator'
      );
    } catch (err) {
      console.warn('Notice deleting platform event from Firestore:', err);
    }
  };

  const savePlatformEvent = async (eventData: Partial<PlatformEventItem>): Promise<string> => {
    const adminUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
    const adminName = currentUser?.name || 'Administrator';
    const eventId = await savePlatformEventToFirestore(eventData, adminUid, adminName);

    const catObj = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === eventData.category);
    const resolvedTargetTab: TabType =
      eventData.targetTab || (eventData.category === 'school_dome' ? 'school_dome' : catObj?.tabKey || 'daily_qa');
    const fullEvent: EventItem = {
      id: eventId,
      eventId,
      title: (eventData.title || '').trim(),
      category: eventData.category || (resolvedTargetTab === 'school_dome' ? 'school_dome' : 'gus'),
      categoryLabel: catObj?.label || eventData.categoryLabel || 'Platform Event',
      host: OFFICIAL_EVENT_HOST,
      startDate: eventData.startDate || new Date().toISOString().split('T')[0],
      endDate: eventData.endDate || new Date().toISOString().split('T')[0],
      eventTime: eventData.eventTime || '18:00 UTC',
      prizeReward: (eventData.prizeReward || '').trim(),
      audience: 'all_users',
      description: (eventData.description || '').trim(),
      imageUrl: eventData.imageUrl || eventData.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      imageStoragePath: eventData.imageStoragePath || '',
      status: eventData.status || 'Published',
      targetTab: resolvedTargetTab,
      targetSubTab: eventData.targetSubTab || catObj?.subTab || undefined,
      channelName: eventData.channelName || catObj?.channelName || undefined,
      channelUrl: eventData.channelUrl || undefined,
      targetChannel: eventData.targetChannel || resolvedTargetTab,
      createdBy: adminUid,
      createdByName: adminName,
      date: `${eventData.startDate || ''} to ${eventData.endDate || ''}`,
      time: eventData.eventTime || '18:00 UTC',
      prizePool: (eventData.prizeReward || '').trim(),
      institutionHost: OFFICIAL_EVENT_HOST,
      image: eventData.imageUrl || eventData.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
      participantsCount: eventData.participantsCount || 0,
      maxParticipants: 0,
      isRegistered: false,
    };

    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === eventId || e.eventId === eventId);
      const updated = idx >= 0 ? prev.map((e, i) => (i === idx ? { ...e, ...fullEvent } : e)) : [fullEvent, ...prev];
      try {
        localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('grobax_events_changed', { detail: fullEvent }));
    }

    return eventId;
  };

  const togglePlatformEventStatus = async (eventId: string, newStatus: PlatformEventStatus): Promise<void> => {
    const adminUid = currentUser?.id || PRIMARY_SUPER_ADMIN_UID;
    const adminName = currentUser?.name || 'Administrator';
    const ev = events.find((e) => e.id === eventId || e.eventId === eventId);

    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === eventId || e.eventId === eventId ? { ...e, status: newStatus } : e));
      try {
        localStorage.setItem('grobax_saved_platform_events', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await togglePlatformEventStatusInFirestore(eventId, ev?.title || 'Platform Event', newStatus, adminUid, adminName);
    } catch (err) {
      console.warn('Notice toggling event status in Firestore:', err);
    }
  };

  const restorePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'Published' } : p));
  };

  const reportPost = (postId: string, reason: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const reports = p.reports || [];
      const newReport: PostReport = {
        id: 'rep_' + Date.now(),
        postId,
        reportedBy: currentUser.username,
        reason,
        timestamp: 'Just now',
        status: 'Pending',
      };
      return { ...p, reports: [...reports, newReport] };
    }));
  };

  const addCommentToPost = (
    postId: string,
    content: string,
    parentId?: string | null,
    replyTo?: { name: string; username: string; commentId: string } | null
  ) => {
    if (!content || !content.trim()) return;

    const subInfo = resolveUserSubscriptionStatus(currentUser);
    const hasUpgradedPlan = subInfo.isSubscribed;
    const effectiveTier = subInfo.effectiveTier;

    const isStaffOrAdmin =
      currentUser.role === 'admin' ||
      currentUser.role === 'super_admin' ||
      currentUser.name.toLowerCase().includes('admin') ||
      currentUser.name.toLowerCase().includes('staff');

    const isCommunityManager =
      currentUser.role === 'community_manager' ||
      currentUser.name.toLowerCase().includes('community manager');

    let updatedCommentsList: PostComment[] = [];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.commentsList || [];
      const newComment: PostComment = {
        id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        postId,
        parentId: parentId || null,
        replyTo: replyTo || null,
        author: {
          name: currentUser.name,
          username: currentUser.username,
          avatar: currentUser.avatar,
          role: currentUser.role,
          institution: currentUser.institution || 'Grobaax Scholar',
          department: currentUser.department,
          equippedBadge: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager ? currentUser.equippedBadge : undefined,
          membershipTier: effectiveTier,
          subscriptionTier: effectiveTier,
          isPremium: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager,
          isStaffOrAdmin,
          isCommunityManager,
          verified: hasUpgradedPlan || isStaffOrAdmin || isCommunityManager || currentUser.verified,
        },
        content: content.trim(),
        timestamp: 'Just now',
        createdAtMillis: Date.now(),
        likes: 0,
        isLiked: false,
        likedBy: [],
        replies: [],
        repliesCount: 0,
      };
      updatedCommentsList = [...comments, newComment];
      return {
        ...p,
        commentsCount: (p.commentsCount || 0) + 1,
        commentsList: updatedCommentsList,
      };
    }));
    if (updatedCommentsList.length > 0) {
      addCommentToCommunityPostInFirestore(postId, updatedCommentsList).catch(err =>
        console.warn('Notice syncing comment to Firestore:', err)
      );
    }
  };

  const toggleLikeComment = (postId: string, commentId: string) => {
    const userUid = currentUser.id || currentUser.username || 'user';
    let updatedCommentsList: PostComment[] = [];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.commentsList || [];
      updatedCommentsList = comments.map(c => {
        if (c.id === commentId) {
          const likedBy = c.likedBy || [];
          const isCurrentlyLiked = c.isLiked || likedBy.includes(userUid);
          const newLikedBy = isCurrentlyLiked ? likedBy.filter(uid => uid !== userUid) : [...likedBy, userUid];
          const newLikes = isCurrentlyLiked ? Math.max(0, (c.likes || 1) - 1) : (c.likes || 0) + 1;
          return {
            ...c,
            likes: newLikes,
            isLiked: !isCurrentlyLiked,
            likedBy: newLikedBy,
          };
        }
        return c;
      });
      return {
        ...p,
        commentsList: updatedCommentsList,
      };
    }));
    if (updatedCommentsList.length > 0) {
      addCommentToCommunityPostInFirestore(postId, updatedCommentsList).catch(err =>
        console.warn('Notice updating comment likes in Firestore:', err)
      );
    }
  };

  const deleteComment = (postId: string, commentId: string) => {
    let updatedCommentsList: PostComment[] = [];
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const comments = p.commentsList || [];
      // Remove comment and any replies attached to it
      updatedCommentsList = comments.filter(c => c.id !== commentId && c.parentId !== commentId);
      return {
        ...p,
        commentsCount: updatedCommentsList.length,
        commentsList: updatedCommentsList,
      };
    }));
    addCommentToCommunityPostInFirestore(postId, updatedCommentsList).catch(err =>
      console.warn('Notice deleting comment in Firestore:', err)
    );
  };

  const suspendUserPosting = (userId: string) => {
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, isPostingSuspended: true }));
    }
  };

  const sendChatroomMessage = async (message: ChatroomLiveMessage): Promise<void> => {
    const finalMsg: ChatroomLiveMessage = {
      ...message,
      equippedBadge: message.equippedBadge || (message.userId === currentUser.id ? currentUser.equippedBadge : undefined),
    };

    setChatroomMessages(prev => {
      const exists = prev.some(m => m.id === finalMsg.id);
      const updated = exists ? prev.map(m => m.id === finalMsg.id ? finalMsg : m) : [...prev, finalMsg];
      try {
        localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await sendChatroomMessageToFirestore(finalMsg);
    } catch (err) {
      console.warn('Notice syncing chatroom message to Firestore:', err);
    }
  };

  const deleteChatroomMessage = async (messageId: string): Promise<void> => {
    setChatroomMessages(prev => {
      const updated = prev.map(m => m.id === messageId ? { ...m, isDeleted: true } : m);
      try {
        localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await deleteChatroomMessageFromFirestore(messageId);
    } catch (err) {
      console.warn('Notice deleting chatroom message in Firestore:', err);
    }
  };

  const reactChatroomMessage = async (messageId: string, emoji: string): Promise<void> => {
    // Instant optimistic update for silky-smooth repeated clicking
    setChatroomMessages(prev => {
      const updated = prev.map(m => {
        if (m.id !== messageId) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (Number(reactions[emoji]) || 0) + 1;
        return { ...m, reactions };
      });
      try {
        localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await reactChatroomMessageInFirestore(messageId, emoji);
    } catch (err) {
      console.warn('Notice reacting to chatroom message in Firestore:', err);
    }
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'date' | 'status' | 'transactionId'> & Partial<Transaction>) => {
    const payRef = extractTxPaymentReference(tx);
    if (payRef) {
      const isDuplicate = transactions.some((existing) => {
        const existingRef = extractTxPaymentReference(existing);
        return (
          (existingRef && existingRef.toLowerCase() === payRef.toLowerCase()) ||
          existing.transactionId === payRef ||
          (existing.meta?.paymentReference && String(existing.meta.paymentReference).toLowerCase() === payRef.toLowerCase())
        );
      });
      if (isDuplicate) {
        console.log(`[Transactions] Deduplication prevented duplicate transaction log for reference: ${payRef}`);
        return;
      }
    }

    const txId = tx.transactionId || 'TX-GRBX-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = tx.date || new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const newTx: Transaction = {
      ...tx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date: dateStr,
      status: tx.status || 'completed',
      transactionId: txId,
      userId: tx.userId || currentUser.id || firebaseUser?.uid || '',
      userName: tx.userName || currentUser.name || currentUser.fullName || 'Scholar',
      userEmail: tx.userEmail || currentUser.email || currentUser.username || '',
      userAvatar: tx.userAvatar || currentUser.avatar || '',
      institutionName: tx.institutionName || currentUser.institution || currentUser.institutionName || '',
    };
    setTransactions(prev => [newTx, ...prev.filter(t => t.id !== newTx.id && t.transactionId !== newTx.transactionId)]);

    // Write authoritative record to Firestore
    recordWalletTransactionInFirestore({
      userId: newTx.userId || '',
      userName: newTx.userName,
      userEmail: newTx.userEmail,
      userAvatar: newTx.userAvatar,
      institutionName: newTx.institutionName,
      type: newTx.type,
      amount: newTx.amount,
      unit: newTx.unit || 'GP',
      title: newTx.title,
      description: newTx.description,
      isCredit: newTx.isCredit,
      status: newTx.status,
      transactionId: newTx.transactionId,
      adminUid: newTx.adminUid,
      adminName: newTx.adminName,
      reason: newTx.reason,
      meta: newTx.meta,
    }).catch(err => console.warn('Could not record wallet transaction in Firestore:', err));
  };

  const updateGpConversionConfig = (config: Partial<GpConversionConfig>) => {
    setGpConversionConfig(prev => ({ ...prev, ...config }));
    if (typeof config.minimumWithdrawalGP === 'number' && config.minimumWithdrawalGP > 0) {
      setSystemSettings(prev => ({ ...prev, minWithdrawalAmountGp: config.minimumWithdrawalGP! }));
      try {
        localStorage.setItem('grobax_min_withdrawal_gp', String(config.minimumWithdrawalGP));
      } catch {}
    }
    if (typeof config.gpToFiatRate === 'number' && config.gpToFiatRate > 0) {
      setSystemSettings(prev => ({ ...prev, gpToFiatRate: config.gpToFiatRate! }));
      try {
        localStorage.setItem('grobax_gp_fiat_rate', String(config.gpToFiatRate));
      } catch {}
    }
    saveGpConversionConfigToFirestore(config, firebaseUser?.uid, currentUser.name).catch(err => {
      console.warn('Could not sync GP conversion config to Firestore:', err);
    });
  };

  const updateWithdrawalStatus = (id: string, status: WithdrawalRecord['status'], notes?: string) => {
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status, adminNotes: notes || w.adminNotes } : w));
  };

  const adminAdjustGpBalance = async (amount: number, reason: string) => {
    const targetUid = firebaseUser?.uid || currentUser.id;
    if (targetUid) {
      try {
        const res = await adjustUserGpInFirestore(targetUid, amount, reason, targetUid, currentUser.name);
        if (res.success) {
          setCurrentUser(prev => ({ ...prev, gpBalance: res.newBalance }));
        }
      } catch (e) {
        console.warn('adminAdjustGpBalance firestore sync notice:', e);
      }
    } else {
      const newBalance = Math.max(0, (currentUser.gpBalance || 0) + amount);
      setCurrentUser(prev => ({ ...prev, gpBalance: newBalance }));
    }
  };

  const adminAdjustTargetUserGp = async (targetUserId: string, amount: number, reason: string): Promise<void> => {
    if (!targetUserId) return;
    try {
      const res = await adjustUserGpInFirestore(targetUserId, amount, reason, firebaseUser?.uid || currentUser.id, currentUser.name);
      if (res.success && (targetUserId === (firebaseUser?.uid || currentUser.id) || targetUserId === currentUser.id)) {
        setCurrentUser(prev => ({ ...prev, gpBalance: res.newBalance }));
      }
    } catch (e) {
      console.warn('adminAdjustTargetUserGp firestore error:', e);
    }
  };

  const addBadgeToStore = async (badge: Omit<BadgeStoreItem, 'id'>) => {
    const newBadge: BadgeStoreItem = {
      ...badge,
      id: 'b_' + Date.now(),
      createdDate: new Date().toISOString().split('T')[0],
      purchasesCount: 0,
    };
    setBadgeStore(prev => [newBadge, ...prev]);
    try {
      await setDoc(doc(db, 'gpStore', newBadge.id), {
        ...newBadge,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Failed to save badge to Firestore gpStore:', err);
    }
  };

  const deleteBadgeFromStore = async (id: string) => {
    setBadgeStore(prev => prev.filter(b => b.id !== id));
    try {
      await deleteDoc(doc(db, 'gpStore', id));
    } catch (err) {
      console.warn('Failed to delete badge from Firestore gpStore:', err);
    }
  };

  const updateBadgeInStore = (id: string, patch: Partial<BadgeStoreItem>) => {
    setBadgeStore(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  const equipBadge = async (badgeId: string) => {
    const badgeItem = badgeStore.find(b => b.id === badgeId) || currentUser.badges.find(b => b.id === badgeId);
    if (!badgeItem) {
      setCurrentUser(prev => ({ ...prev, equippedBadgeId: undefined, equippedBadge: undefined }));
      setChatroomMessages(prev => {
        const updated = prev.map(m =>
          m.userId === (firebaseUser?.uid || currentUser.id)
            ? { ...m, equippedBadge: undefined }
            : m
        );
        try {
          localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      if (firebaseUser) {
        try {
          await updateUserProfileInFirestore(firebaseUser.uid, {
            equippedBadgeId: undefined,
            equippedBadge: undefined,
          } as any);
        } catch (e) {
          console.warn('equipBadge unset notice:', e);
        }
      }
      return;
    }
    const badgeTitle = 'name' in badgeItem ? badgeItem.name : badgeItem.title;
    const badgeIcon = 'image' in badgeItem ? badgeItem.image : badgeItem.icon;
    const equippedBadgeObj = {
      id: badgeItem.id,
      title: badgeTitle,
      name: badgeTitle,
      icon: badgeIcon,
      color: badgeItem.color || 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    setCurrentUser(prev => ({
      ...prev,
      equippedBadgeId: badgeId,
      equippedBadge: equippedBadgeObj,
    }));
    setChatroomMessages(prev => {
      const updated = prev.map(m =>
        m.userId === (firebaseUser?.uid || currentUser.id)
          ? { ...m, equippedBadge: equippedBadgeObj }
          : m
      );
      try {
        localStorage.setItem('grobax_chatroom_messages', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (firebaseUser) {
      try {
        await updateUserProfileInFirestore(firebaseUser.uid, {
          equippedBadgeId: badgeId,
          equippedBadge: equippedBadgeObj,
        });
      } catch (e) {
        console.warn('equipBadge sync notice:', e);
      }
    }

    sendNotification({
      title: '🎖️ Showcase Honour Equipped',
      message: `You are now showcasing "${equippedBadgeObj.title}" on your Smart Campus Pass and academic cards.`,
      type: 'announcement',
      actionUrl: 'wallet:profile',
      targetUserId: firebaseUser?.uid || currentUser.id,
      userId: firebaseUser?.uid || currentUser.id,
    });
  };

  const addSponsorshipCampaign = async (campaign: Omit<SponsorshipCampaign, 'id'>) => {
    const newCamp: SponsorshipCampaign = {
      ...campaign,
      id: 'sp_' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser?.name || 'Admin',
    };
    setSponsorshipCampaigns(prev => {
      const updated = [newCamp, ...prev];
      try {
        localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await saveSponsorshipCampaignToFirestore(
        newCamp,
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.warn('Error saving sponsorship campaign to Firestore:', err);
    }
  };

  const updateSponsorshipCampaign = async (id: string, patch: Partial<SponsorshipCampaign>) => {
    let updatedCampaign: SponsorshipCampaign | undefined;
    setSponsorshipCampaigns(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          updatedCampaign = { ...s, ...patch, updatedAt: new Date().toISOString() };
          return updatedCampaign;
        }
        return s;
      });
      try {
        localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (updatedCampaign) {
      try {
        await saveSponsorshipCampaignToFirestore(
          updatedCampaign,
          firebaseUser?.uid || currentUser.id,
          currentUser.name
        );
      } catch (err) {
        console.warn('Error updating sponsorship campaign in Firestore:', err);
      }
    }
  };

  const deleteSponsorshipCampaign = async (id: string) => {
    const existing = sponsorshipCampaigns.find(s => s.id === id);
    setSponsorshipCampaigns(prev => {
      const updated = prev.filter(s => s.id !== id);
      try {
        localStorage.setItem('grobax_saved_sponsorships', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await deleteSponsorshipCampaignFromFirestore(
        id,
        existing?.title || 'Sponsorship Campaign',
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.warn('Error deleting sponsorship campaign from Firestore:', err);
    }
  };

  const updateUpgradePlan = (id: string, patch: Partial<UpgradePlan>) => {
    setUpgradePlans(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const markNotificationRead = (id: string) => {
    const currentUid = firebaseUser?.uid || currentUser.id;
    const targetNotif = notifications.find(n => n.id === id);
    const keysToPersist: string[] = [id];
    if (targetNotif && (targetNotif.title || targetNotif.message)) {
      keysToPersist.push(`${targetNotif.title || ''}_${targetNotif.message || ''}`);
    }

    persistReadNotifKeys(keysToPersist, currentUid, currentUser.id, firebaseUser?.uid);

    setNotifications(prev => {
      const updated = prev.map(n => {
        const matchesId = n.id === id;
        const matchesFp = targetNotif && (n.title || n.message) &&
          `${n.title || ''}_${n.message || ''}` === `${targetNotif.title || ''}_${targetNotif.message || ''}`;
        return matchesId || matchesFp ? { ...n, isRead: true } : n;
      });
      try {
        localStorage.setItem('grobax_saved_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (id && !id.startsWith('notif_')) {
      try {
        updateDoc(doc(db, 'notifications', id), { isRead: true }).catch(() => {});
      } catch {}
    }
  };

  const markAllNotificationsRead = () => {
    const currentUid = firebaseUser?.uid || currentUser.id;
    const keysToPersist: string[] = [];
    notifications.forEach(n => {
      keysToPersist.push(n.id);
      if (n.title || n.message) {
        keysToPersist.push(`${n.title || ''}_${n.message || ''}`);
      }
    });

    persistReadNotifKeys(keysToPersist, currentUid, currentUser.id, firebaseUser?.uid);

    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      try {
        localStorage.setItem('grobax_saved_notifications', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    notifications.forEach(n => {
      if (!n.isRead && n.id && !n.id.startsWith('notif_')) {
        try {
          updateDoc(doc(db, 'notifications', n.id), { isRead: true }).catch(() => {});
        } catch {}
      }
    });
  };

  const sendNotification = async (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => {
    const currentUid = firebaseUser?.uid || currentUser.id;
    const lowerTitle = (notif.title || '').toLowerCase();
    const lowerMsg = (notif.message || '').toLowerCase();
    const isPrizeNotification =
      lowerTitle.includes('prize distributed') ||
      lowerTitle.includes('prize credited') ||
      lowerTitle.includes('champion prize') ||
      lowerTitle.includes('prize split') ||
      lowerMsg.includes('deposited directly into your wallet') ||
      lowerMsg.includes('gp has been deposited') ||
      lowerMsg.includes('equal share of') ||
      lowerMsg.includes('equal split of');

    const resolvedTargetUid =
      notif.targetUserId ||
      notif.userId ||
      (isPrizeNotification || notif.type === 'system' || notif.type === 'wallet' ? currentUid : undefined);

    // Safeguard: Never broadcast prize distribution notifications to all users
    if (isPrizeNotification && !resolvedTargetUid) {
      console.warn('Blocked broadcast of untargeted prize distribution notification');
      return;
    }

    const newNotif: NotificationItem = {
      ...notif,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: 'Just now',
      isRead: false,
      createdAtMs: Date.now(),
      targetUserId: resolvedTargetUid,
      userId: resolvedTargetUid,
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Also persist targeted or broadcast notification to Firestore
    if (resolvedTargetUid || (!isPrizeNotification && (notif.type === 'announcement' || notif.type === 'dome' || notif.type === 'league' || notif.type === 'gus'))) {
      try {
        await sendBroadcastNotificationToFirestore(
          {
            title: notif.title,
            message: notif.message,
            type: notif.type,
            targetRole: notif.targetRole,
            userId: resolvedTargetUid,
            targetUserId: resolvedTargetUid,
            excludeUserId: notif.excludeUserId,
            actionUrl: notif.actionUrl,
          },
          currentUid,
          currentUser.name
        );
      } catch (err) {
        console.warn('sendNotification firestore notice:', err);
      }
    }
  };

  // Listen for School Dome Season Concluded & Prize Distributed events to ensure real-time wallet balance sync
  useEffect(() => {
    const handleDomeConcluded = (e: any) => {
      const detail = e?.detail;
      if (!detail || !Array.isArray(detail.winners) || !detail.prizePerWinner) return;

      const currentUid = firebaseUser?.uid || currentUser.id;
      const myWin = detail.winners.find((w: any) => w.userId === currentUid || w.userId === currentUser.id);

      if (myWin && detail.prizePerWinner > 0) {
        const prize = Number(detail.prizePerWinner);
        setCurrentUser((prev) => {
          const currentBal = typeof prev.gpBalance === 'number' ? prev.gpBalance : Number(prev.gpBalance || 0);
          const newBal = (isNaN(currentBal) ? 0 : currentBal) + prize;
          const updated = {
            ...prev,
            gpBalance: newBal,
            walletBalance: newBal,
            totalGpEarned: (Number((prev as any).totalGpEarned || 0) + prize),
          };
          try {
            localStorage.setItem('grobax_cached_user_profile', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        // Prepend new transaction locally so history reflects it immediately
        const txId = `tx_dome_win_${Date.now()}`;
        const newTx: Transaction = {
          id: txId,
          transactionId: `TX-DOME-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: currentUid,
          userName: currentUser.name || 'Scholar',
          type: 'gp_earned',
          amount: prize,
          unit: 'GP',
          title: `🏆 School Dome Season #${detail.seasonNumber || 1} Champion Prize (+${prize.toLocaleString()} GP)`,
          description: `Equal split of ${detail.totalPrize?.toLocaleString() || prize.toLocaleString()} GP prize pool for surviving ${detail.title || 'School Dome'}.`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: 'completed',
          isCredit: true,
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
        };

        setTransactions((prev) => [newTx, ...prev.filter((t) => t.id !== txId)]);

        // Push in-app notification strictly for this winner only (never broadcast to all users)
        const winnerNotifId = `notif_dome_prize_${currentUid}_${detail.seasonNumber || 1}_${Date.now()}`;
        const winnerNotif: NotificationItem = {
          id: winnerNotifId,
          title: '🏆 School Dome Prize Distributed!',
          message: `Congratulations! ${prize.toLocaleString()} GP has been deposited directly into your wallet!`,
          type: 'dome',
          actionUrl: 'school_dome_results',
          userId: currentUid,
          targetUserId: currentUid,
          timestamp: 'Just now',
          isRead: false,
          createdAtMs: Date.now(),
        };

        setNotifications((prev) => {
          if (prev.some((n) => n.id === winnerNotifId)) return prev;
          return [winnerNotif, ...prev];
        });
      }
    };

    const handleGpAwarded = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const targetUserId = detail?.userId;
      if (detail && (targetUserId === currentUser.id || targetUserId === firebaseUser?.uid)) {
        const added = Number(detail.gpAwarded) || 0;
        if (added > 0) {
          setCurrentUser(prev => {
            const nextGp = Math.max(0, (Number(prev.gpBalance) || 0) + added);
            const nextTotal = Math.max(0, (Number(prev.totalGpEarned) || 0) + added);
            const updated = {
              ...prev,
              gpBalance: nextGp,
              totalGpEarned: nextTotal,
            };
            try {
              localStorage.setItem('grobax_cached_user_profile', JSON.stringify(updated));
              if (prev.id) {
                localStorage.setItem(`grobax_user_profile_${prev.id}`, JSON.stringify(updated));
              }
            } catch {}
            return updated;
          });
        }
      }
    };

    window.addEventListener('school_dome_season_concluded', handleDomeConcluded);
    window.addEventListener('grobaax_gp_awarded', handleGpAwarded);
    return () => {
      window.removeEventListener('school_dome_season_concluded', handleDomeConcluded);
      window.removeEventListener('grobaax_gp_awarded', handleGpAwarded);
    };
  }, [currentUser.id, currentUser.name, firebaseUser?.uid]);

  const updateSystemSettings = async (settingsPatch: Partial<SystemSettings>) => {
    setSystemSettings(prev => ({ ...prev, ...settingsPatch }));
    const minGp = typeof settingsPatch.minWithdrawalAmountGp === 'number' && settingsPatch.minWithdrawalAmountGp > 0 ? settingsPatch.minWithdrawalAmountGp : undefined;
    const rate = typeof settingsPatch.gpToFiatRate === 'number' && settingsPatch.gpToFiatRate > 0 ? settingsPatch.gpToFiatRate : undefined;
    if (minGp !== undefined || rate !== undefined) {
      setGpConversionConfig(prev => ({
        ...prev,
        ...(minGp !== undefined ? { minimumWithdrawalGP: minGp } : {}),
        ...(rate !== undefined ? { gpToFiatRate: rate } : {}),
      }));
    }
    try {
      localStorage.setItem('grobax_system_settings_cache', JSON.stringify({ ...systemSettings, ...settingsPatch }));
      if (minGp !== undefined) localStorage.setItem('grobax_min_withdrawal_gp', String(minGp));
      if (rate !== undefined) localStorage.setItem('grobax_gp_fiat_rate', String(rate));
    } catch {}
    try {
      await saveSystemSettingsToFirestore(
        settingsPatch,
        firebaseUser?.uid || currentUser.id,
        currentUser.name
      );
    } catch (err) {
      console.error('Failed to update system settings in Firestore:', err);
      throw err;
    }
  };

  // Global Multi-Section Navigation Badges State
  const [sectionNotifications, setSectionNotifications] = useState<UserSectionUnreadCounts>(
    grobaxNotificationService.getSnapshot().user
  );
  const [adminSectionNotifications, setAdminSectionNotifications] = useState<AdminSectionUnreadCounts>(
    grobaxNotificationService.getSnapshot().admin
  );

  // Global Hints State for realtime notification badge signal
  const [competitionHints, setCompetitionHints] = useState<CompetitionHint[]>(() =>
    getCachedCompetitionHints()
  );

  useEffect(() => {
    const unsub = subscribeToCompetitionHints(
      (items) => {
        setCompetitionHints(items);
      },
      (err) => {
        console.warn('AppContext hints listener note:', err);
      }
    );
    return () => unsub();
  }, []);

  // Initialize Notification Service with current user ID
  useEffect(() => {
    grobaxNotificationService.initUser(firebaseUser?.uid || currentUser.id);
  }, [firebaseUser?.uid, currentUser.id]);

  // Subscribe to Notification Engine unread count updates
  useEffect(() => {
    const unsub = grobaxNotificationService.subscribe(({ user, admin }) => {
      setSectionNotifications((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(user)) return prev;
        return user;
      });
      setAdminSectionNotifications((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(admin)) return prev;
        return admin;
      });
    });
    return () => unsub();
  }, []);

  // Sync state data sources to Notification Engine for automatic real-time unread calculation
  useEffect(() => {
    grobaxNotificationService.updateDataSource({
      userId: firebaseUser?.uid || currentUser.id,
      userRole: currentUser.role,
      posts,
      announcements,
      chatMessages: chatroomMessages,
      schoolDomeMessages,
      platformEvents: events as any,
      qualifications: qualificationCompetitions,
      minimartProducts: minimartProducts as any,
      withdrawals: withdrawals as any,
      transactions: transactions as any,
      studentVerifications: representativeRecords as any,
      reportedPosts: posts.filter(p => (p.status as string) === 'Reported'),
      liveFixtures: fixtures as any,
      libraryMaterials: pendingPastQuestions as any,
      hints: competitionHints,
    });
  }, [
    firebaseUser?.uid,
    currentUser.id,
    currentUser.role,
    posts,
    announcements,
    chatroomMessages,
    schoolDomeMessages,
    events,
    qualificationCompetitions,
    minimartProducts,
    withdrawals,
    transactions,
    representativeRecords,
    fixtures,
    pendingPastQuestions,
    competitionHints,
  ]);

  // When active tab changes, mark that section as read automatically
  useEffect(() => {
    if (activeTab) {
      grobaxNotificationService.markSectionRead(activeTab);
      if (activeTab === 'school_dome' || activeTab === 'school_dome_results') {
        grobaxNotificationService.markSectionRead('school_dome');
        grobaxNotificationService.markSectionRead('school_dome_results');
      }
    }
  }, [activeTab]);

  const clearSectionNotification = useCallback((sectionKey: string) => {
    grobaxNotificationService.markSectionRead(sectionKey);
  }, []);

  const markSectionAsRead = useCallback((sectionKey: string) => {
    grobaxNotificationService.markSectionRead(sectionKey);
  }, []);

  const emitSectionNotification = useCallback(
    async (event: {
      section: string;
      title: string;
      message?: string;
      targetRole?: 'USER' | 'ADMIN' | 'ALL';
    }) => {
      await grobaxNotificationService.emitSectionNotification(event);
    },
    []
  );

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    setCurrentUser(prev => ({ ...prev, ...data }));
    if (firebaseUser) {
      try {
        const updated = await updateUserProfileInFirestore(firebaseUser.uid, data);
        setCurrentUser(prev => ({ ...prev, ...updated }));
      } catch (err) {
        console.error('Error updating user profile in Firestore:', err);
        throw err;
      }
    }
  };

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const firebaseUserRef = useRef(firebaseUser);
  firebaseUserRef.current = firebaseUser;
  const addTransactionRef = useRef(addTransaction);
  addTransactionRef.current = addTransaction;

  const subscribeToPlan = useCallback(async (
    plan: SubscriptionPlan,
    paymentMethod: 'GP' | 'CARD' | 'TRANSFER' = 'CARD',
    customPaymentReference?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const curUser = currentUserRef.current;
      const fbUser = firebaseUserRef.current;
      const days =
        plan.durationUnit === 'Years'
          ? plan.durationValue * 365
          : plan.durationUnit === 'Months'
          ? plan.durationValue * 30
          : plan.durationValue;
      const startDate = new Date().toISOString();
      const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const finalReference =
        customPaymentReference ||
        (paymentMethod === 'GP'
          ? `GP_SUB_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
          : `GRBX_PAY_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`);

      if (finalReference) {
        const dedupeKey = `grobax_sub_processed_${finalReference}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(dedupeKey)) {
          console.log(`[Subscription] Reference ${finalReference} already processed. Skipping duplicate execution.`);
          return {
            success: true,
            message: `You have successfully subscribed to ${plan.name}!`,
          };
        }
        try {
          sessionStorage.setItem(dedupeKey, 'true');
        } catch {}
      }

      // If GP payment, verify and deduct balance
      let newGp = typeof curUser.gpBalance === 'number' ? curUser.gpBalance : Number(curUser.gpBalance || 0);
      const gpPrice = plan.priceNaira; // 1 GP = 1 Naira standard equivalent
      if (paymentMethod === 'GP') {
        if (newGp < gpPrice) {
          return {
            success: false,
            message: `Insufficient GP balance. You need ${gpPrice.toLocaleString()} GP to subscribe to this plan.`,
          };
        }
        newGp = Math.max(0, newGp - gpPrice);
        setCurrentUser(prev => ({ ...prev, gpBalance: newGp }));
      }

      // Check if a transaction with this reference already exists before adding
      const alreadyHasTx = transactions.some((existing) => {
        const ref = extractTxPaymentReference(existing);
        return (
          (ref && ref.toLowerCase() === finalReference.toLowerCase()) ||
          (existing.meta?.paymentReference && String(existing.meta.paymentReference).toLowerCase() === finalReference.toLowerCase())
        );
      });

      if (!alreadyHasTx) {
        if (paymentMethod === 'GP') {
          addTransactionRef.current({
            type: 'subscription_purchase',
            title: `Subscription: ${plan.name}`,
            description: `${plan.durationValue} ${plan.durationUnit} Academic Upgrade (GP Wallet) (${finalReference})`,
            amount: gpPrice,
            unit: 'GP',
            isCredit: false,
            meta: { paymentReference: finalReference },
          });
        } else {
          // Card or Transfer payment via Paystack Gateway
          addTransactionRef.current({
            type: 'subscription_purchase',
            title: `Subscription: ${plan.name}`,
            description: `${plan.durationValue} ${plan.durationUnit} Upgrade via Paystack (${finalReference})`,
            amount: plan.priceNaira,
            unit: 'NGN',
            isCredit: false,
            meta: { paymentReference: finalReference },
          });
        }
      }

      // Determine new tier attributes
      const resolvedTargetTier: 'free' | 'premium' | 'vip' =
        plan.targetTier ||
        plan.tierType ||
        ((plan.planId && (plan.planId.toLowerCase().includes('titan') || plan.planId.toLowerCase().includes('vip'))) ||
        (plan.name && (plan.name.toLowerCase().includes('titan') || plan.name.toLowerCase().includes('vip') || plan.name.toLowerCase().includes('annual'))) ||
        plan.priceNaira >= 20000
          ? 'vip'
          : 'premium');

      const isTitanVip = resolvedTargetTier === 'vip';

      const subRecord: Omit<UserSubscriptionRecord, 'id'> = {
        subscriptionId: `sub_${Date.now()}_${(curUser.id || 'user').substring(0, 5)}`,
        userId: curUser.id || fbUser?.uid || 'guest',
        userName: curUser.name || curUser.fullName || 'Scholar',
        userEmail: curUser.username || curUser.email || '',
        planId: plan.planId,
        planNameSnapshot: plan.name,
        targetTier: resolvedTargetTier,
        tierType: resolvedTargetTier,
        isVip: isTitanVip,
        priceSnapshot: plan.priceNaira,
        currencySnapshot: 'NGN',
        durationSnapshot: `${plan.durationValue} ${plan.durationUnit}`,
        startDate,
        expiryDate,
        status: 'active',
        paymentReference: finalReference,
        channel: paymentMethod === 'GP' ? 'wallet_gp' : 'paystack',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore userSubscriptions (checking for duplicate first)
      try {
        const existingSubQuery = query(
          collection(db, 'userSubscriptions'),
          where('paymentReference', '==', finalReference),
          limit(1)
        );
        const existingSubSnap = await getDocs(existingSubQuery);
        if (existingSubSnap.empty) {
          await addDoc(collection(db, 'userSubscriptions'), subRecord);
        }
      } catch (dbErr) {
        console.warn('Saving subscription record notice:', dbErr);
      }

      const gusTier =
        isTitanVip ? 'Titan' : plan.priceNaira >= 2000 ? 'Master' : 'Scholar';

      // Update currentUser state
      const updatedUserPatch: Partial<UserProfile> = {
        activePlanId: plan.planId,
        membershipTier: plan.name,
        subscriptionTier: plan.name,
        subscriptionPlan: plan.name,
        planId: plan.planId,
        tier: plan.name,
        plan: plan.name,
        targetTier: resolvedTargetTier,
        tierType: resolvedTargetTier,
        isSubscribed: true,
        isPremium: true,
        isVip: isTitanVip,
        gusTier: gusTier as any,
        subscriptionExpiry: expiryDate,
        subscription: {
          planId: plan.planId,
          name: plan.name,
          price: plan.priceNaira,
          currency: 'NGN',
          duration: `${plan.durationValue} ${plan.durationUnit}`,
          startDate,
          expiryDate,
          status: 'active',
          paymentReference: finalReference,
        } as any,
        verified: true, // Pro & VIP scholars receive verified status
        ...(paymentMethod === 'GP' ? { gpBalance: newGp } : {}),
      };

      const targetUid = fbUser?.uid || curUser.id;

      setCurrentUser(prev => {
        const nextUser = {
          ...prev,
          ...updatedUserPatch,
        };
        try {
          if (targetUid) {
            localStorage.setItem(`grobax_user_profile_${targetUid}`, JSON.stringify(nextUser));
          }
        } catch {}
        return nextUser;
      });

      // Update userSubscriptions local state immediately
      setUserSubscriptions(prev => [
        { ...subRecord, id: subRecord.subscriptionId, isVip: isTitanVip },
        ...prev.filter(s => s.planId !== plan.planId)
      ]);

      // Remove any pending payment record from localStorage
      try {
        localStorage.removeItem('grobax_pending_paystack_sub');
      } catch {}

      // Update user in Firestore
      if (targetUid) {
        try {
          await updateUserProfileInFirestore(targetUid, updatedUserPatch);
        } catch (uErr) {
          console.warn('Updating user profile with subscription notice:', uErr);
        }

        // Also trigger background server activation for full database sync
        if (finalReference) {
          fetch('/api/paystack/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: finalReference,
              userId: targetUid,
              userEmail: curUser.email || fbUser?.email || '',
              userName: curUser.name || curUser.fullName || '',
              planId: plan.planId,
              planName: plan.name,
              amountNaira: plan.priceNaira,
            }),
          }).catch(actErr => console.warn('Notice calling server activation:', actErr));
        }
      }

      // Send in-app celebration notification specifically to this user
      sendNotification({
        title: isTitanVip ? `👑 VIP Scholar Status Activated!` : `🎉 Upgraded to ${plan.name}!`,
        message: `Your membership has been upgraded to ${plan.name} (${plan.durationValue} ${plan.durationUnit}). Enjoy boosted multipliers, pro verified badge, and priority features!`,
        type: 'system',
        targetUserId: targetUid,
        userId: targetUid,
        actionUrl: 'wallet:upgrade',
      });

      // Dispatch real-time global event so all open modals (WalletModal, PaystackGatewayModal) update synchronously
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('paystack_subscription_activated', {
              detail: { plan, reference: finalReference, amountNaira: plan.priceNaira },
            })
          );
        } catch {}
      }

      return {
        success: true,
        message: `Successfully upgraded to ${plan.name}! All privileges are now active.`,
      };
    } catch (err: any) {
      console.error('Error subscribing to plan:', err);
      return {
        success: false,
        message: err.message || 'Failed to activate subscription. Please try again.',
      };
    }
  }, []);

  // Register a pending Paystack payment for continuous background sensor monitoring
  const registerPendingPayment = useCallback((data: {
    reference: string;
    plan: SubscriptionPlan;
    userId?: string;
    userName?: string;
    userEmail?: string;
    channel?: string;
  }) => {
    if (!data.reference) return;
    try {
      const curUser = currentUserRef.current;
      const payload = {
        reference: data.reference,
        plan: data.plan,
        userId: data.userId || curUser.id || 'scholar',
        userName: data.userName || curUser.name || 'Scholar',
        userEmail: data.userEmail || curUser.email || '',
        channel: data.channel || 'paystack',
        timestamp: Date.now(),
      };
      localStorage.setItem('grobax_pending_paystack_sub', JSON.stringify(payload));

      const rawRefs = localStorage.getItem('grobax_pending_references');
      const refs: string[] = rawRefs ? JSON.parse(rawRefs) : [];
      if (!refs.includes(data.reference)) {
        refs.push(data.reference);
        localStorage.setItem('grobax_pending_references', JSON.stringify(refs.slice(-6)));
      }

      setActivePaymentSensor(prev => {
        if (prev.isMonitoring && prev.pendingReference === data.reference && prev.planName === data.plan.name) {
          return prev;
        }
        return {
          isMonitoring: true,
          pendingReference: data.reference,
          planName: data.plan.name,
          lastCheckedAt: Date.now(),
        };
      });
      console.log(`[Sensor] Registered pending payment reference: ${data.reference} (${data.plan.name})`);
    } catch (err) {
      console.warn('Error registering pending payment in sensor:', err);
    }
  }, []);

  const isCheckingSensorRef = useRef(false);
  const subscriptionPlansRef = useRef(subscriptionPlans);
  subscriptionPlansRef.current = subscriptionPlans;
  const subscribeToPlanRef = useRef(subscribeToPlan);
  subscribeToPlanRef.current = subscribeToPlan;

  // Active Subscription Plan Sensor:
  // Continuous real-time listener and poller that detects customer payments (Bank Transfer & Card Checkout)
  // and immediately activates their subscription across the application and Firestore.
  const runSubscriptionSensorCheck = useCallback(async () => {
    if (isCheckingSensorRef.current) return;
    isCheckingSensorRef.current = true;
    try {
      // 1. Check URL search parameters (?reference=..., ?trxref=..., ?paystack_verify=...)
      let urlRef = '';
      let urlPlanId = '';
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        urlRef = params.get('reference') || params.get('trxref') || params.get('paystack_verify') || '';
        urlPlanId = params.get('planId') || '';
      }

      // 2. Check localStorage pending item
      let pendingData: any = null;
      try {
        const raw = localStorage.getItem('grobax_pending_paystack_sub');
        if (raw) {
          pendingData = JSON.parse(raw);
        }
      } catch {}

      // 3. Check list of recent references
      let recentRefs: string[] = [];
      try {
        const rawRefs = localStorage.getItem('grobax_pending_references');
        if (rawRefs) recentRefs = JSON.parse(rawRefs);
      } catch {}

      const refsToTest = Array.from(
        new Set(
          [urlRef, pendingData?.reference, ...recentRefs]
            .filter((r): r is string => Boolean(r) && typeof r === 'string' && r.trim().length > 0 && r !== 'undefined' && r !== 'null')
            .map(r => r.trim())
        )
      );

      if (refsToTest.length === 0) {
        setActivePaymentSensor(prev => {
          if (!prev.isMonitoring && !prev.pendingReference) return prev;
          return {
            isMonitoring: false,
            pendingReference: null,
            planName: null,
            lastCheckedAt: Date.now(),
          };
        });
        return;
      }

      const targetRef = refsToTest[0];
      const targetPlanName = pendingData?.plan?.name || 'Academic Plan';

      setActivePaymentSensor(prev => {
        if (prev.isMonitoring && prev.pendingReference === targetRef && prev.planName === targetPlanName) {
          return prev;
        }
        return {
          isMonitoring: true,
          pendingReference: targetRef,
          planName: targetPlanName,
          lastCheckedAt: Date.now(),
        };
      });

      for (const ref of refsToTest) {
        try {
          const verifyRes = await verifyPaystackTransaction(ref);
          if (verifyRes && (verifyRes.verified || verifyRes.status === 'success')) {
            console.log(`[Active Payment Sensor] Verified payment for ref ${ref}:`, verifyRes);

            // Match plan
            const matchedPlanId = verifyRes.planId || urlPlanId || pendingData?.plan?.planId || pendingData?.plan?.id;
            const matchedPlanName = verifyRes.planName || pendingData?.plan?.name;

            let matchedPlan = subscriptionPlansRef.current.find(
              p => (matchedPlanId && (p.planId === matchedPlanId || p.id === matchedPlanId)) ||
                   (matchedPlanName && p.name.toLowerCase() === matchedPlanName.toLowerCase())
            );

            if (!matchedPlan) {
              matchedPlan = DEFAULT_SUBSCRIPTION_PLANS.find(
                p => (matchedPlanId && (p.planId === matchedPlanId || p.id === matchedPlanId)) ||
                     (matchedPlanName && p.name.toLowerCase() === matchedPlanName.toLowerCase())
              );
            }

            if (!matchedPlan && pendingData?.plan) {
              matchedPlan = pendingData.plan;
            }

            if (!matchedPlan) {
              matchedPlan = {
                id: matchedPlanId || 'plan_premium',
                planId: matchedPlanId || 'plan_premium',
                name: matchedPlanName || 'Premium',
                shortDescription: 'Upgraded Academic Scholar Membership',
                priceNaira: verifyRes.amountNaira || 100,
                currency: 'NGN',
                durationValue: 1,
                durationUnit: 'Months',
                featured: true,
                benefits: ['Unlimited Quiz Access', 'Priority Support', 'Full Verification'],
                features: ['Active Scholar Pro', 'Ad-Free Experience'],
              } as any;
            }

            // Immediately activate the subscription in state and Firestore
            await subscribeToPlanRef.current(matchedPlan, 'CARD', ref);

            // Dispatch global event for instant UI celebration and modal state transition
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('paystack_subscription_activated', {
                  detail: { plan: matchedPlan, reference: ref, amountNaira: verifyRes.amountNaira },
                })
              );
            }

            // Clean up verified reference
            try {
              localStorage.removeItem('grobax_pending_paystack_sub');
              const remainingRefs = recentRefs.filter(r => r !== ref);
              localStorage.setItem('grobax_pending_references', JSON.stringify(remainingRefs));
              if (urlRef && window.history && window.history.replaceState) {
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
              }
            } catch {}

            setActivePaymentSensor({
              isMonitoring: false,
              pendingReference: null,
              planName: null,
              lastCheckedAt: Date.now(),
            });

            break; // Stop after successfully activating
          }
        } catch (itemErr) {
          console.warn(`[Sensor] Check failed for ref ${ref}:`, itemErr);
        }
      }
    } catch (err) {
      console.warn('[Sensor] Sensor loop notice:', err);
    } finally {
      isCheckingSensorRef.current = false;
    }
  }, []);

  const triggerSubscriptionSensorCheck = useCallback(async () => {
    await runSubscriptionSensorCheck();
  }, [runSubscriptionSensorCheck]);

  // Automatic Sensor Polling Loop (Only active when an in-flight payment transaction exists)
  useEffect(() => {
    if (!isAuthReady) return;

    let isMounted = true;

    const hasPendingPayment = () => {
      try {
        if (typeof window === 'undefined') return false;
        const search = window.location.search;
        if (search.includes('trxref=') || search.includes('reference=')) return true;
        if (localStorage.getItem('grobax_pending_paystack_sub')) return true;
        const rawPending = localStorage.getItem('grobax_pending_references');
        if (rawPending) {
          const parsed = JSON.parse(rawPending);
          if (Array.isArray(parsed) && parsed.length > 0) return true;
        }
      } catch {}
      return false;
    };

    // Run initial check once on load/auth ready
    if (hasPendingPayment()) {
      runSubscriptionSensorCheck();
    }

    // Only set an interval if an active payment reference is actually in-flight
    let interval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const maxPolls = 15; // Auto-terminate polling after ~50 seconds to save quota

    if (hasPendingPayment()) {
      interval = setInterval(() => {
        if (!isMounted) return;
        pollCount++;
        if (pollCount > maxPolls || !hasPendingPayment()) {
          if (interval) clearInterval(interval);
          return;
        }
        runSubscriptionSensorCheck();
      }, 3500);
    }

    const handleFocus = () => {
      if (isMounted && hasPendingPayment()) runSubscriptionSensorCheck();
    };

    const handleVisibility = () => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible' && hasPendingPayment()) {
        runSubscriptionSensorCheck();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthReady, runSubscriptionSensorCheck]);

  const activeSubscriptionPlans = useMemo(
    () => sortSubscriptionPlans(subscriptionPlans.filter(p => p.active !== false && p.planId !== 'plan_free_scholar' && p.id !== 'plan_free_scholar' && p.priceNaira > 0)),
    [subscriptionPlans]
  );

  const freeScholarPlan = useMemo<SubscriptionPlan>(() => {
    const found = subscriptionPlans.find(
      (p) => p.planId === 'plan_free_scholar' || p.id === 'plan_free_scholar'
    );
    if (found) return found;
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('grobax_saved_free_scholar_plan') : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.name) return parsed;
      }
    } catch {}
    return DEFAULT_FREE_SCHOLAR_PLAN;
  }, [subscriptionPlans]);

  return (
    <AppContext.Provider
      value={{
        isAuthReady,
        role,
        setRole,
        toggleRepresentativeStatus,
        theme,
        setTheme,
        resolvedTheme,
        activeTab,
        setActiveTab,
        communitySubTab,
        setCommunitySubTab,
        navigateToCommunitySubTab,
        navigateToEventChannel,
        currentUser,
        setCurrentUser,
        isWalletModalOpen,
        setIsWalletModalOpen,
        walletModalTab,
        setWalletModalTab,
        openWalletModal,
        subscriptionPlans,
        activeSubscriptionPlans,
        freeScholarPlan,
        subscribeToPlan,
        registerPendingPayment,
        activePaymentSensor,
        triggerSubscriptionSensorCheck,
        isUserSubscribed,
        isSubscriber: isUserSubscribed,
        isUpgradePromoVisible,
        dismissUpgradePromo,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        openAuthModal,
        login,
        logout,
        firebaseUser,
        posts,
        setPosts,
        events,
        toggleEventRegistration,
        announcements,
        addAnnouncement,
        createPost,
        toggleLikePost,
        claimReward,
        badgeStore,
        buyBadge,
        withdrawals,
        requestGpWithdrawal,
        updatePrivacy,
        isBalanceHidden,
        toggleBalanceHidden,
        masterInstitutions,
        addMasterInstitution,
        updateMasterInstitution,
        addDepartmentToInstitution,
        removeDepartmentFromInstitution,
        toggleInstitutionSeason,
        toggleInstitutionHidden,
        seasons,
        addSeason,
        updateSeasonStatus,
        toggleSeasonParticipation,
        questionSets,
        addQuestionSet,
        addQuestionToSet,
        qualificationCompetitions,
        addQualificationCompetition,
        representativeRecords,
        representativeAssignments,
        assignRepresentative,
        removeRepresentative,
        fixtures,
        updateFixtureScore,
        addFixture,
        updateFixtureState,
        calculateStandings,
        gusSeasons,
        activeGusSeason,
        gusParticipants,
        userGusRecord,
        gusLiveClock,
        registerForGusSeason,
        submitGusAnswer,
        addGusSeason,
        updateGusSeason,
        addGusRoundToSeason,
        updateGusRoundInSeason,
        addQuestionToGusRound,
        updateGusPrizes,
        adminControlGusCompetition,
        domeSessions,
        activeDomeSession,
        domeScoreboard,
        domeUserProgress,
        domeHistory,
        domeLiveClock,
        submitDomeAnswer,
        addDomeSession,
        updateDomeSession,
        addQuestionToDomeSession,
        adminControlDomeSession,

        // Grobaax Minimart & Chatroom
        chatroomMessages,
        schoolDomeMessages,
        sendChatroomMessage,
        deleteChatroomMessage,
        reactChatroomMessage,
        minimartProducts,
        minimartCategories,
        minimartConfig,
        minimartReports,
        addMinimartProduct,
        updateMinimartProduct,
        deleteMinimartProduct,
        reportMinimartProduct,
        updateMinimartProductStatus,
        saveMinimartCategory,
        addMinimartCategory,
        updateMinimartCategory,
        deleteMinimartCategory,
        saveMinimartConfig,
        updateMinimartConfig,
        moderateMinimartReport,
        resolveMinimartReport,
        checkUserListingEligibility,
        checkUserPostEligibility,

        updateAnnouncement,
        deleteAnnouncement,
        publishAnnouncement,
        scheduleAnnouncement,
        unpublishAnnouncement,
        pinAnnouncement,
        hidePost,
        deletePost,
        updatePost,
        deletePlatformEvent,
        savePlatformEvent,
        togglePlatformEventStatus,
        restorePost,
        reportPost,
        addCommentToPost,
        toggleLikeComment,
        deleteComment,
        suspendUserPosting,
        transactions,
        addTransaction,
        gpConversionConfig,
        updateGpConversionConfig,
        updateWithdrawalStatus,
        adminAdjustGpBalance,
        adminAdjustTargetUserGp,
        addBadgeToStore,
        deleteBadgeFromStore,
        updateBadgeInStore,
        equipBadge,
        sponsorshipCampaigns,
        addSponsorshipCampaign,
        updateSponsorshipCampaign,
        deleteSponsorshipCampaign,
        upgradePlans,
        updateUpgradePlan,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        sendNotification,
        addNotification: sendNotification,
        sectionNotifications,
        adminSectionNotifications,
        clearSectionNotification,
        markSectionAsRead,
        emitSectionNotification,
        systemSettings,
        updateSystemSettings,
        updateUserProfile,
        userProfile: currentUser,
        viewMode,
        setViewMode,
        adminActiveTab,
        setAdminActiveTab,
        navigateToAdminTab,
        pendingPastQuestionsCount: pendingPastQuestions.length,
        pendingPastQuestions,
        toggleTheme: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),

        triggerAiBroadcast,
        selectedRoleUser: MOCK_USERS[role],
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
