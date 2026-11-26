import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../src/lib/supabase';
import { requireAuth, requireAdmin } from './utils/authMiddleware';
import {
  dispatchExternalPush,
  getPublicPushConfig,
  getPushConfigurationStatus,
  getUserPushPreferences,
  listUserPushDevices,
  registerUserPushDevice,
  removeUserPushDevice,
  resolvePushCategory,
  unregisterUserPushDeviceByToken,
  updateUserPushPreferences,
} from './pushService';

export const notificationsRouter = express.Router();

function isAdminRole(role?: string | null): boolean {
  const r = String(role || '').toLowerCase();
  return (
    r === 'admin' ||
    r === 'super_admin' ||
    r === 'moderator' ||
    r === 'manager'
  );
}

async function resolveCallerUserId(req: Request): Promise<string> {
  const explicit = String(
    req.body?.userId || req.query?.userId || ''
  ).trim();
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data?.user?.id) {
          return data.user.id;
        }
      } catch {}
    }
  }
  return explicit;
}

/**
 * POST /api/notifications/mark-read
 * Authoritatively persists notification read state both:
 * 1) On each `notifications` row (`readByUserIds`, `readBy[uid]`, and `isRead: true` for user-targeted rows)
 * 2) On the user's `users.data.readNotificationIds` array so logout/login on ANY device preserves read state.
 */
notificationsRouter.post('/mark-read', async (req: Request, res: Response) => {
  try {
    const userId = await resolveCallerUserId(req);
    if (!userId || userId === 'guest') {
      return res.json({ success: true, skipped: true });
    }

    const rawIds: string[] = Array.isArray(req.body?.notificationIds)
      ? req.body.notificationIds.map((x: any) => String(x || '').trim()).filter(Boolean)
      : [];
    const rawFps: string[] = Array.isArray(req.body?.fingerprints)
      ? req.body.fingerprints.map((x: any) => String(x || '').trim().toLowerCase()).filter(Boolean)
      : [];

    const uniqueIds = Array.from(new Set(rawIds));
    const nowIso = new Date().toISOString();

    if (uniqueIds.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from('notifications')
        .select('id, data')
        .in('id', uniqueIds);

      if (rows && rows.length > 0) {
        await Promise.all(
          rows.map(async (row: any) => {
            const existingData = (row.data && typeof row.data === 'object') ? row.data : {};
            const existingReadBy =
              existingData.readBy && typeof existingData.readBy === 'object'
                ? existingData.readBy
                : {};
            const existingReadList: string[] = Array.isArray(existingData.readByUserIds)
              ? existingData.readByUserIds.map((x: any) => String(x))
              : [];

            const nextReadList = Array.from(new Set([...existingReadList, userId]));
            const nextReadBy = { ...existingReadBy, [userId]: true };

            const rowTarget = existingData.targetUserId || existingData.userId;
            const isDirectToCaller =
              Boolean(rowTarget) && String(rowTarget).trim() === userId;

            const updatedData: Record<string, any> = {
              ...existingData,
              id: row.id,
              readBy: nextReadBy,
              readByUserIds: nextReadList,
              updatedAt: nowIso,
            };

            // Direct user-scoped notifications also get global isRead = true
            if (isDirectToCaller) {
              updatedData.isRead = true;
            }

            await supabaseAdmin
              .from('notifications')
              .update({
                data: updatedData,
                updated_at: nowIso,
              })
              .eq('id', row.id);
          })
        );
      }
    }

    // Persist on user's profile row so cross-device logins always retain read status
    const keysToStore = Array.from(new Set([...uniqueIds, ...rawFps]));
    if (keysToStore.length > 0) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('id, data')
        .eq('id', userId)
        .maybeSingle();

      if (userRow) {
        const userData = (userRow.data && typeof userRow.data === 'object') ? userRow.data : {};
        const prevReadIds: string[] = Array.isArray(userData.readNotificationIds)
          ? userData.readNotificationIds.map((x: any) => String(x))
          : [];
        const merged = Array.from(new Set([...prevReadIds, ...keysToStore])).slice(-600);

        await supabaseAdmin
          .from('users')
          .update({
            data: {
              ...userData,
              readNotificationIds: merged,
              updatedAt: nowIso,
            },
            updated_at: nowIso,
          })
          .eq('id', userId);
      }
    }

    return res.json({ success: true, persistedCount: uniqueIds.length });
  } catch (err: any) {
    console.warn('[NotificationsRouter] mark-read error:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to mark read' });
  }
});

