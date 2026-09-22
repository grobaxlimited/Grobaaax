export type UserRole = 'student' | 'admin' | 'community_manager' | 'super_admin';

export type ManagerRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SUG_MANAGER'
  | 'GUS_MANAGER'
  | 'GROUP_BATTLE_MANAGER'
  | 'WALLET_MANAGER'
  | 'EVENTS_MANAGER'
  | 'COMMUNITY_ANNOUNCEMENT_MANAGER'
  | 'SPONSORSHIP_AD_MANAGER'
  | 'LIVE_COMPETITION_MANAGER'
  | 'CHATROOM_LIVE_MANAGER'
  | 'QUESTION_MANAGER'
  | 'NOTIFICATION_MANAGER'
  | 'USER_MANAGER'
  | 'INSTITUTIONAL_LEAGUE_MANAGER';

export const PRIMARY_SUPER_ADMIN_UID = '4403bd2b-e385-479b-af16-058582fa4ee3';
export const LEGACY_SUPER_ADMIN_UID = 'iH02BTcB4B0BV2YLA60WwFAi50CJ3';
export const SUPER_ADMIN_EMAIL = 'grobaxycompany@gmail.com';

export interface ManagerAssignment {
  id: string;
  uid: string;
  email: string;
  name: string;
  avatar?: string;
  role: ManagerRole;
  permissions: string[];
  status: 'active' | 'suspended' | 'inactive';
  assignedByUid: string;
  assignedByName: string;
  assignedAt: string;
  updatedAt: string;
}

export interface ManagerActivityLog {
  id: string;
  managerUid: string;
  managerName: string;
  managerEmail: string;
  role: ManagerRole | string;
  action: string;
  date: string;
  time: string;
  target: string;
  targetId: string;
  previousValue?: string | any;
  newValue?: string | any;
  timestamp: number;
}

export interface GroupBattleSeason {
  id: string;
  title: string;
  status: 'Draft' | 'Registration' | 'Live' | 'Completed';
  startDate: string;
  endDate: string;
  maxTeams?: number;
  registeredTeamsCount: number;
}

export interface GroupBattleTeam {
  id: string;
  teamName: string;
  institution: string;
  captainName: string;
  captainUid: string;
  membersCount: number;
  wins: number;
  losses: number;
  points: number;
  status: 'Active' | 'Eliminated';
}

export type SubscriptionTierType = 'free' | 'premium' | 'vip';

export interface SubscriptionPlan {
  id: string;
  planId: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  priceNaira: number; // Price in ₦
  currency: 'NGN' | string; // '₦'
  targetTier?: SubscriptionTierType; // Base membership tier rule applied to this plan: 'free' | 'premium' | 'vip'
  tierType?: SubscriptionTierType;
  durationValue: number;
  durationUnit: 'Days' | 'Months' | 'Years';
  benefits: string[];
  features: string[];
  badgeLabel?: string;
  featured: boolean;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Authoritative sort for subscription plans:
 * 1. Free Scholar (₦0 / Lifetime)
 * 2. Premium (₦349 / 30 Days) - rendered ABOVE VIP
 * 3. VIP (₦599 / 30 Days) - rendered BELOW Premium
 */
export const getSubscriptionPlanTierRank = (p: SubscriptionPlan): number => {
  const name = (p.name || '').toLowerCase();
  const id = (p.id || p.planId || '').toLowerCase();
  const tier = (p.targetTier || p.tierType || '').toLowerCase();

  // Tier 0: Free Scholar
  if (id.includes('free') || name.includes('free') || (p.priceNaira ?? 0) === 0) {
    return 0;
  }
  // Tier 2: VIP / Titan (Top tier - rendered below Premium in ascending list)
  if (tier === 'vip' || id.includes('vip') || name.includes('vip') || name.includes('titan')) {
    return 2;
  }
  // Tier 1: Premium / Pro / Basic / Starter (Mid tier - rendered above VIP)
  return 1;
};

export const sortSubscriptionPlans = (plans: SubscriptionPlan[]): SubscriptionPlan[] => {
  return [...plans].sort((a, b) => {
    const rankA = getSubscriptionPlanTierRank(a);
    const rankB = getSubscriptionPlanTierRank(b);
    if (rankA !== rankB) {
      return rankA - rankB; // rank 1 (Premium) comes before rank 2 (VIP)
    }
    // If same tier rank, sort by priceNaira ascending (e.g. ₦349 before ₦599)
    if ((a.priceNaira ?? 0) !== (b.priceNaira ?? 0)) {
      return (a.priceNaira ?? 0) - (b.priceNaira ?? 0);
    }
    return (a.displayOrder || 1) - (b.displayOrder || 1);
  });
};

export interface UserSubscriptionRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planNameSnapshot: string;
  targetTier?: SubscriptionTierType;
  tierType?: SubscriptionTierType;
  isVip?: boolean;
  priceSnapshot: number;
  currencySnapshot: string;
  durationSnapshot: string;
  startDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'cancelled';
  paymentReference: string;
  channel?: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminTabType =
  | 'dashboard'
  | 'users'
  | 'managers'
  | 'sug_management'
  | 'institutions'
  | 'gus'
  | 'group_battle'
  | 'events'
  | 'school_dome'
  | 'community'
  | 'chatroom_live'
  | 'announcements'
  | 'sponsorship'
  | 'questions'
  | 'live_management'
  | 'wallet'
  | 'airtime_data'
  | 'transactions'
  | 'badges'
  | 'withdrawals'
  | 'notifications'
  | 'subscriptions'
  | 'library'
  | 'hints'
  | 'settings'
  | 'contact';

export type ThemeMode = 'dark' | 'light' | 'system';

export type TabType = 'home' | 'gus' | 'daily_qa' | 'school_dome' | 'school_dome_results' | 'hints' | 'library' | 'community';

// ==========================================
// GROBAAX COMPETITION HINTS TYPES & SCHEMAS
// ==========================================
export type CompetitionHintType = 'daily_qa' | 'school_dome';
export type HintSubscriptionTier = 'free' | 'premium' | 'vip' | 'both';
export type HintStatus = 'draft' | 'published' | 'hidden';

export interface CompetitionHint {
  id: string;
  competitionType: CompetitionHintType; // 'daily_qa' (Daily GP Grab) | 'school_dome' (School Dome)
  possibleQuestions: string[]; // Possible questions that admin will ask in the competition
  roundLabel?: string; // e.g. "Round 1" or "Today's Challenge" (optional)
  title?: string; // Legacy / optional title
  category?: string; // Legacy category
  topic?: string; // Legacy topic
  areasToPrepare?: string[]; // Legacy areas
  preparationMessage?: string; // Legacy preparation message
  accessLevel: HintSubscriptionTier; // 'premium' | 'vip' | 'both'
  status: HintStatus; // 'draft' | 'published' | 'hidden'
  createdByUid?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// GROBAAX AI LIBRARY TYPES & SCHEMAS
// ==========================================
export type HandoutOptionType = 'short_notes' | 'standard_handout' | 'detailed_handout' | 'exam_revision';

export interface HandoutCalculationStep {
  title: string;
  problem: string;
  given?: string;
  formula?: string;
  steps: string[];
  solution: string;
  units?: string;
  alternateMethod?: string;
}

export interface HandoutWorkedExample {
  title: string;
  scenario: string;
  stepByStepSolution: string[];
  takeaway?: string;
  codeSnippet?: string;
}

export interface HandoutDiagram {
  title: string;
  type?: 'flowchart' | 'architecture' | 'schematic' | 'tree' | 'cycle' | 'table' | 'photo_illustration' | 'concept_figure';
  asciiArt?: string;
  svgContent?: string;
  imageUrl?: string;
  imageCaption?: string;
  figureNumber?: string;
  description: string;
  keyComponents?: string[];
}

export interface HandoutFormulaItem {
  name: string;
  expression: string;
  parameters?: string;
  application?: string;
}

export interface HandoutSection {
  chapterNumber?: number;
  pageNumber?: number;
  title: string;
  subtitle?: string;
  content: string;
  keyPoints?: string[];
  examples?: Array<string | HandoutWorkedExample>;
  formulas?: Array<string | HandoutFormulaItem>;
  calculations?: HandoutCalculationStep[];
  diagram?: HandoutDiagram;
  diagramDescription?: string;
  imageUrl?: string;
  imageCaption?: string;
  figureNumber?: string;
  examPitfalls?: string[];
  readingTimeMinutes?: number;
}

export interface HandoutTerm {
  term: string;
  definition: string;
}

export interface HandoutExamQuestion {
  question: string;
  answerGuide?: string;
  type?: 'multiple_choice' | 'essay' | 'short_answer';
  marks?: number;
  modelCalculation?: HandoutCalculationStep;
}

export interface HandoutReference {
  title: string;
  source: string;
  year?: string;
  link?: string;
}

export interface LibraryHandoutContent {
  title: string;
  course: string;
  courseCode?: string;
  department: string;
  faculty: string;
  institutionCategory?: InstitutionCategory | string;
  level: string;
  topic: string;
  targetAudienceLevel: string;
  totalPagesEstimate?: number;
  tableOfContents?: string[];
  introduction?: string;
  learningObjectives?: string[];
  keyConcepts?: string[];
  sections: HandoutSection[];
  masteryCalculations?: HandoutCalculationStep[];
  quickFormulaSheet?: HandoutFormulaItem[];
  practicalApplications?: string[];
  importantTerms?: HandoutTerm[];
  summary?: string;
  possibleExamQuestions?: HandoutExamQuestion[];
  quickRevisionPoints?: string[];
  references?: HandoutReference[];
}

export interface LibraryGeneration {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  faculty: string;
  department: string;
  institutionCategory?: InstitutionCategory | string;
  level: string;
  institutionContext?: string;
  course: string;
  topic: string;
  searchQuery: string;
  handoutOption: HandoutOptionType;
  additionalInstructions?: string;
  handoutTitle: string;
  content: LibraryHandoutContent;
  sources: HandoutReference[];
  createdAt: string;
  updatedAt: string;
  status: 'completed' | 'generating' | 'failed';
  generationVersion: number;
}

// =========================================================================
// GROBAAX AI HANDOUT GENERATION SYSTEM TYPES
// =========================================================================

export type HandoutInstitutionCategory = 'University' | 'Polytechnic' | 'College of Education';

export interface HandoutReviewQuestion {
  question: string;
  type?: 'short_answer' | 'essay' | 'calculation' | 'conceptual';
  modelAnswerOrHint?: string;
}

export interface HandoutDefinitionItem {
  term: string;
  definition: string;
}

export interface HandoutExampleItem {
  title: string;
  scenarioOrProblem: string;
  explanationOrSolution: string;
}

export interface HandoutSectionModule {
  title: string;
  content: string;
  bulletPoints?: string[];
  formulas?: string[];
  keyTakeaway?: string;
}

export interface GeneratedHandout {
  id: string;
  userId: string;
  userEmail?: string;
  userDisplayName?: string;

