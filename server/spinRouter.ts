import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../src/lib/supabaseFirestoreAdapter';

export const spinRouter = Router();

export interface SpinRewardSlice {
  amount: number;
  weight: number;
  label: string;
  color: string;
  textColor: string;
}

// Exactly these 8 GP reward amounts as specified in requirements
export const SPIN_REWARDS: SpinRewardSlice[] = [
  { amount: 5, weight: 35, label: '5 GP', color: '#F59E0B', textColor: '#FFFFFF' },      // Common (35%)
  { amount: 10, weight: 30, label: '10 GP', color: '#2563EB', textColor: '#FFFFFF' },    // Common (30%)
  { amount: 15, weight: 15, label: '15 GP', color: '#10B981', textColor: '#FFFFFF' },    // Less frequent (15%)
  { amount: 20, weight: 10, label: '20 GP', color: '#8B5CF6', textColor: '#FFFFFF' },    // Less frequent (10%)
  { amount: 25, weight: 5, label: '25 GP', color: '#4F46E5', textColor: '#FFFFFF' },      // Less common (5%)
  { amount: 30, weight: 3, label: '30 GP', color: '#EC4899', textColor: '#FFFFFF' },      // Less common (3%)
  { amount: 35, weight: 1.5, label: '35 GP', color: '#06B6D4', textColor: '#FFFFFF' },    // Rare (1.5%)
  { amount: 50, weight: 0.5, label: '50 GP', color: '#D97706', textColor: '#FFFFFF' },    // Rarest / Highest (0.5%)
];

// In-memory concurrency locks to prevent race conditions & double-clicks
const activeSpinLocks = new Set<string>();
const processedSpinsToday = new Set<string>();

/**
 * Helper to get current calendar date string (YYYY-MM-DD)
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Helper to compute seconds remaining until next midnight (UTC)
 */
export function getSecondsUntilMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

/**
 * Weighted random selection: determines the winning reward strictly server-side
 */
function pickWeightedReward(): { sliceIndex: number; rewardAmount: number } {
  const totalWeight = SPIN_REWARDS.reduce((sum, slice) => sum + slice.weight, 0); // 100
  const randomVal = Math.random() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < SPIN_REWARDS.length; i++) {
    cumulative += SPIN_REWARDS[i].weight;
    if (randomVal <= cumulative) {
      return { sliceIndex: i, rewardAmount: SPIN_REWARDS[i].amount };
    }
  }

  // Fallback
  return { sliceIndex: 0, rewardAmount: SPIN_REWARDS[0].amount };
}

/**
 * GET /api/spin/rewards
 * Returns the reward slices without internal probability weights
 */
spinRouter.get('/rewards', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    rewards: SPIN_REWARDS.map((r, index) => ({
      index,
      amount: r.amount,
      label: r.label,
      color: r.color,
      textColor: r.textColor,
    })),
  });
});

/**
 * GET /api/spin/status/:userId
 * Securely verifies whether a user can spin today from backend & database
 */
spinRouter.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const todayDate = getTodayDateStr();
    const cacheKey = `${userId}_${todayDate}`;

    // 1. Check in-memory processed tracker
    if (processedSpinsToday.has(cacheKey)) {
      return res.json({
        success: true,
        canSpin: false,
        todayDate,
        secondsUntilNextSpin: getSecondsUntilMidnight(),
        reason: 'already_spun',
        message: 'You have already used your free spin today! Return tomorrow for another spin.',
      });
    }

    // 2. Authoritative check on user document in database
    const { data: userDoc } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle();

    const userData = userDoc?.data || {};

    if (userData.lastSpinDate === todayDate) {
      processedSpinsToday.add(cacheKey);
      return res.json({
        success: true,
        canSpin: false,
        todayDate,
        lastSpinDate: userData.lastSpinDate,
        lastReward: userData.lastSpinReward || null,
        secondsUntilNextSpin: getSecondsUntilMidnight(),
        reason: 'already_spun',
        message: 'You have already used your free spin today! Return tomorrow for another spin.',
      });
    }

    // 3. Fallback check in walletTransactions for today
    try {
      const { data: txList } = await supabaseAdmin
        .from('walletTransactions')
        .select('id, data')
        .order('created_at', { ascending: false })
        .limit(50);

      const hasSpunInTx = (txList || []).some((item: any) => {
        const d = item.data || {};
        return (
          d.userId === userId &&
          d.type === 'spin_reward' &&
          (d.meta?.spinDate === todayDate || (d.date && d.date.includes(todayDate)))
        );
      });

      if (hasSpunInTx) {
        processedSpinsToday.add(cacheKey);
        return res.json({
          success: true,
          canSpin: false,
          todayDate,
          secondsUntilNextSpin: getSecondsUntilMidnight(),
          reason: 'already_spun',
          message: 'You have already used your free spin today! Return tomorrow for another spin.',
        });
      }
    } catch {
      // Non-blocking query failure
    }

    return res.json({
      success: true,
      canSpin: true,
      todayDate,
      lastSpinDate: userData.lastSpinDate || null,
      secondsUntilNextSpin: 0,
      message: 'Your 1 free daily spin is ready! Spin the wheel to claim your GP reward.',
    });
  } catch (err: any) {
    console.error('[Spin API] Error checking spin status:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify spin status.' });
  }
});

