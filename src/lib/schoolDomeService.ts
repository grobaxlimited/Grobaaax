import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  deleteDoc,
  isSubscriptionExpired,
  supabaseAdmin,
} from './firebase';
import {
  SchoolDomeSeason,
  SchoolDomeSeasonStatus,
  SchoolDomeQuestion,
  SchoolDomeMessage,
  SchoolDomeParticipant,
  SchoolDomeWinner,
  UserProfile,
  PRIMARY_SUPER_ADMIN_UID,
} from '../types';
import { grobaxNotificationService } from './notificationService';

export interface ScholarPlanEligibilityResult {
  isEligible: boolean;
  userTierName: 'free' | 'premium' | 'vip' | 'admin';
  userPlanName: string;
  userPlanId: string;
  requiredPlanText: string;
  reason?: string;
}

/**
 * Evaluates whether a user's subscription tier or specific plan allows them to answer a School Dome question.
 * Filters out ineligible users while protecting them from unfair elimination.
 */
export function checkScholarSchoolDomePlanEligibility(
  user: any,
  question: SchoolDomeQuestion | null | undefined
): ScholarPlanEligibilityResult {
  // 1. Resolve Admin & Arbiter Privileges (Moderators and staff can always test/answer questions)
  const role = (user?.role || '').toLowerCase();
  const email = (user?.email || '').toLowerCase();
  const userName = (user?.name || user?.userName || '').toLowerCase();
  const userId = user?.id || user?.userId || '';

  const isStaffOrAdmin =
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'community_manager' ||
    role === 'staff' ||
    Boolean(user?.managerRole) ||
    email === 'grobaxycompany@gmail.com' ||
    userId === 'aGZBTsB4BBNvlY1A69hwfAb5DCJ3' ||
    userId === 'iH02BTcB4B0BV2YLA60WwFAi50CJ3' ||
    userId === 'grobax_arbiter' ||
    userName.includes('admin') ||
    userName.includes('moderator') ||
    userName.includes('staff') ||
    userName.includes('arbiter');

  // 2. Resolve User's Effective Subscription Tier & Plan
  const membership = ((user?.membershipTier || user?.tierName || '') + '').toLowerCase();
  const subTier = ((user?.subscriptionTier || '') + '').toLowerCase();
  const rawPlanId = ((user?.activePlanId || user?.planId || user?.tier || '') + '').toLowerCase();
  const subPlanName = ((user?.subscriptionPlan || '') + '').toLowerCase();

  const isExpired = !isStaffOrAdmin && isSubscriptionExpired(user);

  const isVip = isStaffOrAdmin || (!isExpired && Boolean(
    user?.isVip ||
    user?.gusTier === 'Titan' ||
    rawPlanId.includes('titan') ||
    rawPlanId.includes('vip') ||
    rawPlanId.includes('annual') ||
    membership.includes('vip') ||
    membership.includes('titan') ||
    membership.includes('annual') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    subTier.includes('annual') ||
    subPlanName.includes('vip') ||
    subPlanName.includes('titan') ||
    subPlanName.includes('annual')
  ));

  const isPremium = isStaffOrAdmin || (!isExpired && (isVip || Boolean(
    user?.isPremium ||
    user?.isSubscribed ||
    (rawPlanId && !rawPlanId.includes('free') && rawPlanId !== 'starter scholar') ||
    (membership && !membership.includes('free') && membership !== 'starter scholar' && !membership.includes('scholar (starter)') && membership.trim().length > 0) ||
    (subTier && !subTier.includes('free') && subTier !== 'starter scholar' && !subTier.includes('scholar (starter)') && subTier.trim().length > 0) ||
    (subPlanName && !subPlanName.includes('free') && subPlanName !== 'starter scholar' && subPlanName.trim().length > 0) ||
    (user?.subscription && user.subscription.status === 'active')
  )));

  const userTierName: 'free' | 'premium' | 'vip' = isVip ? 'vip' : isPremium ? 'premium' : 'free';

  const userPlanName = isExpired
    ? 'Free Scholar'
    : (user?.subscriptionPlan && !String(user.subscriptionPlan).toLowerCase().includes('free') && user.subscriptionPlan) ||
      (user?.subscriptionTier && !String(user.subscriptionTier).toLowerCase().includes('free') && user.subscriptionTier) ||
      (user?.membershipTier && !String(user.membershipTier).toLowerCase().includes('free') && user.membershipTier) ||
      (rawPlanId === 'plan_titan_naira' ? 'Grobaax Titan Annual VIP' :
       rawPlanId === 'plan_pro_naira' ? 'Champions Pro Scholar' :
       rawPlanId === 'plan_basic_naira' ? 'Scholar Starter Plan' :
       isStaffOrAdmin ? 'VIP Scholar' :
       isVip ? 'VIP Scholar' :
       isPremium ? 'Premium Scholar' : 'Free Scholar');

  // If no question is active or provided, return user's accurate resolved plan info
  if (!question) {
    return {
      isEligible: true,
      userTierName,
      userPlanName,
      userPlanId: rawPlanId,
      requiredPlanText: 'All Scholars',
    };
  }

  // Staff and Admins always have access to test or arbitrate questions
  if (isStaffOrAdmin) {
    return {
      isEligible: true,
      userTierName: 'admin',
      userPlanName: 'Staff / Arbiter Pass',
      userPlanId: 'admin_pass',
      requiredPlanText: 'Admin Access',
    };
  }

  // 3. Resolve Question Requirements
  const targetTier = (question.targetTier || 'free').toLowerCase();
  const allowedPlanIds = question.allowedPlanIds || [];
  const targetPlanName = question.targetPlanName;

  let requiredPlanText = 'All Contenders';
  if (targetPlanName) {
    requiredPlanText = targetPlanName;
  } else if (allowedPlanIds.length > 0) {
    requiredPlanText = allowedPlanIds.map(pid => {
      if (pid === 'plan_titan_naira') return 'Titan VIP';
      if (pid === 'plan_pro_naira') return 'Champions Pro';
      if (pid === 'plan_basic_naira') return 'Scholar Starter';
      return pid;
    }).join(' / ');
  } else if (targetTier === 'vip') {
    requiredPlanText = 'VIP / Titan Only';
  } else if (targetTier === 'premium') {
    requiredPlanText = 'Premium & VIP Subscribers';
  }

  // If question is open to everyone
  if (targetTier === 'free' || targetTier === 'all' || (!targetTier && allowedPlanIds.length === 0 && !targetPlanName)) {
    return {
      isEligible: true,
      userTierName,
      userPlanName,
      userPlanId: rawPlanId,
      requiredPlanText: 'All Contenders',
    };
  }

  // If specific plan IDs are enforced on this question
  if (allowedPlanIds.length > 0) {
    const matchesPlan = allowedPlanIds.some(pid => {
      const p = pid.toLowerCase();
      return (
        rawPlanId === p ||
        rawPlanId.includes(p) ||
        subPlanName.includes(p) ||
        subTier.includes(p) ||
        (p.includes('titan') && isVip) ||
        (p.includes('vip') && isVip) ||
        (p.includes('pro') && (rawPlanId.includes('pro') || isVip)) ||
        (p.includes('basic') && isPremium)
      );
    });

    if (!matchesPlan) {
      return {
        isEligible: false,
        userTierName,
        userPlanName,
        userPlanId: rawPlanId,
        requiredPlanText,
        reason: `Requires ${requiredPlanText}. Your plan: ${userPlanName}.`,
      };
    }
  }

  // If question requires VIP
  if (targetTier === 'vip') {
    if (!isVip) {
      return {
        isEligible: false,
        userTierName,
        userPlanName,
        userPlanId: rawPlanId,
        requiredPlanText,
        reason: `Exclusive to VIP & Titan subscribers. Your plan: ${userPlanName}.`,
      };
    }
  }

  // If question requires Premium
  if (targetTier === 'premium') {
    if (!isPremium && !isVip) {
      return {
        isEligible: false,
        userTierName,
        userPlanName,
        userPlanId: rawPlanId,
        requiredPlanText,
        reason: `Requires an active Premium or VIP subscription plan. Your plan: Free Scholar.`,
      };
    }
  }

  return {
    isEligible: true,
    userTierName,
    userPlanName,
    userPlanId: rawPlanId,
    requiredPlanText,
  };
}

// Completed Season 1 (Permanent Historical Record)
export const COMPLETED_SEASON_1: SchoolDomeSeason = {
  id: 'season_dome_1',
  seasonNumber: 1,
  title: 'Season 1',
  description: 'Inter-Campus Elimination Arena Season 1',
  prizePool: 30000,
  prizeCurrency: 'GP',
  status: 'ended',
  registeredUserIds: ['user_john_1', 'user_mary_2', 'user_david_3'],
  activeUserIds: ['user_john_1', 'user_mary_2', 'user_david_3'],
  eliminatedUserIds: [],
  isRegistrationLocked: true,
  firstQuestionLaunched: true,
  currentQuestionNumber: 10,
  totalQuestionsLaunched: 10,
  createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  startedAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
  endedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  winners: [
    {
      userId: 'user_john_1',
      userName: 'John',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      institution: 'University of Lagos',
      prizeWon: 10000,
    },
    {
      userId: 'user_mary_2',
      userName: 'Mary',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      institution: 'Federal polytechnic ilaro',
      prizeWon: 10000,
    },
    {
      userId: 'user_david_3',
      userName: 'David',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      institution: 'Adekunle college of education',
      prizeWon: 10000,
    },
  ],
};

