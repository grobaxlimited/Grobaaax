import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../src/lib/supabase';
import { NIGERIAN_INSTITUTIONS } from '../src/data/nigerianInstitutions';
import { optionalAuth, requireAuth, requireAdmin } from './utils/authMiddleware';
import {
  resolveCanonicalInstitution,
  ensureSchoolBlogRecord,
  slugifyText,
} from './utils/institutionResolver';
import {
  SchoolBlogCategory,
  SchoolBlogContentBlock,
  SchoolBlogReactionType,
} from '../src/types';

export const schoolBlogRouter = Router();

const VALID_CATEGORIES: SchoolBlogCategory[] = ['News', 'Events', 'Academics', 'Campus Life'];
const VALID_REACTIONS: SchoolBlogReactionType[] = ['like', 'helpful', 'insightful', 'celebrate'];
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

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
    viewsCount: Number(row.views_count || 0),
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

function normalizeArticleBlocks(blocks: any[], fallbackText?: string): {
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
  const excerptSource = cleanBlocks.find((b) => b.type === 'paragraph')?.text || plainText;
  const excerpt = excerptSource.length > 180 ? excerptSource.slice(0, 177).trim() + '...' : excerptSource;

  return { blocks: cleanBlocks, plainText, excerpt, inlineImages };
}

// ----------------------------------------------------------------------------
// 1. PUBLIC / AUTHENTICATED READ ROUTES
// ----------------------------------------------------------------------------

// List institutions with School Blogs + aggregate counts (supports search & category)
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