  // Academic Context
  institutionType: HandoutInstitutionCategory;
  institution: string;
  faculty: string;
  department: string;
  level: string;
  course: string;
  topic: string;
  additionalInstruction?: string;

  // Handout Content
  title: string;
  learningObjectives: string[];
  introduction: string;
  mainConcepts: string[];
  sections: HandoutSectionModule[];
  importantDefinitions: HandoutDefinitionItem[];
  relevantExamples: HandoutExampleItem[];
  practicalApplications: string[];
  keyPointsToRemember: string[];
  summary: string;
  reviewQuestions: HandoutReviewQuestion[];

  // Metadata
  createdAt: string;
  tierAtGeneration: 'free' | 'premium' | 'vip';
  generationDurationMs?: number;
}

export interface HandoutDailyLimitConfig {
  freeDailyLimit: number; // default: 2
  premiumDailyLimit: number; // default: 30
  vipDailyLimit: number | 'unlimited'; // default: 'unlimited'
  updatedAt?: string;
  updatedBy?: string;
}

export interface HandoutUserQuotaInfo {
  tier: 'free' | 'premium' | 'vip';
  todayCount: number;
  dailyLimit: number | 'unlimited';
  remaining: number | 'unlimited';
  canGenerate: boolean;
  dateKey: string;
}

export interface HandoutAdminStats {
  totalGenerated: number;
  generatedToday: number;
  generatedThisMonth: number;
  freeGenerations: number;
  premiumGenerations: number;
  vipGenerations: number;
  failedGenerations?: number;
  lastUpdated: string;
}

export type PastQuestionStatus = 'pending' | 'approved' | 'rejected';
export type PastQuestionFileType = 'image' | 'pdf' | 'document';

export interface PastQuestion {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionCategory: string; // 'University' | 'Polytechnic' | 'College of Education' | 'College of Health & Nursing' | 'Specialized Institute'
  facultyId?: string;
  facultyName: string;
  departmentId?: string;
  departmentName: string;
  level: string; // e.g. "100L", "200L", "ND I", "HND II", etc.
  courseCode: string; // e.g. "CSC 201"
  courseTitle: string; // e.g. "Computer Programming I"
  academicSession: string; // e.g. "2023/2024"
  semester: '1st Semester' | '2nd Semester' | '1st' | '2nd';
  examType?: 'Main Examination' | 'Mid-Semester / Test' | 'Resit / Supplementary' | string;
  fileUrl: string; // Base64 data URL or storage URL
  fileUrls?: string[]; // Multiple image pages
  fileName?: string;
  fileType: PastQuestionFileType;
  pagesCount?: number;
  description?: string;
  lecturerName?: string;
  uploadedBy: string; // User UID
  uploadedByName: string;
  uploadedByEmail?: string;
  uploadedAt: string;
  status: PastQuestionStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  gpAwarded?: number;
  viewsCount: number;
  bookmarksCount?: number;
  compositeKey: string; // `${institutionId}_${departmentName}_${level}_${courseCode}_${academicSession}_${semester}`
}

export interface PastQuestionSettings {
  enabled: boolean;
  uploadGpReward: number; // default: 50
  freeDailyViewLimit: number; // default: 2
  premiumDailyViewLimit: number; // default: 10
  vipDailyViewLimit: number | 'unlimited'; // default: 20 or 'unlimited'
  allowUserUploads: boolean;
  requireVerification: boolean;
  maxUploadsPerWeek: number; // default: 1 upload/contributor/week
  maxUploadsPerDay?: number; // legacy fallback
  freeCanUpload?: boolean; // default: false (Free users cannot upload)
  premiumUploadCooldownDays?: number; // default: 30 (1 upload every 30 days)
  vipUploadCooldownDays?: number; // default: 15 (1 upload every 15 days)
}

export interface UserUploadCooldownStatus {
  canUpload: boolean;
  userTier: 'free' | 'premium' | 'vip';
  cooldownDays: number; // 30 for premium, 15 for vip, 0 for free
  daysRemaining: number;
  hoursRemaining: number;
  remainingUploads: number;
  lastUploadDate: string | null;
  nextEligibleDate: string | null;
  message: string;
  reason?: 'UPGRADE_REQUIRED' | 'COOLDOWN_ACTIVE' | 'OK';
}

export interface PastQuestionViewRecord {
  id: string;
  userId: string;
  questionId: string;
  date: string; // YYYY-MM-DD
  viewedAt: string;
  userTier?: 'free' | 'premium' | 'vip';
}

export interface PastQuestionUploadRecord {
  id: string;
  userId: string;
  questionId: string;
  date: string; // YYYY-MM-DD
  week: string; // YYYY-Www (e.g. 2026-W36)
  uploadedAt: string;
}

export interface LibraryAiSettings {
  enabled: boolean;
  model: string;
  maxGenerationsPerDay?: number; // legacy fallback
  freeDailyLimit: number; // default: 1
  premiumDailyLimit: number; // default: 5
  vipDailyLimit: number | 'unlimited'; // default: 'unlimited' or number
  enablePdfExport: boolean;
  enableTtsSummary: boolean;
  defaultHandoutOption: HandoutOptionType;
  textbookChaptersCount?: number; // default: 8
  textbookDetailLevel?: 'comprehensive_textbook' | 'standard_notes' | 'exam_mastery';
}

// Champions Institutional League Interfaces
export type ChampionsSeasonStatus = 'Draft' | 'Qualifier Selection' | 'Group Stage' | 'Knockout Stage' | 'Completed' | 'Archived';

export interface ChampionsSeason {
  id: string;
  seasonName: string; // e.g. "Champions League Season 1 — 2026"
  year: number;
  category: 'Champions Institutional League';
  status: ChampionsSeasonStatus;
  champion?: {
    id: string;
    name: string;
    shortName: string;
    logo: string;
  };
  runnerUp?: {
    id: string;
    name: string;
    shortName: string;
    logo: string;
  };
  totalInstitutions: number;
  universitiesCount: number;
  polytechnicsCount: number;
  collegesCount: number;
  startDate?: string;
  endDate?: string;
  qualifiersFinalized?: boolean;
  qualifiersFinalizedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ChampionsQualifier {
  id: string; // `${seasonId}_${institutionId}`
  seasonId: string;
  institutionId: string;
  institutionName: string;
  institutionShortName: string;
  institutionLogo: string;
  institutionCategory: InstitutionCategory;
  leaguePosition?: number;
  leaguePoints?: number;
  leagueWins?: number;
  leagueDraws?: number;
  leagueLosses?: number;
  qualificationStatus: 'selected' | 'finalized' | 'removed';
  selectedBy: string;
  selectedByName?: string;
  selectedAt: string;
  finalizedAt?: string;
  notes?: string;
}

export interface ChampionsGroup {
  id: string; // 'group_a', 'group_b', ... 'group_h'
  name: string; // 'Group A', ... 'Group H'
  seasonId: string;
  status?: 'active' | 'locked' | 'completed';
  institutions: Array<{
    id: string;
    name: string;
    shortName: string;
    logo: string;
    category: InstitutionCategory;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChampionsFeatureDay {
  id: string;
  seasonId: string;
  name: string; // "Feature Day 1"
  dayNumber: number;
  scheduledAt: string;
  status: 'upcoming' | 'live' | 'completed';
  enabled: boolean; // When enabled, fixtures appear in live section
  createdAt?: string;
  updatedAt?: string;
}

export interface ChampionsFixture {
  id: string;
  seasonId: string;
  stage: 'group_stage' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
  stageName: string;
  matchNumber?: number;
  groupId?: string;
  groupName?: string;
  featureDayId?: string;
  featureDayName?: string;
  homeInst: { id: string; name: string; shortName: string; logo: string; score?: number; category?: InstitutionCategory };
  awayInst: { id: string; name: string; shortName: string; logo: string; score?: number; category?: InstitutionCategory };
  homeRepresentative?: { id: string; name: string; avatar: string; department?: string; level?: string };
  awayRepresentative?: { id: string; name: string; avatar: string; department?: string; level?: string };
  homeScore: number;
  awayScore: number;
  status: 'Upcoming' | 'Live' | 'Completed' | 'Paused';
  date?: string;
  scheduledTime?: string;
  winnerId?: string;
  winnerName?: string;
  matchRoomId?: string;
  bracketPosition?: number;
  activeQuestionIndex?: number;
  totalQuestions?: number;
  liveAudioActive?: boolean;
  repSpeakingId?: string | null;
  updatedAt?: any;
}

export interface ChampionsQuestion {
  id: string;
  seasonId: string;
  featureDayId?: string;
  fixtureId?: string;
  category: string;
  questionText: string;
  correctAnswer: string; // exact/normalized answer (e.g. "Abuja")
  acceptedAlternatives?: string[];
  scoreAward: number;
  durationSeconds: number;
  questionOrder: number;
  status: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface ChampionsLiveSession {
  id: string; // fixtureId
  fixtureId: string;
  seasonId: string;
  questionIndex: number;
  questionNumber: number;
  totalQuestions: number;
  currentQuestion: {
    id: string;
    questionText: string;
    category: string;
    scoreAward: number;
    durationSeconds: number;
  } | null;
  questionStartedAt: number;
  questionEndsAt: number;
  secondsRemaining?: number;
  state: 'WAITING' | 'LIVE' | 'EVALUATING' | 'REVEALED' | 'MATCH_OVER';
  homeAnswer?: {
    repId: string;
    repName: string;
    answerText: string;
    submittedAt: number;
    isCorrect: boolean;
    scoreAwarded: number;
  };
  awayAnswer?: {
    repId: string;
    repName: string;
    answerText: string;
    submittedAt: number;
    isCorrect: boolean;
    scoreAwarded: number;
  };
  homeScore: number;
  awayScore: number;
  liveAudioActive?: boolean;
  repSpeakingId?: string | null;
  spectatorCount?: number;
  updatedAt: number;
}

export interface ChampionsAnswer {
  id: string;
  fixtureId: string;
  questionId: string;
  representativeId: string;
  representativeName: string;
  institutionId: string;
  institutionName: string;
  answerText: string;
  normalizedAnswer: string;
  isCorrect: boolean;
  scoreAwarded: number;
  submittedAt: number;
}

export interface ChampionsTableStanding {
  position: number;
  institutionId: string;
  institutionName: string;
  shortName: string;
  logo: string;
  category: InstitutionCategory;
  groupId: string;
  played: number; // P
  won: number;    // W
  draw: number;   // D
  lost: number;   // L
  goalsFor: number; // GF
  goalsAgainst: number; // GA
  goalDifference: number; // GD
  points: number; // Pts
  form: Array<'W' | 'D' | 'L'>;
  isQualified: boolean; // Top 2 advance to Knockout
}

export interface ChampionsKnockoutMatch {
  id: string;
  stage: 'round_of_16' | 'quarter_final' | 'semi_final' | 'final';
  stageName: string; // "Round of 16", "Quarter-Finals", "Semi-Finals", "Final"
  matchNumber: number;
  seasonId: string;
  homeInst: { id: string; name: string; shortName: string; logo: string; score?: number };
  awayInst: { id: string; name: string; shortName: string; logo: string; score?: number };
  status: 'Upcoming' | 'Live' | 'Completed';
  date?: string;
  scheduledTime?: string;
  winnerId?: string;
  winnerName?: string;
  matchRoomId?: string;
  bracketPosition?: number;
}

export interface ChampionsAuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  targetId?: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export type InstitutionCategory =
  | 'University'
  | 'Polytechnic'
  | 'College of Education'
  | 'College of Health & Nursing'
  | 'Specialized Institute';

export interface UserNotificationPreferences {
  pushEnabled: boolean;
  matchAlerts: boolean;
  gusReminders: boolean;
  walletTransactions: boolean;
  communityMentions: boolean;
  adminBroadcasts: boolean;
  emailDigest: boolean;
}

export interface SystemSettings {
  platformName: string;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  publicLeagueVisibility: boolean;
  defaultFreeGpOnRegister: number;
  minWithdrawalAmountGp: number;
  maxDailyWithdrawalGp: number;
  gpToFiatRate?: number;
  autoApproveInstitutions: boolean;
  requireStudentVerification: boolean;
  defaultQuestionTimeSeconds: number;
  defaultPenaltyPerMistakeSeconds: number;
  speedClockGraceSeconds: number;
  enableLiveCommunityFeed: boolean;
  enableGusRegistration: boolean;
  announcementBannerText?: string;
  announcementBannerActive?: boolean;
  updatedAt?: string;
  updatedByUid?: string;
}

export interface PrivacySettings {
  showInstitution: boolean;
  showFaculty?: boolean;
  showDepartment: boolean;
  showLevel: boolean;
  institutionVisibility: 'Public' | 'Followers' | 'Private';
  facultyVisibility?: 'Public' | 'Followers' | 'Private';
  departmentVisibility: 'Public' | 'Followers' | 'Private';
  levelVisibility: 'Public' | 'Followers' | 'Private';
  showAcademicInfoOnPosts: boolean;
}

export interface BadgeStoreItem {
  id: string;
  name: string;
  image: string; // Emoji or SVG/URL icon
  gpPrice: number;
  description: string;
  active: boolean;
  color: string;
  createdDate?: string;
  purchasesCount?: number;
}

export type UserEquippedBadge =
  | string
  | {
      id?: string;
      title?: string;
      name?: string;
      icon?: string;
      color?: string;
    };

export interface AcademicProfileData {
  institutionCategory: InstitutionCategory;
  institutionId: string;
  institutionName: string;
  facultyId?: string;
  facultyName?: string;
  faculty?: string;
  departmentId?: string;
  departmentName: string;
  department?: string;
  level: string;
  academicLevel?: string;
  state?: string;
  matricNumber?: string;
  isVerified?: boolean;
  completedAt?: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  displayName?: string;
  fullName?: string;
  username: string;
  usernameLower?: string;
  email?: string;
  avatar: string;
  profileImage?: string;
  role: UserRole;
  isRepresentative?: boolean; // Representative status for competition participation without destroying student account
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  academicProfileCompleted?: boolean;
  academicProfile?: AcademicProfileData;
  institution: string;
  institutionId?: string;
  institutionName?: string;
  institutionCategory?: InstitutionCategory;
  institutionLogo?: string;
  faculty?: string;
  facultyName?: string;
  facultyId?: string;
  department: string;
  departmentId?: string;
  departmentName?: string;
  level: string;
  major: string;
  matricNumber?: string;
  grbxTokens: number;
  gpBalance: number; // GP Wallet balance
  totalGpEarned?: number; // Total cumulative GP points earned
  stakedTokens: number;
  reputationPoints: number;
  gusRank: number;
  gusTier: 'Novice' | 'Scholar' | 'Master' | 'Grandmaster' | 'Titan';
  walletAddress: string;
  bio: string;
  verified: boolean;
  isVerified?: boolean;
  isSuperAdmin?: boolean;
  hasBlueBadge?: boolean;
  studentIdCardUrl?: string;
  idVerificationStatus?: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  idCardUploadedAt?: string;
  privacy: PrivacySettings;
  notificationPreferences?: Partial<UserNotificationPreferences>;
  equippedBadgeId?: string;
  equippedBadge?: UserEquippedBadge;
  isPostingSuspended?: boolean;
  accountStatus?: 'active' | 'suspended' | 'inactive';
  activePlanId?: string;
  membershipTier?: string;
  subscriptionTier?: string;
  subscriptionPlan?: string;
  planId?: string;
  tier?: string;
  plan?: string;
  targetTier?: SubscriptionTierType;
  tierType?: SubscriptionTierType;
  isSubscribed?: boolean;
  isPremium?: boolean;
  isVip?: boolean;
  dailyQaUsage?: {
    date: string;
    count: number;
    lastSubmittedAt?: number;
  };
  subscription?: {
    planId: string;
    name: string;
    price: number;
    currency: string;
    duration: string;
    startDate: string;
    expiryDate: string;
    status: string;
    paymentReference?: string;
  };
  subscriptionExpiry?: string;
  authProvider?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
  badges: Array<{
    id: string;
    title: string;
    icon: string;
    color: string;
  }>;
  purchasedBadgeIds: string[];
  competitionHistory?: {
    gus: Array<{ seasonName: string; position: string; roundReached: number; date: string }>;
    dome: Array<{ sessionName: string; score: number; rank: number; date: string }>;
    league: Array<{ match: string; role: string; result: string; date: string }>;
  };
}

export interface WithdrawalRecord {
  id: string;
  userId?: string;
  username?: string;
  userAvatar?: string;
  amountGP: number;
  fiatValue: string;
  requestDate: string;
  status: 'Pending' | 'Processing' | 'Approved' | 'Paid' | 'Rejected' | 'Cancelled';
  bankName: string;
  accountNumber: string;
  accountName?: string;
  reference?: string;
  adminNotes?: string;
}

export interface SponsorTickerItem {
  id: string;
  tag: string;
  message: string;
  linkText?: string;
  color: string;
}

export interface LiveActivityItem {
  id: string;
  type: 'dome' | 'gus' | 'league' | 'community' | 'reward';
  title: string;
  subtitle: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string;
    institution: string;
  };
  highlight?: string;
  status: 'live' | 'completed' | 'upcoming';
}

export type PlatformEventCategory =
  | 'school_dome'
  | 'gus'
  | 'academic_olympiad'
  | 'chatroom_live'
  | 'campus_hackathon'
  | 'others';

export type PlatformEventStatus = 'Draft' | 'Published' | 'Unpublished' | 'Archived';
export type PlatformEventAudience = 'all_users';

export interface PlatformEventItem {
  id: string;
  eventId?: string;
  title: string;
  category: PlatformEventCategory;
  categoryLabel?: string;
  host: string; // Fixed: "Global Academic Directorate"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  eventTime: string; // e.g. "18:00 UTC"
  prizeReward?: string; // e.g. "50,000 GP Prize Pool" (empty if none)
  audience: PlatformEventAudience; // 'all_users'
  description: string;
  imageUrl: string;
  imageStoragePath?: string;
  status: PlatformEventStatus;
  createdBy?: string;
  createdByName?: string;
  createdAt?: any;
  updatedAt?: any;
  publishedAt?: any;
  archivedAt?: any;
  sortOrder?: number;
  targetTab?: TabType;
  targetSubTab?: 'minimart' | 'announcements' | 'campus';
  channelName?: string;
  channelUrl?: string;
  targetChannel?: string;
  // Legacy / convenience aliases
  date?: string;
  time?: string;
  prizePool?: string;
  institutionHost?: string;
  image?: string;
  participantsCount?: number;
  maxParticipants?: number;
  isRegistered?: boolean;
}

export type EventItem = PlatformEventItem;

export const OFFICIAL_EVENT_HOST = 'Global Academic Directorate';

export const PLATFORM_EVENT_CATEGORIES: {
  id: PlatformEventCategory;
  label: string;
  shortLabel: string;
  tabKey?: TabType;
  channelName: string;
  subTab?: 'minimart' | 'announcements' | 'campus';
}[] = [
  { id: 'school_dome', label: 'School Dome Arena', shortLabel: 'School Dome', tabKey: 'school_dome', channelName: 'School Dome Arena' },
  { id: 'gus', label: 'GUS Championship Event', shortLabel: 'GUS Tournament', tabKey: 'daily_qa', channelName: 'Daily GP Grab' },
  { id: 'academic_olympiad', label: 'Academic Olympiad Event', shortLabel: 'Academic Olympiad', tabKey: 'daily_qa', channelName: 'Daily GP Grab' },
  { id: 'chatroom_live', label: 'Chatroom Live Event', shortLabel: 'Chatroom Live', tabKey: 'daily_qa', channelName: 'Daily GP Grab Live' },
  { id: 'campus_hackathon', label: 'Campus Hackathon & Quiz', shortLabel: 'Campus Hackathon', tabKey: 'community', subTab: 'campus', channelName: 'Campus Network' },
  { id: 'others', label: 'General Student Event', shortLabel: 'Campus Event', tabKey: 'community', subTab: 'campus', channelName: 'Campus Network' },
];

export interface GusSubject {
  id: string;
  name: string;
  category: string;
  score: number; // 0-100
  tier: string;
  verifiedBy: string;
  iconName: string;
  trend: 'up' | 'down' | 'stable';
}

export interface DomeBattle {
  id: string;
  title: string;
  mode: '1v1 Quiz Duel' | 'Timed Code Sprints' | 'Academic Debate' | 'Research Pitch';
  player1: {
    name: string;
    avatar: string;
    institution: string;
    score: number;
  };
  player2: {
    name: string;
    avatar: string;
    institution: string;
    score: number;
  };
  spectators: number;
  status: 'LIVE' | 'WAITING' | 'ENDED';
  prize: string;
  gpReward: number;
  timeRemaining?: string;
}

export interface MasterInstitution {
  id: string;
  institutionId?: string;
  name: string;
  normalizedName?: string;
  shortName?: string;
  category?: InstitutionCategory;
  type?: InstitutionCategory | 'university' | 'polytechnic' | 'college_of_education';
  logo: string;
  logoUrl?: string;
  state: string;
  description: string;
  assignedRepId?: string;
  assignedRepName?: string;
  assignedRepUsername?: string;
  status?: 'active' | 'inactive';
  activeInSeason?: boolean;
  isHidden?: boolean;
  hidden?: boolean;
  createdAt?: any;
  updatedAt?: any;
  departments?: string[];
}

export interface DepartmentDoc {
  id: string;
  departmentId?: string;
  institutionId: string;
  name: string;
  normalizedName?: string;
  status: 'active' | 'inactive';
  createdAt?: any;
  updatedAt?: any;
}

export interface AcademicLevelDoc {
  id: string;
  institutionType: InstitutionCategory;
  name: string;
  status: 'active' | 'inactive';
  ordering: number;
}

export interface AdminAuditLog {
  id: string;
  adminUid: string;
  adminName: string;
  action: string;
  targetId: string;
  details?: any;
  timestamp: string;
}

export type SeasonStatus =
  | 'Draft'
  | 'Registration'
  | 'Registration Open'
  | 'Qualification'
  | 'League Upcoming'
  | 'League Live'
  | 'Upcoming'
  | 'Live'
  | 'Completed'
  | 'Archived'
  | 'Cancelled';

export interface LeagueSeason {
  id: string;
  name: string; // e.g. "Season 1 — 2026"
  year?: number;
  category: InstitutionCategory;
  description?: string;
  registrationStart?: string;
  registrationEnd?: string;
  qualificationStart?: string;
  qualificationEnd?: string;
  leagueStart?: string;
  leagueEnd?: string;
  startDate?: string;
  endDate?: string;
  status: SeasonStatus;
  isActive?: boolean;
  maxParticipatingInstitutions?: number;
  qualificationQuestionCount?: number;
  qualificationTimePerQuestion?: number; // seconds
  participatingInstitutionIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type SeasonParticipationStatus =
  | 'registered'
  | 'qualifying'
  | 'qualified'
  | 'representative_selected'
  | 'active'
  | 'withdrawn'
  | 'eliminated'
  | 'completed';

export interface SeasonParticipation {
  id: string;
  seasonId: string;
  institutionId: string;
  institutionName: string;
  institutionShortName: string;
  institutionLogo: string;
  category: InstitutionCategory;
  status: SeasonParticipationStatus;
  joinedAt: string;
  withdrawnAt?: string;
  qualificationStatus: 'pending' | 'in_progress' | 'completed';
  representativeId?: string;
  representativeName?: string;
  currentPosition: number;
  played: number;
  wins: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
}

export interface QuestionItem {
  id: string;
  text?: string;
  question?: string;
  options?: string[];
  correctAnswer?: string | number;
  correctOptionIndex?: number;
  explanation?: string;
  category?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Master';
  timeLimit?: number; // in seconds
  timeLimitSeconds?: number;
  points?: number;
  gpReward?: number;
  active?: boolean;
}

export interface QuestionSet {
  id: string;
  title: string;
  category: InstitutionCategory;
  questions: QuestionItem[];
  isRandomized?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type FixtureStatus =
  | 'Scheduled'
  | 'Upcoming'
  | 'Lobby'
  | 'Starting'
  | 'Live'
  | 'Paused'
  | 'Completed'
  | 'Cancelled';

export interface LeagueFixture {
  id: string;
  fixtureId?: string;
  seasonId: string;
  category: InstitutionCategory;
  round?: string;
  homeInstId: string;
  homeInst: string;
  awayInstId: string;
  awayInst: string;
  homeLogo: string;
  awayLogo: string;
  homeRep: string;
  homeRepId?: string;
  awayRep: string;
  awayRepId?: string;
  homeScore: number;
  awayScore: number;
  date: string;
  startTime: string;
  endTime?: string;
  roundSession: string; // e.g. "Group Stage Round 1", "Semi-Finals", "Finals"
  status: FixtureStatus;
  scheduledTime: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  matchRoomId: string;
  roomId?: string;
  questionSetId?: string;
  winnerId?: string;
  winnerName?: string;
  currentQuestionIndex?: number;
  isPaused?: boolean;
  scoreA?: number;
  scoreB?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LiveMatchAnswerSubmission {
  fixtureId: string;
  seasonId: string;
  questionId: string;
  representativeId: string;
  representativeName: string;
  institutionId: string;
  institutionName: string;
  answerText: string;
  optionIndex?: number;
  submittedAt: number; // ms timestamp
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export interface LiveMatchState {
  fixtureId: string;
  seasonId: string;
  category: InstitutionCategory;
  matchRoomId: string;
  status: 'scheduled' | 'lobby' | 'starting' | 'live' | 'paused' | 'completed' | 'cancelled';
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: QuestionItem | null;
  questionStartedAt: number; // ms server timestamp
  questionEndsAt: number; // ms server timestamp
  homeInstId: string;
  homeInst: string;
  homeLogo: string;
  homeRepId?: string;
  homeRepName?: string;
  awayInstId: string;
  awayInst: string;
  awayLogo: string;
  awayRepId?: string;
  awayRepName?: string;
  scoreA: number;
  scoreB: number;
  audienceCount: number;
  currentAnswerWindowOpen: boolean;
  answers: Record<string, LiveMatchAnswerSubmission>;
  lastAnswerResult?: {
    questionId: string;
    correctAnswerText: string;
    correctOptionIndex?: number;
    homeResult?: { isCorrect: boolean; points: number; answerText?: string };
    awayResult?: { isCorrect: boolean; points: number; answerText?: string };
    evaluatedAt: number;
  };
  questionOrder?: QuestionItem[];
  isPaused?: boolean;
  pausedRemainingMs?: number;
  winnerId?: string;
  winnerName?: string;
  isDraw?: boolean;
}

export interface MatchResultRecord {
  id: string;
  resultId?: string;
  fixtureId: string;
  seasonId: string;
  category: InstitutionCategory;
  roundSession: string;
  homeInstId: string;
  homeInst: string;
  homeLogo: string;
  homeRepName: string;
  awayInstId: string;
  awayInst: string;
  awayLogo: string;
  awayRepName: string;
  scoreA: number;
  scoreB: number;
  winnerId?: string;
  winnerName?: string;
  isDraw: boolean;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  correctAnswersA: number;
  correctAnswersB: number;
  questionBreakdown?: Array<{
    questionIndex: number;
    questionText: string;
    homeAnswer?: string;
    homeCorrect?: boolean;
    awayAnswer?: string;
    awayCorrect?: boolean;
    correctAnswerText?: string;
  }>;
}

export interface InstitutionLeagueSeason {
  id: string;
  name: string; // e.g. "Season 1 — 2026/2027"
  status: 'Draft' | 'Registration' | 'Active' | 'Locked' | 'Completed' | 'Archived';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  description?: string;
  categories: InstitutionCategory[];
  participatingInstitutions: {
    universityIds: string[];
    polytechnicIds: string[];
    collegeIds: string[];
  };
  totalInstitutions?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstitutionLeagueFixtureDay {
  id: string;
  seasonId: string;
  dayNumber: number;
  title: string; // "Fixture Day 1"
  scheduledDate: string; // "2026-08-20"
  isLiveEnabled: boolean;
  status: 'Upcoming' | 'Live' | 'Completed';
  assignedQuestionIds?: string[];
  questionDurationSeconds?: number; // default 30
  currentQuestionIndex?: number;
  questionStartedAt?: number;
  questionEndsAt?: number;
  isPaused?: boolean;
  totalQuestions?: number;
  pausedRemainingMs?: number;
  // Nationwide Synchronized Background Music
  backgroundMusicPreset?: 'academic_arena' | 'champions_anthem' | 'speed_round' | 'ambient_focus' | 'custom' | string;
  backgroundMusicTitle?: string;
  backgroundMusicUrl?: string; // audio data url or web url
  backgroundMusicEnabled?: boolean;
  backgroundMusicVolume?: number; // 0.0 to 1.0
  backgroundMusicStartedAt?: number; // timestamp in ms when music started or day went live
  createdAt?: string;
  updatedAt?: string;
}

export interface InstitutionLeagueFixture {
  id: string;
  fixtureId?: string;
  fixtureDayId: string;
  seasonId: string;
  category: InstitutionCategory;
  homeInstId: string;
  homeInst: string;
  homeLogo: string;
  homeRep: string;
  homeRepId?: string;
  awayInstId: string;
  awayInst: string;
  awayLogo: string;
  awayRep: string;
  awayRepId?: string;
  homeScore: number;
  awayScore: number;
  scheduledDate: string;
  scheduledTime: string;
  status: 'Scheduled' | 'Upcoming' | 'Live' | 'live' | 'Completed' | 'Cancelled';
  totalQuestions?: number;
  winnerId?: string;
  winnerName?: string;
  isDraw?: boolean;
  matchRoomId?: string;
  currentQuestionIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstitutionLeagueQuestion {
  id: string;
  questionId?: string;
  seasonId?: string;
  fixtureDayId?: string;
  fixtureId?: string;
  question: string;
  category: 'All' | 'University' | 'Polytechnic' | 'College of Education' | 'General';
  topic: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
  options?: string[];
  correctOptionIndex?: number;
  type?: 'typed' | 'multiple_choice';
  durationSeconds: number;
  points: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface InstitutionLeagueLiveRoom {
  fixtureId: string;
  fixtureDayId: string;
  seasonId: string;
  category: InstitutionCategory;
  status: 'scheduled' | 'live' | 'paused' | 'completed';
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: InstitutionLeagueQuestion | null;
  questionStartedAt: number;
  questionEndsAt: number;
  durationSeconds: number;
  currentAnswerWindowOpen: boolean;
  homeInstId: string;
  homeInst: string;
  homeLogo: string;
  homeRepId: string;
  homeRepName: string;
  awayInstId: string;
  awayInst: string;
  awayLogo: string;
  awayRepId: string;
  awayRepName: string;
  scoreA: number;
  scoreB: number;
  isPaused: boolean;
  pausedRemainingMs?: number;
  audienceCount: number;
  answers: Record<string, {
    repId: string;
    repName: string;
    instId: string;
    instName: string;
    answerText: string;
    optionIndex?: number;
    submittedAt: number;
    isCorrect: boolean;
    pointsAwarded: number;
  }>;
  lastAnswerResult?: {
    questionText: string;
    correctAnswer: string;
    homeAnswer?: string;
    homeCorrect?: boolean;
    awayAnswer?: string;
    awayCorrect?: boolean;
    evaluatedAt: number;
  };
  isDraw?: boolean;
  winnerId?: string;
  winnerName?: string;
  liveAudioActive?: boolean;
  repSpeakingId?: string | null;
  updatedAt?: any;
}

export interface InstitutionLeagueResult {
  id: string;
  resultId: string;
  fixtureId: string;
  fixtureDayId: string;
  seasonId: string;
  category: InstitutionCategory;
  homeInstId: string;
  homeInst: string;
  homeLogo: string;
  homeRepName: string;
  awayInstId: string;
  awayInst: string;
  awayLogo: string;
  awayRepName: string;
  scoreA: number;
  scoreB: number;
  winnerId?: string;
  winnerName?: string;
  isDraw: boolean;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  questionBreakdown: Array<{
    questionIndex: number;
    question: string;
    homeAns: string;
    awayAns: string;
    correctAns: string;
    winner: 'home' | 'away' | 'both' | 'none';
    pointsAwarded: number;
  }>;
}

export interface InstitutionLeagueStanding {
  id: string;
  seasonId: string;
  institutionId: string;
  institutionName: string;
  institutionShortName: string;
  institutionLogo: string;
  category: InstitutionCategory;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
  representativeName?: string;
  representativeId?: string;
  position?: number;
  shortName?: string;
  logo?: string;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  form?: string[];
  updatedAt?: any;
}

export interface QualificationParticipant {
  studentId: string;
  studentName: string;
  avatar: string;
  institutionId: string;
  department: string;
  level: string;
  score: number;
  completionTime: string;
  isRepresentative: boolean;
}

export interface QualificationCompetition {
  id: string;
  seasonId: string;
  institutionId: string;
  institutionName?: string;
  category?: InstitutionCategory;
  title: string;
  questionSetId?: string;
  numQuestions: number;
  timePerQuestion: number;
  startDate: string;
  endDate: string;
  attemptRules?: string;
  scoringRules?: string;
  status?: 'Draft' | 'Scheduled' | 'Open' | 'Closed' | 'Completed';
  questions?: QuestionItem[];
  participants?: QualificationParticipant[];
}

export interface QualificationAttempt {
  id: string;
  qualificationId: string;
  seasonId: string;
  institutionId: string;
  userId: string;
  userName: string;
  userUsername?: string;
  userAvatar?: string;
  department: string;
  level: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  completionTimeSeconds: number;
  completedAt: string;
  status: 'submitted' | 'disqualified';
  rank?: number;
}

export type RepresentativeAssignmentStatus = 'active' | 'replaced' | 'removed' | 'completed';

export interface RepresentativeAssignment {
  id: string;
  assignmentId?: string;
  userId: string;
  userName: string;
  userUsername?: string;
  userAvatar?: string;
  institutionId: string;
  institutionName: string;
  department: string;
  level: string;
  seasonId: string;
  seasonName?: string;
  category: InstitutionCategory;
  qualificationScore: number;
  qualificationRank?: number;
  selectedByAdminId: string;
  selectedByAdminName: string;
  selectedAt: string;
  status: RepresentativeAssignmentStatus;
}

export interface SeasonStanding {
  id: string;
  seasonId: string;
  institutionId: string;
  institutionName: string;
  institutionShortName: string;
  institutionLogo: string;
  category: InstitutionCategory;
  rank: number;
  played: number;
  wins: number;
  losses: number;
  points: number;
  scoreFor: number;
  scoreAgainst: number;
  scoreDifference: number;
  representativeName?: string;
}

export interface RepresentativeRecord {
  id: string;
  studentId: string;
  studentName: string;
  avatar: string;
  institutionId: string;
  institutionName: string;
  department: string;
  level: string;
  seasonId: string;
  qualificationScore: number;
  selectionStatus: 'Selected' | 'Candidate' | 'Replaced' | 'Removed';
  selectionDate: string;
}

export interface LiveAudioParticipant {
  id: string;
  name: string;
  avatar: string;
  role: 'Participant A' | 'Participant B' | 'Spectator';
  isMuted: boolean;
  isSpeaking: boolean;
  institutionLogo?: string;
}

export interface InstitutionRank {
  rank: number;
  id: string;
  name: string;
  shortName: string;
  logo: string;
  type: InstitutionCategory;
  played: number;
  won: number;
  lost: number;
  points: number;
  scoreDiff: number; // Goal/Points difference (+/-)
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
  representative: string;
  trend: 'up' | 'down' | 'same';
  region: string;
  scholarsCount: number;
}

export interface Announcement {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  authorAvatar: string;
  date: string;
  content: string;
  category: 'Official' | 'League Rule' | 'Grant Opportunity' | 'System Update';
  important?: boolean;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Draft' | 'Scheduled' | 'Published' | 'Archived';
  image?: string;
  isPinned?: boolean;
  isRead?: boolean;
  publishDate?: string;
  scheduleDate?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  parentId?: string | null;
  replyTo?: {
    name: string;
    username: string;
    commentId: string;
  } | null;
  author: {
    name: string;
    username: string;
    avatar: string;
    role: UserRole;
    institution: string;
    department?: string;
    equippedBadge?: UserEquippedBadge;
    membershipTier?: string;
    subscriptionTier?: string;
    isPremium?: boolean;
    isStaffOrAdmin?: boolean;
    isCommunityManager?: boolean;
    verified?: boolean;
  };
  content: string;
  timestamp: string;
  createdAtMillis?: number;
  likes: number;
  isLiked?: boolean;
  likedBy?: string[];
  replies?: PostComment[];
  repliesCount?: number;
}

export interface PostReport {
  id: string;
  postId: string;
  reportedBy: string;
  reason: string;
  timestamp: string;
  status: 'Pending' | 'Dismissed' | 'Hidden';
}

export interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    role: UserRole;
    isRepresentative?: boolean;
    institution: string;
    department?: string;
    level?: string;
    privacy?: PrivacySettings;
    badges?: Array<{ id: string; title: string; icon: string; color: string }>;
    equippedBadge?: UserEquippedBadge;
    membershipTier?: string;
    subscriptionTier?: string;
    isPremium?: boolean;
    isStaffOrAdmin?: boolean;
    isCommunityManager?: boolean;
    verified: boolean;
  };
  content: string;
  timestamp: string;
  tags: string[];
  likes: number;
  commentsCount: number;
  shares: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isAiGenerated?: boolean;
  image?: string;
  status?: 'Published' | 'Hidden' | 'Deleted';
  reports?: PostReport[];
  commentsList?: PostComment[];
  attachments?: {
    type: 'code' | 'image' | 'chart';
    data: string;
  };
  createdAtMillis?: number;
}

export interface Transaction {
  id: string;
  type:
    | 'reward'
    | 'stake'
    | 'transfer'
    | 'grant'
    | 'gp_earned'
    | 'gp_withdrawal'
    | 'badge_purchase'
    | 'admin_adjustment'
    | 'subscription_purchase'
    | 'vtu_purchase'
    | 'vtu_redemption'
    | 'refund'
    | 'welcome_bonus'
    | string;
  amount: number;
  unit: 'GRBX' | 'GP' | string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  isCredit: boolean;
  transactionId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  institutionName?: string;
  adminUid?: string;
  adminName?: string;
  reason?: string;
  createdAt?: any;
  meta?: any;
}

export type MinimartProductCondition =
  | 'New'
  | 'Used'
  | 'Fairly Used'
  | 'Used - Good'
  | 'Used - Like New'
  | 'Used - Fair'
  | 'Refurbished'
  | string;

export type MinimartProductStatus = 'active' | 'expired' | 'suspended' | 'removed' | 'archived';

export interface MinimartProduct {
  id: string;
  productId: string;
  sellerId: string;
  sellerName: string;
  sellerUsername?: string;
  sellerProfileImage?: string;
  sellerAvatar?: string;
  sellerVerified?: boolean;
  sellerInstitution?: string;
  sellerDepartment?: string;
  institutionId?: string;
  institutionName: string;
  departmentName?: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  description: string;
  price: number;
  currency: 'NGN' | string;
  condition: MinimartProductCondition;
  imageUrls?: string[];
  images?: string[];
  whatsappNumber: string;
  location?: string;
  locationCampus?: string;
  contactHours?: string;
  tags?: string[];
  isNegotiable?: boolean;
  additionalInfo?: string;
  status: MinimartProductStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  subscriptionPlan: 'premium' | 'vip' | 'admin' | string;
  listingDurationHours: number;
  reportsCount?: number;
  viewsCount?: number;
}

export interface MinimartCategory {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  icon?: string;
  status: 'active' | 'disabled';
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type MinimartReportReason =
  | 'Scam'
  | 'Fake product'
  | 'Prohibited item'
  | 'Misleading information'
  | 'Inappropriate content'
  | 'Spam'
  | 'Other'
  | 'scam_fraud'
  | 'fake_counterfeit'
  | 'prohibited_goods'
  | 'misleading_pricing'
  | 'inappropriate'
  | 'other';

export interface MinimartReport {
  id: string;
  reportId: string;
  productId: string;
  productName?: string;
  sellerId?: string;
  sellerName?: string;
  reportedBy: string;
  reporterName?: string;
  reason: MinimartReportReason;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

export interface MinimartConfig {
  premiumDailyListingLimit: number;
  vipDailyListingLimit: number;
  premiumListingDurationHours: number;
  vipListingDurationHours: number;
  enabled: boolean;
  minPriceNGN?: number;
  maxPriceNGN?: number;
  maxImagesPerListing?: number;
  limitsByTier?: {
    free?: { dailyListings: number; listingDurationHours: number };
    premium?: { dailyListings: number; listingDurationHours: number };
    vip?: { dailyListings: number; listingDurationHours: number };
  };
}

export interface UserListingEligibility {
  userId: string;
  todayCount: number;
  dailyLimit: number;
  remainingToday: number;
  userTier: 'free' | 'premium' | 'vip';
  canCreateProduct: boolean;
  listingDurationHours: number;
  nextResetTime?: string;
  reason?: string;
}

export interface UserPostEligibility {
  userId: string;
  postCountLast24h: number;
  dailyLimit: number | 'unlimited';
  remainingPosts: number | 'unlimited';
  userTier: 'free' | 'premium' | 'vip';
  canCreatePost: boolean;
  hoursRemaining?: number;
  nextEligibleDate?: string | null;
  reason?: string;
}

export interface GpConversionConfig {
  gpToFiatRate: number; // e.g. 100 GP = $1.00 USD
  currencySymbol: string;
  currencyCode: string;
  minimumWithdrawalGP: number;
  maximumWithdrawalGP: number;
  withdrawalFeeGP: number;
  rules: string[];
}

export interface SponsorshipCampaign {
  id: string;
  title: string;
  sponsorName: string;
  logo: string;
  banner?: string;
  text: string;
  destinationUrl?: string;
  startDate: string;
  endDate: string;
  placement: 'Ticker' | 'HomeBanner' | 'CommunityFeed' | 'Sidebar';
  priority: 'Low' | 'Medium' | 'High' | 'Top';
  status: 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Expired' | 'Archived';
  ctaText?: string;
  tag?: string;
  badgeLabel?: string;
  impressions?: number;
  clicks?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface UpgradePlan {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  isCurrent?: boolean;
  active: boolean;
  badgeLabel?: string;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  targetUserId?: string;
  targetRole?: string;
  excludeUserId?: string;
  senderUserId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderInstitution?: string;
  senderFaculty?: string;
  senderDepartment?: string;
  senderLevel?: string;
  senderTier?: string;
  requestId?: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'dome' | 'gus' | 'league' | 'wallet' | 'announcement' | 'system' | 'reward' | 'academic_library' | 'library' | 'vtu' | 'minimart' | 'campus' | (string & {});
  actionUrl?: string;
  createdAtMs?: number;
}

// ==========================================
// GUS (Global Ultimate Search) Interfaces
// ==========================================

export type GusSeasonStatus = 'Draft' | 'Registration Open' | 'Upcoming' | 'Live' | 'Paused' | 'Completed' | 'Archived';
export type GusRoundStatus = 'Draft' | 'Locked' | 'Ready' | 'Live' | 'Upcoming' | 'Active' | 'Completed';
export type GusParticipantStatus = 'ACTIVE' | 'ELIMINATED' | 'COMPLETED' | 'DISQUALIFIED' | 'NOT_STARTED';
export type GusRoundEligibility = 'FREE_AND_PREMIUM' | 'PREMIUM_ONLY';
export type GusPrizeVisibility = 'VISIBLE' | 'HIDDEN';

export interface GusPrizeConfig {
  id?: string;
  position: number;
  positionTitle?: string; // e.g. "1st Place - Ultimate Scholar Champion"
  title?: string;
  percentage?: number;
  gpAmount?: number;
  gpReward?: number;
  description?: string;
  active?: boolean;
}

export interface GusWinner {
  id: string;
  position: number;
  positionTitle: string;
  userId: string;
  userName: string;
  userAvatar: string;
  institution: string;
  gpAwarded: number;
  finalRoundReached: number;
  finalScore: number;
}

export interface GusQuestionBankItem {
  id: string;
  seasonId?: string;
  roundId?: string;
  roundNumber?: number; // e.g. 1, 2, 3...
  roundName?: string;
  questionOrder?: number; // 1, 2, 3...
  question: string;
  correctAnswer?: string; // TYPED answer based (e.g. "Abuja", "Superposition", "Shor's Algorithm")
  acceptedAnswers?: string[]; // Alternative valid spellings/aliases
  options?: string[]; // Optional for legacy compatibility
  correctOptionIndex?: number; // Optional for legacy compatibility
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Master';
  timeLimitSeconds?: number;
  points?: number;
  explanation?: string;
  active?: boolean;
  createdAt?: string;
}

export interface GusRound {
  id: string;
  seasonId?: string;
  roundNumber: number;
  name?: string; // Admin-defined name, e.g. "Preliminary Logic Elimination", "Quarter-Finals Speed Sprint"
  title?: string; // Alias for name
  date?: string; // Round date, e.g. "2026-09-15"
  status: GusRoundStatus;
  questions?: GusQuestionBankItem[];
  questionsCount?: number;
  timePerQuestionSeconds: number;
  eligibility?: GusRoundEligibility;
  startCondition?: string;
}

export interface GusCompetition {
  id: string;
  seasonId?: string;
  title: string;
  seasonNumber?: number;
  description?: string;
  status: GusSeasonStatus;
  prizePoolGP: number;
  prizePoolVisibility: GusPrizeVisibility;
  currentRound: number; // Active round number
  currentRoundName?: string;
  currentQuestionIndex: number; // 0-based
  totalRounds: number; // Dynamic total rounds
  questionsPerRound: number;
  totalQuestions: number;
  timePerQuestionSeconds: number;
  roundEligibility: Record<number, GusRoundEligibility>;
  rules: string[];
  totalParticipants: number;
  activeParticipants: number;
  eliminatedParticipants: number;
  startedAt?: string;
  completedAt?: string;
  winners?: GusWinner[];
  updatedAt?: any;
}

export interface GusSeason {
  id: string;
  title: string; // e.g. "GUS Season 1 — Apex Grandmaster Olympiad"
  seasonNumber?: number;
  description?: string;
  status: GusSeasonStatus;
  registrationStartDate: string;
  registrationEndDate: string;
  competitionStartDate: string;
  competitionEndDate: string;
  prizePoolGP: number;
  prizePoolVisibility?: GusPrizeVisibility;
  rules: string[];
  registeredParticipantIds: string[];
  activeParticipantIds: string[];
  eliminatedParticipantIds: string[];
  currentRoundIndex: number; // 0-based
  currentQuestionIndex: number; // 0-based inside round
  rounds: GusRound[];
  prizes: GusPrizeConfig[];
  winners: GusWinner[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GusParticipantRecord {
  id?: string;
  competitionId?: string;
  seasonId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  institution: string;
  department?: string;
  level?: string;
  registrationStatus: 'REGISTERED' | 'NOT_REGISTERED';
  status: GusParticipantStatus;
  currentRound: number;
  currentQuestion: number;
  questionsCompleted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  isPremium?: boolean;
  eliminatedAtRound?: number;
  eliminatedAtQuestion?: number;
  eliminationReason?: 'Wrong Answer' | 'Time Expired' | 'Premium Required' | 'Disqualified';
  finalPosition?: number;
  prizeAwardedGP?: number;
  registeredAt?: string;
  lastAnswerSubmittedAt?: number;
  lastAnswerCorrect?: boolean;
  lastSubmittedAnswerText?: string;
}

export type GusCompetitionStateStatus =
  | 'WAITING'
  | 'QUESTION_LIVE'
  | 'ANSWER_SUBMITTED'
  | 'TIME_EXPIRED'
  | 'EVALUATING'
  | 'QUESTION_RESULT'
  | 'ROUND_COMPLETED'
  | 'ADVANCED'
  | 'ELIMINATED'
  | 'FINAL_ROUND'
  | 'COMPLETED'
  | 'PAUSED';

export interface GusLiveState {
  competitionId: string;
  seasonId?: string;
  title?: string;
  status: 'WAITING' | 'LIVE' | 'PAUSED' | 'EVALUATING' | 'ROUND_TRANSITION' | 'COMPLETED';
  currentRound: number;
  currentRoundName?: string;
  currentQuestionOrder: number;
  currentQuestionIndex: number;
  totalRounds: number;
  questionsPerRound: number;
  question: {
    id: string;
    question: string;
    topic: string;
    difficulty: string;
    timeLimitSeconds: number;
    options?: string[]; // Optional backwards compatibility
    correctAnswer?: string; // For reveal / referee verification
  } | null;
  questionStartedAt: number; // ms timestamp
  questionEndsAt: number; // ms timestamp
  timeLimitSeconds: number;
  totalParticipants: number;
  activeParticipants: number;
  eliminatedParticipants: number;
  roundEligibility: GusRoundEligibility;
  prizePoolGP: number;
  prizePoolVisibility: GusPrizeVisibility;
  winners?: GusWinner[];
  updatedAt?: any;
}

export interface GusLiveClockState {
  seasonId: string;
  roundNumber: number;
  questionNumber: number;
  totalQuestionsInRound: number;
  currentQuestion: QuestionItem | null;
  questionStartAt: number; // ms timestamp
  questionEndAt: number; // ms timestamp
  secondsRemaining: number;
  competitionStatus: GusCompetitionStateStatus;
  totalParticipantsCount: number;
  activeParticipantsCount: number;
  eliminatedParticipantsCount: number;
}

// ==========================================
// DOME Competition Interfaces
// ==========================================

export type DomeSessionStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Registration Open'
  | 'Live'
  | 'Paused'
  | 'Completed'
  | 'Cancelled'
  | 'Archived';

export interface DomeQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Master';
  timeLimitSeconds: number;
  gpReward: number;
  questionOrder: number;
  active: boolean;
}

export interface DomeSession {
  id: string;
  name: string;
  description: string;
  totalQuestions: number;
  questions: DomeQuestionItem[];
  startDate: string;
  startTime: string;
  endDate: string;
  timePerQuestionSeconds: number;
  gpRewardPerQuestion: number;
  eligibility: string;
  status: DomeSessionStatus;
  participantsCount: number;
  totalGpDistributed: number;
  currentQuestionIndex: number; // 0-based
  questionStartAt?: number; // ms timestamp
  questionEndAt?: number; // ms timestamp
}

export interface DomeUserProgress {
  sessionId: string;
  questionsAnswered: number;
  correct: number;
  incorrect: number;
  missed: number;
  gpEarned: number;
  accuracy: number; // percentage (0-100)
  rank: number;
  userAnswers: Record<number, { selectedOption: number | null; isCorrect: boolean; gpEarned: number; timeTaken?: number }>;
}

export interface DomeScoreboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  institution?: string;
  correctAnswers: number;
  questionsAnswered: number;
  gpEarned: number;
}

export interface DomeHistoryItem {
  id: string;
  sessionName: string;
  date: string;
  totalQuestions: number;
  participantsCount: number;
  gpDistributed: number;
  userResult?: {
    correct: number;
    total: number;
    gpEarned: number;
    rank: number;
    accuracy: number;
  };
}

export interface DomeLiveClockState {
  sessionId: string;
  questionNumber: number;
  totalQuestions: number;
  currentQuestion: DomeQuestionItem | null;
  questionStartAt: number;
  questionEndAt: number;
  secondsRemaining: number;
  sessionStatus: DomeSessionStatus;
  activeParticipantsCount: number;
  answersReceivedCount: number;
  correctCount: number;
  incorrectCount: number;
  avgResponseTimeSeconds: number;
  totalGpDistributed: number;
}

// ==========================================
// GROBAAX COMMUNITY CHATROOM LIVE INTERFACES
// ==========================================

export type ChatroomLiveMessageType =
  | 'normal'
  | 'question'
  | 'announcement'
  | 'system';

export interface ChatroomLiveMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  institution: string;
  department?: string;
  level?: string;
  isPremium: boolean;
  isVip?: boolean;
  membershipTier?: string;
  role?: string;
  equippedBadge?: UserEquippedBadge;
  messageText: string;
  timestamp: number; // ms
  createdAt?: any;
  type: ChatroomLiveMessageType;
  replyTo?: {
    id: string;
    userName: string;
    messageSnippet: string;
    institution?: string;
  };
  evalStatus?: 'correct' | 'wrong' | null;
  isCorrect?: boolean;
  isWinner?: boolean;
  gpAwarded?: number;
  winnerRank?: number;
  targetQuestionId?: string;
  competitionRef?: {
    competitionId: string;
    questionId: string;
    questionNumber: number;
    totalQuestions: number;
    questionText: string;
    correctAnswer?: string;
    acceptedAlternativeAnswers?: string[];
    status: 'active' | 'closed';
    gpRewardPerWinner: number;
    winnerCountLimit: number;
    allowFreeParticipation: boolean;
    targetTier?: 'free' | 'premium' | 'vip' | 'all';
    targetPlanName?: string;
    allowedPlanIds?: string[];
    timeLimitSeconds?: number;
    startAt?: number;
    endAt?: number;
    repliedUserIds?: string[];
    repliedUsernames?: string[];
    selectedWinners?: Array<{
      userId: string;
      userName: string;
      userAvatar?: string;
      institution?: string;
      isPremium?: boolean;
      isVip?: boolean;
      membershipTier?: string;
      submittedAt?: number;
      gpAwarded?: number;
    }>;
  };
  answerEvaluation?: {
    questionId: string;
    isCorrect: boolean;
    isPremium: boolean;
    isWinner?: boolean;
    gpAwarded?: number;
    freeUpgradePrompt?: boolean;
  };
  reactions?: Record<string, number>;
  isDeleted?: boolean;
}

export interface ChatroomLiveQuestion {
  id: string;
  competitionId?: string;
  questionNumber: number;
  totalQuestions?: number;
  questionText: string;
  correctAnswer: string; // e.g. "Abuja"
  acceptedAlternativeAnswers?: string[]; // aliases / typos accepted
  timeLimitSeconds: number;
  startAt: number;
  endAt: number;
  status: 'draft' | 'active' | 'closed' | 'finalized';
  winnerLimit: number; // default 5 (1, 3, 5, 10, etc.)
  gpRewardPerWinner: number; // e.g. 200 GP
  allowFreeParticipation: boolean;
  premiumRequiredForRewards: boolean;
  selectedWinners: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    institution: string;
    isPremium: boolean;
    isVip?: boolean;
    membershipTier?: string;
    submittedAt: number;
    gpAwarded: number;
  }>;
  repliedUserIds?: string[];
  repliedUsernames?: string[];
  freeCorrectSubmissionsCount?: number;
  totalSubmissionsCount?: number;
  createdAt: number;
}

export interface ChatroomLiveCompetition {
  id: string;
  title: string;
  scheduledDate: string; // e.g. "Monday–Friday, 7:00 PM"
  status: 'Scheduled' | 'Live' | 'Completed' | 'Paused';
  totalQuestions: number;
  currentQuestionIndex: number;
  winnerLimitPerQuestion: number;
  gpRewardPerWinner: number;
  totalPrizePool: number;
  allowFreeParticipation: boolean;
  premiumRequiredForRewards: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatroomLiveAnswerSubmission {
  id: string;
  questionId: string;
  competitionId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  institution: string;
  submittedAnswer: string;
  normalizedAnswer: string;
  isCorrect: boolean;
  isPremium: boolean;
  timestamp: number;
  isWinner: boolean;
  rewardProcessed: boolean;
  gpAwarded: number;
}

export interface UltimateSearchRuleItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface UltimateSearchRulesData {
  title: string;
  scheduleNotice: string;
  generalGuidelines?: string;
  rules: UltimateSearchRuleItem[];
  freeScholarPolicy?: string;
  updatedAt?: string;
  updatedByUid?: string;
  updatedByName?: string;
}

export interface ChatroomLiveSettings {
  allowFreeUsersToParticipate: boolean;
  premiumRequiredForRewards: boolean;
  defaultWinnerCount: number;
  defaultGpRewardPerWinner: number;
  defaultTimeLimitSeconds?: number;
  competitionScheduleNotice: string;
  isChatMuted: boolean;
  mutedUserIds: string[];
  ultimateSearchRules?: UltimateSearchRulesData;
}

export interface DailyChatAllowanceInfo {
  userId: string;
  userTier: 'free' | 'premium' | 'vip' | 'admin';
  date: string;
  usedCount: number;
  dailyLimit: number;
  remainingCount: number;
  isLimitReached: boolean;
}

export interface DailyChatResponseRecord {
  id: string;
  userId: string;
  date: string;
  count: number;
  userTier: 'free' | 'premium' | 'vip' | 'admin';
  lastSubmittedAt: number;
  updatedAt?: any;
}

// ==========================================
// GROBAAX SUG ELECTION SYSTEM INTERFACES
// ==========================================

export type SugCampaignType = 'general_sug' | 'faculty' | 'departmental' | 'other';

export type SugCampaignStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Voting Open'
  | 'Voting Closed'
  | 'Results Processing'
  | 'Results Published'
  | 'Archived'
  | 'Suspended';

export type SugScopeType = 'institution' | 'faculty' | 'department' | 'custom';

export type SugResultsVisibility = 'live' | 'after_close' | 'admin_only';

export interface SugManagerRequest {
  id?: string;
  requestId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  institutionCategory?: InstitutionCategory;
  applicantName: string;
  applicantEmail: string;
  applicantAvatar?: string;
  sugPosition: string; // e.g., "Electoral Committee Chairman", "SUG President", etc.
  studentId: string; // Matric / Student Identification Number
  sugIdDocument: string; // Base64 document or verification image
  institutionalEmail?: string;
  additionalInfo?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  rejectionReason?: string;
  verificationNotes?: string;
  updatedAt?: string;
}

export interface SugManager {
  id?: string;
  managerId: string; // institutionId as document id or uid
  userId: string;
  institutionId: string;
  institutionName: string;
  institutionCategory?: InstitutionCategory;
  fullName: string;
  email: string;
  avatar?: string;
  position: string;
  status: 'active' | 'suspended' | 'revoked';
  approvedAt: string;
  approvedBy: string;
  approvedByName?: string;
  updatedAt: string;
}

export interface SugCampaign {
  id?: string;
  campaignId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo?: string;
  institutionCategory?: InstitutionCategory;
  createdBy: string; // User ID of creator
  createdByName?: string;
  managerId: string; // Authorized SUG Manager ID
  title: string;
  campaignType: SugCampaignType;
  description: string;
  coverImage?: string;
  videoUrl?: string;
  electionInstructions?: string;
  status: SugCampaignStatus;
  startAt: string; // ISO datetime string
  endAt: string; // ISO datetime string
  publicVisibility: boolean;
  resultsVisibility: SugResultsVisibility;
  sectionsCount?: number;
  positionsCount?: number;
  totalVotesCount?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
}

export interface SugSection {
  id?: string;
  sectionId: string;
  campaignId: string;
  institutionId: string;
  title: string; // e.g., "General SUG", "Faculty of Engineering", "Computer Science Department"
  description?: string;
  scopeType: SugScopeType;
  facultyId?: string;
  facultyName?: string;
  departmentId?: string;
  departmentName?: string;
  order: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface SugPosition {
  id?: string;
  positionId: string;
  campaignId: string;
  sectionId: string;
  institutionId: string;
  title: string; // Dynamic custom title (e.g. "SUG President", "Academic Affairs Director", "Treasurer")
  description?: string;
  order: number;
  status: 'active' | 'inactive';
  candidatesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SugCandidate {
  id?: string;
  candidateId: string;
  campaignId: string;
  sectionId: string;
  positionId: string;
  institutionId: string;
  fullName: string;
  profileImage: string;
  candidateNumber?: string;
  manifesto: string;
  biography?: string;
  campaignInformation?: string;
  department?: string;
  level?: string;
  status: 'active' | 'disqualified' | 'withdrawn';
  createdAt: string;
  updatedAt: string;
}

export interface SugVote {
  id?: string;
  voteId: string; // `${campaignId}_${positionId}_${voterEligibilityKey}`
  campaignId: string;
  sectionId: string;
  positionId: string;
  candidateId: string;
  institutionId: string;
  facultyId?: string;
  departmentId?: string;
  voterEligibilityKey: string; // Hash or student UID
  submittedAt: string;
}

export interface SugResult {
  id?: string;
  resultId: string; // `${campaignId}_${positionId}`
  campaignId: string;
  sectionId: string;
  positionId: string;
  positionTitle?: string;
  candidateTotals: Record<string, number>; // candidateId -> count
  totalVotes: number;
  winnerCandidateId?: string;
  winnerCandidateName?: string;
  isTie?: boolean;
  tieCandidateIds?: string[];
  status: 'provisional' | 'final' | 'tie_pending' | 'resolved';
  calculatedAt: string;
  publishedAt?: string;
  tieResolutionNotes?: string;
  resolvedWinnerCandidateId?: string;
}

export interface SugAuditLog {
  id?: string;
  logId: string;
  actorUserId: string;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  institutionId: string;
  institutionName?: string;
  campaignId?: string;
  campaignTitle?: string;
  sectionId?: string;
  positionId?: string;
  timestamp: number;
  date: string;
  metadata?: Record<string, any>;
}

export interface StudentVerificationRequest {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  institutionCategory: InstitutionCategory;
  institutionId: string;
  institutionName: string;
  departmentId?: string;
  departmentName: string;
  level: string;
  studentIdCardUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

// ==========================================
// GLOBAL NAVIGATION NOTIFICATION BADGE SYSTEM
// ==========================================

export type UserNavSectionKey =
  | 'home'
  | 'league'
  | 'gus'
  | 'hints'
  | 'library'
  | 'community'
  | 'sug'
  | 'chatroom'
  | 'user'
  | 'minimart'
  | 'announcements'
  | 'campus';

export type AdminNavSectionKey = AdminTabType;

export interface UserSectionUnreadCounts {
  home: number;
  league: number;
  gus: number;
  daily_qa: number;
  hints: number;
  library: number;
  community: number;
  sug: number;
  chatroom: number;
  user: number;
  minimart: number;
  announcements: number;
  campus: number;
  [key: string]: number;
}

export type AdminSectionUnreadCounts = Record<AdminTabType, number>;

export interface SectionReadState {
  [sectionKey: string]: number; // timestamp ms of when section was last viewed
}

export interface SectionNotificationEvent {
  id: string;
  section: string;
  title: string;
  message?: string;
  timestamp: number;
  targetRole?: 'USER' | 'ADMIN' | 'ALL';
  metadata?: Record<string, any>;
}

// ==========================================
// GROBAAX COMMUNITY CAMPUS TYPES
// ==========================================

export interface CampusMembership {
  id: string;
  userId: string;
  institution: string;
  institutionCategory?: InstitutionCategory;
  faculty: string;
  department: string;
  level: string;
  whatsappNumber: string;
  whatsappVerified: boolean;
  joinedAt: string;
  updatedAt: string;
  status: 'active' | 'suspended';
  lastActiveAt?: string;
}

export type CampusConnectionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface CampusConnectionRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  senderInstitution: string;
  senderFaculty: string;
  senderDepartment: string;
  senderLevel: string;
  senderTier?: 'free' | 'premium' | 'vip';
  recipientId: string;
  recipientName: string;
  recipientUsername: string;
  recipientAvatar: string;
  recipientInstitution: string;
  recipientFaculty: string;
  recipientDepartment: string;
  recipientLevel: string;
  recipientTier?: 'free' | 'premium' | 'vip';
  institution: string;
  status: CampusConnectionStatus;
  createdAt: string;
  respondedAt?: string;
  updatedAt: string;
}

export interface CampusStudentCard {
  id: string;
  name: string;
  username: string;
  avatar: string;
  institution: string;
  faculty: string;
  department: string;
  level: string;
  tier: 'free' | 'premium' | 'vip';
  hasBlueBadge?: boolean;
  isVerified?: boolean;
  isOnline: boolean;
  connectionStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected' | 'self';
  requestId?: string;
  joinedCampus?: boolean;
}

// ==========================================
// SCHOOL DOME COMPETITION SYSTEM TYPES
// ==========================================

export type SchoolDomeSeasonStatus = 'upcoming' | 'registration_open' | 'active' | 'ended';

export interface SchoolDomeWinner {
  userId: string;
  userName: string;
  avatar?: string;
  institution?: string;
  department?: string;
  prizeWon: number;
}

export interface SchoolDomeSeason {
  id: string;
  seasonNumber: number;
  title: string;
  description?: string;
  prizePool: number; // e.g. 50000
  prizeCurrency: 'NGN' | 'GP';
  status: SchoolDomeSeasonStatus;
  registeredUserIds: string[];
  activeUserIds: string[]; // Participants still standing
  eliminatedUserIds: string[]; // Participants knocked out
  isRegistrationLocked: boolean; // Permanently locked the moment first question is launched
  firstQuestionLaunched: boolean;
  currentQuestionNumber: number;
  totalQuestionsLaunched: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  winners?: SchoolDomeWinner[];
  rules?: string[];
}

export type SchoolDomeParticipantStatus = 'active' | 'eliminated' | 'winner';

export interface SchoolDomeParticipant {
  id: string;
  seasonId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  institution?: string;
  department?: string;
  level?: string;
  isPremium?: boolean;
  isVip?: boolean;
  subscriptionTier?: string;
  subscriptionPlan?: string;
  planId?: string;
  membershipTier?: string;
  status: SchoolDomeParticipantStatus;
  registeredAt: number;
  eliminatedAtQuestionNumber?: number;
  eliminatedAt?: number;
  correctAnswersCount: number;
}

export interface SchoolDomeQuestion {
  id: string;
  seasonId: string;
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  acceptedAlternativeAnswers?: string[];
  timeLimitSeconds: number;
  targetTier?: 'free' | 'premium' | 'vip' | 'all';
  allowedPlanIds?: string[]; // Specific subscription plan IDs (e.g. 'plan_basic_naira', 'plan_pro_naira', 'plan_titan_naira')
  targetPlanName?: string; // Display name of specific plan requirement (e.g. "Scholar Starter Plan", "Grobaax Titan Annual VIP")
  startAt: number;
  endAt: number;
  status: 'active' | 'closed';
  survivorUserIds?: string[];
  eliminatedUserIds?: string[];
  totalSubmissionsCount: number;
  repliedUserIds?: string[];
  repliedUsernames?: string[];
  createdAt: number;
  createdByUid?: string;
  createdByName?: string;
}

export interface SchoolDomeMessage extends ChatroomLiveMessage {
  seasonId?: string;
  subscriptionTier?: string;
  subscriptionPlan?: string;
  planId?: string;
  targetTier?: 'free' | 'premium' | 'vip' | 'all';
  targetPlanName?: string;
  allowedPlanIds?: string[];
  isAnswer?: boolean;
  isCorrect?: boolean;
  evalStatus?: 'correct' | 'wrong';
  questionId?: string;
  questionNumber?: number;
}