// Default initial live season for School Dome (Season 1)
export const DEFAULT_INITIAL_SEASON: SchoolDomeSeason = {
  id: 'season_dome_1',
  seasonNumber: 1,
  title: 'Season #1 — School Dome',
  description: 'The Ultimate Inter-Campus Elimination Arena. Answer correctly to survive each question. The prize pool is divided equally among the last scholars standing!',
  prizePool: 50000,
  prizeCurrency: 'GP',
  status: 'active',
  registeredUserIds: [],
  activeUserIds: [],
  eliminatedUserIds: [],
  isRegistrationLocked: false,
  firstQuestionLaunched: false,
  currentQuestionNumber: 0,
  totalQuestionsLaunched: 0,
  createdAt: Date.now(),
  startedAt: Date.now(),
  winners: [],
  rules: [
    'Registration is completely free and open to all verified scholars before Question #1 begins.',
    'Users cannot participate or register any longer after the first question has been launched.',
    'Each scholar receives exactly ONE attempt per live question challenge.',
    'Submitting the correct answer within the time limit secures survival and advancement to the next question.',
    'Elimination Criteria: Users are eliminated by: 1) Not answering a particular question before the time expired, 2) Answering wrong.',
    'The entire GP prize pool is divided equally among the Last Scholars Standing when the season concludes.',
  ],
};

export const DEFAULT_INITIAL_QUESTION: SchoolDomeQuestion | null = null;

export const DEFAULT_INITIAL_MESSAGES: SchoolDomeMessage[] = [
  {
    id: 'dome_msg_welcome',
    seasonId: 'season_dome_1',
    userId: 'grobax_arbiter',
    userName: 'School Dome Arbiter 🛡️',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    institution: 'Grobaax Arena HQ',
    department: 'Chief Arbiter',
    level: 'Master',
    isPremium: true,
    isVip: true,
    messageText: '🏛️ Welcome to School Dome Season #1!\n\nRegistration is now open! Compete for the 50,000 GP prize pool. All scholars standing when the tournament concludes will share the prize pool equally.',
    timestamp: Date.now(),
    type: 'announcement',
    reactions: { '🔥': 5, '⚔️': 3 },
  },
];

// Past completed season sample for Results/Winners Tab
export const PAST_COMPLETED_SEASONS_MOCK: SchoolDomeSeason[] = [
  {
    id: 'season_dome_pre_alpha',
    seasonNumber: 0,
    title: 'School Dome — Inaugural Exhibition Season',
    description: 'The inaugural exhibition clash featuring top university scholars nationwide.',
    prizePool: 30000,
    prizeCurrency: 'NGN',
    status: 'ended',
    registeredUserIds: ['user_unilag_1', 'user_ui_2', 'user_unn_3'],
    activeUserIds: ['user_unilag_1', 'user_unn_3'],
    eliminatedUserIds: ['user_ui_2'],
    isRegistrationLocked: true,
    firstQuestionLaunched: true,
    currentQuestionNumber: 5,
    totalQuestionsLaunched: 5,
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    startedAt: Date.now() - 1000 * 60 * 60 * 46,
    endedAt: Date.now() - 1000 * 60 * 60 * 44,
    winners: [
      {
        userId: 'user_unilag_1',
        userName: 'Amina Bello',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        institution: 'University of Lagos',
        department: 'Computer Science',
        prizeWon: 15000,
      },
      {
        userId: 'user_unn_3',
        userName: 'David Eze',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        institution: 'University of Nigeria, Nsukka',
        department: 'Mechanical Engineering',
        prizeWon: 15000,
      },
    ],
  },
];

// Helper to normalize and check answers with fast, multi-variant tolerance
export function isAnswerCorrect(
  userAnswer: string,
  officialAnswer: string,
  alternatives?: string[]
): boolean {
  if (!userAnswer || !officialAnswer) return false;

  const normalize = (str: string): string => {
    return str
      .trim()
      .toLowerCase()
      .replace(/^(answer|ans|option|choice)\s*[:.\-)]*\s*/i, '') // strip "Option A", "Ans: B"
      .replace(/^[\s#@!.*'"()[\]{}]+|[\s#@!.*'"()[\]{}]+$/g, '') // strip surrounding punctuation/quotes
      .replace(/\s+/g, ' '); // normalize multiple spaces
  };

  const cleanUser = normalize(userAnswer);
  const cleanOfficial = normalize(officialAnswer);

  if (cleanUser === cleanOfficial) return true;

  // Single letter multiple choice check (e.g. user answered "A" or "Option A" or "A. Lagos")
  if (cleanOfficial.length === 1 && /^[a-d]$/i.test(cleanOfficial)) {
    const firstChar = cleanUser.charAt(0);
    if (firstChar === cleanOfficial && (cleanUser.length === 1 || /^([a-d])([.\s\-)].*)?$/i.test(cleanUser))) {
      return true;
    }
  }

  // Also check if official is "A. Paris" and user answered "Paris" or "A"
  if (/^[a-d]\s*[.):-]\s*/i.test(cleanOfficial)) {
    const letter = cleanOfficial.charAt(0);
    const textWithoutLetter = cleanOfficial.replace(/^[a-d]\s*[.):-]\s*/i, '').trim();
    if (cleanUser === letter || cleanUser === textWithoutLetter) return true;
  }

  if (alternatives && alternatives.length > 0) {
    for (const alt of alternatives) {
      if (!alt) continue;
      const cleanAlt = normalize(alt);
      if (cleanUser === cleanAlt) return true;
      if (cleanAlt.length === 1 && /^[a-d]$/i.test(cleanAlt) && cleanUser.charAt(0) === cleanAlt) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Resolves a normalized, canonical question ID across all formats:
 * - 'sdq_1728...'
 * - 'msg_sdq_1728...'
 * - 'msg_sdq_sdq_1728...'
 * - 'dome_q_13'
 * - 'dome_msg_q_13'
 * - Objects with competitionRef.questionId or questionId
 */
export function getCanonicalQuestionId(idOrMsg: any): string {
  if (!idOrMsg) return '';
  if (typeof idOrMsg === 'object') {
    const raw =
      idOrMsg.competitionRef?.questionId ||
      idOrMsg.questionId ||
      idOrMsg.id ||
      '';
    return getCanonicalQuestionId(raw);
  }
  const str = String(idOrMsg).trim();
  let clean = str.replace(/^msg_/, '');
  clean = clean.replace(/^dome_msg_q_/, 'dome_q_');
  clean = clean.replace(/^sdq_sdq_/, 'sdq_');
  return clean;
}

// Subscribe to latest/active season
export function subscribeSchoolDomeActiveSeason(
  callback: (season: SchoolDomeSeason) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_seasons'),
      orderBy('seasonNumber', 'desc'),
      limit(1)
    );

    let lastSeasonJson = '';

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as SchoolDomeSeason;
          const fullSeason = { ...docData, id: snapshot.docs[0].id };
          const seasonJson = JSON.stringify(fullSeason);
          if (seasonJson !== lastSeasonJson) {
            lastSeasonJson = seasonJson;
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('grobax_school_dome_active_season', seasonJson);
              }
            } catch {}
            callback(fullSeason);
          }
        } else {
          // If no season documents exist, return pristine fallback Season 1 without mutative writes inside the listener
          let fallback = DEFAULT_INITIAL_SEASON;
          try {
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('grobax_school_dome_active_season');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed) fallback = { ...DEFAULT_INITIAL_SEASON, ...parsed };
              }
            }
          } catch {}
          const fallbackJson = JSON.stringify(fallback);
          if (fallbackJson !== lastSeasonJson) {
            lastSeasonJson = fallbackJson;
            callback(fallback);
          }
        }
      },
      (err) => {
        console.warn('School Dome active season snapshot notice:', err);
        let fallback = DEFAULT_INITIAL_SEASON;
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('grobax_school_dome_active_season');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.status !== 'ended') {
                fallback = { ...DEFAULT_INITIAL_SEASON, ...parsed };
              }
            }
          }
        } catch {}
        const fallbackJson = JSON.stringify(fallback);
        if (fallbackJson !== lastSeasonJson) {
          lastSeasonJson = fallbackJson;
          callback(fallback);
        }
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('School Dome active season subscription failed:', err);
    let fallback = DEFAULT_INITIAL_SEASON;
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('grobax_school_dome_active_season');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.status !== 'ended') {
            fallback = { ...DEFAULT_INITIAL_SEASON, ...parsed };
          }
        }
      }
    } catch {}
    callback(fallback);
    return () => {};
  }
}

