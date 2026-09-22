import { Router, Request, Response } from 'express';
import { vtuProvider } from './vtuProvider';
import {
  VtuNetwork,
  VtuServiceType,
  AirtimeDataSettings,
  DEFAULT_AIRTIME_DATA_SETTINGS,
  AirtimeDataTransaction,
  AirtimeDataAuditLog,
  validateNigerianPhone,
  getAirtimeRedemptionWindowStatus,
} from '../src/lib/vtuTypes';

export const vtuRouter = Router();

// In-memory runtime state for fast lookup with persistence fallback
let currentSettings: AirtimeDataSettings = { ...DEFAULT_AIRTIME_DATA_SETTINGS };
const inMemoryTransactions = new Map<string, AirtimeDataTransaction>();
const inMemoryAuditLogs: AirtimeDataAuditLog[] = [];
const processedIdempotencyKeys = new Set<string>();

// Helper to log financial actions
function logAudit(entry: Omit<AirtimeDataAuditLog, 'id' | 'timestamp'>) {
  const log: AirtimeDataAuditLog = {
    ...entry,
    id: `vtu_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  inMemoryAuditLogs.unshift(log);
  if (inMemoryAuditLogs.length > 500) {
    inMemoryAuditLogs.pop();
  }
  return log;
}

/**
 * GET /api/vtu/settings
 * Publicly accessible VTU settings (Strictly NO secret API keys exposed!)
 */
vtuRouter.get('/settings', (_req: Request, res: Response) => {
  const redemptionWindow = getAirtimeRedemptionWindowStatus();
  return res.json({
    success: true,
    serverTime: new Date().toISOString(),
    redemptionWindow,
    settings: {
      airtimeEnabled: currentSettings.airtimeEnabled,
      dataEnabled: currentSettings.dataEnabled,
      mtnEnabled: currentSettings.mtnEnabled,
      airtelEnabled: currentSettings.airtelEnabled,
      gloEnabled: currentSettings.gloEnabled,
      nineMobileEnabled: currentSettings.nineMobileEnabled,
      gpToNgnRate: currentSettings.gpToNgnRate,
      minAirtimeNGN: currentSettings.minAirtimeNGN,
      maxAirtimeNGN: currentSettings.maxAirtimeNGN,
      minDataNGN: currentSettings.minDataNGN,
      maxDataNGN: currentSettings.maxDataNGN,
      providerEnvironment: currentSettings.providerEnvironment,
    },
  });
});

/**
 * GET /api/vtu/data-plans
 * Available data plans with calculated GP prices
 */
vtuRouter.get('/data-plans', (req: Request, res: Response) => {
  const network = (req.query.network as string)?.toUpperCase() as VtuNetwork | undefined;
  const planType = (req.query.planType || req.query.category || req.query.type) as string | undefined;
  const plans = vtuProvider.getDataPlans(network, planType);

  const rate = currentSettings.gpToNgnRate > 0 ? currentSettings.gpToNgnRate : 1.0;

  const plansWithGp = plans.map(p => ({
    ...p,
    requiredGp: Math.ceil(p.amountNGN / rate),
  }));

  return res.json({
    success: true,
    plans: plansWithGp,
    gpToNgnRate: rate,
  });
});

/**
 * POST /api/vtu/purchase
 * Core secure purchase processing endpoint
 */
vtuRouter.post('/purchase', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      userName = 'Scholar',
      userEmail = '',
      userAvatar = '',
      serviceType = 'airtime',
      network,
      phoneNumber,
      amountNGN,
      gpAmount,
      productCode,
      productName,
      idempotencyKey,
      membershipTier,
      subscriptionTier,
      isPremium,
      userRole,
      userPlan,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!network || !phoneNumber || !amountNGN || !gpAmount || !idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required purchase parameters (network, phoneNumber, amountNGN, gpAmount, idempotencyKey)',
      });
    }

    // 1. Check idempotency / replay attacks
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      // Find existing transaction
      const existing = Array.from(inMemoryTransactions.values()).find(t => t.idempotencyKey === idempotencyKey);
      if (existing) {
        return res.json({
          success: existing.status === 'SUCCESS' || existing.status === 'PENDING',
          transaction: existing,
          isDuplicate: true,
          message: `Duplicate request ignored. Current status: ${existing.status}`,
        });
      }
    }
    processedIdempotencyKeys.add(idempotencyKey);

    // 2. Authoritative Static Airtime/Data Redemption Schedule Enforcement (Free users only)
    // - PREMIUM and VIP users are completely exempt and can redeem airtime/data anytime.
    // - FREE users can only redeem during the first 15 minutes of each hour (:00 to :15).
    const mTier = String(membershipTier || '').toLowerCase();
    const sTier = String(subscriptionTier || '').toLowerCase();
    const uPlan = String(userPlan || '').toLowerCase();
    const isExempt = Boolean(
      isPremium === true ||
      mTier.includes('premium') ||
      mTier.includes('vip') ||
      mTier.includes('titan') ||
      mTier.includes('pro') ||
      mTier.includes('annual') ||
      sTier.includes('premium') ||
      sTier.includes('vip') ||
      sTier.includes('titan') ||
      sTier.includes('pro') ||
      sTier.includes('annual') ||
      uPlan.includes('premium') ||
      uPlan.includes('vip') ||
      uPlan.includes('titan') ||
      uPlan.includes('pro') ||
      uPlan.includes('annual') ||
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userRole === 'staff' ||
      userRole === 'community_manager'
    );

    if (!isExempt) {
      const windowStatus = getAirtimeRedemptionWindowStatus();
      if (!windowStatus.isOpen) {
        return res.status(403).json({
          success: false,
          code: 'REDEMPTION_WINDOW_CLOSED',
          message: 'Redemption window is closed. Free users can redeem only during the first 15 minutes of each hour. Upgrade to Premium or VIP to redeem airtime & data anytime.',
          windowStatus,
        });
      }
    }

    // 3. Validate Service & Network Settings
    if (serviceType === 'airtime' && !currentSettings.airtimeEnabled) {
      return res.status(403).json({ success: false, message: 'Airtime recharge service is currently disabled by Admin.' });
    }
    if (serviceType === 'data' && !currentSettings.dataEnabled) {
      return res.status(403).json({ success: false, message: 'Mobile data service is currently disabled by Admin.' });
    }

    const netKey = network.toUpperCase() as VtuNetwork;
    if (netKey === 'MTN' && !currentSettings.mtnEnabled) {
      return res.status(403).json({ success: false, message: 'MTN network service is temporarily unavailable.' });
    }
    if (netKey === 'AIRTEL' && !currentSettings.airtelEnabled) {
      return res.status(403).json({ success: false, message: 'Airtel network service is temporarily unavailable.' });
    }
    if (netKey === 'GLO' && !currentSettings.gloEnabled) {
      return res.status(403).json({ success: false, message: 'Glo network service is temporarily unavailable.' });
    }
    if (netKey === '9MOBILE' && !currentSettings.nineMobileEnabled) {
      return res.status(403).json({ success: false, message: '9mobile network service is temporarily unavailable.' });
    }

    // 3. Validate Phone Number
    const phoneValidation = validateNigerianPhone(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({ success: false, message: phoneValidation.error || 'Invalid Nigerian phone number format.' });
    }

    // 4. Validate Amount limits
    const numAmount = Number(amountNGN);
    const numGp = Number(gpAmount);

    if (serviceType === 'airtime') {
      if (numAmount < currentSettings.minAirtimeNGN || numAmount > currentSettings.maxAirtimeNGN) {
        return res.status(400).json({
          success: false,
          message: `Airtime amount must be between ₦${currentSettings.minAirtimeNGN.toLocaleString()} and ₦${currentSettings.maxAirtimeNGN.toLocaleString()}`,
        });
      }
    } else {
      if (numAmount < currentSettings.minDataNGN || numAmount > currentSettings.maxDataNGN) {
        return res.status(400).json({
          success: false,
          message: `Data plan amount must be between ₦${currentSettings.minDataNGN.toLocaleString()} and ₦${currentSettings.maxDataNGN.toLocaleString()}`,
        });
      }
    }

    // Expected GP calculation validation
    const expectedGp = Math.ceil(numAmount / currentSettings.gpToNgnRate);
    if (numGp < expectedGp) {
      return res.status(400).json({
        success: false,
        message: `Insufficient GP specified. Required: ${expectedGp} GP at rate 1 GP = ₦${currentSettings.gpToNgnRate}.`,
      });
    }

    // 5. Generate Authoritative Grobaax Transaction Reference
    const transactionId = `GBX_VTU_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const transactionRecord: AirtimeDataTransaction = {
      id: transactionId,
      transactionId,
      userId,
      userName,
      userEmail,
      userAvatar,
      serviceType: serviceType as VtuServiceType,
      phoneNumber: phoneValidation.formattedNumber,
      network: netKey,
      productCode,
      productName: productName || (serviceType === 'airtime' ? `${netKey} ₦${numAmount} Airtime` : `${netKey} Mobile Data`),
      amountNGN: numAmount,
      gpAmount: numGp,
      status: 'PENDING',
      provider: 'pairgate',
      idempotencyKey,
      refundStatus: 'NONE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryTransactions.set(transactionId, transactionRecord);

    logAudit({
      transactionId,
      userId,
      userName,
      action: 'GP_RESERVED',
      details: {
        amountNGN: numAmount,
        gpAmount: numGp,
        serviceType,
        network: netKey,
        phoneNumber: phoneValidation.formattedNumber,
        rate: currentSettings.gpToNgnRate,
      },
      status: 'PENDING',
    });

    // 6. Dispatch to VTU Provider Service
    let providerResult;
    if (serviceType === 'airtime') {
      providerResult = await vtuProvider.purchaseAirtime({
        network: netKey,
        phoneNumber: phoneValidation.formattedNumber,
        amountNGN: numAmount,
        reference: transactionId,
        environment: currentSettings.providerEnvironment,
      });
    } else {
      providerResult = await vtuProvider.purchaseData({
        network: netKey,
        phoneNumber: phoneValidation.formattedNumber,
        planCode: productCode || `${netKey}_DATA`,
        amountNGN: numAmount,
        reference: transactionId,
        environment: currentSettings.providerEnvironment,
      });
    }

    // 7. Process Provider Result
    if (providerResult.status === 'SUCCESS') {
      transactionRecord.status = 'SUCCESS';
      transactionRecord.providerTransactionId = providerResult.providerTransactionId;
      transactionRecord.completedAt = new Date().toISOString();
      transactionRecord.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, transactionRecord);

      logAudit({
        transactionId,
        userId,
        userName,
        action: 'TRANSACTION_SUCCESS',
        details: {
          providerTransactionId: providerResult.providerTransactionId,
          message: providerResult.message,
        },
        status: 'SUCCESS',
      });

      return res.json({
        success: true,
        status: 'SUCCESS',
        message: providerResult.message,
        transaction: transactionRecord,
      });
    } else if (providerResult.status === 'PENDING') {
      transactionRecord.status = 'PENDING';
      transactionRecord.providerTransactionId = providerResult.providerTransactionId;
      transactionRecord.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, transactionRecord);

      logAudit({
        transactionId,
        userId,
        userName,
        action: 'PROVIDER_RESPONSE_RECEIVED',
        details: {
          providerTransactionId: providerResult.providerTransactionId,
          message: providerResult.message,
        },
        status: 'PENDING',
      });

      return res.json({
        success: true,
        status: 'PENDING',
        message: providerResult.message || 'Transaction is being processed by the telecom network.',
        transaction: transactionRecord,
      });
    } else {
      // Failed - Trigger Automatic GP Refund
      transactionRecord.status = 'FAILED';
      transactionRecord.failureReason = providerResult.message || 'Provider or operator error';
      transactionRecord.refundStatus = 'REFUNDED';
      transactionRecord.refundTransactionId = `REF_${transactionId}`;
      transactionRecord.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, transactionRecord);

      logAudit({
        transactionId,
        userId,
        userName,
        action: 'GP_REFUNDED',
        details: {
          failureReason: transactionRecord.failureReason,
          refundedGp: numGp,
          refundTransactionId: transactionRecord.refundTransactionId,
        },
        status: 'REFUNDED',
      });

      return res.status(400).json({
        success: false,
        status: 'FAILED',
        message: providerResult.message || 'Recharge failed. Your GP balance has been fully refunded.',
        transaction: transactionRecord,
        refunded: true,
        refundedGp: numGp,
      });
    }
  } catch (err: any) {
    console.error('VTU Purchase Endpoint Exception:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing telecom recharge: ' + (err?.message || 'Unknown error'),
    });
  }
});

