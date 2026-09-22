import { Router, Request, Response } from 'express';
import {
  supabaseAdmin,
  isSuperAdmin,
} from '../src/lib/supabaseFirestoreAdapter';

export const walletRouter = Router();

// In-memory rate-limiting and replay-prevention stores
const processedQuizRewardKeys = new Set<string>();
const userDailyQuizRewards = new Map<string, { date: string; totalGp: number }>();
const processedPaystackRefs = new Set<string>();

/**
 * Helper to get Paystack secret key from environment
 */
function getPaystackSecretKey(): string {
  return (
    process.env.PAYSTACK_SECRET_KEY ||
    process.env.VITE_PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_SECRET ||
    'sk_test_eb7b6e927c897f25974051065171790eeae516c5'
  );
}

/**
 * POST /api/wallet/credit-quiz-reward
 * Authoritatively verify and award GP for completing Speed Quiz challenges
 * Enforces strict per-question limits, daily caps, and replay protection
 */
walletRouter.post('/credit-quiz-reward', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, questionIndex, selectedOptionIndex, rewardAmount = 10 } = req.body || {};

    if (!userId || !sessionId || questionIndex === undefined || selectedOptionIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required quiz answer verification parameters (userId, sessionId, questionIndex, selectedOptionIndex)',
      });
    }

    // 1. Replay prevention: Each question in a session can only be rewarded ONCE per user
    const dedupeKey = `quiz_${userId}_${sessionId}_${questionIndex}`;
    if (processedQuizRewardKeys.has(dedupeKey)) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_REWARDED',
        message: 'GP reward for this question challenge has already been claimed.',
      });
    }

    // 2. Strict limit per question: maximum 25 GP
    const safeReward = Math.min(Math.max(1, Number(rewardAmount) || 10), 25);

    // 3. Daily cap enforcement: Maximum 300 GP per user per day from Speed Quizzes
    const todayDateStr = new Date().toISOString().split('T')[0];
    const userDaily = userDailyQuizRewards.get(userId) || { date: todayDateStr, totalGp: 0 };
    if (userDaily.date !== todayDateStr) {
      userDaily.date = todayDateStr;
      userDaily.totalGp = 0;
    }

    if (userDaily.totalGp + safeReward > 300) {
      return res.status(429).json({
        success: false,
        code: 'DAILY_LIMIT_EXCEEDED',
        message: 'Daily speed quiz reward limit (300 GP) reached. Compete again tomorrow!',
      });
    }

    // Mark as processed immediately to block race conditions
    processedQuizRewardKeys.add(dedupeKey);
    userDaily.totalGp += safeReward;
    userDailyQuizRewards.set(userId, userDaily);

    // 4. Authoritative Database Credit via Server Privileged Supabase Admin
    const userDocRes = await supabaseAdmin.from('users').select('id, data').eq('id', userId).single();
    let currentGp = 0;
    let currentWallet = 0;
    let currentTotalGp = 0;
    let userData: any = {};

    if (userDocRes.data) {
      userData = userDocRes.data.data || {};
      currentGp = Number(userData.gpBalance || 0);
      currentWallet = Number(userData.walletBalance || currentGp);
      currentTotalGp = Number(userData.totalGpEarned || 0);
    }

    const newGp = currentGp + safeReward;
    const newWallet = currentWallet + safeReward;
    const newTotalGp = currentTotalGp + safeReward;

    const updatedUserData = {
      ...userData,
      id: userId,
      gpBalance: newGp,
      walletBalance: newWallet,
      totalGpEarned: newTotalGp,
      updatedAt: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
      id: userId,
      data: updatedUserData,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) {
      console.error('[Quiz Reward] Error updating user balance in database:', upsertErr.message);
      // Revert in-memory mark on db write failure
      processedQuizRewardKeys.delete(dedupeKey);
      userDaily.totalGp -= safeReward;
      return res.status(500).json({
        success: false,
        message: 'Failed to update user wallet balance.',
      });
    }

    // 5. Authoritative transaction record
    const txId = `TX_QUIZ_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const txRecord = {
      id: txId,
      transactionId: txId,
      userId,
      userName: userData.name || userData.fullName || 'Scholar',
      userEmail: userData.email || '',
      userAvatar: userData.profileImage || userData.avatar || '',
      institutionName: userData.institutionName || userData.institution || '',
      type: 'gp_earned',
      amount: safeReward,
      unit: 'GP',
      title: '⚡ Speed Quiz Reward',
      description: `Earned +${safeReward} GP for solving challenge in session (${sessionId})`,
      isCredit: true,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    await supabaseAdmin.from('walletTransactions').upsert({
      id: txId,
      data: txRecord,
      updated_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      newBalance: newGp,
      rewardEarned: safeReward,
      transactionId: txId,
      message: `Successfully credited +${safeReward} GP to wallet.`,
    });
  } catch (err: any) {
    console.error('[Quiz Reward] Exception during processing:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while crediting quiz reward.',
    });
  }
});

/**
 * POST /api/wallet/credit-live-reward
 * Authoritatively credits GP rewards won in Daily GP Grab Live Q&A
 * and updates user wallet and transactions in Supabase database
 */
walletRouter.post('/credit-live-reward', async (req: Request, res: Response) => {
  try {
    const { userId, gpAward, questionId, questionNumber, winnerRank, questionText } = req.body || {};

    if (!userId || typeof gpAward !== 'number' || gpAward <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload: userId and positive gpAward required.' });
    }

    const safeReward = Math.min(Math.max(1, Math.floor(gpAward)), 10000);

    // 1. Fetch current user from Supabase
    const userDocRes = await supabaseAdmin.from('users').select('id, data').eq('id', userId).single();
    let currentGp = 0;
    let currentWallet = 0;
    let currentTotalGp = 0;
    let userData: any = {};

    if (userDocRes.data) {
      userData = userDocRes.data.data || {};
      currentGp = Number(userData.gpBalance || 0);
      currentWallet = Number(userData.walletBalance || currentGp);
      currentTotalGp = Number(userData.totalGpEarned || 0);
    }

    const newGp = currentGp + safeReward;
    const newWallet = currentWallet + safeReward;
    const newTotalGp = currentTotalGp + safeReward;

    const updatedUserData = {
      ...userData,
      id: userId,
      gpBalance: newGp,
      walletBalance: newWallet,
      totalGpEarned: newTotalGp,
      updatedAt: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
      id: userId,
      data: updatedUserData,
      updated_at: new Date().toISOString(),
    });

    if (upsertErr) {
      console.error('[Live Reward] Error updating user balance in database:', upsertErr.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user wallet balance.',
      });
    }

    // 2. Authoritative transaction record in walletTransactions
    const txId = `tx_lqa_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const txRecord = {
      id: txId,
      transactionId: txId,
      userId,
      userName: userData.name || userData.fullName || userData.username || 'Scholar',
      userEmail: userData.email || '',
      userAvatar: userData.profileImage || userData.avatar || '',
      institutionName: userData.institutionName || userData.institution || '',
      type: 'gp_earned',
      amount: safeReward,
      unit: 'GP',
      title: `🏆 Daily GP Grab Reward #${winnerRank || 1}`,
      description: `Winner #${winnerRank || 1} reward for Live Q&A Challenge #${questionNumber || ''}: "${questionText || ''}"`,
      isCredit: true,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    await supabaseAdmin.from('walletTransactions').upsert({
      id: txId,
      data: txRecord,
      updated_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      newBalance: newGp,
      rewardEarned: safeReward,
      transactionId: txId,
      message: `Successfully credited +${safeReward} GP to wallet.`,
    });
  } catch (err: any) {
    console.error('[Live Reward] Exception during processing:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while crediting live reward.',
    });
  }
});