// Subscribe to all seasons (for Results / Winners tab)
export function subscribeSchoolDomeSeasons(
  callback: (seasons: SchoolDomeSeason[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_seasons'),
      orderBy('seasonNumber', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let list: SchoolDomeSeason[] = [];
        if (!snapshot.empty) {
          list = snapshot.docs.map(d => ({
            ...(d.data() as SchoolDomeSeason),
            id: d.id,
          }));
        }

        // Order descending: latest seasons first
        list.sort((a, b) => (b.seasonNumber || 0) - (a.seasonNumber || 0));
        callback(list);
      },
      (err) => {
        console.warn('School Dome seasons snapshot notice:', err);
        callback([]);
      }
    );

    return unsubscribe;
  } catch {
    callback([]);
    return () => {};
  }
}

// Subscribe to live messages
export function subscribeSchoolDomeMessages(
  seasonId: string,
  callback: (messages: SchoolDomeMessage[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_messages'),
      orderBy('timestamp', 'desc'),
      limit(40)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const msgs = snapshot.docs
            .map(d => {
              const data = d.data() as any;
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
                ...data,
                id: d.id,
                reactions: cleanReactions,
              } as SchoolDomeMessage;
            })
            .filter(m => !m.isDeleted)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          callback(msgs);
        } else {
          callback(DEFAULT_INITIAL_MESSAGES);
        }
      },
      (err) => {
        console.warn('School Dome messages snapshot notice:', err);
        callback(DEFAULT_INITIAL_MESSAGES);
      }
    );

    return unsubscribe;
  } catch {
    callback(DEFAULT_INITIAL_MESSAGES);
    return () => {};
  }
}

// Subscribe to active question
export function subscribeSchoolDomeActiveQuestion(
  seasonId: string,
  callback: (question: SchoolDomeQuestion | null) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_questions'),
      where('seasonId', '==', seasonId),
      where('status', '==', 'active'),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const qData = snapshot.docs[0].data() as SchoolDomeQuestion;
          const fullQ = { ...qData, id: snapshot.docs[0].id };
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('grobax_school_dome_active_question', JSON.stringify(fullQ));
            }
          } catch {}
          callback(fullQ);
        } else {
          let fallback: SchoolDomeQuestion | null = null;
          try {
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('grobax_school_dome_active_question');
              if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.status === 'active') fallback = parsed;
              }
            }
          } catch {}
          if (!fallback && (!seasonId || seasonId === 'season_dome_1') && DEFAULT_INITIAL_QUESTION?.status === 'active') {
            fallback = DEFAULT_INITIAL_QUESTION;
          }
          callback(fallback);
        }
      },
      (err) => {
        console.warn('School Dome active question snapshot notice:', err);
        let fallback: SchoolDomeQuestion | null = null;
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('grobax_school_dome_active_question');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.status === 'active') fallback = parsed;
            }
          }
        } catch {}
        if (!fallback && (!seasonId || seasonId === 'season_dome_1') && DEFAULT_INITIAL_QUESTION?.status === 'active') {
          fallback = DEFAULT_INITIAL_QUESTION;
        }
        callback(fallback);
      }
    );

    return unsubscribe;
  } catch {
    callback(DEFAULT_INITIAL_QUESTION?.status === 'active' ? DEFAULT_INITIAL_QUESTION : null);
    return () => {};
  }
}

// Subscribe to all questions of a season (for archive/results)
export function subscribeSchoolDomeQuestions(
  seasonId: string,
  callback: (questions: SchoolDomeQuestion[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'school_dome_questions'),
      where('seasonId', '==', seasonId),
      orderBy('questionNumber', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({
            ...(d.data() as SchoolDomeQuestion),
            id: d.id,
          }));
          callback(list);
        } else {
          callback(DEFAULT_INITIAL_QUESTION ? [DEFAULT_INITIAL_QUESTION] : []);
        }
      },
      () => {
        callback(DEFAULT_INITIAL_QUESTION ? [DEFAULT_INITIAL_QUESTION] : []);
      }
    );

    return unsubscribe;
  } catch {
    callback(DEFAULT_INITIAL_QUESTION ? [DEFAULT_INITIAL_QUESTION] : []);
    return () => {};
  }
}

// Register user for current season (only allowed before first question)
export async function registerUserForSchoolDome(
  seasonId: string,
  user: UserProfile
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = user?.id || (user as any)?.uid || (user as any)?.userId || '';
    if (!userId) {
      return { success: false, message: 'Please sign in or complete your profile to register for School Dome.' };
    }

    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    let seasonSnap = await getDoc(seasonRef);
    let seasonData: SchoolDomeSeason;

    if (!seasonSnap.exists()) {
      // Auto-bootstrap Season 1 or restore from local cache if database record was just reset
      let fallbackSeason: SchoolDomeSeason = { ...DEFAULT_INITIAL_SEASON, id: seasonId };
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('grobax_school_dome_active_season');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.id === seasonId) {
              fallbackSeason = parsed;
            }
          }
        }
      } catch {}
      await setDoc(seasonRef, fallbackSeason, { merge: false });
      seasonData = fallbackSeason;
    } else {
      seasonData = seasonSnap.data() as SchoolDomeSeason;
    }

    // RULE: Registration locks permanently once first question is launched
    if (
      seasonData.isRegistrationLocked ||
      seasonData.firstQuestionLaunched ||
      (seasonData.totalQuestionsLaunched && seasonData.totalQuestionsLaunched > 0) ||
      (seasonData.currentQuestionNumber && seasonData.currentQuestionNumber > 0)
    ) {
      return {
        success: false,
        message: 'Registration is permanently closed. Users cannot participate or register any longer after the first question has been launched.',
      };
    }

    if (seasonData.status === 'ended') {
      return { success: false, message: 'This season has already concluded.' };
    }

    const regList = seasonData.registeredUserIds || [];
    if (regList.includes(userId)) {
      return { success: true, message: 'You are already registered for this season!' };
    }

    // Add participant with full subscription plan tracking
    const planEligibility = checkScholarSchoolDomePlanEligibility(user, null);
    const partRef = doc(db, 'school_dome_registrations', `${seasonId}_${userId}`);
    const participant: SchoolDomeParticipant = {
      id: `${seasonId}_${userId}`,
      seasonId,
      userId,
      userName: user.name || (user as any).username || 'Scholar',
      userAvatar: user.avatar,
      institution: user.institution,
      department: user.department,
      level: user.level,
      isPremium: planEligibility.userTierName === 'vip' || planEligibility.userTierName === 'premium' || Boolean(user.isPremium || user.isVip),
      isVip: planEligibility.userTierName === 'vip' || Boolean(user.isVip),
      subscriptionTier: user.subscriptionTier || (planEligibility.userTierName === 'vip' ? 'VIP SCHOLAR' : planEligibility.userTierName === 'premium' ? 'PREMIUM SCHOLAR' : 'Free Scholar'),
      subscriptionPlan: user.subscriptionPlan || planEligibility.userPlanName,
      planId: user.activePlanId || user.planId || planEligibility.userPlanId,
      membershipTier: user.membershipTier || (planEligibility.userTierName === 'vip' ? 'VIP SCHOLAR' : planEligibility.userTierName === 'premium' ? 'PREMIUM SCHOLAR' : 'Free Scholar'),
      status: 'active',
      registeredAt: Date.now(),
      correctAnswersCount: 0,
    };

    // Update season registered & active lists in parallel with participant record
    const updatedRegistered = Array.from(new Set([...regList, userId]));
    const updatedActive = Array.from(new Set([...(seasonData.activeUserIds || []), userId]));

    const updatedSeason: SchoolDomeSeason = {
      ...seasonData,
      registeredUserIds: updatedRegistered,
      activeUserIds: updatedActive,
      status: seasonData.status === 'registration_open' ? 'registration_open' : 'active',
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(updatedSeason));
        window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: updatedSeason }));
      } catch {}
    }

    await Promise.all([
      setDoc(partRef, participant, { merge: true }),
      setDoc(seasonRef, {
        registeredUserIds: updatedRegistered,
        activeUserIds: updatedActive,
        updatedAt: Date.now(),
      }, { merge: true }),
    ]);

    return { success: true, message: 'Registered successfully! Good luck in the Arena.' };
  } catch (err: any) {
    console.error('Error registering for School Dome:', err);
    return { success: false, message: err.message || 'Failed to register.' };
  }
}

export const isMockSchoolDomeMessage = (m: any): boolean => {
  if (!m || !m.id) return false;
  const mockIds = ['dome_msg_welcome', 'dome_msg_q_13', 'dome_msg_user_1', 'dome_msg_user_2', 'dome_msg_user_3'];
  return mockIds.includes(m.id) || m.id.startsWith('mock_') || (m as any).isMock === true;
};