/**
 * POST /api/notifications/section-read
 * Persists per-section lastRead timestamp to user's DB profile so clearing/reading a nav section
 * survives logout/login and cross-device switches.
 */
notificationsRouter.post('/section-read', async (req: Request, res: Response) => {
  try {
    const userId = await resolveCallerUserId(req);
    const sectionKey = String(req.body?.sectionKey || '').trim();
    const readAt = Number(req.body?.readAt) || Date.now();
    if (!userId || userId === 'guest' || !sectionKey) {
      return res.json({ success: true, skipped: true });
    }

    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle();

    if (userRow) {
      const userData = (userRow.data && typeof userRow.data === 'object') ? userRow.data : {};
      const existingMap: Record<string, number> =
        userData.sectionReadState && typeof userData.sectionReadState === 'object'
          ? { ...userData.sectionReadState }
          : {};

      const nextMap: Record<string, number> = {
        ...existingMap,
        [sectionKey]: Math.max(Number(existingMap[sectionKey] || 0), readAt),
      };

      if (sectionKey === 'community' || sectionKey === 'admin_community') {
        ['community', 'user', 'minimart', 'announcements', 'campus', 'admin_community'].forEach((k) => {
          nextMap[k] = Math.max(Number(nextMap[k] || 0), readAt);
        });
      } else if (sectionKey.startsWith('admin_')) {
        const stripped = sectionKey.replace(/^admin_/, '');
        nextMap[stripped] = Math.max(Number(nextMap[stripped] || 0), readAt);
      } else {
        nextMap[`admin_${sectionKey}`] = Math.max(Number(nextMap[`admin_${sectionKey}`] || 0), readAt);
      }

      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from('users')
        .update({
          data: {
            ...userData,
            sectionReadState: nextMap,
            updatedAt: nowIso,
          },
          updated_at: nowIso,
        })
        .eq('id', userId);
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.warn('[NotificationsRouter] section-read error:', err?.message || err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to save section read state' });
  }
});

/**
 * GET /api/notifications/live-summary
 * Provides lightweight live timestamps & pending review counts for:
 * - Student School Blog notification badge
 * - Admin Portal section badges (Corporate Advertising Portal, School Blogger Management, etc.)
 */
notificationsRouter.get('/live-summary', async (req: Request, res: Response) => {
  try {
    const isAdminFlag =
      String(req.query?.isAdmin || '').toLowerCase() === 'true' ||
      isAdminRole(String(req.query?.role || ''));

    if (!isAdminFlag) {
      return res.json({
        success: true,
        schoolBlogArticles: [],
      });
    }

    const { data: publishedArticles } = await supabaseAdmin
      .from('school_blog_articles')
      .select('id, author_user_id, blog_institution_id, institution_name, published_at, updated_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(40);

    const schoolBlogArticles = (publishedArticles || []).map((a: any) => ({
      id: a.id,
      authorUserId: a.author_user_id,
      blogInstitutionId: a.blog_institution_id,
      institutionName: a.institution_name,
      publishedAt: a.published_at || a.updated_at || a.created_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));

    const [
      pendingCompaniesRes,
      recentCompaniesRes,
      pendingCampaignsRes,
      pendingTickersRes,
      recentPaymentsRes,
      pendingBlogAppsRes,
      openBlogReportsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from('corporate_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending'),
      supabaseAdmin
        .from('corporate_accounts')
        .select('id, status, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(15),
      supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending Review'),
      supabaseAdmin
        .from('corporate_ticker_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending Review'),
      supabaseAdmin
        .from('corporate_payments')
        .select('id, status, paid_at, created_at')
        .eq('status', 'success')
        .order('paid_at', { ascending: false })
        .limit(15),
      supabaseAdmin
        .from('school_blogger_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending'),
      supabaseAdmin
        .from('school_blog_reports')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'pending', 'Open', 'Pending']),
    ]);

    const corporateRecentActivityTimestamps: string[] = [];
    (recentCompaniesRes.data || []).forEach((c: any) => {
      if (c.status && c.status !== 'Pending' && (c.created_at || c.updated_at)) {
        corporateRecentActivityTimestamps.push(c.created_at || c.updated_at);
      }
    });
    (recentPaymentsRes.data || []).forEach((p: any) => {
      if (p.paid_at || p.created_at) {
        corporateRecentActivityTimestamps.push(p.paid_at || p.created_at);
      }
    });

    const blogRecentArticleTimestamps = schoolBlogArticles
      .map((a: any) => a.publishedAt || a.createdAt)
      .filter(Boolean);

    return res.json({
      success: true,
      schoolBlogArticles,
      adminQueues: {
        corporatePendingCompanies: Number(pendingCompaniesRes.count || 0),
        corporatePendingCampaigns: Number(pendingCampaignsRes.count || 0),
        corporatePendingTickers: Number(pendingTickersRes.count || 0),
        corporatePendingPayments: 0,
        corporateRecentActivityTimestamps,
        blogPendingApplications: Number(pendingBlogAppsRes.count || 0),
        blogOpenReports: Number(openBlogReportsRes.count || 0),
        blogRecentArticleTimestamps,
      },
    });
  } catch (err: any) {
    console.warn('[NotificationsRouter] live-summary error:', err?.message || err);
    return res.json({ success: false, schoolBlogArticles: [] });
  }
});

// ============================================================================
// EXTERNAL WEB PUSH NOTIFICATIONS (FCM) ROUTES
// ============================================================================

/**
 * GET /api/notifications/push-config
 * Returns non-secret Firebase Messaging client configuration and readiness status.
 */
notificationsRouter.get('/push-config', (_req: Request, res: Response) => {
  try {
    const cfg = getPublicPushConfig();
    return res.json({
      success: true,
      ...cfg,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to read push configuration.',
    });
  }
});

/**
 * POST /api/notifications/devices/register
 * Registers or refreshes an authenticated user's FCM device token.
 */
notificationsRouter.post('/devices/register', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { token, platform, browser, deviceLabel, userAgent, isStandalone } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Device registration token is required.' });
    }

    const device = await registerUserPushDevice({
      userId: authUser.id,
      token,
      platform,
      browser,
      deviceLabel,
      userAgent: userAgent || String(req.headers['user-agent'] || ''),
      isStandalone: Boolean(isStandalone),
    });

    return res.json({
      success: true,
      device,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'Failed to register push device.',
    });
  }
});