/**
 * POST /api/vtu/requery
 * Manual or automated re-verification of pending transaction
 */
vtuRouter.post('/requery', async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    const tx = inMemoryTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction record not found' });
    }

    if (tx.status === 'SUCCESS' || tx.status === 'REFUNDED') {
      return res.json({
        success: true,
        status: tx.status,
        message: `Transaction is already finalized with status: ${tx.status}`,
        transaction: tx,
      });
    }

    const queryResult = await vtuProvider.requeryTransaction({
      providerTransactionId: tx.providerTransactionId,
      reference: tx.transactionId,
      environment: currentSettings.providerEnvironment,
    });

    if (queryResult.status === 'SUCCESS') {
      tx.status = 'SUCCESS';
      tx.completedAt = new Date().toISOString();
      tx.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, tx);

      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: 'TRANSACTION_SUCCESS',
        details: { requeryMessage: queryResult.message },
        status: 'SUCCESS',
      });
    } else if (queryResult.status === 'FAILED') {
      tx.status = 'FAILED';
      tx.refundStatus = 'REFUNDED';
      tx.failureReason = queryResult.message;
      tx.refundTransactionId = `REF_${transactionId}`;
      tx.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, tx);

      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: 'GP_REFUNDED',
        details: { requeryFailedReason: queryResult.message, refundedGp: tx.gpAmount },
        status: 'REFUNDED',
      });
    }

    return res.json({
      success: true,
      status: tx.status,
      message: queryResult.message,
      transaction: tx,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Requery failed: ' + (err?.message || 'Server error'),
    });
  }
});