// Send Message & Evaluate Live Answers
export async function sendSchoolDomeMessage(
  message: SchoolDomeMessage,
  currentSeason: SchoolDomeSeason | null,
  activeQuestion: SchoolDomeQuestion | null,
  userProfile?: any
): Promise<{
  outcome?: 'survived' | 'eliminated' | 'spectating' | 'normal' | 'ineligible_plan';
  reason?: string;
}> {
  try {
    const msgRef = doc(db, 'school_dome_messages', message.id);
    const cleanMsg = JSON.parse(JSON.stringify(message, (_, v) => (v === undefined ? null : v)));

    // Notify local runtime listeners immediately BEFORE any network write for 0ms instantaneous drop
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('school_dome_message_posted', { detail: cleanMsg }));
    }

    await setDoc(msgRef, cleanMsg);

    // If message is not answering a question, return normal
    if (message.type !== 'normal' || !message.messageText || !currentSeason) {
      return { outcome: 'normal' };
    }

    // If season is currently paused by Arbiter, answers are frozen
    if (currentSeason.status === 'paused') {
      return { outcome: 'normal', reason: 'Season is paused' };
    }

    // Check if there is an active question and if user is in competition
    if (activeQuestion && activeQuestion.status === 'active') {
      const userId = message.userId;
      const isRegistered = currentSeason.registeredUserIds?.includes(userId);
      const isStillStanding = currentSeason.activeUserIds?.includes(userId);

      // If user is not registered or already eliminated, they are a spectator
      if (!isRegistered || !isStillStanding) {
        return { outcome: 'spectating' };
      }

      // RULE: Messages are ONLY evaluated as answers if the user is explicitly replying to the question card!
      // If standing users are texting for another purpose (chatting, encouragement, etc.), it is NOT an answer and NEVER eliminates them.
      const canonicalActiveQId = getCanonicalQuestionId(activeQuestion.id);
      const isTargetingActiveQuestion = Boolean(
        message.isAnswer ||
        (message.replyTo?.id && (
          getCanonicalQuestionId(message.replyTo.id) === canonicalActiveQId ||
          (message.replyTo as any)?.questionId === activeQuestion.id ||
          message.replyTo.id === activeQuestion.id ||
          message.replyTo.id === `msg_${activeQuestion.id}` ||
          (message.replyTo.messageSnippet && activeQuestion.questionText && message.replyTo.messageSnippet.includes(activeQuestion.questionText.slice(0, 15)))
        ))
      );

      // If the message is NOT a reply to the question card, treat as normal chat
      if (!isTargetingActiveQuestion) {
        return { outcome: 'normal' };
      }

      // Check subscription plan eligibility for this question using full profile if available
      const subjectUser = userProfile || message;
      const planEligibility = checkScholarSchoolDomePlanEligibility(subjectUser, activeQuestion);
      if (!planEligibility.isEligible) {
        // User's subscription plan is not eligible to answer this question.
        // Filter out without eliminating them from the tournament!
        return {
          outcome: 'ineligible_plan',
          reason: planEligibility.reason || `Question restricted to ${planEligibility.requiredPlanText}`,
        };
      }

      // RULE: Users are only meant to reply ONCE to a question card.
      // If user already attempted this question card, reject duplicate reply attempts.
      const alreadyAttempted =
        activeQuestion.repliedUserIds?.includes(userId) ||
        activeQuestion.survivorUserIds?.includes(userId) ||
        activeQuestion.eliminatedUserIds?.includes(userId);

      if (alreadyAttempted) {
        return { outcome: 'normal' };
      }

      // Record user reply in question
      const qRef = doc(db, 'school_dome_questions', activeQuestion.id);
      const isCorrect = isAnswerCorrect(
        message.messageText,
        activeQuestion.correctAnswer,
        activeQuestion.acceptedAlternativeAnswers
      );

      if (isCorrect) {
        // User SURVIVED!
        const partRef = doc(db, 'school_dome_registrations', `${currentSeason.id}_${userId}`);

        // Fast parallel execution without Arbiter spam writes
        await Promise.all([
          updateDoc(qRef, {
            survivorUserIds: [...(activeQuestion.survivorUserIds || []), userId],
            repliedUserIds: [...(activeQuestion.repliedUserIds || []), userId],
            repliedUsernames: [...(activeQuestion.repliedUsernames || []), message.userName],
            totalSubmissionsCount: increment(1),
            updatedAt: serverTimestamp(),
          }),
          updateDoc(partRef, {
            correctAnswersCount: increment(1),
            updatedAt: serverTimestamp(),
          }).catch(() => {}),
          updateDoc(msgRef, {
            isAnswer: true,
            isCorrect: true,
            evalStatus: 'correct',
            questionId: activeQuestion.id,
            questionNumber: activeQuestion.questionNumber,
            updatedAt: serverTimestamp(),
          }).catch(() => {}),
        ]);

        return { outcome: 'survived' };
      } else {
        // User ELIMINATED!
        const seasonRef = doc(db, 'school_dome_seasons', currentSeason.id);
        const newActive = (currentSeason.activeUserIds || []).filter(id => id !== userId);
        const newEliminated = [...(currentSeason.eliminatedUserIds || []), userId];
        const partRef = doc(db, 'school_dome_registrations', `${currentSeason.id}_${userId}`);

        // Fast parallel execution without Arbiter spam writes
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(
              new CustomEvent('school_dome_season_updated', {
                detail: { activeUserIds: newActive, eliminatedUserIds: newEliminated },
              })
            );
            const cachedSeasonStr = localStorage.getItem('grobax_school_dome_active_season');
            if (cachedSeasonStr) {
              const cachedObj = JSON.parse(cachedSeasonStr);
              cachedObj.activeUserIds = newActive;
              cachedObj.eliminatedUserIds = newEliminated;
              localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(cachedObj));
            }
          } catch {}
        }

        await Promise.all([
          updateDoc(qRef, {
            eliminatedUserIds: [...(activeQuestion.eliminatedUserIds || []), userId],
            repliedUserIds: [...(activeQuestion.repliedUserIds || []), userId],
            repliedUsernames: [...(activeQuestion.repliedUsernames || []), message.userName],
            totalSubmissionsCount: increment(1),
            updatedAt: serverTimestamp(),
          }),
          updateDoc(seasonRef, {
            activeUserIds: newActive,
            eliminatedUserIds: newEliminated,
            updatedAt: serverTimestamp(),
          }),
          updateDoc(partRef, {
            status: 'eliminated',
            eliminatedAtQuestionNumber: activeQuestion.questionNumber,
            eliminatedAt: Date.now(),
            eliminationReason: 'incorrect_answer',
            updatedAt: serverTimestamp(),
          }).catch(() => {}),
          updateDoc(msgRef, {
            isAnswer: true,
            isCorrect: false,
            evalStatus: 'wrong',
            questionId: activeQuestion.id,
            questionNumber: activeQuestion.questionNumber,
            updatedAt: serverTimestamp(),
          }).catch(() => {}),
        ]);

        return { outcome: 'eliminated' };
      }
    }

    return { outcome: 'normal' };
  } catch (err) {
    console.error('Error sending School Dome message:', err);
    throw err;
  }
}

// React to School Dome message
export async function reactSchoolDomeMessage(messageId: string, emoji: string): Promise<void> {
  try {
    const msgRef = doc(db, 'school_dome_messages', messageId);
    let fallbackMsg: any = DEFAULT_INITIAL_MESSAGES.find(m => m.id === messageId) || null;
    if (!fallbackMsg && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('grobax_school_dome_cached_messages');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            fallbackMsg = list.find((m: any) => m.id === messageId);
          }
        }
      } catch {}
    }

    const baseData = fallbackMsg ? { ...fallbackMsg } : {};
    delete baseData.reactions; // Don't overwrite reactions with stale snapshot

    await setDoc(
      msgRef,
      {
        ...baseData,
        reactions: {
          [emoji]: increment(1),
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('school_dome_message_reacted', {
          detail: { messageId, emoji },
        })
      );
    }
  } catch (err) {
    console.warn('Error reacting to School Dome message:', err);
  }
}