/**
 * GET /api/notifications/devices
 * Lists authenticated user's own registered push devices.
 */
notificationsRouter.get('/devices', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const currentToken = String(req.query?.currentToken || '').trim();
    const devices = await listUserPushDevices(authUser.id, currentToken);
    return res.json({
      success: true,
      devices,
      pushStatus: getPushConfigurationStatus(),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to load registered devices.',
    });
  }
});

/**
 * DELETE /api/notifications/devices/:deviceId
 * Removes a specific registered device belonging to the authenticated user.
 */
notificationsRouter.delete('/devices/:deviceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const deviceId = String(req.params.deviceId || '').trim();
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'Device ID is required.' });
    }

    const removed = await removeUserPushDevice(authUser.id, deviceId);
    if (!removed) {
      return res.status(404).json({ success: false, error: 'Device not found for this account.' });
    }

    return res.json({ success: true, removed: true });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to remove device.',
    });
  }
});

/**
 * POST /api/notifications/devices/unregister
 * Unregisters a token on sign-out or explicit browser disable.
 */
notificationsRouter.post('/devices/unregister', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required.' });
    }
    const removed = await unregisterUserPushDeviceByToken(authUser.id, token);
    return res.json({ success: true, removed });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to unregister push token.',
    });
  }
});

/**
 * GET /api/notifications/preferences
 */
notificationsRouter.get('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const preferences = await getUserPushPreferences(authUser.id);
    return res.json({
      success: true,
      preferences,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to load push notification preferences.',
    });
  }
});

/**
 * PUT /api/notifications/preferences
 */
notificationsRouter.put('/preferences', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const { pushEnabled, categories } = req.body || {};
    const preferences = await updateUserPushPreferences(authUser.id, {
      ...(typeof pushEnabled === 'boolean' ? { pushEnabled } : {}),
      ...(categories && typeof categories === 'object' ? { categories } : {}),
    });
    return res.json({
      success: true,
      preferences,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to save notification preferences.',
    });
  }
});

/**
 * POST /api/notifications/test-self
 * Sends a test push notification strictly to the authenticated caller's own registered devices.
 */
