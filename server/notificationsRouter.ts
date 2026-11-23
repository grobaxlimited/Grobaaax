import express, { Request, Response } from 'express';
import { supabaseAdmin } from '../src/lib/supabase';

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