// Delete School Dome message
export async function deleteSchoolDomeMessage(messageId: string): Promise<void> {
  try {
    const msgRef = doc(db, 'school_dome_messages', messageId);
    await updateDoc(msgRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn('Error deleting School Dome message:', err);
  }
}

// Admin: Launch a Live School Dome Question Challenge
export async function createSchoolDomeQuestion(
  seasonId: string,
  questionData: {
    questionText: string;
    correctAnswer: string;
    acceptedAlternativeAnswers?: string[];
    timeLimitSeconds?: number;
    targetTier?: 'free' | 'premium' | 'vip' | 'all';
    allowedPlanIds?: string[];
    targetPlanName?: string;
    questionNumber?: number;
    winnerLimit?: number;
    gpRewardPerWinner?: number;
  },
  adminUid?: string,
  adminName?: string,
  precomputedQuestion?: SchoolDomeQuestion,
  precomputedMessage?: SchoolDomeMessage
): Promise<SchoolDomeQuestion> {
  try {
    const now = precomputedQuestion?.startAt || Date.now();
    const timeLimit = precomputedQuestion?.timeLimitSeconds || Math.max(15, Number(questionData.timeLimitSeconds) || 300);
    const endAt = precomputedQuestion?.endAt || (now + timeLimit * 1000);
    const qId = precomputedQuestion?.id || ('sdq_' + now + '_' + Math.random().toString(36).substring(2, 6));
    const winnerLimit = Number(questionData.winnerLimit) || 1;
    const gpReward = Number(questionData.gpRewardPerWinner) || 500;
    const targetTier = questionData.targetTier || 'free';
    const allowedPlanIds = questionData.allowedPlanIds;
    const targetPlanName = questionData.targetPlanName;
    const nextQNumber = precomputedQuestion?.questionNumber || questionData.questionNumber || 1;

    const newQuestion: SchoolDomeQuestion = precomputedQuestion || {
      id: qId,
      seasonId,
      questionNumber: nextQNumber,
      questionText: questionData.questionText.trim(),
      correctAnswer: questionData.correctAnswer.trim(),
      acceptedAlternativeAnswers: (questionData.acceptedAlternativeAnswers || []).map(s => s.trim()).filter(Boolean),
      timeLimitSeconds: timeLimit,
      targetTier,
      allowedPlanIds,
      targetPlanName,
      startAt: now,
      endAt,
      status: 'active',
      survivorUserIds: [],
      eliminatedUserIds: [],
      totalSubmissionsCount: 0,
      repliedUserIds: [],
      repliedUsernames: [],
      createdAt: now,
      createdByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      createdByName: adminName || 'Dome Arbiter',
    };

    const targetLabel = targetPlanName || (targetTier === 'vip' ? 'VIP Only' : targetTier === 'premium' ? 'Premium & VIP' : 'Open to All');
    const allowFree = targetTier === 'free' || targetTier === 'all';
    const qMessage: SchoolDomeMessage = precomputedMessage || {
      id: 'msg_' + qId,
      seasonId,
      userId: adminUid || PRIMARY_SUPER_ADMIN_UID,
      userName: adminName ? `${adminName} 🛡️` : 'Grobaxy Limited 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      department: 'Chief Moderator',
      level: 'Master',
      isPremium: true,
      isVip: true,
      subscriptionPlan: targetLabel,
      targetTier,
      targetPlanName,
      allowedPlanIds,
      messageText: newQuestion.questionText,
      timestamp: now,
      type: 'question',
      questionId: qId,
      competitionRef: {
        competitionId: 'school_dome',
        questionId: qId,
        questionNumber: newQuestion.questionNumber,
        totalQuestions: 20,
        questionText: newQuestion.questionText,
        status: 'active',
        gpRewardPerWinner: gpReward,
        winnerCountLimit: winnerLimit,
        allowFreeParticipation: allowFree,
        targetTier,
        targetPlanName,
        allowedPlanIds,
        timeLimitSeconds: timeLimit,
        startAt: now,
        endAt,
        repliedUserIds: [],
      },
      reactions: { '⚡': 1, '🎯': 1 },
    };

    // Notify local runtime listeners immediately for 0ms question drop into arena feed
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('school_dome_message_posted', { detail: qMessage }));
      } catch {}
    }

    const seasonRef = doc(db, 'school_dome_seasons', seasonId);

    // Ultra-fast parallel writes to Firestore
    await Promise.all([
      setDoc(doc(db, 'school_dome_questions', qId), newQuestion).catch(err => {
        console.warn('Notice saving question doc:', err);
      }),
      setDoc(doc(db, 'school_dome_messages', qMessage.id), qMessage).catch(err => {
        console.warn('Notice saving question message:', err);
      }),
      setDoc(
        seasonRef,
        {
          id: seasonId,
          isRegistrationLocked: true,
          firstQuestionLaunched: true,
          status: 'active',
          currentQuestionNumber: nextQNumber,
          totalQuestionsLaunched: nextQNumber,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(err => {
        console.warn('Notice updating season doc:', err);
      }),
    ]);

    // Auto-close previous active questions & dispatch notification in the background (non-blocking)
    (async () => {
      try {
        const activeQQuery = query(
          collection(db, 'school_dome_questions'),
          where('seasonId', '==', seasonId),
          where('status', '==', 'active')
        );
        const activeSnap = await getDocs(activeQQuery);
        for (const d of activeSnap.docs) {
          if (d.id !== qId) {
            closeSchoolDomeQuestion(seasonId, d.id).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Notice background closing prior questions:', e);
      }

      try {
        const notifDoc = doc(collection(db, 'notifications'));
        await setDoc(notifDoc, {
          id: notifDoc.id,
          title: `⚡ Live School Dome Question #${nextQNumber}!`,
          message: `Question #${nextQNumber} is now live in the School Dome Arena (${targetLabel}). Answer before time runs out!`,
          type: 'dome',
          isRead: false,
          timestamp: Date.now(),
          createdAt: serverTimestamp(),
          actionUrl: 'school_dome',
        });
        grobaxNotificationService.incrementSection('school_dome', 1);
      } catch (notifErr) {
        console.warn('Could not dispatch live question notification in background:', notifErr);
      }
    })().catch(() => {});

    return newQuestion;
  } catch (err: any) {
    console.error('Error creating School Dome question:', err);
    // If permission or network issue occurred, still return the question object so UI succeeds
    const fallbackQ: SchoolDomeQuestion = {
      id: 'sdq_' + Date.now(),
      seasonId,
      questionNumber: questionData.questionNumber || 1,
      questionText: questionData.questionText.trim(),
      correctAnswer: questionData.correctAnswer.trim(),
      acceptedAlternativeAnswers: (questionData.acceptedAlternativeAnswers || []).map(s => s.trim()).filter(Boolean),
      timeLimitSeconds: Math.max(15, Number(questionData.timeLimitSeconds) || 300),
      targetTier: questionData.targetTier || 'free',
      allowedPlanIds: questionData.allowedPlanIds,
      targetPlanName: questionData.targetPlanName,
      startAt: Date.now(),
      endAt: Date.now() + 300 * 1000,
      status: 'active',
      survivorUserIds: [],
      eliminatedUserIds: [],
      totalSubmissionsCount: 0,
      repliedUserIds: [],
      repliedUsernames: [],
      createdAt: Date.now(),
      createdByUid: adminUid || PRIMARY_SUPER_ADMIN_UID,
      createdByName: adminName || 'Dome Arbiter',
    };
    return fallbackQ;
  }
}

// Admin: Close & Finalize Active Question
export async function closeSchoolDomeQuestion(
  seasonId: string,
  questionId: string
): Promise<void> {
  try {
    const qRef = doc(db, 'school_dome_questions', questionId);
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);

    const [qSnap, seasonSnap] = await Promise.all([
      getDoc(qRef),
      getDoc(seasonRef),
    ]);

    if (!qSnap.exists()) return;
    const qData = qSnap.data() as SchoolDomeQuestion;

    // Idempotency: if already closed, skip duplicate calculations immediately
    if (qData.status === 'closed') return;

    const survivors = qData.survivorUserIds || [];

    // Parallelize closing question and question message
    const targetMsgId = questionId.startsWith('msg_')
      ? questionId
      : questionId.startsWith('sdq_')
      ? 'msg_' + questionId
      : 'msg_sdq_' + questionId;
    const msgRef = doc(db, 'school_dome_messages', targetMsgId);
    const closeOps: Promise<any>[] = [
      updateDoc(qRef, {
        status: 'closed',
        updatedAt: serverTimestamp(),
      }),
      updateDoc(msgRef, {
        'competitionRef.status': 'closed',
        updatedAt: serverTimestamp(),
      }).catch(() => {}),
    ];

    if (seasonSnap.exists()) {
      const sData = seasonSnap.data() as SchoolDomeSeason;
      const currentActive = sData.activeUserIds || [];

      // Non-survivors are those who were active but did not answer correctly in time
      const newlyEliminated = currentActive.filter(id => !survivors.includes(id));
      const updatedActive = currentActive.filter(id => survivors.includes(id));
      const updatedEliminated = Array.from(new Set([...(sData.eliminatedUserIds || []), ...newlyEliminated]));
      const allQEliminated = Array.from(new Set([...(qData.eliminatedUserIds || []), ...newlyEliminated]));

      // Update question eliminated user list and season active standing
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('school_dome_season_updated', {
              detail: { activeUserIds: updatedActive, eliminatedUserIds: updatedEliminated },
            })
          );
          const cachedSeasonStr = localStorage.getItem('grobax_school_dome_active_season');
          if (cachedSeasonStr) {
            const cachedObj = JSON.parse(cachedSeasonStr);
            cachedObj.activeUserIds = updatedActive;
            cachedObj.eliminatedUserIds = updatedEliminated;
            localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(cachedObj));
          }
        } catch {}
      }

      closeOps.push(
        updateDoc(qRef, {
          eliminatedUserIds: allQEliminated,
        }),
        updateDoc(seasonRef, {
          activeUserIds: updatedActive,
          eliminatedUserIds: updatedEliminated,
          updatedAt: serverTimestamp(),
        })
      );

      // High-performance batch updates for eliminated participant registrations
      if (newlyEliminated.length > 0) {
        const batchChunks: string[][] = [];
        for (let i = 0; i < newlyEliminated.length; i += 400) {
          batchChunks.push(newlyEliminated.slice(i, i + 400));
        }

        const batchPromises = batchChunks.map(async (chunk) => {
          const batch = writeBatch(db);
          for (const elimUserId of chunk) {
            const regDoc = doc(db, 'school_dome_registrations', `${seasonId}_${elimUserId}`);
            batch.update(regDoc, {
              status: 'eliminated',
              eliminatedAtQuestionNumber: qData.questionNumber,
              eliminatedAt: Date.now(),
              eliminationReason: qData.eliminatedUserIds?.includes(elimUserId) ? 'incorrect_answer' : 'unanswered_time_expired',
            });
          }
          return batch.commit().catch(() => {});
        });

        closeOps.push(...batchPromises);
      }
    }

    await Promise.all(closeOps);
  } catch (err) {
    console.error('Error closing School Dome question:', err);
    throw err;
  }
}