notificationsRouter.post('/test-self', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const pushResult = await dispatchExternalPush({
      eventType: 'self_test',
      category: 'system',
      title: 'Grobaax Push Notifications Active',
      body: 'Your device is configured to receive important Grobaax updates.',
      actionUrl: '/home',
      recipientUserId: authUser.id,
      dedupeKey: `self_test_${authUser.id}_${Math.floor(Date.now() / 5000)}`,
    });

    return res.json({
      success: true,
      pushResult,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to test push notification.',
    });
  }
});

/**
 * POST /api/notifications/admin-broadcast
 * Admin-only authoritative announcement dispatcher:
 * - Saves in-app notification row in Supabase `notifications`
 * - Dispatches FCM external push notifications respecting preferences & eligibility
 */
notificationsRouter.post('/admin-broadcast', requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminUser = req.authUser!;
    const {
      title,
      message,
      type = 'announcement',
      targetRole = 'ALL',
      targetUserId,
      actionUrl,
      sendExternalPush = true,
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    const cleanMessage = String(message || '').trim();
    if (!cleanTitle || !cleanMessage) {
      return res.status(400).json({
        success: false,
        error: 'Notification title and message are required.',
      });
    }

    let resolvedTargetUserId = String(targetUserId || '').trim();
    if (resolvedTargetUserId.startsWith('@')) {
      const handle = resolvedTargetUserId.toLowerCase();
      const { data: matchedUsers } = await supabaseAdmin
        .from('users')
        .select('id, data')
        .limit(300);
      const found = (matchedUsers || []).find((row: any) => {
        const u = row.data || {};
        const un = String(u.username || '').toLowerCase();
        const normUn = un.startsWith('@') ? un : `@${un}`;
        return normUn === handle || un === handle.slice(1);
      });
      if (!found) {
        return res.status(404).json({
          success: false,
          error: `Scholar with username ${resolvedTargetUserId} was not found.`,
        });
      }
      resolvedTargetUserId = found.id;
    }

    const notifId = `notif_admin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    const resolvedActionUrl =
      String(actionUrl || '').trim() ||
      (type === 'dome'
        ? 'school_dome'
        : type === 'gus'
        ? 'gus'
        : type === 'league'
        ? 'league'
        : type === 'wallet'
        ? 'wallet'
        : '/home');

    const notifData = {
      id: notifId,
      title: cleanTitle,
      message: cleanMessage,
      type,
      targetRole: resolvedTargetUserId ? undefined : targetRole || 'ALL',
      userId: resolvedTargetUserId || null,
      targetUserId: resolvedTargetUserId || null,
      actionUrl: resolvedActionUrl,
      isRead: false,
      senderAdminUid: adminUser.id,
      senderAdminName: adminUser.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMillis: Date.now(),
      createdAt: nowIso,
    };

    const { error: insertErr } = await supabaseAdmin.from('notifications').upsert(
      {
        id: notifId,
        data: notifData,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

    if (insertErr) {
      return res.status(500).json({
        success: false,
        error: insertErr.message || 'Failed to save broadcast notification.',
      });
    }

    // Record audit log
    try {
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await supabaseAdmin.from('auditLogs').upsert(
        {
          id: auditId,
          data: {
            id: auditId,
            adminUid: adminUser.id,
            adminName: adminUser.name,
            action: 'DISPATCH_BROADCAST_NOTIFICATION',
            targetId: notifId,
            details: {
              title: cleanTitle,
              type,
              targetRole: resolvedTargetUserId ? 'DIRECT_USER' : targetRole || 'ALL',
              targetUserId: resolvedTargetUserId || null,
              sendExternalPush: Boolean(sendExternalPush),
            },
            createdAt: nowIso,
          },
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    } catch {}

    let pushResult = null;
    if (sendExternalPush !== false) {
      const category = resolvePushCategory(type, resolvedActionUrl, cleanTitle);
      pushResult = await dispatchExternalPush({
        eventType: 'admin_broadcast',
        category,
        title: cleanTitle,
        body: cleanMessage,
        actionUrl: resolvedActionUrl,
        notificationId: notifId,
        dedupeKey: `admin_broadcast_${notifId}`,
        recipientUserId: resolvedTargetUserId || undefined,
        targetRole: resolvedTargetUserId ? undefined : targetRole || 'ALL',
      });
    }

    return res.json({
      success: true,
      notificationId: notifId,
      notification: notifData,
      pushResult,
    });
  } catch (err: any) {
    console.error('[NotificationsRouter] admin-broadcast error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to dispatch broadcast notification.',
    });
  }
});

/**
 * POST /api/notifications/trigger-event
 * Verifies caller identity and DB state before dispatching FCM external push for
 * supported Grobaax events initiated by existing service workflows.
 */
notificationsRouter.post('/trigger-event', requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const {
      eventType,
      title,
      message,
      type,
      actionUrl,
      notificationId,
      dedupeKey,
      recipientUserId,
      targetRole,
      excludeUserId,
      requestId,
    } = req.body || {};

    const cleanEvent = String(eventType || '').trim();

    // Admins can dispatch push for existing platform competition / announcement / reward events
    if (authUser.isAdmin) {
      const cleanTitle = String(title || '').trim();
      const cleanMessage = String(message || '').trim();
      if (!cleanTitle || !cleanMessage) {
        return res.status(400).json({ success: false, error: 'Title and message are required.' });
      }
      const category = resolvePushCategory(type || cleanEvent, actionUrl, cleanTitle);
      const pushResult = await dispatchExternalPush({
        eventType: cleanEvent || 'admin_event',
        category,
        title: cleanTitle,
        body: cleanMessage,
        actionUrl,
        notificationId,
        dedupeKey: dedupeKey || (notificationId ? `notif_${notificationId}` : undefined),
        recipientUserId: recipientUserId || undefined,
        targetRole: recipientUserId ? undefined : targetRole || 'ALL',
        excludeUserId: excludeUserId || undefined,
      });
      return res.json({ success: true, pushResult });
    }

    // Standard authenticated users can ONLY trigger verified Campus connection events
    if (cleanEvent === 'campus_connection_request') {
      const targetUid = String(recipientUserId || '').trim();
      if (!targetUid || targetUid === authUser.id) {
        return res.status(400).json({ success: false, error: 'Valid recipient is required.' });
      }

      const { data: reqRows } = await supabaseAdmin
        .from('campus_connection_requests')
        .select('id, data')
        .eq('data->>senderId', authUser.id)
        .eq('data->>recipientId', targetUid)
        .limit(5);

      const verifiedReq = (reqRows || []).find((r: any) =>
        !requestId || r.id === requestId || r.data?.id === requestId
      );
      if (!verifiedReq) {
        return res.status(403).json({
          success: false,
          error: 'Verified connection request record not found.',
        });
      }

      const pushResult = await dispatchExternalPush({
        eventType: 'campus_connection_request',
        category: 'connections',
        title: 'New Connection Request',
        body: `${authUser.name} wants to connect with you on Grobaax Campus.`,
        actionUrl: '/community?tab=campus&view=connections',
        notificationId,
        dedupeKey: `campus_req_${verifiedReq.id}`,
        recipientUserId: targetUid,
      });
      return res.json({ success: true, pushResult });
    }

    if (cleanEvent === 'campus_connection_accepted') {
      const targetUid = String(recipientUserId || '').trim();
      if (!targetUid || targetUid === authUser.id) {
        return res.status(400).json({ success: false, error: 'Valid recipient is required.' });
      }

      const { data: reqRows } = await supabaseAdmin
        .from('campus_connection_requests')
        .select('id, data')
        .eq('data->>senderId', targetUid)
        .eq('data->>recipientId', authUser.id)
        .limit(5);

      const verifiedAccepted = (reqRows || []).find(
        (r: any) => r.data?.status === 'ACCEPTED' && (!requestId || r.id === requestId || r.data?.id === requestId)
      );
      if (!verifiedAccepted) {
        return res.status(403).json({
          success: false,
          error: 'Verified accepted connection record not found.',
        });
      }

      const pushResult = await dispatchExternalPush({
        eventType: 'campus_connection_accepted',
        category: 'connections',
        title: 'Connection Request Accepted',
        body: `${authUser.name} accepted your Grobaax Campus connection request.`,
        actionUrl: '/community?tab=campus&view=connections',
        notificationId,
        dedupeKey: `campus_accept_${verifiedAccepted.id}`,
        recipientUserId: targetUid,
      });
      return res.json({ success: true, pushResult });
    }

    return res.status(403).json({
      success: false,
      error: 'Unauthorized push notification trigger.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to process notification trigger.',
    });
  }
});