/**
 * GET /api/vtu/admin/overview
 * Admin analytics, provider health, balance & metrics
 */
vtuRouter.get('/admin/overview', async (_req: Request, res: Response) => {
  try {
    const balanceInfo = await vtuProvider.getProviderBalance(currentSettings.providerEnvironment);
    const allTxs = Array.from(inMemoryTransactions.values());

    const successfulTxs = allTxs.filter(t => t.status === 'SUCCESS');
    const pendingTxs = allTxs.filter(t => t.status === 'PENDING');
    const failedTxs = allTxs.filter(t => t.status === 'FAILED' || t.status === 'REFUNDED');

    const totalNgn = successfulTxs.reduce((acc, t) => acc + t.amountNGN, 0);
    const totalGp = successfulTxs.reduce((acc, t) => acc + t.gpAmount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTxs = successfulTxs.filter(t => typeof t.createdAt === 'string' && t.createdAt.startsWith(todayStr));
    const todayNgn = todayTxs.reduce((acc, t) => acc + t.amountNGN, 0);
    const todayGp = todayTxs.reduce((acc, t) => acc + t.gpAmount, 0);

    return res.json({
      success: true,
      stats: {
        provider: 'Pairgate VTU Gateway',
        environment: currentSettings.providerEnvironment,
        providerConnected: balanceInfo.success,
        providerBalanceNGN: balanceInfo.balanceNGN,
        totalTransactions: allTxs.length,
        successfulTransactions: successfulTxs.length,
        pendingTransactions: pendingTxs.length,
        failedTransactions: failedTxs.length,
        totalNgnProcessed: totalNgn,
        totalGpRedeemed: totalGp,
        todayTransactionsCount: todayTxs.length,
        todayNgnProcessed: todayNgn,
        todayGpRedeemed: todayGp,
      },
      settings: currentSettings,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to load admin overview' });
  }
});

/**
 * GET & POST /api/vtu/admin/sync-provider
 * Explicit provider synchronization endpoint for live wallet balance and status
 */
const syncProviderHandler = async (_req: Request, res: Response) => {
  try {
    const balanceInfo = await vtuProvider.getProviderBalance(currentSettings.providerEnvironment);
    return res.json({
      success: true,
      message: 'Pairgate provider wallet synchronized successfully',
      environment: currentSettings.providerEnvironment,
      provider: 'Pairgate VTU Gateway',
      providerConnected: balanceInfo.success,
      providerBalanceNGN: balanceInfo.balanceNGN,
      balanceNGN: balanceInfo.balanceNGN,
      currency: balanceInfo.currency || 'NGN',
      retrievedAt: balanceInfo.retrievedAt || new Date().toISOString(),
      balanceInfo,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to sync provider balance',
    });
  }
};

vtuRouter.get('/admin/sync-provider', syncProviderHandler);
vtuRouter.post('/admin/sync-provider', syncProviderHandler);
vtuRouter.get('/admin/balance', syncProviderHandler);
vtuRouter.get('/balance', syncProviderHandler);

/**
 * POST /api/vtu/admin/settings
 * Admin settings update
 */
vtuRouter.post('/admin/settings', (req: Request, res: Response) => {
  try {
    const newSettings = req.body || {};

    const prevRate = currentSettings.gpToNgnRate;
    const prevEnv = currentSettings.providerEnvironment;

    currentSettings = {
      ...currentSettings,
      ...newSettings,
      gpToNgnRate: Number(newSettings.gpToNgnRate) > 0 ? Number(newSettings.gpToNgnRate) : currentSettings.gpToNgnRate,
      minAirtimeNGN: Number(newSettings.minAirtimeNGN) || currentSettings.minAirtimeNGN,
      maxAirtimeNGN: Number(newSettings.maxAirtimeNGN) || currentSettings.maxAirtimeNGN,
      minDataNGN: Number(newSettings.minDataNGN) || currentSettings.minDataNGN,
      maxDataNGN: Number(newSettings.maxDataNGN) || currentSettings.maxDataNGN,
      updatedAt: new Date().toISOString(),
      updatedBy: req.body.adminName || 'Super Admin',
    };

    logAudit({
      action: 'ADMIN_SETTINGS_CHANGED',
      details: {
        changes: newSettings,
        rateChangedFrom: prevRate !== currentSettings.gpToNgnRate ? `${prevRate} -> ${currentSettings.gpToNgnRate}` : undefined,
        envChangedFrom: prevEnv !== currentSettings.providerEnvironment ? `${prevEnv} -> ${currentSettings.providerEnvironment}` : undefined,
      },
      status: 'UPDATED',
    });

    return res.json({
      success: true,
      message: 'Airtime & Mobile Data settings updated successfully',
      settings: currentSettings,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update settings' });
  }
});

/**
 * GET /api/vtu/admin/transactions
 * Admin transaction ledger search & filtering
 */
vtuRouter.get('/admin/transactions', (req: Request, res: Response) => {
  try {
    const { search = '', status = 'ALL', network = 'ALL', serviceType = 'ALL', page = '1', limit = '50' } = req.query as Record<string, string>;

    let txs = Array.from(inMemoryTransactions.values());

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      txs = txs.filter(t =>
        t.transactionId.toLowerCase().includes(q) ||
        (t.providerTransactionId && t.providerTransactionId.toLowerCase().includes(q)) ||
        t.phoneNumber.includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.userId.toLowerCase().includes(q) ||
        (t.userEmail && t.userEmail.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (status !== 'ALL') {
      txs = txs.filter(t => t.status === status);
    }

    // Network filter
    if (network !== 'ALL') {
      txs = txs.filter(t => t.network === network);
    }

    // Service filter
    if (serviceType !== 'ALL') {
      txs = txs.filter(t => t.serviceType === serviceType);
    }

    // Sort newest first
    txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const totalCount = txs.length;
    const paginated = txs.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    return res.json({
      success: true,
      transactions: paginated,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to list transactions' });
  }
});

/**
 * GET /api/vtu/admin/audit-logs
 * Real-time audit logs feed for security & reconciliation
 */
vtuRouter.get('/admin/audit-logs', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    logs: inMemoryAuditLogs,
  });
});

/**
 * POST /api/vtu/admin/reconcile
 * Force reconciliation action
 */
vtuRouter.post('/admin/reconcile', async (req: Request, res: Response) => {
  try {
    const { transactionId, manualStatus, adminNotes } = req.body || {};
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    const tx = inMemoryTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const oldStatus = tx.status;
    if (manualStatus && ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'].includes(manualStatus)) {
      tx.status = manualStatus;
      if (manualStatus === 'REFUNDED') {
        tx.refundStatus = 'REFUNDED';
        tx.refundTransactionId = `MANUAL_REF_${transactionId}`;
      }
      tx.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, tx);

      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: 'TRANSACTION_RECONCILED',
        details: {
          oldStatus,
          newStatus: manualStatus,
          adminNotes: adminNotes || 'Manual status override by administrator',
        },
        status: manualStatus,
      });

      return res.json({
        success: true,
        message: `Transaction ${transactionId} status updated to ${manualStatus}`,
        transaction: tx,
      });
    }

    // Otherwise auto-requery
    const queryResult = await vtuProvider.requeryTransaction({
      providerTransactionId: tx.providerTransactionId,
      reference: tx.transactionId,
      environment: currentSettings.providerEnvironment,
    });

    if (queryResult.status !== oldStatus) {
      tx.status = queryResult.status;
      tx.updatedAt = new Date().toISOString();
      inMemoryTransactions.set(transactionId, tx);

      logAudit({
        transactionId,
        userId: tx.userId,
        userName: tx.userName,
        action: 'TRANSACTION_RECONCILED',
        details: {
          oldStatus,
          newStatus: queryResult.status,
          providerResponse: queryResult.rawResponse,
        },
        status: queryResult.status,
      });
    }

    return res.json({
      success: true,
      message: `Reconciled: ${queryResult.message}`,
      transaction: tx,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Reconciliation failed' });
  }
});