// Admin: Extend time for active question
export async function extendSchoolDomeQuestionTime(
  questionId: string,
  extraSeconds: number = 60
): Promise<void> {
  try {
    const qRef = doc(db, 'school_dome_questions', questionId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) return;
    const qData = qSnap.data() as SchoolDomeQuestion;
    const newEndAt = Math.max(Date.now(), qData.endAt) + extraSeconds * 1000;

    await updateDoc(qRef, {
      endAt: newEndAt,
      timeLimitSeconds: (qData.timeLimitSeconds || 300) + extraSeconds,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Error extending question time:', err);
  }
}

// Admin: Start / Reset a new season
export async function startNewSchoolDomeSeason(
  config: {
    seasonNumber?: number;
    title: string;
    prizePool: number;
    prizeCurrency?: 'NGN' | 'GP';
    description?: string;
    rules?: string[];
  },
  adminUid?: string,
  adminName?: string
): Promise<SchoolDomeSeason> {
  try {
    const seasonId = 'season_dome_' + Date.now();
    const newSeason: SchoolDomeSeason = {
      id: seasonId,
      seasonNumber: config.seasonNumber || Date.now() % 1000,
      title: config.title || `School Dome — Season ${config.seasonNumber || 1}`,
      description: config.description || 'Inter-campus elimination tournament. Last scholars standing split the prize pool equally!',
      prizePool: Number(config.prizePool) || 50000,
      prizeCurrency: config.prizeCurrency || 'GP',
      status: 'active',
      registeredUserIds: [],
      activeUserIds: [],
      eliminatedUserIds: [],
      isRegistrationLocked: false,
      firstQuestionLaunched: false,
      currentQuestionNumber: 0,
      totalQuestionsLaunched: 0,
      createdAt: Date.now(),
      startedAt: Date.now(),
      winners: [],
      rules: config.rules && config.rules.length > 0 ? config.rules : DEFAULT_INITIAL_SEASON.rules,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('grobax_school_dome_active_question');
        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(newSeason));
        window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: newSeason }));
        window.dispatchEvent(new CustomEvent('school_dome_active_question_updated', { detail: null }));
      } catch {}
    }

    await setDoc(doc(db, 'school_dome_seasons', seasonId), newSeason, { merge: false });

    // Notify spin bonus system that a new season has started to reset VIP & Premium spin counts
    try {
      fetch('/api/spin/school-dome/reset-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId, startedAt: newSeason.startedAt || Date.now() }),
      }).catch(() => {});
    } catch {}

    // Announce opening of registration
    const annMsg: SchoolDomeMessage = {
      id: `ann_${Date.now()}`,
      seasonId,
      userId: adminUid || 'grobax_arbiter',
      userName: adminName ? `${adminName} 🛡️` : 'School Dome Arbiter 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      isPremium: true,
      isVip: true,
      messageText: `📢 REGISTRATION IS NOW OPEN FOR ${newSeason.title}!\n\nPrize Pool: ${newSeason.prizeCurrency === 'NGN' ? '₦' : ''}${newSeason.prizePool.toLocaleString()} ${newSeason.prizeCurrency === 'GP' ? 'GP' : ''}.\nRegister now to claim your battle slot before Question #1 launches!`,
      timestamp: Date.now(),
      type: 'announcement',
      reactions: { '🔥': 5, '⚡': 4 },
    };

    await setDoc(doc(db, 'school_dome_messages', annMsg.id), annMsg, { merge: false });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify([annMsg]));
        window.dispatchEvent(new CustomEvent('school_dome_message_posted', { detail: annMsg }));
        window.dispatchEvent(new CustomEvent('school_dome_messages_reset', { detail: [annMsg] }));
      } catch {}
    }

    return newSeason;
  } catch (err) {
    console.error('Error starting new School Dome season:', err);
    throw err;
  }
}