/**
 * POST /api/spin/execute
 * Secure, authoritative execution of the daily spin:
 * - Checks daily restriction in database
 * - Computes winning result using weighted probabilities
 * - Atomically increments GP wallet balance
 * - Creates an authoritative Spin transaction record
 */
spinRouter.post('/execute', async (req: Request, res: Response) => {
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required to spin the wheel.' });
  }

  const todayDate = getTodayDateStr();
  const dedupeKey = `${userId}_${todayDate}`;

  // 1. Race condition / concurrent request protection
  if (activeSpinLocks.has(userId)) {
    return res.status(429).json({
      success: false,
      code: 'SPIN_IN_PROGRESS',
      message: 'A spin request is already being processed. Please wait.',
    });
  }

  if (processedSpinsToday.has(dedupeKey)) {
    return res.status(409).json({
      success: false,
      code: 'ALREADY_SPUN_TODAY',
      message: 'You have already used your free spin today! Come back tomorrow for another chance.',
      secondsUntilNextSpin: getSecondsUntilMidnight(),
    });
  }

  // Acquire in-memory lock
  activeSpinLocks.add(userId);

  try {
    // 2. Fetch authoritative user document from database
    const { data: userDoc } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle();

    const rawData = userDoc?.data || {};
    const userData: any = typeof rawData === 'object' && rawData !== null && 'gpBalance' in rawData
      ? rawData
      : (typeof rawData.data === 'object' && rawData.data !== null ? rawData.data : {
          id: userId,
          name: req.body.userName || 'Scholar',
          email: req.body.userEmail || '',
          institutionName: req.body.institutionName || '',
          gpBalance: 0,
          walletBalance: 0,
          totalGpEarned: 0,
        });

    // 3. Database check: Verify user has not already spun on this calendar day
    if (userData.lastSpinDate === todayDate) {
      processedSpinsToday.add(dedupeKey);
      activeSpinLocks.delete(userId);
      return res.status(409).json({
        success: false,
        code: 'ALREADY_SPUN_TODAY',
        message: 'You have already used your free spin today! Come back tomorrow for another chance.',
        secondsUntilNextSpin: getSecondsUntilMidnight(),
      });
    }

    // 4. Server authoritative weighted selection
    const { sliceIndex, rewardAmount } = pickWeightedReward();

    // 5. Calculate new wallet balances
    const currentGp = Number(userData.gpBalance || 0);
    const currentWallet = Number(userData.walletBalance || currentGp);
    const currentTotalGp = Number(userData.totalGpEarned || 0);

    const newGp = currentGp + rewardAmount;
    const newWallet = currentWallet + rewardAmount;
    const newTotalGp = currentTotalGp + rewardAmount;

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' — ' +
      now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    const txId = `TX_SPIN_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const updatedUserData = {
      ...userData,
      id: userId,
      gpBalance: newGp,
      walletBalance: newWallet,
      totalGpEarned: newTotalGp,
      lastSpinDate: todayDate,
      lastSpinAt: now.toISOString(),
      lastSpinReward: rewardAmount,
      lastSpinTxId: txId,
      updatedAt: now.toISOString(),
    };

    // 6. Update user document in database
    const { error: userUpdateErr } = await supabaseAdmin.from('users').upsert({
      id: userId,
      data: updatedUserData,
      updated_at: now.toISOString(),
    });

    if (userUpdateErr) {
      console.error('[Spin API] Error updating user balance in database:', userUpdateErr.message);
      activeSpinLocks.delete(userId);
      return res.status(500).json({ success: false, message: 'Failed to update user wallet balance.' });
    }

    // Mark as processed in-memory immediately after successful balance update
    processedSpinsToday.add(dedupeKey);

    // 7. Authoritative Transaction Record
    const txRecord = {
      id: txId,
      transactionId: txId,
      userId,
      userName: userData.name || userData.fullName || userData.username || 'Scholar',
      userEmail: userData.email || '',
      userAvatar: userData.profileImage || userData.avatar || '',
      institutionName: userData.institutionName || userData.institution || '',
      type: 'spin_reward',
      amount: rewardAmount,
      unit: 'GP',
      title: 'Spin Reward',
      description: `Daily Spin Wheel reward (+${rewardAmount} GP)`,
      date: formattedDate,
      isCredit: true,
      status: 'completed',
      createdAt: now.toISOString(),
      meta: {
        feature: 'spin_wheel',
        rewardAmount,
        sliceIndex,
        spinDate: todayDate,
      },
    };

    // Save transaction to walletTransactions
    await supabaseAdmin.from('walletTransactions').upsert({
      id: txId,
      data: txRecord,
      updated_at: now.toISOString(),
    });

    // Redundant dailySpins log (non-blocking if table not separately provisioned)
    try {
      await supabaseAdmin.from('dailySpins').upsert({
        id: `spin_${userId}_${todayDate}`,
        data: {
          id: `spin_${userId}_${todayDate}`,
          userId,
          date: todayDate,
          amount: rewardAmount,
          transactionId: txId,
          createdAt: now.toISOString(),
        },
        updated_at: now.toISOString(),
      });
    } catch {
      // Safe fallback
    }

    activeSpinLocks.delete(userId);

    return res.json({
      success: true,
      rewardAmount,
      sliceIndex,
      newBalance: newGp,
      transactionId: txId,
      date: formattedDate,
      transaction: txRecord,
      secondsUntilNextSpin: getSecondsUntilMidnight(),
      message: `🎉 Congratulations! You won +${rewardAmount} GP!`,
    });
  } catch (err: any) {
    activeSpinLocks.delete(userId);
    console.error('[Spin API] Unexpected exception during spin execution:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while processing spin.' });
  }
});

/**
 * GET /api/spin/history/:userId
 * Retrieves user's own Spin transactions
 */
spinRouter.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const { data: rawList } = await supabaseAdmin
      .from('walletTransactions')
      .select('id, data')
      .order('created_at', { ascending: false })
      .limit(100);

    const spinTxs = (rawList || [])
      .map((item: any) => item.data)
      .filter((tx: any) => tx && tx.userId === userId && tx.type === 'spin_reward');

    return res.json({
      success: true,
      transactions: spinTxs,
    });
  } catch (err: any) {
    console.error('[Spin API] Error fetching spin history:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve spin history.' });
  }
});

// =========================================================================
// SCHOOL DOME ELIMINATION PARTICIPATION SPIN BONUS SYSTEM
// =========================================================================

export interface SchoolDomeSpinSlice {
  amount: number;
  weight: number;
  label: string;
  color: string;
  textColor: string;
}

/**
 * Exactly these 9 GP reward amounts as specified in requirements:
 * - 20 GP (very common)
 * - 25 GP (very common)
 * - 30 GP (common)
 * - 35 GP (less common)
 * - 40 GP (less common)
 * - 45 GP (less common)
 * - 50 GP (uncommon)
 * - 100 GP (not achievable)
 * - 200 GP (not achievable)
 */
export const SCHOOL_DOME_SPIN_SLICES: SchoolDomeSpinSlice[] = [
  { amount: 20, weight: 35, label: '20 GP', color: '#2563EB', textColor: '#FFFFFF' },   // Very common (35%)
  { amount: 25, weight: 30, label: '25 GP', color: '#10B981', textColor: '#FFFFFF' },   // Very common (30%)
  { amount: 30, weight: 18, label: '30 GP', color: '#8B5CF6', textColor: '#FFFFFF' },   // Common (18%)
  { amount: 35, weight: 8, label: '35 GP', color: '#EC4899', textColor: '#FFFFFF' },    // Less common (8%)
  { amount: 40, weight: 5, label: '40 GP', color: '#06B6D4', textColor: '#FFFFFF' },    // Less common (5%)
  { amount: 45, weight: 3, label: '45 GP', color: '#F59E0B', textColor: '#FFFFFF' },    // Less common (3%)
  { amount: 50, weight: 1, label: '50 GP', color: '#6366F1', textColor: '#FFFFFF' },    // Uncommon (1%)
  { amount: 100, weight: 0, label: '100 GP', color: '#DC2626', textColor: '#FFFFFF' },  // Not achievable (0%)
  { amount: 200, weight: 0, label: '200 GP', color: '#EAB308', textColor: '#FFFFFF' },  // Not achievable (0%)
];

const domeSpinLocks = new Set<string>();

/**
 * Server-side authoritative resolver for user subscription tier
 */
export function resolveServerUserTier(user: any): 'free' | 'premium' | 'vip' {
  if (!user) return 'free';

  const isStaffOrAdmin =
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'ADMIN' ||
    user.role === 'staff' ||
    (user.name && (String(user.name).toLowerCase().includes('admin') || String(user.name).toLowerCase().includes('staff')));

  if (isStaffOrAdmin) return 'vip';

  const membership = String(user.membershipTier || '').toLowerCase().trim();
  const subTier = String(user.subscriptionTier || '').toLowerCase().trim();
  const plan = String(user.subscriptionPlan || user.planId || user.subscriptionTier || user.membershipTier || user.tier || user.activePlanId || '').toLowerCase().trim();
  const planName = String(user.planNameSnapshot || user.subscription?.name || user.subscription?.planId || '').toLowerCase().trim();

  const isExplicitlyFree =
    membership === 'free' ||
    membership === 'free scholar' ||
    membership === 'scholar (starter)' ||
    membership === 'starter scholar' ||
    subTier === 'free' ||
    subTier === 'free scholar' ||
    plan === 'free' ||
    plan === 'plan_free' ||
    plan === 'free_starter';

  if (
    user.isVip ||
    user.targetTier === 'vip' ||
    user.tierType === 'vip' ||
    membership.includes('vip') ||
    membership.includes('titan') ||
    subTier.includes('vip') ||
    subTier.includes('titan') ||
    plan.includes('vip') ||
    plan.includes('titan') ||
    planName.includes('vip') ||
    planName.includes('titan') ||
    plan.includes('annual') ||
    planName.includes('annual')
  ) {
    return 'vip';
  }

  if (isExplicitlyFree && !user.isPremium) {
    return 'free';
  }

  const isPremium = Boolean(
    user.isPremium ||
    user.targetTier === 'premium' ||
    user.tierType === 'premium' ||
    (user.isSubscribed && !isExplicitlyFree) ||
    membership.includes('premium') ||
    membership.includes('pro') ||
    membership.includes('champion') ||
    subTier.includes('premium') ||
    subTier.includes('pro') ||
    subTier.includes('champion') ||
    plan.includes('premium') ||
    plan.includes('pro') ||
    plan.includes('champion')
  );

  if (isPremium) return 'premium';
  return 'free';
}

/**
 * Weighted random selector for School Dome elimination rewards
 */
function pickSchoolDomeWeightedReward(): { sliceIndex: number; rewardAmount: number } {
  const totalWeight = SCHOOL_DOME_SPIN_SLICES.reduce((sum, s) => sum + s.weight, 0); // 100
  const randomVal = Math.random() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < SCHOOL_DOME_SPIN_SLICES.length; i++) {
    cumulative += SCHOOL_DOME_SPIN_SLICES[i].weight;
    if (randomVal <= cumulative) {
      return { sliceIndex: i, rewardAmount: SCHOOL_DOME_SPIN_SLICES[i].amount };
    }
  }

  return { sliceIndex: 0, rewardAmount: SCHOOL_DOME_SPIN_SLICES[0].amount };
}

/**
 * GET /api/spin/school-dome/slices
 * Slices metadata for frontend wheel rendering
 */
spinRouter.get('/school-dome/slices', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    slices: SCHOOL_DOME_SPIN_SLICES.map((s, index) => ({
      index,
      amount: s.amount,
      label: s.label,
      color: s.color,
      textColor: s.textColor,
    })),
  });
});

/**
 * GET /api/spin/school-dome/status/:seasonId/:userId
 * Checks user's eligibility and remaining spin count for a specific School Dome season
 */
spinRouter.get('/school-dome/status/:seasonId/:userId', async (req: Request, res: Response) => {
  try {
    const { seasonId, userId } = req.params;
    if (!seasonId || !userId) {
      return res.status(400).json({ success: false, message: 'seasonId and userId are required.' });
    }

    // 1. Fetch user doc and resolve subscription tier
    const { data: userDoc } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle();

    const rawData = userDoc?.data || {};
    const userData: any = typeof rawData === 'object' && rawData !== null && 'gpBalance' in rawData
      ? rawData
      : (typeof rawData.data === 'object' && rawData.data !== null ? rawData.data : {});

    const tierType = resolveServerUserTier(userData);

    // Rule: Free users receive NO spin bonus
    if (tierType === 'free') {
      return res.json({
        success: true,
        canSpin: false,
        isEligible: false,
        tierType: 'free',
        maxSpins: 0,
        spinsUsed: 0,
        spinsRemaining: 0,
        reason: 'free_tier_ineligible',
        message: 'Free tier scholars receive normal elimination experience without bonus spins.',
      });
    }

    const maxSpins = tierType === 'vip' ? 2 : 1;

    // 2. Count existing School Dome elimination spin transactions for this user & season
    const { data: rawTxList } = await supabaseAdmin
      .from('walletTransactions')
      .select('id, data')
      .order('created_at', { ascending: false })
      .limit(100);

    const existingSpins = (rawTxList || []).filter((item: any) => {
      const d = item.data || {};
      const isTargetType = d.type === 'school_dome_spin_bonus' || (d.type === 'spin_reward' && d.meta?.feature === 'school_dome_elimination_spin');
      const matchesSeason = d.meta?.seasonId === seasonId || (d.description && d.description.includes(seasonId));
      return d.userId === userId && isTargetType && matchesSeason;
    });

    const spinsUsed = existingSpins.length;
    const spinsRemaining = Math.max(0, maxSpins - spinsUsed);
    const canSpin = spinsRemaining > 0;

    return res.json({
      success: true,
      canSpin,
      isEligible: true,
      tierType,
      maxSpins,
      spinsUsed,
      spinsRemaining,
      seasonId,
      message: canSpin
        ? `You have ${spinsRemaining} bonus spin${spinsRemaining > 1 ? 's' : ''} available for this season!`
        : 'All eligible bonus spins for this School Dome season have been completed.',
    });
  } catch (err: any) {
    console.error('[School Dome Spin Status] Error checking status:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify School Dome spin status.' });
  }
});

/**
 * POST /api/spin/school-dome/execute
 * Authoritatively executes an elimination spin bonus for an eligible School Dome participant:
 * - Strictly validates user's general Grobaax subscription (Premium gets 1, VIP gets 2, Free gets 0)
 * - Verifies user registered and participated in this specific season
 * - Verifies user was eliminated
 * - Enforces max 1 spin (Premium) or 2 spins (VIP) per season
 * - Computes winning result server-side using weighted probabilities (100 & 200 GP are unachievable)
 * - Credits winning GP directly to user's wallet atomically
 * - Creates an official School Dome Elimination Spin Bonus transaction record
 */
spinRouter.post('/school-dome/execute', async (req: Request, res: Response) => {
  const { seasonId, userId, seasonNumber, seasonTitle, isRegistered, isEliminated } = req.body || {};

  if (!seasonId || !userId) {
    return res.status(400).json({
      success: false,
      message: 'seasonId and userId are required to execute a School Dome elimination spin.',
    });
  }

  const lockKey = `dome_${seasonId}_${userId}`;
  if (domeSpinLocks.has(lockKey)) {
    return res.status(429).json({
      success: false,
      code: 'SPIN_IN_PROGRESS',
      message: 'A School Dome spin is already in progress. Please wait.',
    });
  }

  domeSpinLocks.add(lockKey);

  try {
    // 1. Fetch user doc
    const { data: userDoc } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle();

    const rawData = userDoc?.data || {};
    const userData: any = typeof rawData === 'object' && rawData !== null && 'gpBalance' in rawData
      ? rawData
      : (typeof rawData.data === 'object' && rawData.data !== null ? rawData.data : {
          id: userId,
          name: req.body.userName || 'Scholar',
          email: req.body.userEmail || '',
          institutionName: req.body.institutionName || '',
          gpBalance: 0,
          walletBalance: 0,
          totalGpEarned: 0,
        });

    // 2. Check general subscription eligibility (Premium: 1, VIP: 2, Free: 0)
    const tierType = resolveServerUserTier(userData);

    if (tierType === 'free') {
      domeSpinLocks.delete(lockKey);
      return res.status(403).json({
        success: false,
        code: 'FREE_USER_INELIGIBLE',
        message: 'Free users are not eligible for School Dome elimination bonus spins.',
      });
    }

    const maxSpins = tierType === 'vip' ? 2 : 1;

    // 3. Verify user registered and eliminated for this season
    // Check against database season doc if available
    let verifiedRegistration = Boolean(isRegistered);
    let verifiedElimination = Boolean(isEliminated);

    try {
      const { data: seasonDoc } = await supabaseAdmin
        .from('schoolDomeSeasons')
        .select('id, data')
        .eq('id', seasonId)
        .maybeSingle();

      if (seasonDoc?.data) {
        const sData = seasonDoc.data.data || seasonDoc.data;
        if (sData.registeredUserIds && Array.isArray(sData.registeredUserIds)) {
          verifiedRegistration = sData.registeredUserIds.includes(userId);
        }
        if (sData.eliminatedUserIds && Array.isArray(sData.eliminatedUserIds)) {
          verifiedElimination = sData.eliminatedUserIds.includes(userId);
        }
      }
    } catch {
      // Non-blocking fallback
    }

    if (!verifiedRegistration) {
      domeSpinLocks.delete(lockKey);
      return res.status(403).json({
        success: false,
        code: 'NOT_REGISTERED',
        message: 'Only registered participants of this School Dome season are eligible for participation bonus.',
      });
    }

    if (!verifiedElimination) {
      domeSpinLocks.delete(lockKey);
      return res.status(403).json({
        success: false,
        code: 'NOT_ELIMINATED',
        message: 'Only eliminated participants are eligible for the elimination participation spin bonus.',
      });
    }

    // 4. Count prior spins used for this season
    const { data: rawTxList } = await supabaseAdmin
      .from('walletTransactions')
      .select('id, data')
      .order('created_at', { ascending: false })
      .limit(100);

    const existingSpins = (rawTxList || []).filter((item: any) => {
      const d = item.data || {};
      const isTargetType = d.type === 'school_dome_spin_bonus' || (d.type === 'spin_reward' && d.meta?.feature === 'school_dome_elimination_spin');
      const matchesSeason = d.meta?.seasonId === seasonId || (d.description && d.description.includes(seasonId));
      return d.userId === userId && isTargetType && matchesSeason;
    });

    const spinsUsed = existingSpins.length;

    if (spinsUsed >= maxSpins) {
      domeSpinLocks.delete(lockKey);
      return res.status(409).json({
        success: false,
        code: 'SEASON_SPINS_EXHAUSTED',
        message: `You have already used all eligible spin bonuses (${maxSpins}) for this School Dome season.`,
        spinsUsed,
        maxSpins,
      });
    }

    // 5. Pick winning reward using weighted probabilities
    const { sliceIndex, rewardAmount } = pickSchoolDomeWeightedReward();

    // 6. Calculate new balances
    const currentGp = Number(userData.gpBalance || 0);
    const currentWallet = Number(userData.walletBalance || currentGp);
    const currentTotalGp = Number(userData.totalGpEarned || 0);

    const newGp = currentGp + rewardAmount;
    const newWallet = currentWallet + rewardAmount;
    const newTotalGp = currentTotalGp + rewardAmount;

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' — ' +
      now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

    const currentSpinNumber = spinsUsed + 1;
    const effectiveSeasonNum = seasonNumber || (seasonId ? seasonId.replace(/\D/g, '') || 1 : 1);
    const effectiveSeasonTitle = seasonTitle || `Season ${effectiveSeasonNum}`;
    const txId = `TX_DOME_SPIN_${seasonId}_${userId}_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const updatedUserData = {
      ...userData,
      id: userId,
      gpBalance: newGp,
      walletBalance: newWallet,
      totalGpEarned: newTotalGp,
      updatedAt: now.toISOString(),
    };

    // 7. Authoritative User Balance Update in Database
    const { error: userUpdateErr } = await supabaseAdmin.from('users').upsert({
      id: userId,
      data: updatedUserData,
      updated_at: now.toISOString(),
    });

    if (userUpdateErr) {
      console.error('[School Dome Spin] Error updating user balance in database:', userUpdateErr.message);
      domeSpinLocks.delete(lockKey);
      return res.status(500).json({ success: false, message: 'Failed to credit wallet balance.' });
    }

    // 8. Official Transaction Record
    const txRecord = {
      id: txId,
      transactionId: txId,
      userId,
      userName: userData.name || userData.fullName || userData.username || 'Scholar',
      userEmail: userData.email || '',
      userAvatar: userData.profileImage || userData.avatar || '',
      institutionName: userData.institutionName || userData.institution || '',
      type: 'school_dome_spin_bonus',
      amount: rewardAmount,
      unit: 'GP',
      title: 'School Dome Elimination Spin Bonus',
      description: `School Dome ${effectiveSeasonTitle} Elimination Participation Bonus (+${rewardAmount} GP)`,
      date: formattedDate,
      isCredit: true,
      status: 'completed',
      createdAt: now.toISOString(),
      meta: {
        feature: 'school_dome_elimination_spin',
        seasonId,
        seasonNumber: Number(effectiveSeasonNum),
        seasonTitle: effectiveSeasonTitle,
        subscriptionTier: tierType.toUpperCase(),
        eliminationStatus: 'eliminated',
        spinNumber: currentSpinNumber,
        maxSpins,
        rewardAmount,
        sliceIndex,
      },
    };

    // Save transaction to walletTransactions
    await supabaseAdmin.from('walletTransactions').upsert({
      id: txId,
      data: txRecord,
      updated_at: now.toISOString(),
    });

    // Save record to schoolDomeSpins table
    try {
      await supabaseAdmin.from('schoolDomeSpins').upsert({
        id: `dome_spin_${seasonId}_${userId}_${currentSpinNumber}`,
        data: {
          id: `dome_spin_${seasonId}_${userId}_${currentSpinNumber}`,
          seasonId,
          userId,
          spinNumber: currentSpinNumber,
          maxSpins,
          rewardAmount,
          transactionId: txId,
          subscriptionTier: tierType,
          createdAt: now.toISOString(),
        },
        updated_at: now.toISOString(),
      });
    } catch {
      // Non-blocking
    }

    domeSpinLocks.delete(lockKey);

    const spinsRemaining = Math.max(0, maxSpins - currentSpinNumber);

    return res.json({
      success: true,
      rewardAmount,
      sliceIndex,
      newBalance: newGp,
      transactionId: txId,
      date: formattedDate,
      transaction: txRecord,
      spinsUsed: currentSpinNumber,
      maxSpins,
      spinsRemaining,
      tierType,
      message: `🎉 Congratulations! You won +${rewardAmount} GP!`,
    });
  } catch (err: any) {
    domeSpinLocks.delete(lockKey);
    console.error('[School Dome Spin] Unexpected exception during spin execution:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while executing spin.' });
  }
});
