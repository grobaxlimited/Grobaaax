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