// Admin: End Season & Distribute Prize Pool equally among last people standing
export async function endSchoolDomeSeasonAndDistributePrize(
  seasonId: string,
  adminUid?: string,
  adminName?: string
): Promise<{ winners: SchoolDomeWinner[]; prizePerWinner: number }> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    const seasonSnap = await getDoc(seasonRef);
    if (!seasonSnap.exists()) {
      throw new Error('Season not found.');
    }

    const seasonData = seasonSnap.data() as SchoolDomeSeason;

    // 1. Resolve Last Standing Scholars (ONLY those currently standing/active!)
    let lastStandingIds: string[] = Array.isArray(seasonData.activeUserIds)
      ? [...seasonData.activeUserIds].filter(Boolean)
      : [];

    // Fallback 1: Query school_dome_registrations with status 'active' for this season
    if (lastStandingIds.length === 0) {
      try {
        const activeRegsSnap = await getDocs(
          query(
            collection(db, 'school_dome_registrations'),
            where('seasonId', '==', seasonId),
            where('status', '==', 'active')
          )
        );
        if (!activeRegsSnap.empty) {
          lastStandingIds = activeRegsSnap.docs.map((d) => d.data().userId).filter(Boolean);
        }
      } catch (err) {
        console.warn('[School Dome] Notice: Could not query active registrations:', err);
      }
    }

    // Deduplicate IDs
    lastStandingIds = Array.from(new Set(lastStandingIds));

    // CRITICAL USER RULE:
    // If standing is 0, GP must NOT be distributed to anybody! All of them were knocked out.
    // If we have 1 or more standing, that is when the GP split is effective.
    const totalPrize = Math.max(0, Number(seasonData.prizePool) || 0);
    const prizePerWinner = lastStandingIds.length > 0 ? Math.floor(totalPrize / lastStandingIds.length) : 0;

    // 3. Concurrently credit each winner's user document and record compliant transaction
    const winners: SchoolDomeWinner[] = await Promise.all(
      lastStandingIds.map(async (uId) => {
        let userName = `Scholar (${uId.slice(-4)})`;
        let avatar: string | undefined;
        let institution = 'Nigerian Higher Institution';
        let department: string | undefined;
        let currentGp = 0;
        let currentWalletBalance = 0;
        let currentTotalGpEarned = 0;
        let existingData: any = null;

        try {
          const uSnap = await getDoc(doc(db, 'users', uId));
          if (uSnap.exists()) {
            existingData = uSnap.data();
            userName = existingData.name || existingData.fullName || existingData.username || userName;
            avatar = existingData.avatar || existingData.profileImage;
            institution = existingData.institution || existingData.institutionName || institution;
            department = existingData.department || existingData.departmentName;

            currentGp = typeof existingData.gpBalance === 'number'
              ? existingData.gpBalance
              : Number(existingData.gpBalance || 0);
            if (isNaN(currentGp)) currentGp = 0;

            currentWalletBalance = typeof existingData.walletBalance === 'number'
              ? existingData.walletBalance
              : currentGp;
            if (isNaN(currentWalletBalance)) currentWalletBalance = currentGp;

            currentTotalGpEarned = typeof existingData.totalGpEarned === 'number'
              ? existingData.totalGpEarned
              : Number(existingData.totalGpEarned || 0);
            if (isNaN(currentTotalGpEarned)) currentTotalGpEarned = 0;
          }
        } catch (err) {
          console.warn(`[School Dome] Could not fetch user data for ${uId}:`, err);
        }

        const winnerRecord: SchoolDomeWinner = {
          userId: uId,
          userName,
          avatar,
          institution,
          department,
          prizeWon: prizePerWinner,
        };

        if (prizePerWinner > 0) {
          const newGpBalance = currentGp + prizePerWinner;
          const newWalletBalance = currentWalletBalance + prizePerWinner;
          const newTotalGpEarned = currentTotalGpEarned + prizePerWinner;

          const txDoc = doc(collection(db, 'walletTransactions'));
          const notifDoc = doc(collection(db, 'notifications'));
          const txRefId = `TX-DOME-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
          const dateStr = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          // Perform writes
          try {
            // A. Directly write updated GP balance to users document
            await setDoc(
              doc(db, 'users', uId),
              {
                gpBalance: newGpBalance,
                gp: newGpBalance,
                walletBalance: newWalletBalance,
                totalGpEarned: newTotalGpEarned,
                updatedAt: serverTimestamp(),
              },
              { merge: true, isServerAuthoritative: true }
            );

            // B. Record fully compliant wallet transaction
            await setDoc(
              txDoc,
              {
                id: txDoc.id,
                transactionId: txRefId,
                userId: uId,
                userName,
                type: 'gp_earned',
                action: 'Credit',
                category: 'School Dome Prize',
                amount: prizePerWinner,
                unit: 'GP',
                currency: 'GP',
                title: `🏆 School Dome Season #${seasonData.seasonNumber || 1} Champion Prize (+${prizePerWinner.toLocaleString()} GP)`,
                description: `Equal share of ${totalPrize.toLocaleString()} GP prize pool for surviving Season #${seasonData.seasonNumber || 1}: ${seasonData.title}.`,
                isCredit: true,
                status: 'completed',
                date: dateStr,
                timestamp: Date.now(),
                createdAt: serverTimestamp(),
                source: 'School Dome Prize',
              },
              { isServerAuthoritative: true }
            );

            // C. Send congratulatory in-app notification strictly targeted to the winner
            await setDoc(
              notifDoc,
              {
                id: notifDoc.id,
                userId: uId,
                targetUserId: uId,
              title: '🏆 School Dome Champion Prize Credited!',
              message: `Congratulations! You survived as a champion in ${seasonData.title}! Your equal share of ${prizePerWinner.toLocaleString()} GP has been deposited directly into your wallet.`,
              type: 'dome',
              isRead: false,
              timestamp: Date.now(),
              createdAt: serverTimestamp(),
              actionUrl: 'school_dome_results',
            });

            // D. Mark registration record as winner
            const regDocRef = doc(db, 'school_dome_registrations', `${seasonId}_${uId}`);
            await setDoc(
              regDocRef,
              {
                isWinner: true,
                prizeWon: prizePerWinner,
                status: 'active',
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (creditErr) {
            console.error(`[School Dome] Error crediting prize to user ${uId}:`, creditErr);
          }
        }

        return winnerRecord;
      })
    );

    // Broadcast local storage/window event to ensure real-time UI balance sync
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('school_dome_season_concluded', {
            detail: {
              seasonId,
              seasonNumber: seasonData.seasonNumber,
              title: seasonData.title,
              totalPrize,
              winners,
              prizePerWinner,
            },
          })
        );
      }
    } catch {}

    // Auto-close any active question
    try {
      const activeQ = query(
        collection(db, 'school_dome_questions'),
        where('seasonId', '==', seasonId),
        where('status', '==', 'active')
      );
      const qSnap = await getDocs(activeQ);
      qSnap.forEach((d) => {
        updateDoc(d.ref, { status: 'closed', updatedAt: serverTimestamp() }).catch(() => {});
      });
    } catch {}

    // Finalize season document
    await updateDoc(seasonRef, {
      status: 'ended',
      endedAt: Date.now(),
      winners,
      updatedAt: serverTimestamp(),
    });

    // Automatically create and permanently save the result record for that completed season
    try {
      const resultDocRef = doc(db, 'school_dome_results', seasonId);
      await setDoc(resultDocRef, {
        id: seasonId,
        seasonNumber: seasonData.seasonNumber,
        title: seasonData.title,
        prizePool: totalPrize,
        prizeCurrency: 'GP',
        prizePerWinner,
        winners,
        completedAt: Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (resErr) {
      console.warn('Could not record dedicated season result document:', resErr);
    }

    // Post triumphant final announcement in feed
    const finalRef = doc(db, 'school_dome_messages', `season_finale_${Date.now()}`);
    const winnerNames = winners.map(w => `${w.userName} (${w.institution || 'Scholar'})`).join(', ');

    await setDoc(finalRef, {
      id: finalRef.id,
      seasonId,
      userId: adminUid || 'grobax_arbiter',
      userName: adminName ? `${adminName} 🛡️` : 'School Dome Arbiter 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      isPremium: true,
      messageText: lastStandingIds.length > 0
        ? `🏆 ${seasonData.title.toUpperCase()} HAS CONCLUDED!\n\n👑 THE LAST SCHOLARS STANDING:\n${winnerNames}\n\n💰 PRIZE POOL SPLIT:\nThe ${totalPrize.toLocaleString()} GP prize pool has been divided equally! Each survivor receives ${prizePerWinner.toLocaleString()} GP credited directly to their GROBAAX wallet!\nCongratulations to our champions!`
        : `🏆 ${seasonData.title.toUpperCase()} HAS CONCLUDED!\n\n👑 THE LAST SCHOLARS STANDING:\nNo scholars survived this season (0 Standing).\n\n💰 PRIZE POOL:\nAll contenders were knocked out. The ${totalPrize.toLocaleString()} GP prize pool was not distributed.`,
      timestamp: Date.now(),
      type: 'announcement',
      reactions: { '👑': 10, '🏆': 8, '🎉': 12 },
    });

    // Broadcast announcement notification to all scholars and update results badge
    try {
      const broadNotif = doc(collection(db, 'notifications'));
      await setDoc(broadNotif, {
        id: broadNotif.id,
        title: `🏆 ${seasonData.title} Has Concluded!`,
        message: `Season #${seasonData.seasonNumber || 1} has ended! Check out the final survivors and winners in the Results tab.`,
        type: 'dome',
        isRead: false,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        actionUrl: 'school_dome_results',
      });
      grobaxNotificationService.incrementSection('school_dome_results', 1);
    } catch {}

    // Update localStorage fallback active season
    try {
      const stored = localStorage.getItem('grobax_school_dome_active_season');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id === seasonId) {
          parsed.status = 'ended';
          parsed.endedAt = Date.now();
          parsed.winners = winners;
          localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(parsed));
        }
      }
    } catch {}

    return { winners, prizePerWinner };
  } catch (err) {
    console.error('Error ending School Dome season:', err);
    throw err;
  }
}

// Update Season Rules
export async function updateSchoolDomeSeasonRules(
  seasonId: string,
  rules: string[]
): Promise<void> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    await updateDoc(seasonRef, {
      rules,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error updating season rules:', err);
    throw err;
  }
}

/**
 * Admin: Update/Edit an existing School Dome season
 * Allows editing Title, Season Number, Prize Pool, Currency, Status, Registration Lock, Description, and Rules
 */
export async function updateSchoolDomeSeason(
  seasonId: string,
  updates: {
    title?: string;
    seasonNumber?: number;
    prizePool?: number;
    prizeCurrency?: 'NGN' | 'GP';
    status?: SchoolDomeSeasonStatus;
    isRegistrationLocked?: boolean;
    description?: string;
    rules?: string[];
  }
): Promise<void> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    const sanitizedUpdates: any = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) {
      sanitizedUpdates.title = updates.title.trim();
    }
    if (updates.seasonNumber !== undefined) {
      sanitizedUpdates.seasonNumber = Math.max(1, Number(updates.seasonNumber) || 1);
    }
    if (updates.prizePool !== undefined) {
      sanitizedUpdates.prizePool = Math.max(0, Number(updates.prizePool) || 0);
    }
    if (updates.prizeCurrency !== undefined) {
      sanitizedUpdates.prizeCurrency = updates.prizeCurrency;
    }
    if (updates.status !== undefined) {
      sanitizedUpdates.status = updates.status;
      if (updates.status === 'ended') {
        sanitizedUpdates.endedAt = Date.now();
      } else if (updates.status === 'paused') {
        sanitizedUpdates.pausedAt = Date.now();
      } else if (updates.status === 'active') {
        sanitizedUpdates.resumedAt = Date.now();
      }
    }
    if (updates.isRegistrationLocked !== undefined) {
      sanitizedUpdates.isRegistrationLocked = Boolean(updates.isRegistrationLocked);
    }
    if (updates.description !== undefined) {
      sanitizedUpdates.description = updates.description.trim();
    }
    if (updates.rules !== undefined) {
      sanitizedUpdates.rules = updates.rules;
    }

    // If status is transitioning to 'ended', ensure prizes are distributed
    if (updates.status === 'ended') {
      try {
        const snap = await getDoc(seasonRef);
        if (snap.exists()) {
          const curData = snap.data() as SchoolDomeSeason;
          if (curData.status !== 'ended' || !curData.winners || curData.winners.length === 0) {
            // Apply other edits first
            await setDoc(seasonRef, sanitizedUpdates, { merge: true });
            // Then execute formal prize distribution
            await endSchoolDomeSeasonAndDistributePrize(seasonId);
            return;
          }
        }
      } catch (endErr) {
        console.warn('[School Dome] Notice: Could not auto-finalize prize distribution in updateSchoolDomeSeason:', endErr);
      }
    }

    await setDoc(seasonRef, sanitizedUpdates, { merge: true });

    // Sync localStorage fallback active season and notify all subscribers
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('grobax_school_dome_active_season');
        const currentObj = stored ? JSON.parse(stored) : { id: seasonId, ...DEFAULT_INITIAL_SEASON };
        Object.assign(currentObj, sanitizedUpdates);
        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(currentObj));
        window.dispatchEvent(
          new CustomEvent('school_dome_season_updated', {
            detail: currentObj,
          })
        );
      }
    } catch {}
  } catch (err) {
    console.error('Error updating School Dome season:', err);
    throw err;
  }
}

/**
 * Admin / Arbiter: Pause the active School Dome Season.
 * Puts competition, question timers, and contender answers/chat on hold.
 */
