import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../src/lib/supabase';
import { NIGERIAN_INSTITUTIONS } from '../src/data/nigerianInstitutions';
import { optionalAuth, requireAuth, requireAdmin } from './utils/authMiddleware';
import {
  resolveCanonicalInstitution,
  ensureSchoolBlogRecord,
  slugifyText,
} from './utils/institutionResolver';
import {
  ArticleRewardProgress,
  BloggerRewardSummary,
  SchoolBlogCategory,
  SchoolBlogContentBlock,
  SchoolBlogReactionType,
  SchoolBlogRewardMilestone,
} from '../src/types';

export const schoolBlogRouter = Router();

const VALID_CATEGORIES: SchoolBlogCategory[] = ['News', 'Events', 'Academics', 'Campus Life'];
const VALID_REACTIONS: SchoolBlogReactionType[] = ['like', 'helpful', 'insightful', 'celebrate'];
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIEWS_PER_REWARD_MILESTONE = 250;
const GP_PER_REWARD_MILESTONE = 1000;

// Map DB snake_case rows cleanly to frontend TypeScript interfaces
function mapBlogRow(row: any) {
  return {
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    shortName: row.short_name || '',
    category: row.category || 'University',
    state: row.state || '',
    logo: row.logo || '🏛️',
    slug: row.slug,
    description: row.description || '',
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignmentRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    userId: row.user_id,
    userName: row.user_name,
    department: row.department || '',
    level: row.level || '',
    status: row.status,
    appointedBy: row.appointed_by,
    appointedByName: row.appointed_by_name || 'Grobaax Admin',
    appointedAt: row.appointed_at,
    endedBy: row.ended_by || null,
    endedAt: row.ended_at || null,
    endReason: row.end_reason || null,
  };
}