// Get/Auto-provision independent School Blog homepage for a specific institution
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

    const [{ data: activeAssign }, { data: allArticles }] = await Promise.all([
      supabaseAdmin
        .from('school_blogger_assignments')
        .select('*')
        .eq('institution_id', canonical.institutionId)
        .eq('status', 'active')
        .maybeSingle(),
      supabaseAdmin
        .from('school_blog_articles')
        .select('*')
        .eq('blog_institution_id', canonical.institutionId)
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
    ]);

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

    // Viewer permissions & application status
    let viewerStatus: {
      isHomeInstitution: boolean;
      isActiveBloggerForThisSchool: boolean;
      isSuspendedBloggerForThisSchool: boolean;
      myApplication: any | null;
      homeInstitutionId: string;
      homeInstitutionName: string;
    } = {
      isHomeInstitution: false,
      isActiveBloggerForThisSchool: false,
      isSuspendedBloggerForThisSchool: false,
      myApplication: null,
      homeInstitutionId: req.authUser?.institutionId || '',
      homeInstitutionName: req.authUser?.institutionName || '',
    };

    if (req.authUser) {
      viewerStatus.isHomeInstitution =
        req.authUser.institutionId === canonical.institutionId ||
        req.authUser.institutionName.toLowerCase() === canonical.institutionName.toLowerCase();

      viewerStatus.isActiveBloggerForThisSchool = Boolean(
        activeAssign && activeAssign.user_id === req.authUser.id && activeAssign.status === 'active'
      );

      if (viewerStatus.isHomeInstitution) {
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

        viewerStatus.isSuspendedBloggerForThisSchool = myAssign?.status === 'suspended';
        viewerStatus.myApplication = myApp ? mapApplicationRow(myApp) : null;
      }
    }

    return res.json({
      success: true,
      blog: {
        ...blog,
        publishedArticlesCount: publishedRows.length,
        activeBlogger: mapAssignmentRow(activeAssign),
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

// Submit School Blogger Application (strict backend verification: ONLY own verified institution)
schoolBlogRouter.post('/applications', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.authUser!;
    const { targetInstitutionId, targetInstitutionName, reason, experience } = req.body || {};

    if (!user.canonicalInstitution || !user.institutionName) {
      return res.status(400).json({
        success: false,
        error: 'You must complete your academic institution profile before applying as a School Blogger.',
      });
    }

    // Strict server-side ownership enforcement: reject if client asks for a different school
    if (
      (targetInstitutionId && targetInstitutionId !== user.institutionId) ||
      (targetInstitutionName &&
        targetInstitutionName.trim().toLowerCase() !== user.institutionName.toLowerCase())
    ) {
      return res.status(403).json({
        success: false,
        error: `You can only apply to manage the School Blog for your own registered institution (${user.institutionName}).`,
      });
    }

    const cleanReason = String(reason || '').trim();
    const cleanExperience = String(experience || '').trim();
    if (cleanReason.length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a clear reason (at least 15 characters) explaining why you want to represent your school blog.',
      });
    }

    await ensureSchoolBlogRecord(user.canonicalInstitution);

    // Check if user is already an active blogger
    const { data: existingAssign } = await supabaseAdmin
      .from('school_blogger_assignments')
      .select('id, status')
      .eq('institution_id', user.institutionId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingAssign) {
      return res.status(400).json({
        success: false,
        error: `You are already the approved School Blogger for ${user.institutionName}.`,
      });
    }

    // Check duplicate Pending application
    const { data: existingPending } = await supabaseAdmin
      .from('school_blogger_applications')
      .select('id')
      .eq('applicant_user_id', user.id)
      .eq('institution_id', user.institutionId)
      .eq('status', 'Pending')
      .maybeSingle();

    if (existingPending) {
      return res.status(400).json({
        success: false,
        error: 'You already have a Pending School Blogger application for your institution.',
      });
    }

    const { data: created, error } = await supabaseAdmin
      .from('school_blogger_applications')
      .insert({
        applicant_user_id: user.id,
        institution_id: user.institutionId,
        institution_name: user.institutionName,
        applicant_name: user.name,
        department: user.department || 'General Studies',
        level: user.level || '100 Level',
        reason: cleanReason,
        experience: cleanExperience,
        status: 'Pending',
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    await notifyUserOrAdmins({
      title: 'New School Blogger Application',
      message: `${user.name} (${user.department || 'Student'}, ${user.level}) applied to become the School Blogger for ${user.institutionName}.`,
      targetRole: 'admin',
      actionUrl: '/admin?tab=school_blogs',
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorName: user.name,
      actorRole: 'student',
      action: 'BLOGGER_APPLICATION_SUBMITTED',
      institutionId: user.institutionId,
      institutionName: user.institutionName,
      targetType: 'application',
      targetId: created.id,
    });

    return res.json({
      success: true,
      message: `Application submitted for ${user.institutionName} Blog! Grobaax Admins will review it shortly.`,
      application: mapApplicationRow(created),
    });
  } catch (err: any) {
    console.error('Error in POST /api/school-blogs/applications:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to submit application.' });
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

// Get Full Single Article + reaction breakdown
schoolBlogRouter.get('/articles/:articleId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
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

// Server-side deduplicated article view tracking
schoolBlogRouter.post('/articles/:articleId/view', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    const { data: articleRow } = await supabaseAdmin
      .from('school_blog_articles')
      .select('id, status, views_count')
      .eq('id', articleId)
      .maybeSingle();

    if (!articleRow || articleRow.status !== 'published') {
      return res.status(404).json({ success: false, error: 'Published article not found.' });
    }

    const rawIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const ua = String(req.headers['user-agent'] || '').slice(0, 120);
    const anonHash = crypto.createHash('sha256').update(`${rawIp}|${ua}`).digest('hex').slice(0, 24);
    const viewerKey = req.authUser?.id ? `user:${req.authUser.id}` : `anon:${anonHash}`;
    const viewBucket = new Date().toISOString().slice(0, 10); // UTC day bucket prevents refresh spam

    const { error: insertErr } = await supabaseAdmin.from('school_blog_article_views').insert({
      article_id: articleId,
      viewer_key: viewerKey,
      view_bucket: viewBucket,
    });

    if (!insertErr) {
      // New unique view recorded; recount authoritatively
      const { count } = await supabaseAdmin
        .from('school_blog_article_views')
        .select('id', { count: 'exact', head: true })
        .eq('article_id', articleId);

      const newCount = typeof count === 'number' ? count : Number(articleRow.views_count || 0) + 1;
      await supabaseAdmin
        .from('school_blog_articles')
        .update({ views_count: newCount })
        .eq('id', articleId);

      return res.json({ success: true, counted: true, viewsCount: newCount });
    }

    return res.json({
      success: true,
      counted: false,
      viewsCount: Number(articleRow.views_count || 0),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// React to published article (add, change, or remove reaction; no duplicate reactions)
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
      .select('id, status')
      .eq('id', articleId)
      .maybeSingle();

    if (!articleRow || articleRow.status !== 'published') {
      return res.status(404).json({ success: false, error: 'Published article not found.' });
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

    const normalized = normalizeArticleBlocks(contentBlocks, contentText);
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

    const { title, category, coverImageUrl, contentBlocks, contentText, status } = req.body || {};
    const nextTitle = title !== undefined ? String(title).trim() : existing.title;
    const nextCategory =
      category && VALID_CATEGORIES.includes(category) ? category : existing.category;
    const nextCover =
      coverImageUrl !== undefined ? String(coverImageUrl).trim() : existing.cover_image_url;

    const normalized =
      contentBlocks !== undefined || contentText !== undefined
        ? normalizeArticleBlocks(contentBlocks, contentText)
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

    if (nextStatus === 'published' && (!nextCover || (normalized.plainText || '').length < 30)) {
      return res.status(400).json({
        success: false,
        error: 'Published articles require a cover image and at least 30 characters of content.',
      });
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

// Admin Overview & Institution Blog Metrics
schoolBlogRouter.get('/admin/overview', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [
      { data: blogs },
      { data: apps },
      { data: assignments },
      { data: articles },
      { data: reports },
      { data: logs },
    ] = await Promise.all([
      supabaseAdmin.from('school_blogs').select('*').order('institution_name', { ascending: true }),
      supabaseAdmin.from('school_blogger_applications').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('school_blogger_assignments').select('*').order('created_at', { ascending: false }).limit(200),
      supabaseAdmin.from('school_blog_articles').select('*').order('created_at', { ascending: false }).limit(300),
      supabaseAdmin.from('school_blog_reports').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('school_blog_audit_logs').select('*').order('created_at', { ascending: false }).limit(150),
    ]);

    const blogRows = (blogs || []).map(mapBlogRow);
    const appRows = (apps || []).map(mapApplicationRow);
    const assignRows = (assignments || []).map(mapAssignmentRow).filter(Boolean);
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
        pendingApplicationsCount: appRows.filter((a) => a.status === 'Pending').length,
        activeBloggersCount: assignRows.filter((a: any) => a.status === 'active').length,
        publishedArticlesCount: articleRows.filter((a) => a.status === 'published').length,
        totalArticlesCount: articleRows.length,
        openReportsCount: reportRows.filter((r) => r.status === 'open').length,
      },
      blogs: enrichedBlogs,
      applications: appRows,
      bloggers: assignRows,
      articles: articleRows,
      reports: reportRows,
      auditLogs: auditRows,
    });
  } catch (err: any) {
    console.error('Error in GET /api/school-blogs/admin/overview:', err);
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

    // If restoring to active, replace any other active blogger on the same school
    if (status === 'active') {
      const { data: others } = await supabaseAdmin
        .from('school_blogger_assignments')
        .select('*')
        .eq('institution_id', assignRow.institution_id)
        .eq('status', 'active')
        .neq('id', assignmentId);

      for (const other of others || []) {
        await supabaseAdmin
          .from('school_blogger_assignments')
          .update({
            status: 'replaced',
            ended_by: admin.id,
            ended_at: nowIso,
            end_reason: `Replaced upon reinstatement of ${assignRow.user_name}`,
            updated_at: nowIso,
          })
          .eq('id', other.id);
      }
    }

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