export async function pauseSchoolDomeSeason(
  seasonId: string,
  adminUid?: string,
  adminName?: string
): Promise<void> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    let seasonNumber = 1;
    try {
      const snap = await getDoc(seasonRef);
      if (snap.exists()) {
        const data = snap.data() as SchoolDomeSeason;
        seasonNumber = data.seasonNumber || 1;
      }
    } catch {}

    const pausedAtTime = Date.now();
    const updates = {
      status: 'paused' as SchoolDomeSeasonStatus,
      pausedAt: pausedAtTime,
      updatedAt: serverTimestamp(),
    };

    await setDoc(seasonRef, updates, { merge: true });

    // Sync localStorage fallback active season and notify all subscribers
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('grobax_school_dome_active_season');
        const currentObj = stored ? JSON.parse(stored) : { id: seasonId, ...DEFAULT_INITIAL_SEASON };
        currentObj.status = 'paused';
        currentObj.pausedAt = pausedAtTime;
        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(currentObj));
        window.dispatchEvent(
          new CustomEvent('school_dome_season_updated', {
            detail: currentObj,
          })
        );
      }
    } catch {}

    // Send official announcement into the arena chat
    await sendSchoolDomeMessage(
      {
        id: 'sdm_paused_' + Date.now(),
        seasonId,
        userId: 'grobax_arbiter',
        userName: 'School Dome Arbiter ⚖️',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        institution: 'Official Commission',
        messageText: `⏸️ **ARENA NOTICE**: Season #${seasonNumber} has been PAUSED by ${adminName || 'Official Arbiter'}. Elimination questions, timer countdowns, and contender responses are on hold until resumed.`,
        isStaff: true,
        membershipTier: 'ARBITER',
      } as any,
      null,
      null
    ).catch(() => {});
  } catch (err) {
    console.error('Error pausing School Dome season:', err);
    throw err;
  }
}

/**
 * Admin / Arbiter: Resume the paused School Dome Season.
 * Unlocks the competition and restores live gameplay.
 */
export async function resumeSchoolDomeSeason(
  seasonId: string,
  adminUid?: string,
  adminName?: string
): Promise<void> {
  try {
    const seasonRef = doc(db, 'school_dome_seasons', seasonId);
    let seasonNumber = 1;
    try {
      const snap = await getDoc(seasonRef);
      if (snap.exists()) {
        const data = snap.data() as SchoolDomeSeason;
        seasonNumber = data.seasonNumber || 1;
      }
    } catch {}

    const resumedAtTime = Date.now();
    const updates = {
      status: 'active' as SchoolDomeSeasonStatus,
      resumedAt: resumedAtTime,
      updatedAt: serverTimestamp(),
    };

    await setDoc(seasonRef, updates, { merge: true });

    // Sync localStorage fallback active season and notify all subscribers
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('grobax_school_dome_active_season');
        const currentObj = stored ? JSON.parse(stored) : { id: seasonId, ...DEFAULT_INITIAL_SEASON };
        currentObj.status = 'active';
        currentObj.resumedAt = resumedAtTime;
        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(currentObj));
        window.dispatchEvent(
          new CustomEvent('school_dome_season_updated', {
            detail: currentObj,
          })
        );
      }
    } catch {}

    // Send official announcement into the arena chat
    await sendSchoolDomeMessage(
      {
        id: 'sdm_resumed_' + Date.now(),
        seasonId,
        userId: 'grobax_arbiter',
        userName: 'School Dome Arbiter ⚖️',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        institution: 'Official Commission',
        messageText: `▶️ **ARENA NOTICE**: Season #${seasonNumber} has been RESUMED by ${adminName || 'Official Arbiter'}. The School Dome battle is now LIVE!`,
        isStaff: true,
        membershipTier: 'ARBITER',
      } as any,
      null,
      null
    ).catch(() => {});
  } catch (err) {
    console.error('Error resuming School Dome season:', err);
    throw err;
  }
}

/**
 * Admin: Delete All Seasons & wipe Champions page completely,
 * resetting the School Dome Arena back to a fresh Season 1.
 */
export async function deleteAllSchoolDomeSeasons(
  adminUid?: string,
  adminName?: string
): Promise<SchoolDomeSeason> {
  try {
    // Fresh pristine Season 1 specification
    const freshSeason1: SchoolDomeSeason = {
      id: 'season_dome_1',
      seasonNumber: 1,
      title: 'Season #1 — School Dome',
      description: 'The Ultimate Inter-Campus Elimination Arena. Answer correctly to survive each question. The prize pool is divided equally among the last scholars standing!',
      prizePool: 50000,
      prizeCurrency: 'GP',
      status: 'active',
      registeredUserIds: [],
      activeUserIds: [],
      eliminatedUserIds: [],
      isRegistrationLocked: false,
      firstQuestionLaunched: false,
      currentQuestionNumber: 0,
      totalQuestionsLaunched: 0,
      createdAt: Date.now(),
      startedAt: Date.now(),
      winners: [],
      rules: [
        'Registration is completely free and open to all verified scholars before Question #1 begins.',
        'Users cannot participate or register any longer after the first question has been launched.',
        'Each scholar receives exactly ONE attempt per live question challenge.',
        'Submitting the correct answer within the time limit secures survival and advancement to the next question.',
        'Elimination Criteria: Users are eliminated by: 1) Not answering a particular question before the time expired, 2) Answering wrong.',
        'The entire GP prize pool is divided equally among the Last Scholars Standing when the season concludes.',
      ],
    };

    const freshWelcomeMsg: SchoolDomeMessage = {
      id: `dome_msg_welcome_${Date.now()}`,
      seasonId: freshSeason1.id,
      userId: adminUid || 'grobax_arbiter',
      userName: adminName ? `${adminName} 🛡️` : 'School Dome Arbiter 🛡️',
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      institution: 'Grobaax Arena HQ',
      department: 'Chief Arbiter',
      level: 'Master',
      isPremium: true,
      isVip: true,
      messageText: '🏛️ Welcome to School Dome Season #1!\n\nRegistration is now officially open! Compete for the 50,000 GP prize pool. Register now to claim your battle slot before Question #1 begins!',
      timestamp: Date.now(),
      type: 'announcement',
      reactions: { '🔥': 5, '⚔️': 3 },
    };

    // 1. Instant local storage purge & event dispatch for 0ms UI reaction
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.toLowerCase().includes('school_dome') || k.startsWith('grobax_school_dome_') || k.startsWith('grobaax_table_fallback_school_dome_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(freshSeason1));
        localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify([freshWelcomeMsg]));

        window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: freshSeason1 }));
        window.dispatchEvent(new CustomEvent('school_dome_season_reset', { detail: freshSeason1 }));
        window.dispatchEvent(new CustomEvent('school_dome_active_question_updated', { detail: null }));
        window.dispatchEvent(new CustomEvent('school_dome_messages_reset', { detail: [freshWelcomeMsg] }));
      } catch {}
    }

    // 2. Direct Supabase bulk wipe for speed and completeness
    try {
      if (supabaseAdmin) {
        await Promise.allSettled([
          supabaseAdmin.from('school_dome_messages').delete().neq('id', '___keep_none___'),
          supabaseAdmin.from('school_dome_questions').delete().neq('id', '___keep_none___'),
          supabaseAdmin.from('school_dome_registrations').delete().neq('id', '___keep_none___'),
          supabaseAdmin.from('school_dome_seasons').delete().neq('id', '___keep_none___'),
        ]);
      }
    } catch (e) {
      console.warn('Notice in bulk table clean:', e);
    }

    // 3. Fallback Firestore document wipes
    try {
      const collectionsToWipe = ['school_dome_messages', 'school_dome_questions', 'school_dome_registrations', 'school_dome_seasons'];
      for (const colName of collectionsToWipe) {
        try {
          const snap = await getDocs(collection(db, colName));
          const deletes: Promise<void>[] = [];
          snap.forEach(d => {
            deletes.push(deleteDoc(doc(db, colName, d.id)).catch(() => {}));
          });
          await Promise.all(deletes);
        } catch {}
      }
    } catch (e) {
      console.warn('Notice in document cleanup:', e);
    }

    // 4. Save clean Season 1 and initial welcome message (merge: false ensures complete reset)
    await Promise.all([
      setDoc(doc(db, 'school_dome_seasons', freshSeason1.id), freshSeason1, { merge: false }),
      setDoc(doc(db, 'school_dome_messages', freshWelcomeMsg.id), freshWelcomeMsg, { merge: false }),
    ]);

    // 4b. Reset all spin bonus records on backend for clean Season 1 restart
    try {
      fetch('/api/spin/school-dome/reset-season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: freshSeason1.id, startedAt: freshSeason1.startedAt || Date.now() }),
      }).catch(() => {});
    } catch {}

    // 5. Final local cache sync
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('grobax_school_dome_active_season', JSON.stringify(freshSeason1));
        localStorage.setItem('grobax_school_dome_cached_messages', JSON.stringify([freshWelcomeMsg]));
        window.dispatchEvent(new CustomEvent('school_dome_season_updated', { detail: freshSeason1 }));
        window.dispatchEvent(new CustomEvent('school_dome_season_reset', { detail: freshSeason1 }));
        window.dispatchEvent(new CustomEvent('school_dome_active_question_updated', { detail: null }));
        window.dispatchEvent(new CustomEvent('school_dome_messages_reset', { detail: [freshWelcomeMsg] }));
      } catch {}
    }

    return freshSeason1;
  } catch (err) {
    console.error('Error deleting all School Dome seasons:', err);
    throw err;
  }
}