function mapApplicationRow(row: any) {
  return {
    id: row.id,
    applicantUserId: row.applicant_user_id,
    institutionId: row.institution_id,
    institutionName: row.institution_name,
    applicantName: row.applicant_name,
    department: row.department || '',
    level: row.level || '',
    reason: row.reason,
    experience: row.experience,
    status: row.status,
    reviewedBy: row.reviewed_by || null,
    reviewerName: row.reviewer_name || null,
    reviewNotes: row.review_notes || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapArticleRow(row: any) {
  return {
    id: row.id,
    blogInstitutionId: row.blog_institution_id,
    institutionName: row.institution_name,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    category: row.category,
    coverImageUrl: row.cover_image_url,
    contentBlocks: Array.isArray(row.content_blocks) ? row.content_blocks : [],
    contentText: row.content_text || '',
    status: row.status,
    viewsCount: Number(row.eligible_views_count ?? row.views_count ?? 0),
    reactionsCount: Number(row.reactions_count || 0),
    moderationReason: row.moderation_reason || null,
    moderatedBy: row.moderated_by || null,
    moderatedAt: row.moderated_at || null,
    publishedAt: row.published_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function writeAuditLog(params: {
  actorUserId: string;
  actorName: string;
  actorRole: string;
  action: string;
  institutionId?: string | null;
  institutionName?: string | null;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
}) {
  try {
    await supabaseAdmin.from('school_blog_audit_logs').insert({
      actor_user_id: params.actorUserId,
      actor_name: params.actorName,
      actor_role: params.actorRole,
      action: params.action,
      institution_id: params.institutionId || null,
      institution_name: params.institutionName || null,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details || {},
    });
  } catch (err) {
    console.warn('[SchoolBlog] Audit log write notice:', err);
  }
}

async function notifyUserOrAdmins(params: {
  title: string;
  message: string;
  targetUserId?: string;
  targetRole?: 'admin';
  actionUrl?: string;
}) {
  try {
    const id = `notif_blog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();
    await supabaseAdmin.from('notifications').upsert(
      {
        id,
        data: {
          id,
          title: params.title,
          message: params.message,
          type: 'campus',
          targetUserId: params.targetUserId || null,
          userId: params.targetUserId || null,
          targetRole: params.targetRole || null,
          actionUrl: params.actionUrl || '/community?tab=campus',
          isRead: false,
          createdAt: nowIso,
          timestamp: nowIso,
        },
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[SchoolBlog] Notification dispatch notice:', err);
  }
}

function hasActiveBloggerSubscription(user: Request['authUser']): boolean {
  if (!user) return false;
  return Boolean(user.hasActiveSubscription || user.isAdmin);
}

function normalizeArticleBlocks(
  blocks: any[],
  fallbackText?: string,
  customExcerpt?: string
): {
  blocks: SchoolBlogContentBlock[];
  plainText: string;
  excerpt: string;
  inlineImages: Array<{ imageUrl: string; caption: string; sortOrder: number }>;
} {
  const cleanBlocks: SchoolBlogContentBlock[] = [];
  const textParts: string[] = [];
  const inlineImages: Array<{ imageUrl: string; caption: string; sortOrder: number }> = [];

  if (Array.isArray(blocks)) {
    blocks.forEach((b, idx) => {
      if (!b || typeof b !== 'object') return;
      if (b.type === 'heading' && String(b.text || '').trim()) {
        const text = String(b.text).trim();
        cleanBlocks.push({
          id: b.id || `blk_${idx}_${Date.now()}`,
          type: 'heading',
          level: b.level === 3 ? 3 : 2,
          text,
        });
        textParts.push(text);
      } else if (b.type === 'paragraph' && String(b.text || '').trim()) {
        const text = String(b.text).trim();
        cleanBlocks.push({
          id: b.id || `blk_${idx}_${Date.now()}`,
          type: 'paragraph',
          text,
        });
        textParts.push(text);
      } else if (b.type === 'image' && String(b.imageUrl || '').trim()) {
        const imageUrl = String(b.imageUrl).trim();
        const caption = String(b.caption || '').trim();
        cleanBlocks.push({
          id: b.id || `blk_${idx}_${Date.now()}`,
          type: 'image',
          imageUrl,
          caption,
        });
        inlineImages.push({ imageUrl, caption, sortOrder: inlineImages.length });
      }
    });
  }

  if (cleanBlocks.length === 0 && fallbackText && fallbackText.trim()) {
    const paragraphs = fallbackText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    paragraphs.forEach((p, idx) => {
      cleanBlocks.push({
        id: `blk_${idx}_${Date.now()}`,
        type: 'paragraph',
        text: p,
      });
      textParts.push(p);
    });
  }

  const plainText = textParts.join('\n\n').trim();
  const explicitSummary = String(customExcerpt || '').trim();
  const autoSource = (cleanBlocks.find((b) => b.type === 'paragraph')?.text || plainText)
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1');
  const excerpt = explicitSummary
    ? explicitSummary.slice(0, 300)
    : autoSource.length > 180
    ? autoSource.slice(0, 177).trim() + '...'
    : autoSource;

  return { blocks: cleanBlocks, plainText, excerpt, inlineImages };
}

// ----------------------------------------------------------------------------
// 1. PREMIUM / VIP AUTHENTICATED READ ROUTES
// ----------------------------------------------------------------------------

// List institutions with School Blogs + aggregate counts (Free for all students)
schoolBlogRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {

    const q = String(req.query.search || '').trim().toLowerCase();
    const category = String(req.query.category || 'All').trim();

    const [{ data: dbBlogs }, { data: activeBloggers }, { data: articleStats }] = await Promise.all([
      supabaseAdmin.from('school_blogs').select('*').eq('status', 'active'),
      supabaseAdmin.from('school_blogger_assignments').select('*').eq('status', 'active'),
      supabaseAdmin
        .from('school_blog_articles')
        .select('blog_institution_id, published_at, status')
        .eq('status', 'published'),
    ]);

    const blogMap = new Map<string, any>();
    for (const b of dbBlogs || []) {
      blogMap.set(b.institution_id, mapBlogRow(b));
    }
    for (const staticInst of NIGERIAN_INSTITUTIONS) {
      if (!blogMap.has(staticInst.id)) {
        blogMap.set(staticInst.id, {
          institutionId: staticInst.id,
          institutionName: staticInst.name,
          shortName: staticInst.shortName,
          category: staticInst.category,
          state: staticInst.state,
          logo: staticInst.logo || '🏛️',
          slug: slugifyText(staticInst.name),
          description: `Official student newsroom and updates from ${staticInst.name}.`,
          status: 'active',
          createdAt: '',
          updatedAt: '',
        });
      }
    }

    const bloggerByInst = new Map<string, any>();
    for (const a of activeBloggers || []) {
      bloggerByInst.set(a.institution_id, mapAssignmentRow(a));
    }

    const countByInst = new Map<string, { count: number; latest: string | null }>();
    for (const art of articleStats || []) {
      const cur = countByInst.get(art.blog_institution_id) || { count: 0, latest: null };
      cur.count += 1;
      if (art.published_at && (!cur.latest || art.published_at > cur.latest)) {
        cur.latest = art.published_at;
      }
      countByInst.set(art.blog_institution_id, cur);
    }

    let list = Array.from(blogMap.values()).map((blog) => {
      const stats = countByInst.get(blog.institutionId) || { count: 0, latest: null };
      return {
        ...blog,
        publishedArticlesCount: stats.count,
        latestPublishedAt: stats.latest,
        activeBlogger: bloggerByInst.get(blog.institutionId) || null,
      };
    });

    if (category && category !== 'All') {
      list = list.filter((b) => String(b.category || '').toLowerCase().includes(category.toLowerCase()));
    }
    if (q) {
      list = list.filter(
        (b) =>
          b.institutionName.toLowerCase().includes(q) ||
          b.shortName.toLowerCase().includes(q) ||
          b.state.toLowerCase().includes(q)
      );
    }

    // Sort: blogs with published articles / active bloggers first, then caller's home school, then alphabetical
    const homeId = req.authUser?.institutionId || '';
    list.sort((a, b) => {
      if (homeId) {
        if (a.institutionId === homeId && b.institutionId !== homeId) return -1;
        if (b.institutionId === homeId && a.institutionId !== homeId) return 1;
      }
      if ((b.publishedArticlesCount || 0) !== (a.publishedArticlesCount || 0)) {
        return (b.publishedArticlesCount || 0) - (a.publishedArticlesCount || 0);
      }
      if (Boolean(b.activeBlogger) !== Boolean(a.activeBlogger)) {
        return b.activeBlogger ? 1 : -1;
      }
      return a.institutionName.localeCompare(b.institutionName);
    });

    return res.json({ success: true, total: list.length, blogs: list });
  } catch (err: any) {
    console.error('Error in GET /api/school-blogs:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get/Auto-provision independent School Blog homepage for a specific institution (Free for all students to browse & read)
schoolBlogRouter.get('/institution/:institutionKey', optionalAuth, async (req: Request, res: Response) => {
  try {
    const rawKey = decodeURIComponent(req.params.institutionKey || '').trim();
    const category = String(req.query.category || 'All Posts').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const fallbackCategory = String(req.query.institutionCategory || 'University');

    const canonical = await resolveCanonicalInstitution({
      institutionId: rawKey,
      institutionName: rawKey,
      category: fallbackCategory,
    });

    if (!canonical) {
      return res.status(404).json({ success: false, error: 'Institution not found.' });
    }

    const blogRow = await ensureSchoolBlogRecord(canonical);
    const blog = mapBlogRow(blogRow);

    if (blog.status !== 'active' && !req.authUser?.isAdmin) {
      return res.status(403).json({
        success: false,
        code: 'BLOG_SUSPENDED',
        blogSuspended: true,
        blog,
        error: `The ${canonical.institutionName} School Blog is currently suspended by Grobaax Administrators.`,
      });
    }

    const [{ data: activeAssignRows }, { data: allArticles }] = await Promise.all([
      supabaseAdmin
        .from('school_blogger_assignments')
        .select('*')
        .eq('institution_id', canonical.institutionId)
        .eq('status', 'active')
        .order('appointed_at', { ascending: false }),
      supabaseAdmin
        .from('school_blog_articles')
        .select('*')
        .eq('blog_institution_id', canonical.institutionId)
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
    ]);

    const activeAssigns = Array.isArray(activeAssignRows) ? activeAssignRows : [];
    const myActiveAssign = req.authUser
      ? activeAssigns.find((a: any) => a.user_id === req.authUser!.id) || null
      : null;
    const featuredAssign = myActiveAssign || activeAssigns[0] || null;

    const publishedRows = allArticles || [];
    const categoryCounts: Record<string, number> = {
      'All Posts': publishedRows.length,
      News: 0,
      Events: 0,
      Academics: 0,
      'Campus Life': 0,
    };
    for (const art of publishedRows) {
      if (categoryCounts[art.category] !== undefined) {
        categoryCounts[art.category] += 1;
      }
    }

    let filtered = publishedRows;
    if (category && category !== 'All Posts') {
      filtered = filtered.filter((a: any) => a.category === category);
    }
    if (search) {
      filtered = filtered.filter(
        (a: any) =>
          String(a.title || '').toLowerCase().includes(search) ||
          String(a.excerpt || '').toLowerCase().includes(search) ||
          String(a.author_name || '').toLowerCase().includes(search)
      );
    }

    // Viewer permissions & blogger status (works for both free readers and subscribers)
    const viewerStatus: {
      isHomeInstitution: boolean;
      isActiveBloggerForThisSchool: boolean;
      isSuspendedBloggerForThisSchool: boolean;
      bloggerRevokedStatus: string | null;
      myApplication: any | null;
      homeInstitutionId: string;
      homeInstitutionName: string;
      hasActiveSubscription: boolean;
      subscriptionTier: string;
      subscriptionExpired: boolean;
    } = {
      isHomeInstitution: Boolean(
        req.authUser &&
          (req.authUser.institutionId === canonical.institutionId ||
            req.authUser.institutionName.toLowerCase() === canonical.institutionName.toLowerCase())
      ),
      isActiveBloggerForThisSchool: Boolean(myActiveAssign),
      isSuspendedBloggerForThisSchool: false,
      bloggerRevokedStatus: null,
      myApplication: null,
      homeInstitutionId: req.authUser?.institutionId || '',
      homeInstitutionName: req.authUser?.institutionName || '',
      hasActiveSubscription: Boolean(
        req.authUser && (req.authUser.hasActiveSubscription || req.authUser.isAdmin)
      ),
      subscriptionTier: req.authUser?.subscriptionTier || 'free',
      subscriptionExpired: Boolean(req.authUser?.subscriptionExpired),
    };

    if (req.authUser && viewerStatus.isHomeInstitution) {
      const [{ data: myAssign }, { data: myApp }] = await Promise.all([
        supabaseAdmin
          .from('school_blogger_assignments')
          .select('*')
          .eq('institution_id', canonical.institutionId)
          .eq('user_id', req.authUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from('school_blogger_applications')
          .select('*')
          .eq('institution_id', canonical.institutionId)
          .eq('applicant_user_id', req.authUser.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      viewerStatus.isSuspendedBloggerForThisSchool = Boolean(
        !myActiveAssign &&
          myAssign &&
          (myAssign.status === 'suspended' || myAssign.status === 'removed')
      );
      viewerStatus.bloggerRevokedStatus =
        !myActiveAssign && myAssign && (myAssign.status === 'suspended' || myAssign.status === 'removed')
          ? myAssign.status
          : null;
      viewerStatus.myApplication = myApp ? mapApplicationRow(myApp) : null;
    }

    return res.json({
      success: true,
      requiresSubscription: false,
      blog: {
        ...blog,
        publishedArticlesCount: publishedRows.length,
        activeBloggersCount: activeAssigns.length,
        activeBlogger: mapAssignmentRow(featuredAssign),
      },
      categoryCounts,
      articles: filtered.map(mapArticleRow),
      viewerStatus,
    });
  } catch (err: any) {
    console.error('Error in GET /api/school-blogs/institution/:institutionKey:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to load School Blog.' });
  }
});

// Get caller's overall School Blogger status & applications
schoolBlogRouter.get('/my-blogger-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const [{ data: activeAssign }, { data: applications }] = await Promise.all([
      supabaseAdmin
        .from('school_blogger_assignments')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'suspended'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('school_blogger_applications')
        .select('*')
        .eq('applicant_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return res.json({
      success: true,
      homeInstitutionId: user.institutionId,
      homeInstitutionName: user.institutionName,
      department: user.department,
      level: user.level,
      activeAssignment: mapAssignmentRow(activeAssign),
      applications: (applications || []).map(mapApplicationRow),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Shared helper: Immediately activate blogger access once Premium/VIP subscription is verified
async function activateBloggerAccessForUser(params: {
  user: NonNullable<Request['authUser']>;
  targetInstitutionId?: string;
  targetInstitutionName?: string;
}) {
  const { user, targetInstitutionId, targetInstitutionName } = params;

  if (!hasActiveBloggerSubscription(user)) {
    return {
      statusCode: 403,
      body: {
        success: false,
        code: 'SUBSCRIPTION_REQUIRED',
        requiresSubscription: true,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpired: user.subscriptionExpired,
        error: user.subscriptionExpired
          ? 'Your subscription has expired. Subscribe to Premium or VIP to activate School Blogger access.'
          : 'An active Premium or VIP subscription is required to activate School Blogger access.',
      },
    };
  }

  if (!user.canonicalInstitution || !user.institutionName) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Please complete your Campus academic institution profile before activating blogger access.',
      },
    };
  }

  if (
    (targetInstitutionId && targetInstitutionId !== user.institutionId) ||
    (targetInstitutionName &&
      targetInstitutionName.trim().toLowerCase() !== user.institutionName.toLowerCase())
  ) {
    return {
      statusCode: 403,
      body: {
        success: false,
        error: `You can only activate School Blogger access for your own registered institution (${user.institutionName}).`,
      },
    };
  }

  const blogRow = await ensureSchoolBlogRecord(user.canonicalInstitution);
  if (blogRow?.status !== 'active') {
    return {
      statusCode: 403,
      body: {
        success: false,
        code: 'BLOG_SUSPENDED',
        error: `${user.institutionName} School Blog is currently suspended.`,
      },
    };
  }

  // Respect Admin suspension/revocation controls
  const { data: latestAssign } = await supabaseAdmin
    .from('school_blogger_assignments')
    .select('*')
    .eq('institution_id', user.institutionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestAssign?.status === 'active') {
    return {
      statusCode: 200,
      body: {
        success: true,
        activated: true,
        alreadyActive: true,
        message: `Your School Blogger access for ${user.institutionName} is active!`,
        assignment: mapAssignmentRow(latestAssign),
      },
    };
  }

  if (latestAssign && (latestAssign.status === 'suspended' || latestAssign.status === 'removed')) {
    return {
      statusCode: 403,
      body: {
        success: false,
        code: 'BLOGGER_ACCESS_REVOKED',
        revoked: true,
        error:
          latestAssign.end_reason ||
          `Your School Blogger access for ${user.institutionName} was ${latestAssign.status} by Grobaax Administrators.`,
      },
    };
  }

  const nowIso = new Date().toISOString();
  const planLabel =
    user.subscriptionTier === 'vip'
      ? 'VIP Subscription Verification'
      : 'Premium Subscription Verification';

  const { data: assignment, error: assignErr } = await supabaseAdmin
    .from('school_blogger_assignments')
    .insert({
      institution_id: user.institutionId,
      institution_name: user.institutionName,
      user_id: user.id,
      user_name: user.name,
      department: user.department || 'General Studies',
      level: user.level || '100 Level',
      status: 'active',
      appointed_by: 'SYSTEM_SUBSCRIPTION',
      appointed_by_name: planLabel,
      appointed_at: nowIso,
    })
    .select('*')
    .single();

  if (assignErr) {
    return {
      statusCode: 500,
      body: { success: false, error: assignErr.message },
    };
  }

  await Promise.all([
    notifyUserOrAdmins({
      title: 'Campus Blogger Access Activated!',
      message: `Your ${user.subscriptionTier.toUpperCase()} subscription is verified and your School Blogger Dashboard for ${user.institutionName} is now active. You can create and publish articles immediately!`,
      targetUserId: user.id,
      actionUrl: '/community?tab=campus',
    }),
    writeAuditLog({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: 'blogger',
      action: 'BLOGGER_AUTO_ACTIVATED_VIA_SUBSCRIPTION',
      institutionId: user.institutionId,
      institutionName: user.institutionName,
      targetType: 'blogger_assignment',
      targetId: assignment.id,
      details: {
        subscriptionTier: user.subscriptionTier,
        department: user.department,
        level: user.level,
      },
    }),
  ]);

  return {
    statusCode: 200,
    body: {
      success: true,
      activated: true,
      message: `School Blogger access activated for ${user.institutionName}! Opening your Blogger Dashboard.`,
      assignment: mapAssignmentRow(assignment),
    },
  };
}

// Instant School Blogger activation after Paystack/Subscription verification (NO Admin review queue)
schoolBlogRouter.post('/activate-blogger', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const { targetInstitutionId, targetInstitutionName } = req.body || {};
    const result = await activateBloggerAccessForUser({
      user,
      targetInstitutionId,
      targetInstitutionName,
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error('Error in POST /api/school-blogs/activate-blogger:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to activate blogger access.' });
  }
});

// Backward-compatible /applications endpoint: immediately auto-activates upon verified Premium/VIP subscription (no Pending review)
schoolBlogRouter.post('/applications', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const { targetInstitutionId, targetInstitutionName, reason, experience } = req.body || {};

    const result = await activateBloggerAccessForUser({
      user,
      targetInstitutionId,
      targetInstitutionName,
    });

    if (result.statusCode !== 200 || !(result.body as any).assignment) {
      return res.status(result.statusCode).json(result.body);
    }

    const assignment = (result.body as any).assignment;
    // Optionally record an automatically Approved audit entry if an application text was provided
    let recordedApp: any = null;
    if (reason && String(reason).trim().length > 0) {
      const nowIso = new Date().toISOString();
      const { data: appCreated } = await supabaseAdmin
        .from('school_blogger_applications')
        .insert({
          applicant_user_id: user.id,
          institution_id: user.institutionId,
          institution_name: user.institutionName,
          applicant_name: user.name,
          department: user.department || 'General Studies',
          level: user.level || '100 Level',
          reason: String(reason).trim(),
          experience: String(experience || '').trim(),
          status: 'Approved',
          reviewed_by: 'SYSTEM_SUBSCRIPTION',
          reviewer_name: 'Automatic Subscription Verification',
          review_notes: 'Auto-activated upon Premium/VIP subscription verification.',
          reviewed_at: nowIso,
        })
        .select('*')
        .maybeSingle();
      if (appCreated) recordedApp = mapApplicationRow(appCreated);
    }

    return res.json({
      success: true,
      activated: true,
      message: (result.body as any).message,
      assignment,
      application: recordedApp,
    });
  } catch (err: any) {
    console.error('Error in POST /api/school-blogs/applications:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to activate blogger access.' });
  }
});

// Withdraw own Pending application
schoolBlogRouter.post('/applications/:applicationId/withdraw', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const { applicationId } = req.params;

    const { data: appRow } = await supabaseAdmin
      .from('school_blogger_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (!appRow) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }
    if (appRow.applicant_user_id !== user.id) {
      return res.status(403).json({ success: false, error: 'You can only withdraw your own application.' });
    }
    if (appRow.status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Only Pending applications can be withdrawn.' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('school_blogger_applications')
      .update({
        status: 'Withdrawn',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: 'Application withdrawn.',
      application: mapApplicationRow(updated),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get Full Single Article + reaction breakdown (Free for all students)
schoolBlogRouter.get('/articles/:articleId', optionalAuth, async (req: Request, res: Response) => {
  try {

    const { articleId } = req.params;
    if (!UUID_RE.test(articleId)) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }
    const { data: articleRow, error } = await supabaseAdmin
      .from('school_blog_articles')
      .select('*')
      .eq('id', articleId)
      .maybeSingle();

    if (error || !articleRow) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    const isOwner = Boolean(req.authUser && req.authUser.id === articleRow.author_user_id);
    const isAdmin = Boolean(req.authUser?.isAdmin);

    if (articleRow.status !== 'published' && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'This article is currently not publicly available.',
      });
    }

    const [{ data: reactions }, { data: blogRow }] = await Promise.all([
      supabaseAdmin
        .from('school_blog_article_reactions')
        .select('user_id, reaction_type')
        .eq('article_id', articleId),
      supabaseAdmin
        .from('school_blogs')
        .select('*')
        .eq('institution_id', articleRow.blog_institution_id)
        .maybeSingle(),
    ]);

    if (blogRow && blogRow.status !== 'active' && !isAdmin) {
      return res.status(403).json({
        success: false,
        code: 'BLOG_SUSPENDED',
        blogSuspended: true,
        error: 'This School Blog is currently suspended.',
      });
    }

    const breakdown: Record<SchoolBlogReactionType, number> = {
      like: 0,
      helpful: 0,
      insightful: 0,
      celebrate: 0,
    };
    let userReaction: SchoolBlogReactionType | null = null;

    for (const r of reactions || []) {
      const rt = r.reaction_type as SchoolBlogReactionType;
      if (breakdown[rt] !== undefined) breakdown[rt] += 1;
      if (req.authUser && r.user_id === req.authUser.id) {
        userReaction = rt;
      }
    }

    return res.json({
      success: true,
      article: {
        ...mapArticleRow(articleRow),
        reactionBreakdown: breakdown,
        userReaction,
      },
      blog: blogRow ? mapBlogRow(blogRow) : null,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Server-side eligible unique article view tracking + automatic 250-view / 1,000 GP rewards
schoolBlogRouter.post('/articles/:articleId/view', requireAuth, async (req: Request, res: Response) => {
  try {

    const { articleId } = req.params;
    if (!UUID_RE.test(articleId)) {
      return res.status(404).json({ success: false, error: 'Published article not found.' });
    }

    const { data: artCheck } = await supabaseAdmin
      .from('school_blog_articles')
      .select('id, blog_institution_id, status')
      .eq('id', articleId)
      .maybeSingle();

    if (!artCheck || artCheck.status !== 'published') {
      return res.status(404).json({ success: false, error: 'Published article not found.' });
    }

    const { data: blogCheck } = await supabaseAdmin
      .from('school_blogs')
      .select('status')
      .eq('institution_id', artCheck.blog_institution_id)
      .maybeSingle();

    if (blogCheck && blogCheck.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'BLOG_SUSPENDED',
        error: 'This School Blog is currently suspended.',
      });
    }

    const viewerUserId = req.authUser!.id;

    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
      'record_eligible_article_view_and_reward',
      {
        p_article_id: articleId,
        p_viewer_user_id: viewerUserId,
      }
    );

    if (rpcError) {
      return res.status(500).json({ success: false, error: rpcError.message });
    }

    if (!rpcResult || rpcResult.success === false) {
      const code = Number(rpcResult?.statusCode || 404);
      return res.status(code).json({
        success: false,
        error: rpcResult?.error || 'Published article not found.',
      });
    }

    // Dispatch notifications and audit records asynchronously when milestone rewards were credited
    const creditedMilestones: Array<{
      milestoneId?: string;
      milestoneNumber: number;
      eligibleViewThreshold: number;
      gpAmount: number;
      transactionReference: string;
    }> = Array.isArray(rpcResult.creditedMilestones) ? rpcResult.creditedMilestones : [];

    const totalCreditedNow = Number(rpcResult.totalCreditedNow || 0);
    if (totalCreditedNow > 0 && creditedMilestones.length > 0 && rpcResult.authorUserId) {
      const highestThreshold = creditedMilestones[creditedMilestones.length - 1]?.eligibleViewThreshold || 250;
      await Promise.all([
        writeAuditLog({
          actorUserId: rpcResult.authorUserId,
          actorName: rpcResult.authorName || 'Approved Blogger',
          actorRole: 'blogger',
          action: 'BLOGGER_MILESTONE_GP_CREDITED',
          institutionId: rpcResult.institutionId,
          institutionName: rpcResult.institutionName,
          targetType: 'article',
          targetId: articleId,
          details: {
            articleTitle: rpcResult.articleTitle,
            totalCreditedGp: totalCreditedNow,
            eligibleViewsCount: Number(rpcResult.eligibleViewsCount || 0),
            milestones: creditedMilestones,
          },
        }),
        notifyUserOrAdmins({
          title: 'Campus Blogger GP Reward Credited!',
          message: `+${totalCreditedNow.toLocaleString()} GP has been automatically credited to your Grobaax wallet for reaching ${highestThreshold.toLocaleString()} eligible unique views on "${rpcResult.articleTitle || 'your article'}".`,
          targetUserId: rpcResult.authorUserId,
          actionUrl: '/wallet',
        }),
      ]);
    }

    return res.json({
      success: true,
      counted: Boolean(rpcResult.counted),
      eligible: Boolean(rpcResult.eligible),
      reason: String(rpcResult.reason || ''),
      viewsCount: Number(rpcResult.viewsCount || 0),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// React to published article (add, change, or remove reaction; authenticated users, no duplicate reactions)
schoolBlogRouter.post('/articles/:articleId/react', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;

    const { articleId } = req.params;
    const reactionType = String(req.body?.reactionType || 'like') as SchoolBlogReactionType;

    if (!VALID_REACTIONS.includes(reactionType)) {
      return res.status(400).json({ success: false, error: 'Invalid reaction type.' });
    }

    const { data: articleRow } = await supabaseAdmin
      .from('school_blog_articles')
      .select('id, status, blog_institution_id')
      .eq('id', articleId)
      .maybeSingle();

    if (!articleRow || articleRow.status !== 'published') {
      return res.status(404).json({ success: false, error: 'Published article not found.' });
    }

    const { data: blogCheck } = await supabaseAdmin
      .from('school_blogs')
      .select('status')
      .eq('institution_id', articleRow.blog_institution_id)
      .maybeSingle();

    if (blogCheck && blogCheck.status !== 'active' && !user.isAdmin) {
      return res.status(403).json({
        success: false,
        code: 'BLOG_SUSPENDED',
        error: 'This School Blog is currently suspended.',
      });
    }

    const { data: existing } = await supabaseAdmin
      .from('school_blog_article_reactions')
      .select('*')
      .eq('article_id', articleId)
      .eq('user_id', user.id)
      .maybeSingle();

    let nextUserReaction: SchoolBlogReactionType | null = null;
    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Toggle off (remove reaction)
        await supabaseAdmin.from('school_blog_article_reactions').delete().eq('id', existing.id);
        nextUserReaction = null;
      } else {
        // Change reaction type
        await supabaseAdmin
          .from('school_blog_article_reactions')
          .update({ reaction_type: reactionType, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        nextUserReaction = reactionType;
      }
    } else {
      await supabaseAdmin.from('school_blog_article_reactions').insert({
        article_id: articleId,
        user_id: user.id,
        reaction_type: reactionType,
      });
      nextUserReaction = reactionType;
    }

    // Recompute authoritative breakdown & total
    const { data: allReacts } = await supabaseAdmin
      .from('school_blog_article_reactions')
      .select('reaction_type')
      .eq('article_id', articleId);

    const breakdown: Record<SchoolBlogReactionType, number> = {
      like: 0,
      helpful: 0,
      insightful: 0,
      celebrate: 0,
    };
    for (const r of allReacts || []) {
      const rt = r.reaction_type as SchoolBlogReactionType;
      if (breakdown[rt] !== undefined) breakdown[rt] += 1;
    }
    const totalReactions = (allReacts || []).length;

    await supabaseAdmin
      .from('school_blog_articles')
      .update({ reactions_count: totalReactions })
      .eq('id', articleId);

    return res.json({
      success: true,
      userReaction: nextUserReaction,
      reactionsCount: totalReactions,
      reactionBreakdown: breakdown,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Report inappropriate/misleading article to Admin
schoolBlogRouter.post('/articles/:articleId/report', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const { articleId } = req.params;
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({ success: false, error: 'Please specify a reason for reporting.' });
    }

    const { data: art } = await supabaseAdmin
      .from('school_blog_articles')
      .select('id, blog_institution_id, institution_name, title')
      .eq('id', articleId)
      .maybeSingle();
    if (!art) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    const { error } = await supabaseAdmin.from('school_blog_reports').upsert(
      {
        article_id: articleId,
        blog_institution_id: art.blog_institution_id,
        reporter_user_id: user.id,
        reporter_name: user.name,
        reason,
        status: 'open',
      },
      { onConflict: 'article_id,reporter_user_id' }
    );

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    await notifyUserOrAdmins({
      title: 'Reported School Blog Article',
      message: `${user.name} reported "${art.title}" (${art.institution_name}): ${reason}`,
      targetRole: 'admin',
      actionUrl: '/admin?tab=school_blogs',
    });

    return res.json({ success: true, message: 'Article reported to Grobaax Admins for review.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 2. APPROVED BLOGGER STUDIO ROUTES (STRICT ACTIVE BLOGGER ENFORCEMENT)
// ----------------------------------------------------------------------------

async function getVerifiedActiveBloggerAssignment(userId: string) {
  const { data } = await supabaseAdmin
    .from('school_blogger_assignments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// Get blogger's own articles & assignment for Blogger Studio
schoolBlogRouter.get('/studio/articles', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const activeAssign = await getVerifiedActiveBloggerAssignment(user.id);
    if (!activeAssign) {
      return res.status(403).json({
        success: false,
        error: 'You do not currently hold active School Blogger privileges.',
      });
    }

    const { data: articles } = await supabaseAdmin
      .from('school_blog_articles')
      .select('*')
      .eq('blog_institution_id', activeAssign.institution_id)
      .eq('author_user_id', user.id)
      .order('updated_at', { ascending: false });

    return res.json({
      success: true,
      assignment: mapAssignmentRow(activeAssign),
      articles: (articles || []).map(mapArticleRow),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get blogger's private GP reward summary, per-article progress & milestone history
// STRICTLY restricted to active approved bloggers only
schoolBlogRouter.get('/studio/rewards', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const activeAssign = await getVerifiedActiveBloggerAssignment(user.id);
    if (!activeAssign) {
      return res.status(403).json({
        success: false,
        error: 'Blogger GP rewards are strictly accessible to active approved School Bloggers.',
      });
    }

    const [{ data: rawArticles }, { data: rawMilestones }, { data: userRow }] = await Promise.all([
      supabaseAdmin
        .from('school_blog_articles')
        .select('*')
        .eq('blog_institution_id', activeAssign.institution_id)
        .eq('author_user_id', user.id)
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false }),
      supabaseAdmin
        .from('school_blog_reward_milestones')
        .select('*')
        .eq('blogger_user_id', user.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('users').select('id, data').eq('id', user.id).maybeSingle(),
    ]);

    const articles = rawArticles || [];
    const milestonesByArticle = new Map<string, any[]>();
    for (const m of rawMilestones || []) {
      const list = milestonesByArticle.get(m.article_id) || [];
      list.push(m);
      milestonesByArticle.set(m.article_id, list);
    }

    // Fetch authoritative exact count of eligible unique views for each article
    const eligibleCountPairs = await Promise.all(
      articles.map(async (art: any) => {
        const { count } = await supabaseAdmin
          .from('school_blog_eligible_article_views')
          .select('id', { count: 'exact', head: true })
          .eq('article_id', art.id);
        const authoritativeCount = typeof count === 'number' ? count : Number(art.eligible_views_count || 0);

        // Idempotent self-healing check in case views reached a new 250-view milestone
        const targetMilestones = Math.floor(authoritativeCount / VIEWS_PER_REWARD_MILESTONE);
        const existingCount = (milestonesByArticle.get(art.id) || []).length;
        if (art.status === 'published' && targetMilestones > existingCount) {
          await supabaseAdmin.rpc('record_eligible_article_view_and_reward', {
            p_article_id: art.id,
            p_viewer_user_id: null,
          });
        }
        return [art.id, authoritativeCount] as const;
      })
    );
    const eligibleCountMap = new Map<string, number>(eligibleCountPairs);

    // Re-read milestones & user wallet after any self-healing payout
    const [{ data: finalMilestones }, { data: freshUserRow }] = await Promise.all([
      supabaseAdmin
        .from('school_blog_reward_milestones')
        .select('*')
        .eq('blogger_user_id', user.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('users').select('id, data').eq('id', user.id).maybeSingle(),
    ]);

    const milestoneRows = finalMilestones || [];
    const finalMilestonesByArticle = new Map<string, any[]>();
    for (const m of milestoneRows) {
      const list = finalMilestonesByArticle.get(m.article_id) || [];
      list.push(m);
      finalMilestonesByArticle.set(m.article_id, list);
    }

    const articleTitleMap = new Map<string, string>(
      articles.map((a: any) => [a.id, a.title])
    );

    const publishedArticles = articles.filter((a: any) => a.status === 'published');
    const trackableArticles = articles.filter(
      (a: any) => a.status === 'published' || (finalMilestonesByArticle.get(a.id) || []).length > 0
    );

    const articleProgress: ArticleRewardProgress[] = trackableArticles.map((art: any) => {
      const eligibleViews = eligibleCountMap.get(art.id) ?? 0;
      const artMilestones = finalMilestonesByArticle.get(art.id) || [];
      const gpEarned = artMilestones.reduce((sum: number, m: any) => sum + Number(m.gp_amount || 0), 0);
      const achievedCount = artMilestones.length;
      const cycleStart = Math.floor(eligibleViews / VIEWS_PER_REWARD_MILESTONE) * VIEWS_PER_REWARD_MILESTONE;
      const nextMilestoneViews = cycleStart + VIEWS_PER_REWARD_MILESTONE;
      const remainingViews = Math.max(0, nextMilestoneViews - eligibleViews);
      const progressPercent = Math.min(
        100,
        Math.round(((eligibleViews - cycleStart) / VIEWS_PER_REWARD_MILESTONE) * 100)
      );

      return {
        articleId: art.id,
        title: art.title,
        category: art.category,
        status: art.status,
        publishedAt: art.published_at || art.created_at || null,
        eligibleViews,
        gpEarned,
        milestonesAchieved: achievedCount,
        nextMilestoneViews,
        nextRewardGp: (Math.floor(eligibleViews / VIEWS_PER_REWARD_MILESTONE) + 1) * GP_PER_REWARD_MILESTONE,
        remainingViews,
        progressCurrent: eligibleViews,
        progressTarget: nextMilestoneViews,
        progressPercent,
      };
    });

    const totalEligibleViews = publishedArticles.reduce(
      (sum: number, art: any) => sum + (eligibleCountMap.get(art.id) ?? 0),
      0
    );
    const totalGpEarned = milestoneRows.reduce(
      (sum: number, m: any) => sum + Number(m.gp_amount || 0),
      0
    );

    const publishedProgress = articleProgress.filter((a) => a.status === 'published');
    const closestArticle = publishedProgress.length > 0
      ? [...publishedProgress].sort((a, b) => a.remainingViews - b.remainingViews)[0]
      : null;

    const walletGpBalance = Number(
      (freshUserRow?.data || userRow?.data)?.gpBalance || 0
    );

    const summary: BloggerRewardSummary = {
      viewsPerMilestone: VIEWS_PER_REWARD_MILESTONE,
      gpPerMilestone: GP_PER_REWARD_MILESTONE,
      totalEligibleViews,
      totalGpEarned,
      publishedArticlesCount: publishedArticles.length,
      milestonesAchieved: milestoneRows.length,
      walletGpBalance,
      nextMilestoneProgress: closestArticle
        ? {
            articleId: closestArticle.articleId,
            articleTitle: closestArticle.title,
            currentViews: closestArticle.eligibleViews,
            targetViews: closestArticle.nextMilestoneViews,
            remainingViews: closestArticle.remainingViews,
            nextRewardGp: GP_PER_REWARD_MILESTONE,
            progressPercent: closestArticle.progressPercent,
          }
        : {
            articleId: null,
            articleTitle: null,
            currentViews: 0,
            targetViews: VIEWS_PER_REWARD_MILESTONE,
            remainingViews: VIEWS_PER_REWARD_MILESTONE,
            nextRewardGp: GP_PER_REWARD_MILESTONE,
            progressPercent: 0,
          },
    };

    const milestones: SchoolBlogRewardMilestone[] = milestoneRows.slice(0, 50).map((m: any) => ({
      id: m.id,
      articleId: m.article_id,
      articleTitle: articleTitleMap.get(m.article_id) || 'School Blog Article',
      bloggerUserId: m.blogger_user_id,
      institutionId: m.institution_id,
      milestoneNumber: Number(m.milestone_number || 1),
      eligibleViewThreshold: Number(m.eligible_view_threshold || 250),
      gpAmount: Number(m.gp_amount || 1000),
      transactionReference: m.transaction_reference,
      createdAt: m.created_at,
    }));

    return res.json({
      success: true,
      assignment: mapAssignmentRow(activeAssign),
      summary,
      articleProgress,
      milestones,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to load blogger rewards.' });
  }
});

// Validated Image Upload (Base64 data URL -> Supabase Storage public URL)
schoolBlogRouter.post('/studio/upload-image', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const activeAssign = await getVerifiedActiveBloggerAssignment(user.id);
    if (!activeAssign && !user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only approved active School Bloggers can upload blog images.',
      });
    }

    const { dataUrl, fileName } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ success: false, error: 'Invalid image payload.' });
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Malformed image data URL.' });
    }

    const mimeType = match[1].toLowerCase();
    const base64Body = match[2];
    if (!ALLOWED_IMAGE_MIME.has(mimeType)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported image format. Please use JPEG, PNG, WebP, or GIF.',
      });
    }

    const buffer = Buffer.from(base64Body, 'base64');
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return res.status(400).json({
        success: false,
        error: 'Image exceeds the 5MB maximum file size limit.',
      });
    }

    const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const safeName = String(fileName || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
    const instFolder = activeAssign?.institution_id || user.institutionId || 'admin';
    const storagePath = `${instFolder}/${user.id}/${Date.now()}_${safeName}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('school-blog-media')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadErr) {
      console.warn('[SchoolBlog] Storage upload notice, using validated compressed fallback:', uploadErr.message);
      return res.json({ success: true, imageUrl: dataUrl, storagePath: '' });
    }

    const { data: pubUrlData } = supabaseAdmin.storage.from('school-blog-media').getPublicUrl(storagePath);
    return res.json({
      success: true,
      imageUrl: pubUrlData.publicUrl,
      storagePath,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Image upload failed.' });
  }
});

// Create New Article (Draft or Published) — STRICTLY enforces active blogger of that school only
schoolBlogRouter.post('/studio/articles', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const activeAssign = await getVerifiedActiveBloggerAssignment(user.id);
    if (!activeAssign) {
      return res.status(403).json({
        success: false,
        error: 'Only approved active School Bloggers can publish or draft School Blog articles.',
      });
    }

    const {
      targetInstitutionId,
      title,
      excerpt,
      category,
      coverImageUrl,
      contentBlocks,
      contentText,
      status = 'draft',
    } = req.body || {};

    if (targetInstitutionId && targetInstitutionId !== activeAssign.institution_id) {
      return res.status(403).json({
        success: false,
        error: `You are only authorized to publish articles for ${activeAssign.institution_name}.`,
      });
    }

    const { data: blogCheck } = await supabaseAdmin
      .from('school_blogs')
      .select('status')
      .eq('institution_id', activeAssign.institution_id)
      .maybeSingle();

    if (blogCheck && blogCheck.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'BLOG_SUSPENDED',
        error: `The ${activeAssign.institution_name} School Blog is currently suspended.`,
      });
    }

    const cleanTitle = String(title || '').trim();
    if (cleanTitle.length < 5) {
      return res.status(400).json({ success: false, error: 'Article headline must be at least 5 characters.' });
    }

    const articleCategory = VALID_CATEGORIES.includes(category) ? category : 'News';
    const nextStatus = status === 'published' ? 'published' : 'draft';
    const cleanCover = String(coverImageUrl || '').trim();
    if (nextStatus === 'published' && !cleanCover) {
      return res.status(400).json({ success: false, error: 'A cover image is required before publishing.' });
    }

    const normalized = normalizeArticleBlocks(contentBlocks, contentText, excerpt);
    if (nextStatus === 'published' && normalized.plainText.length < 30) {
      return res.status(400).json({
        success: false,
        error: 'Article content must contain at least 30 characters before publishing.',
      });
    }

    const articleSlug = `${slugifyText(cleanTitle) || 'article'}-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const { data: created, error } = await supabaseAdmin
      .from('school_blog_articles')
      .insert({
        blog_institution_id: activeAssign.institution_id,
        institution_name: activeAssign.institution_name,
        author_user_id: user.id,
        author_name: activeAssign.user_name || user.name,
        title: cleanTitle,
        slug: articleSlug,
        excerpt: normalized.excerpt || cleanTitle,
        category: articleCategory,
        cover_image_url: cleanCover,
        content_blocks: normalized.blocks,
        content_text: normalized.plainText,
        status: nextStatus,
        published_at: nextStatus === 'published' ? nowIso : null,
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (normalized.inlineImages.length > 0) {
      await supabaseAdmin.from('school_blog_article_images').insert(
        normalized.inlineImages.map((img) => ({
          article_id: created.id,
          blog_institution_id: activeAssign.institution_id,
          uploaded_by: user.id,
          image_url: img.imageUrl,
          caption: img.caption,
          sort_order: img.sortOrder,
        }))
      );
    }

    await writeAuditLog({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: 'blogger',
      action: nextStatus === 'published' ? 'ARTICLE_PUBLISHED' : 'ARTICLE_DRAFT_CREATED',
      institutionId: activeAssign.institution_id,
      institutionName: activeAssign.institution_name,
      targetType: 'article',
      targetId: created.id,
      details: { title: cleanTitle, category: articleCategory },
    });

    if (nextStatus === 'published') {
      await notifyUserOrAdmins({
        title: 'School Blog Article Published',
        message: `Your article "${cleanTitle}" is now live on ${activeAssign.institution_name} Blog! Earn 1,000 GP for every 250 eligible unique reader views.`,
        targetUserId: user.id,
      });
    }

    return res.json({
      success: true,
      message: nextStatus === 'published' ? 'Article published to School Blog!' : 'Article saved as draft.',
      article: mapArticleRow(created),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Edit / Publish / Unpublish Own Article
schoolBlogRouter.put('/studio/articles/:articleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const { articleId } = req.params;
    const activeAssign = await getVerifiedActiveBloggerAssignment(user.id);
    if (!activeAssign) {
      return res.status(403).json({
        success: false,
        error: 'Your School Blogger privileges are not currently active.',
      });
    }

    const { data: existing } = await supabaseAdmin
      .from('school_blog_articles')
      .select('*')
      .eq('id', articleId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }
    if (
      existing.author_user_id !== user.id ||
      existing.blog_institution_id !== activeAssign.institution_id
    ) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit or unpublish your own articles for your assigned institution.',
      });
    }
    if (existing.status === 'removed') {
      return res.status(403).json({
        success: false,
        error: 'This article was removed by an administrator and cannot be republished.',
      });
    }

    const { title, excerpt, category, coverImageUrl, contentBlocks, contentText, status } = req.body || {};
    const nextTitle = title !== undefined ? String(title).trim() : existing.title;
    const nextCategory =
      category && VALID_CATEGORIES.includes(category) ? category : existing.category;
    const nextCover =
      coverImageUrl !== undefined ? String(coverImageUrl).trim() : existing.cover_image_url;

    const normalized =
      contentBlocks !== undefined || contentText !== undefined || excerpt !== undefined
        ? normalizeArticleBlocks(
            contentBlocks !== undefined ? contentBlocks : existing.content_blocks,
            contentText !== undefined ? contentText : existing.content_text,
            excerpt !== undefined ? excerpt : undefined
          )
        : {
            blocks: existing.content_blocks,
            plainText: existing.content_text,
            excerpt: existing.excerpt,
            inlineImages: [],
          };

    let nextStatus = existing.status;
    if (status === 'published' || status === 'draft' || status === 'unpublished') {
      nextStatus = status;
    }

    if (nextStatus === 'published') {
      const { data: blogCheck } = await supabaseAdmin
        .from('school_blogs')
        .select('status')
        .eq('institution_id', activeAssign.institution_id)
        .maybeSingle();

      if (blogCheck && blogCheck.status !== 'active') {
        return res.status(403).json({
          success: false,
          code: 'BLOG_SUSPENDED',
          error: `The ${activeAssign.institution_name} School Blog is currently suspended.`,
        });
      }

      if (!nextCover || (normalized.plainText || '').length < 30) {
        return res.status(400).json({
          success: false,
          error: 'Published articles require a cover image and at least 30 characters of content.',
        });
      }
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from('school_blog_articles')
      .update({
        title: nextTitle,
        category: nextCategory,
        cover_image_url: nextCover,
        content_blocks: normalized.blocks,
        content_text: normalized.plainText,
        excerpt: normalized.excerpt || nextTitle,
        status: nextStatus,
        published_at:
          nextStatus === 'published' ? existing.published_at || nowIso : existing.published_at,
        updated_at: nowIso,
      })
      .eq('id', articleId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    if (contentBlocks !== undefined) {
      await supabaseAdmin.from('school_blog_article_images').delete().eq('article_id', articleId);
      if (normalized.inlineImages.length > 0) {
        await supabaseAdmin.from('school_blog_article_images').insert(
          normalized.inlineImages.map((img) => ({
            article_id: articleId,
            blog_institution_id: activeAssign.institution_id,
            uploaded_by: user.id,
            image_url: img.imageUrl,
            caption: img.caption,
            sort_order: img.sortOrder,
          }))
        );
      }
    }

    await writeAuditLog({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: 'blogger',
      action:
        nextStatus !== existing.status
          ? `ARTICLE_STATUS_${String(nextStatus).toUpperCase()}`
          : 'ARTICLE_UPDATED',
      institutionId: activeAssign.institution_id,
      institutionName: activeAssign.institution_name,
      targetType: 'article',
      targetId: articleId,
      details: { title: nextTitle, previousStatus: existing.status, nextStatus },
    });

    if (nextStatus === 'published' && existing.status !== 'published') {
      await notifyUserOrAdmins({
        title: 'School Blog Article Published',
        message: `Your article "${nextTitle}" is now live on ${activeAssign.institution_name} Blog!`,
        targetUserId: user.id,
      });
    }

    return res.json({
      success: true,
      message: 'Article updated successfully.',
      article: mapArticleRow(updated),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 3. GROBAAX ADMIN SCHOOL BLOG GOVERNANCE ROUTES
// ----------------------------------------------------------------------------

// Admin Overview & Institution Blog Metrics + GP Reward Monitoring
schoolBlogRouter.get('/admin/overview', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [
      { data: blogs },
      { data: apps },
      { data: assignments },
      { data: articles },
      { data: reports },
      { data: logs },
      { data: milestones },
      { data: rewardTxRows },
      { data: recentViews },
    ] = await Promise.all([
      supabaseAdmin.from('school_blogs').select('*').order('institution_name', { ascending: true }),
      supabaseAdmin.from('school_blogger_applications').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('school_blogger_assignments').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('school_blog_articles').select('*').order('created_at', { ascending: false }).limit(300),
      supabaseAdmin.from('school_blog_reports').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('school_blog_audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('school_blog_reward_milestones').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin
        .from('walletTransactions')
        .select('id, data, created_at')
        .eq('data->>type', 'blogger_reward')
        .order('created_at', { ascending: false })
        .limit(150),
      supabaseAdmin
        .from('school_blog_eligible_article_views')
        .select('article_id, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const blogRows = (blogs || []).map(mapBlogRow);
    const appRows = (apps || []).map(mapApplicationRow);
    const assignRows = (assignments || []).map(mapAssignmentRow).filter(Boolean) as any[];
    const articleRows = (articles || []).map(mapArticleRow);

    const articleTitleMap = new Map(articleRows.map((a) => [a.id, a]));
    const reportRows = (reports || []).map((r: any) => ({
      id: r.id,
      articleId: r.article_id,
      articleTitle: articleTitleMap.get(r.article_id)?.title || 'Article',
      blogInstitutionId: r.blog_institution_id,
      institutionName: articleTitleMap.get(r.article_id)?.institutionName || r.blog_institution_id,
      reporterUserId: r.reporter_user_id,
      reporterName: r.reporter_name || 'Scholar',
      reason: r.reason,
      status: r.status,
      resolvedBy: r.resolved_by || null,
      resolvedAt: r.resolved_at || null,
      createdAt: r.created_at,
    }));

    const auditRows = (logs || []).map((l: any) => ({
      id: l.id,
      actorUserId: l.actor_user_id,
      actorName: l.actor_name,
      actorRole: l.actor_role,
      action: l.action,
      institutionId: l.institution_id,
      institutionName: l.institution_name,
      targetType: l.target_type,
      targetId: l.target_id,
      details: l.details || {},
      createdAt: l.created_at,
    }));

    // Reward Milestones & Transactions
    const bloggerNameById = new Map<string, { name: string; institutionName: string }>();
    for (const as of assignRows) {
      if (!bloggerNameById.has(as.userId)) {
        bloggerNameById.set(as.userId, { name: as.userName, institutionName: as.institutionName });
      }
    }

    const rewardMilestoneRows = (milestones || []).map((m: any) => {
      const art = articleTitleMap.get(m.article_id);
      const bloggerMeta = bloggerNameById.get(m.blogger_user_id);
      return {
        id: m.id,
        articleId: m.article_id,
        articleTitle: art?.title || 'School Blog Article',
        bloggerUserId: m.blogger_user_id,
        bloggerName: art?.authorName || bloggerMeta?.name || 'Approved Blogger',
        institutionId: m.institution_id,
        institutionName: art?.institutionName || bloggerMeta?.institutionName || m.institution_id,
        milestoneNumber: Number(m.milestone_number || 1),
        eligibleViewThreshold: Number(m.eligible_view_threshold || 250),
        gpAmount: Number(m.gp_amount || 1000),
        transactionReference: m.transaction_reference,
        createdAt: m.created_at,
      };
    });

    const rewardTransactionRows = (rewardTxRows || []).map((row: any) => {
      const d = row.data || {};
      return {
        id: row.id,
        userId: d.userId || '',
        userName: d.userName || 'Approved Blogger',
        institutionName: d.institutionName || '',
        amount: Number(d.amount || 0),
        articleId: d.articleId || '',
        articleTitle: d.articleTitle || '',
        eligibleViewThreshold: Number(d.eligibleViewThreshold || 0),
        description: d.description || d.title || 'Campus Blogger View Reward',
        createdAt: d.createdAt || row.created_at,
      };
    });

    // Aggregate per-blogger rewards summary
    const bloggerAggMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        institutionId: string;
        institutionName: string;
        status: string;
        publishedArticlesCount: number;
        eligibleViews: number;
        milestonesAchieved: number;
        totalGpEarned: number;
      }
    >();

    for (const as of assignRows) {
      const existing = bloggerAggMap.get(as.userId);
      if (!existing || as.status === 'active') {
        bloggerAggMap.set(as.userId, {
          userId: as.userId,
          userName: as.userName,
          institutionId: as.institutionId,
          institutionName: as.institutionName,
          status: as.status,
          publishedArticlesCount: existing?.publishedArticlesCount || 0,
          eligibleViews: existing?.eligibleViews || 0,
          milestonesAchieved: existing?.milestonesAchieved || 0,
          totalGpEarned: existing?.totalGpEarned || 0,
        });
      }
    }

    for (const art of articleRows) {
      const entry = bloggerAggMap.get(art.authorUserId) || {
        userId: art.authorUserId,
        userName: art.authorName,
        institutionId: art.blogInstitutionId,
        institutionName: art.institutionName,
        status: 'unknown',
        publishedArticlesCount: 0,
        eligibleViews: 0,
        milestonesAchieved: 0,
        totalGpEarned: 0,
      };
      if (art.status === 'published') entry.publishedArticlesCount += 1;
      entry.eligibleViews += Number(art.viewsCount || 0);
      bloggerAggMap.set(art.authorUserId, entry);
    }

    for (const m of rewardMilestoneRows) {
      const entry = bloggerAggMap.get(m.bloggerUserId);
      if (entry) {
        entry.milestonesAchieved += 1;
        entry.totalGpEarned += Number(m.gpAmount || 0);
      }
    }

    const bloggerRewards = Array.from(bloggerAggMap.values()).sort(
      (a, b) => b.totalGpEarned - a.totalGpEarned || b.eligibleViews - a.eligibleViews
    );

    // Automated View Integrity / Suspicious Activity Diagnostics
    const viewsByArticleTenMin = new Map<string, number>();
    const tenMinCutoff = Date.now() - 10 * 60 * 1000;
    for (const v of recentViews || []) {
      const ts = new Date(v.created_at).getTime();
      if (ts >= tenMinCutoff) {
        viewsByArticleTenMin.set(v.article_id, (viewsByArticleTenMin.get(v.article_id) || 0) + 1);
      }
    }

    const suspiciousActivity: Array<{
      id: string;
      severity: 'info' | 'warning';
      type: string;
      title: string;
      details: string;
      timestamp: string;
    }> = [];

    for (const [artId, count] of viewsByArticleTenMin.entries()) {
      if (count >= 40) {
        const art = articleTitleMap.get(artId);
        suspiciousActivity.push({
          id: `spike_${artId}`,
          severity: 'warning',
          type: 'HIGH_VIEW_VELOCITY',
          title: `High view spike detected on "${art?.title || artId}"`,
          details: `${count} unique eligible reader views recorded within 10 minutes (${art?.institutionName || ''}).`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    for (const as of assignRows) {
      if (as.status === 'suspended' || as.status === 'removed') {
        const entry = bloggerAggMap.get(as.userId);
        if (entry && entry.totalGpEarned > 0) {
          suspiciousActivity.push({
            id: `revoked_payout_${as.id}`,
            severity: 'info',
            type: 'REVOKED_BLOGGER_HISTORY',
            title: `${as.userName} (${as.status}) holds prior reward payouts`,
            details: `${entry.totalGpEarned.toLocaleString()} GP earned before privileges became ${as.status}. New milestone payouts remain paused while ${as.status}.`,
            timestamp: as.endedAt || as.appointedAt,
          });
        }
      }
    }

    const totalEligibleViews = articleRows.reduce((s, a) => s + Number(a.viewsCount || 0), 0);
    const totalGpCredited = rewardMilestoneRows.reduce((s, m) => s + Number(m.gpAmount || 0), 0);

    // Enrich institution blogs with counts + active blogger
    const enrichedBlogs = blogRows.map((b) => {
      const bArticles = articleRows.filter((a) => a.blogInstitutionId === b.institutionId);
      const publishedCount = bArticles.filter((a) => a.status === 'published').length;
      const activeBlogger = assignRows.find(
        (as: any) => as.institutionId === b.institutionId && as.status === 'active'
      ) || null;
      const latestPub = bArticles.find((a) => a.publishedAt)?.publishedAt || null;
      return {
        ...b,
        publishedArticlesCount: publishedCount,
        totalArticlesCount: bArticles.length,
        latestPublishedAt: latestPub,
        activeBlogger,
      };
    });

    return res.json({
      success: true,
      summary: {
        totalInstitutionsWithBlogs: enrichedBlogs.length,
        activeInstitutionsCount: enrichedBlogs.filter((b) => b.status === 'active').length,
        pendingApplicationsCount: appRows.filter((a) => a.status === 'Pending').length,
        activeBloggersCount: assignRows.filter((a: any) => a.status === 'active').length,
        publishedArticlesCount: articleRows.filter((a) => a.status === 'published').length,
        totalArticlesCount: articleRows.length,
        openReportsCount: reportRows.filter((r) => r.status === 'open').length,
      },
      rewardSummary: {
        totalGpCredited,
        totalMilestonesPaid: rewardMilestoneRows.length,
        totalEligibleViews,
        rewardedBloggersCount: bloggerRewards.filter((b) => b.totalGpEarned > 0).length,
        flaggedAnomaliesCount: suspiciousActivity.filter((s) => s.severity === 'warning').length,
      },
      blogs: enrichedBlogs,
      applications: appRows,
      bloggers: assignRows,
      articles: articleRows,
      reports: reportRows,
      auditLogs: auditRows,
      bloggerRewards,
      rewardMilestones: rewardMilestoneRows,
      rewardTransactions: rewardTransactionRows,
      suspiciousActivity,
    });
  } catch (err: any) {
    console.error('Error in GET /api/school-blogs/admin/overview:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Activate or Suspend Institution School Blog (+ optional description update)
schoolBlogRouter.post('/admin/blogs/:institutionId/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.authUser!;
    const institutionId = decodeURIComponent(req.params.institutionId || '').trim();
    const { status, description, reason } = req.body || {};

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Blog status must be active or suspended.' });
    }

    const { data: blogRow } = await supabaseAdmin
      .from('school_blogs')
      .select('*')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (!blogRow) {
      return res.status(404).json({ success: false, error: 'Institution School Blog record not found.' });
    }

    const nowIso = new Date().toISOString();
    const updates: Record<string, any> = {
      status,
      updated_at: nowIso,
    };
    if (typeof description === 'string' && description.trim().length >= 10) {
      updates.description = description.trim();
    }

    const { data: updated, error } = await supabaseAdmin
      .from('school_blogs')
      .update(updates)
      .eq('institution_id', institutionId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    await writeAuditLog({
      actorUserId: admin.id,
      actorName: admin.name,
      actorRole: admin.managerRole || 'ADMIN',
      action: `SCHOOL_BLOG_${String(status).toUpperCase()}`,
      institutionId: blogRow.institution_id,
      institutionName: blogRow.institution_name,
      targetType: 'school_blog',
      targetId: blogRow.institution_id,
      details: { previousStatus: blogRow.status, nextStatus: status, reason: reason || '' },
    });

    return res.json({
      success: true,
      message: `${blogRow.institution_name} School Blog is now ${status}.`,
      blog: mapBlogRow(updated),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Approve Blogger Application (atomically replaces any previous primary blogger while keeping history)
schoolBlogRouter.post('/admin/applications/:applicationId/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.authUser!;
    const { applicationId } = req.params;
    const { reviewNotes } = req.body || {};

    const { data: appRow } = await supabaseAdmin
      .from('school_blogger_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (!appRow) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }
    if (appRow.status !== 'Pending') {
      return res.status(400).json({ success: false, error: `Application is already ${appRow.status}.` });
    }

    const nowIso = new Date().toISOString();

    // 1. Replace any existing active primary blogger for this institution (preserve full record)
    const { data: prevActives } = await supabaseAdmin
      .from('school_blogger_assignments')
      .select('*')
      .eq('institution_id', appRow.institution_id)
      .eq('status', 'active');

    for (const prev of prevActives || []) {
      await supabaseAdmin
        .from('school_blogger_assignments')
        .update({
          status: 'replaced',
          ended_by: admin.id,
          ended_at: nowIso,
          end_reason: `Replaced upon approval of ${appRow.applicant_name}`,
          updated_at: nowIso,
        })
        .eq('id', prev.id);

      await notifyUserOrAdmins({
        title: 'School Blogger Assignment Updated',
        message: `Your primary blogger role for ${appRow.institution_name} has been reassigned by Grobaax Admin. Past articles remain preserved.`,
        targetUserId: prev.user_id,
      });
    }

    // 2. Create active blogger assignment
    const { data: assignment, error: assignErr } = await supabaseAdmin
      .from('school_blogger_assignments')
      .insert({
        institution_id: appRow.institution_id,
        institution_name: appRow.institution_name,
        user_id: appRow.applicant_user_id,
        user_name: appRow.applicant_name,
        department: appRow.department || '',
        level: appRow.level || '',
        status: 'active',
        appointed_by: admin.id,
        appointed_by_name: admin.name,
        appointed_at: nowIso,
      })
      .select('*')
      .single();

    if (assignErr) {
      return res.status(500).json({ success: false, error: assignErr.message });
    }

    // 3. Mark application Approved
    const { data: updatedApp } = await supabaseAdmin
      .from('school_blogger_applications')
      .update({
        status: 'Approved',
        reviewed_by: admin.id,
        reviewer_name: admin.name,
        review_notes: String(reviewNotes || 'Approved as official School Blogger.').trim(),
        reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', applicationId)
      .select('*')
      .single();

    await notifyUserOrAdmins({
      title: 'School Blogger Application Approved!',
      message: `Congratulations! You are now the approved School Blogger for ${appRow.institution_name}. Open your School Blog to start publishing.`,
      targetUserId: appRow.applicant_user_id,
    });

    await writeAuditLog({
      actorUserId: admin.id,
      actorName: admin.name,
      actorRole: admin.managerRole || 'ADMIN',
      action: 'BLOGGER_APPLICATION_APPROVED',
      institutionId: appRow.institution_id,
      institutionName: appRow.institution_name,
      targetType: 'application',
      targetId: applicationId,
      details: {
        applicantUserId: appRow.applicant_user_id,
        applicantName: appRow.applicant_name,
        replacedCount: (prevActives || []).length,
      },
    });

    return res.json({
      success: true,
      message: `${appRow.applicant_name} approved as primary School Blogger for ${appRow.institution_name}.`,
      application: updatedApp ? mapApplicationRow(updatedApp) : null,
      assignment: mapAssignmentRow(assignment),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Reject Blogger Application
schoolBlogRouter.post('/admin/applications/:applicationId/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.authUser!;
    const { applicationId } = req.params;
    const { reviewNotes } = req.body || {};

    const { data: appRow } = await supabaseAdmin
      .from('school_blogger_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    if (!appRow) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }
    if (appRow.status !== 'Pending') {
      return res.status(400).json({ success: false, error: `Application is already ${appRow.status}.` });
    }

    const nowIso = new Date().toISOString();
    const cleanNotes = String(reviewNotes || 'Your application was not selected at this time.').trim();

    const { data: updatedApp, error } = await supabaseAdmin
      .from('school_blogger_applications')
      .update({
        status: 'Rejected',
        reviewed_by: admin.id,
        reviewer_name: admin.name,
        review_notes: cleanNotes,
        reviewed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', applicationId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    await notifyUserOrAdmins({
      title: 'School Blogger Application Update',
      message: `Your application for ${appRow.institution_name} Blog was reviewed: ${cleanNotes}`,
      targetUserId: appRow.applicant_user_id,
    });

    await writeAuditLog({
      actorUserId: admin.id,
      actorName: admin.name,
      actorRole: admin.managerRole || 'ADMIN',
      action: 'BLOGGER_APPLICATION_REJECTED',
      institutionId: appRow.institution_id,
      institutionName: appRow.institution_name,
      targetType: 'application',
      targetId: applicationId,
      details: { applicantUserId: appRow.applicant_user_id, reason: cleanNotes },
    });

    return res.json({
      success: true,
      message: 'Application rejected.',
      application: mapApplicationRow(updatedApp),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Manage Blogger Privileges (suspend | removed | active)
schoolBlogRouter.post('/admin/bloggers/:assignmentId/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.authUser!;
    const { assignmentId } = req.params;
    const { status, reason } = req.body || {};

    if (!['active', 'suspended', 'removed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be active, suspended, or removed.' });
    }

    const { data: assignRow } = await supabaseAdmin
      .from('school_blogger_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (!assignRow) {
      return res.status(404).json({ success: false, error: 'Blogger assignment record not found.' });
    }

    const nowIso = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('school_blogger_assignments')
      .update({
        status,
        ended_by: status === 'active' ? null : admin.id,
        ended_at: status === 'active' ? null : nowIso,
        end_reason: status === 'active' ? null : String(reason || `Marked as ${status} by Admin`).trim(),
        updated_at: nowIso,
      })
      .eq('id', assignmentId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    await notifyUserOrAdmins({
      title: 'School Blogger Privileges Updated',
      message: `Your blogger privileges for ${assignRow.institution_name} are now: ${status.toUpperCase()}.${reason ? ` Note: ${reason}` : ''}`,
      targetUserId: assignRow.user_id,
    });

    await writeAuditLog({
      actorUserId: admin.id,
      actorName: admin.name,
      actorRole: admin.managerRole || 'ADMIN',
      action: `BLOGGER_STATUS_${status.toUpperCase()}`,
      institutionId: assignRow.institution_id,
      institutionName: assignRow.institution_name,
      targetType: 'blogger_assignment',
      targetId: assignmentId,
      details: { targetUserId: assignRow.user_id, previousStatus: assignRow.status, nextStatus: status, reason },
    });

    return res.json({
      success: true,
      message: `Blogger privileges updated to ${status}.`,
      assignment: mapAssignmentRow(updated),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Moderate Article (remove | unpublish | restore)
schoolBlogRouter.post('/admin/articles/:articleId/moderate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.authUser!;
    const { articleId } = req.params;
    const { action, reason } = req.body || {};

    if (!['remove', 'unpublish', 'restore'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be remove, unpublish, or restore.' });
    }

    const { data: art } = await supabaseAdmin
      .from('school_blog_articles')
      .select('*')
      .eq('id', articleId)
      .maybeSingle();

    if (!art) {
      return res.status(404).json({ success: false, error: 'Article not found.' });
    }

    const nextStatus = action === 'remove' ? 'removed' : action === 'unpublish' ? 'unpublished' : 'published';
    const nowIso = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('school_blog_articles')
      .update({
        status: nextStatus,
        moderation_reason: action === 'restore' ? null : String(reason || `Moderated (${action}) by Admin`).trim(),
        moderated_by: admin.id,
        moderated_at: nowIso,
        published_at: action === 'restore' ? art.published_at || nowIso : art.published_at,
        updated_at: nowIso,
      })
      .eq('id', articleId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Mark open reports for this article as resolved when actioned
    await supabaseAdmin
      .from('school_blog_reports')
      .update({ status: 'resolved', resolved_by: admin.id, resolved_at: nowIso })
      .eq('article_id', articleId)
      .eq('status', 'open');

    await notifyUserOrAdmins({
      title: 'School Blog Article Moderation',
      message: `Your article "${art.title}" on ${art.institution_name} Blog was ${nextStatus} by Admin.${reason ? ` Reason: ${reason}` : ''}`,
      targetUserId: art.author_user_id,
    });

    await writeAuditLog({
      actorUserId: admin.id,
      actorName: admin.name,
      actorRole: admin.managerRole || 'ADMIN',
      action: `ADMIN_ARTICLE_${action.toUpperCase()}`,
      institutionId: art.blog_institution_id,
      institutionName: art.institution_name,
      targetType: 'article',
      targetId: articleId,
      details: { title: art.title, previousStatus: art.status, nextStatus, reason },
    });

    return res.json({
      success: true,
      message: `Article ${nextStatus} successfully.`,
      article: mapArticleRow(updated),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Dismiss Report without removing article
schoolBlogRouter.post('/admin/reports/:reportId/dismiss', requireAdmin, async (req: Request, res: Response) => {
  try {
    const admin = req.authUser!;
    const { reportId } = req.params;
    const { error } = await supabaseAdmin
      .from('school_blog_reports')
      .update({
        status: 'dismissed',
        resolved_by: admin.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.json({ success: true, message: 'Report dismissed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