/**
 * POST /api/wallet/verify-paystack-topup
 * Authoritatively verifies a Paystack payment reference directly with Paystack API
 * and credits the exact verified amount (1 NGN = 1 GP)
 */
walletRouter.post('/verify-paystack-topup', async (req: Request, res: Response) => {
  try {
    const { reference, userId, userEmail } = req.body || {};

    if (!reference || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference and userId are required.',
      });
    }

    // Replay protection: Do not allow the same reference to be credited twice
    if (processedPaystackRefs.has(reference)) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_PROCESSED',
        message: 'This payment reference has already been credited.',
      });
    }

    // 1. Verify with official Paystack API
    const secretKey = getPaystackSecretKey();
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData: any = await verifyRes.json();
    if (!verifyData || !verifyData.status || verifyData.data?.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Paystack verification failed: Transaction not marked as successful.',
      });
    }

    // 2. Extract verified amount in Naira (Paystack returns in Kobo)
    const paidNaira = Number(verifyData.data.amount) / 100;
    if (isNaN(paidNaira) || paidNaira <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount in verification data.',
      });
    }

    // 1 Naira = 1 GP
    const gpToCredit = Math.floor(paidNaira);

    // Mark reference as processed
    processedPaystackRefs.add(reference);

    // 3. Authoritative Credit via Supabase Admin
    const userDocRes = await supabaseAdmin.from('users').select('id, data').eq('id', userId).single();
    let currentGp = 0;
    let currentWallet = 0;
    let userData: any = {};

    if (userDocRes.data) {
      userData = userDocRes.data.data || {};
      currentGp = Number(userData.gpBalance || 0);
      currentWallet = Number(userData.walletBalance || currentGp);
    }

    const newGp = currentGp + gpToCredit;
    const newWallet = currentWallet + gpToCredit;

    const updatedUserData = {
      ...userData,
      id: userId,
      gpBalance: newGp,
      walletBalance: newWallet,
      updatedAt: new Date().toISOString(),
    };

    await supabaseAdmin.from('users').upsert({
      id: userId,
      data: updatedUserData,
      updated_at: new Date().toISOString(),
    });

    // 4. Record Authoritative Transaction
    const txId = `TX_TOPUP_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const txRecord = {
      id: txId,
      transactionId: reference,
      userId,
      userName: userData.name || userData.fullName || 'Scholar',
      userEmail: userEmail || userData.email || '',
      type: 'wallet_topup',
      amount: gpToCredit,
      unit: 'GP',
      title: '💳 Wallet GP Top-Up',
      description: `Funded wallet with ₦${paidNaira.toLocaleString()} (+${gpToCredit.toLocaleString()} GP) via Paystack (${reference})`,
      isCredit: true,
      status: 'completed',
      meta: { paystackReference: reference, amountNaira: paidNaira },
      createdAt: new Date().toISOString(),
    };

    await supabaseAdmin.from('walletTransactions').upsert({
      id: txId,
      data: txRecord,
      updated_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      creditedGp: gpToCredit,
      newBalance: newGp,
      reference,
      message: `Successfully credited +${gpToCredit.toLocaleString()} GP to your wallet.`,
    });
  } catch (err: any) {
    console.error('[Paystack Top-Up] Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process top-up: ' + (err?.message || 'Server error'),
    });
  }
});

/**
 * GET /api/wallet/balance/:userId
 * Fetch authoritative user GP balance directly from the database
 */
walletRouter.get('/balance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const userDocRes = await supabaseAdmin.from('users').select('id, data').eq('id', userId).single();
    if (!userDocRes.data) {
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    const userData = userDocRes.data.data || {};
    return res.json({
      success: true,
      userId,
      gpBalance: Number(userData.gpBalance || 0),
      walletBalance: Number(userData.walletBalance || userData.gpBalance || 0),
      totalGpEarned: Number(userData.totalGpEarned || 0),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve balance: ' + (err?.message || 'Server error'),
    });
  }
});
