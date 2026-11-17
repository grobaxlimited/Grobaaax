import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  supabaseAdmin,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '../src/lib/supabase';
import { optionalAuth, requireAuth } from './utils/authMiddleware';
import {
  getSecretKey,
  getPublicKey,
  getPaystackBaseUrl,
  safePaystackFetch,
} from './paystackCore';

export const corporateAdsRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_CREATIVE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_DOC_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const COMPANY_STATUSES = new Set(['Pending', 'Approved', 'Rejected', 'Suspended']);
const CAMPAIGN_STATUSES = new Set([
  'Draft',
  'Pending Review',
  'Approved',
  'Rejected',
  'Active',
  'Paused',
  'Expired',
  'Suspended',
]);

declare global {
  namespace Express {
    interface Request {
      corporateCompany?: any | null;
      corporateAuthUid?: string | null;
    }
  }
}

function createStatelessSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  return '';
}

function sanitizeHttpUrl(rawUrl: string): string | null {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return null;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function mapCompanyRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    accountType: row.account_type,
    companyName: row.company_name,
    brandName: row.brand_name,
    industry: row.industry,
    registrationNumber: row.registration_number || '',
    website: row.website || '',
    description: row.description || '',
    contactName: row.contact_name,
    officialEmail: row.official_email,
    phone: row.phone,
    address: row.address,
    country: row.country,
    state: row.state,
    supportingDocumentUrl: row.supporting_document_url || '',
    supportingDocumentName: row.supporting_document_name || '',
    status: row.status,
    adminFeedback: row.admin_feedback || '',
    reviewedBy: row.reviewed_by || null,
    reviewerName: row.reviewer_name || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlanRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    monthlyPriceNaira: Number(row.monthly_price_naira || 0),
    currency: row.currency || 'NGN',
    durationDays: Number(row.duration_days || 30),
    maxActiveCampaigns: Number(row.max_active_campaigns || 1),
    campaignDurationDays: Number(row.campaign_duration_days || 30),
    placementEligibility: Array.isArray(row.placement_eligibility)
      ? row.placement_eligibility
      : ['school_blog_article_footer'],
    features: Array.isArray(row.features) ? row.features : [],
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubscriptionRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    planId: row.plan_id,
    paymentId: row.payment_id || null,
    paymentReference: row.payment_reference,
    planNameSnapshot: row.plan_name_snapshot,
    monthlyPriceSnapshot: Number(row.monthly_price_snapshot || 0),
    durationDaysSnapshot: Number(row.duration_days_snapshot || 30),
    maxActiveCampaignsSnapshot: Number(row.max_active_campaigns_snapshot || 1),
    campaignDurationDaysSnapshot: Number(row.campaign_duration_days_snapshot || 30),
    placementEligibilitySnapshot: Array.isArray(row.placement_eligibility_snapshot)
      ? row.placement_eligibility_snapshot
      : ['school_blog_article_footer'],
    status: row.status,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPaymentRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    subscriptionId: row.subscription_id || null,
    planId: row.plan_id,
    planNameSnapshot: row.plan_name_snapshot || '',
    reference: row.reference,
    receiptNumber: row.receipt_number || null,
    amountNaira: Number(row.amount_naira || 0),
    currency: row.currency || 'NGN',
    status: row.status,
    channel: row.channel || 'paystack',
    gatewayResponse: row.gateway_response || '',
    paidAt: row.paid_at || null,
    verifiedAt: row.verified_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCampaignRow(row: any, company?: any) {
  if (!row) return null;
  const impressions = Number(row.impressions_count || 0);
  const clicks = Number(row.clicks_count || 0);
  const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: company?.company_name || row.corporate_accounts?.company_name || '',
    brandName: company?.brand_name || row.corporate_accounts?.brand_name || '',
    companyStatus: company?.status || row.corporate_accounts?.status || '',
    subscriptionId: row.subscription_id || null,
    campaignName: row.campaign_name,
    headline: row.headline,
    adText: row.ad_text,
    creativeImageUrl: row.creative_image_url,
    destinationUrl: row.destination_url,
    ctaLabel: row.cta_label || 'Learn More',
    placementType: row.placement_type || 'school_blog_article_footer',
    requestedDurationDays: Number(row.requested_duration_days || 30),
    status: row.status,
    adminFeedback: row.admin_feedback || '',
    rejectionReason: row.rejection_reason || '',
    reviewedBy: row.reviewed_by || null,
    reviewerName: row.reviewer_name || null,
    reviewedAt: row.reviewed_at || null,
    startDate: row.start_date || null,
    expiryDate: row.expiry_date || null,
    impressionsCount: impressions,
    clicksCount: clicks,
    ctr,
    lastServedAt: row.last_served_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function expireOverdueRecords(companyId?: string) {
  const nowIso = new Date().toISOString();
  try {
    let subQ = supabaseAdmin
      .from('corporate_subscriptions')
      .update({ status: 'expired', updated_at: nowIso })
      .eq('status', 'active')
      .lte('expiry_date', nowIso);
    if (companyId) subQ = subQ.eq('company_id', companyId);
    await subQ;

    let campQ = supabaseAdmin
      .from('corporate_ad_campaigns')
      .update({ status: 'Expired', updated_at: nowIso })
      .in('status', ['Active', 'Paused', 'Approved'])
      .not('expiry_date', 'is', null)
      .lte('expiry_date', nowIso);
    if (companyId) campQ = campQ.eq('company_id', companyId);
    await campQ;
  } catch (err) {
    console.warn('[CorporateAds] Expiry sweep notice:', err);
  }
}

async function getActiveSubscriptionForCompany(companyId: string) {
  await expireOverdueRecords(companyId);
  const nowIso = new Date().toISOString();
  const { data } = await supabaseAdmin
    .from('corporate_subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .gt('expiry_date', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

async function uploadDataUrlToBucket(params: {
  bucket: string;
  dataUrl: string;
  fileName: string;
  folder: string;
  allowedMimes: Set<string>;
}) {
  const { bucket, dataUrl, fileName, folder, allowedMimes } = params;
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid file payload.');
  }
  const match = dataUrl.match(/^data:([a-zA-Z0-9.+\-\/]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Malformed base64 file data URL.');
  }
  const mimeType = match[1].toLowerCase();
  if (!allowedMimes.has(mimeType)) {
    throw new Error('Unsupported file format.');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('File must be under 5MB.');
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  };
  const ext = extMap[mimeType] || 'bin';
  const safeBase = String(fileName || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 48);
  const storagePath = `${folder}/${Date.now()}_${safeBase}.${ext}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  if (bucket === 'corporate-ad-media') {
    const { data: pubData } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
    return { path: storagePath, url: pubData.publicUrl };
  }
  return { path: storagePath, url: storagePath };
}

async function logCorporateAudit(params: {
  actorUserId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: any;
}) {
  try {
    await supabaseAdmin.from('corporate_ad_audit_logs').insert({
      actor_user_id: params.actorUserId,
      actor_name: params.actorName,
      actor_role: params.actorRole,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details || {},
    });
  } catch (err) {
    console.warn('[CorporateAds] Audit log notice:', err);
  }
}

function buildViewerKey(req: Request, uid?: string | null): string {
  if (uid) return `u:${uid}`;
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || ''))
      .split(',')[0]
      .trim() ||
    req.ip ||
    'unknown';
  const ua = String(req.headers['user-agent'] || '').slice(0, 140);
  const hash = crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|corp_ad_viewer`)
    .digest('hex')
    .slice(0, 24);
  return `g:${hash}`;
}

/**
 * Corporate advertiser JWT verification middleware.
 * Ensures caller has a valid Supabase Auth session AND a matching corporate_accounts row
 * (rejecting student accounts cleanly).
 */
async function requireCorporateAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Corporate authentication required. Please log in to continue.',
      });
    }

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid. Please log in again.',
      });
    }

    const uid = authData.user.id;
    const { data: company, error: compErr } = await supabaseAdmin
      .from('corporate_accounts')
      .select('*')
      .eq('auth_user_id', uid)
      .maybeSingle();

    if (compErr || !company) {
      return res.status(403).json({
        success: false,
        code: 'NOT_CORPORATE_ACCOUNT',
        error:
          'This account is not a registered Corporate Advertiser account. Student accounts cannot access the Corporate Portal.',
      });
    }

    req.corporateAuthUid = uid;
    req.corporateCompany = company;
    return next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: err?.message || 'Corporate authentication failed.',
    });
  }
}

/**
 * Admin authorization for Corporate Advertising management.
 */
async function requireCorporateAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    const u = req.authUser;
    const allowed = Boolean(
      u?.isAdmin || u?.isSuperAdmin || u?.managerRole === 'SPONSORSHIP_AD_MANAGER'
    );
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: 'Administrator or Sponsorship Manager privileges required.',
      });
    }
    return next();
  });
}

// ============================================================================
// 1. PUBLIC ENDPOINTS (PLANS, AD SERVING, IMPRESSION & CLICK TRACKING)
// ============================================================================

corporateAdsRouter.get('/plans', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('corporate_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('monthly_price_naira', { ascending: true });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      plans: (data || []).map(mapPlanRow),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Automatic School Blog Footer Advertisement Selection & Fair Rotation
corporateAdsRouter.get('/serve-ad', async (req: Request, res: Response) => {
  try {
    await expireOverdueRecords();
    const nowIso = new Date().toISOString();

    const { data: candidates, error } = await supabaseAdmin
      .from('corporate_ad_campaigns')
      .select('*, corporate_accounts!inner(id, company_name, brand_name, status), corporate_subscriptions!inner(id, status, start_date, expiry_date, max_active_campaigns_snapshot, placement_eligibility_snapshot)')
      .eq('status', 'Active')
      .eq('corporate_accounts.status', 'Approved')
      .eq('corporate_subscriptions.status', 'active')
      .gt('corporate_subscriptions.expiry_date', nowIso)
      .lte('corporate_subscriptions.start_date', nowIso)
      .order('last_served_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      console.warn('[CorporateAds] serve-ad query notice:', error.message);
      return res.json({ success: true, ad: null });
    }

    const articleSeed = String(req.query.articleId || '');
    const eligible = (candidates || []).filter((c: any) => {
      if (c.start_date && new Date(c.start_date).getTime() > Date.now()) return false;
      if (c.expiry_date && new Date(c.expiry_date).getTime() <= Date.now()) return false;
      const placements: string[] = Array.isArray(c.corporate_subscriptions?.placement_eligibility_snapshot)
        ? c.corporate_subscriptions.placement_eligibility_snapshot
        : ['school_blog_article_footer'];
      if (
        !placements.includes('school_blog_article_footer') &&
        !placements.includes('all') &&
        !placements.includes(c.placement_type)
      ) {
        return false;
      }
      return true;
    });

    if (eligible.length === 0) {
      return res.json({ success: true, ad: null });
    }

    // Primary selection uses least-recently-served (fair round-robin)
    const selected = eligible[0];

    await supabaseAdmin
      .from('corporate_ad_campaigns')
      .update({ last_served_at: nowIso })
      .eq('id', selected.id);

    // Return ONLY safe public ad creative fields (no private corporate data)
    return res.json({
      success: true,
      articleId: articleSeed || undefined,
      ad: {
        campaignId: selected.id,
        brandName: selected.corporate_accounts?.brand_name || selected.corporate_accounts?.company_name || 'Sponsored Partner',
        companyName: selected.corporate_accounts?.company_name || '',
        headline: selected.headline,
        adText: selected.ad_text,
        creativeImageUrl: selected.creative_image_url,
        destinationUrl: selected.destination_url,
        ctaLabel: selected.cta_label || 'Learn More',
        placementType: selected.placement_type || 'school_blog_article_footer',
      },
    });
  } catch (err: any) {
    console.warn('[CorporateAds] serve-ad error:', err);
    return res.json({ success: true, ad: null });
  }
});

// Backend-controlled Deduplicated Impression Recording
corporateAdsRouter.post(
  '/ads/:campaignId/impression',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      if (!UUID_RE.test(campaignId || '')) {
        return res.status(400).json({ success: false, error: 'Invalid campaign ID.' });
      }
      const articleId = String(req.body?.articleId || 'general').slice(0, 100);
      const institutionId = String(req.body?.institutionId || '').slice(0, 100);

      const { data: camp } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('id, company_id, status, impressions_count, expiry_date')
        .eq('id', campaignId)
        .maybeSingle();

      if (!camp || camp.status !== 'Active') {
        return res.json({ success: false, recorded: false });
      }
      if (camp.expiry_date && new Date(camp.expiry_date).getTime() <= Date.now()) {
        return res.json({ success: false, recorded: false });
      }

      const viewerKey = buildViewerKey(req, req.authUser?.id);
      // 30-minute deduplication window per viewer + article + campaign
      const impressionBucket = `b30m_${Math.floor(Date.now() / (30 * 60 * 1000))}`;

      const { error: insertErr } = await supabaseAdmin
        .from('corporate_ad_impressions')
        .insert({
          campaign_id: camp.id,
          company_id: camp.company_id,
          article_id: articleId,
          institution_id: institutionId,
          viewer_key: viewerKey,
          impression_bucket: impressionBucket,
        });

      if (insertErr) {
        // Unique constraint collision = duplicate impression within window; ignore safely
        return res.json({ success: true, recorded: false, deduplicated: true });
      }

      const nextCount = Number(camp.impressions_count || 0) + 1;
      await supabaseAdmin
        .from('corporate_ad_campaigns')
        .update({ impressions_count: nextCount })
        .eq('id', camp.id);

      return res.json({ success: true, recorded: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Backend-controlled Deduplicated Click Recording (Never increments impressions)
corporateAdsRouter.post(
  '/ads/:campaignId/click',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      if (!UUID_RE.test(campaignId || '')) {
        return res.status(400).json({ success: false, error: 'Invalid campaign ID.' });
      }
      const articleId = String(req.body?.articleId || 'general').slice(0, 100);
      const institutionId = String(req.body?.institutionId || '').slice(0, 100);

      const { data: camp } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('id, company_id, status, destination_url, clicks_count, expiry_date')
        .eq('id', campaignId)
        .maybeSingle();

      if (!camp || camp.status !== 'Active') {
        return res.status(404).json({ success: false, error: 'Active campaign not found.' });
      }

      const viewerKey = buildViewerKey(req, req.authUser?.id);
      // 5-minute click deduplication window per viewer + article + campaign
      const clickBucket = `c5m_${Math.floor(Date.now() / (5 * 60 * 1000))}`;

      const { error: insertErr } = await supabaseAdmin
        .from('corporate_ad_clicks')
        .insert({
          campaign_id: camp.id,
          company_id: camp.company_id,
          article_id: articleId,
          institution_id: institutionId,
          viewer_key: viewerKey,
          click_bucket: clickBucket,
        });

      if (!insertErr) {
        const nextCount = Number(camp.clicks_count || 0) + 1;
        await supabaseAdmin
          .from('corporate_ad_campaigns')
          .update({ clicks_count: nextCount })
          .eq('id', camp.id);
      }

      return res.json({
        success: true,
        recorded: !insertErr,
        destinationUrl: camp.destination_url,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ============================================================================
// 2. CORPORATE AUTHENTICATION & APPLICATION REGISTRATION
// ============================================================================

corporateAdsRouter.post('/auth/register', async (req: Request, res: Response) => {
  let createdAuthUserId: string | null = null;
  try {
    const {
      companyName,
      brandName,
      industry,
      registrationNumber = '',
      website = '',
      description,
      contactName,
      officialEmail,
      phone,
      address,
      country,
      state,
      password,
      supportingDocument,
    } = req.body || {};

    const requiredFields: Array<[string, any]> = [
      ['Registered company name', companyName],
      ['Brand / business name', brandName],
      ['Industry / category', industry],
      ['Company description', description],
      ["Contact person's name", contactName],
      ['Official business email', officialEmail],
      ['Business phone number', phone],
      ['Business address', address],
      ['Country', country],
      ['State', state],
    ];
    for (const [label, val] of requiredFields) {
      if (!val || String(val).trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: `${label} is required.`,
        });
      }
    }

    const cleanEmail = String(officialEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid official business email address.',
      });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
      });
    }

    let normalizedWebsite = '';
    if (website && String(website).trim()) {
      const checked = sanitizeHttpUrl(website);
      if (!checked) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid company website URL (e.g., https://company.com).',
        });
      }
      normalizedWebsite = checked;
    }

    // Prevent mixing student accounts with corporate advertiser accounts
    const { data: existingCorp } = await supabaseAdmin
      .from('corporate_accounts')
      .select('id')
      .ilike('official_email', cleanEmail)
      .maybeSingle();

    if (existingCorp) {
      return res.status(409).json({
        success: false,
        error: 'A Corporate Advertising account already exists for this official email.',
      });
    }

    // Create dedicated corporate identity in Supabase Auth (hashed password handled by GoTrue)
    const { data: createdAuth, error: createAuthErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          account_type: 'corporate_advertiser',
          company_name: String(companyName).trim(),
          brand_name: String(brandName).trim(),
          full_name: String(contactName).trim(),
        },
      });

    if (createAuthErr || !createdAuth?.user) {
      const msg = createAuthErr?.message || 'Unable to register corporate email.';
      const isExists = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('registered');
      return res.status(isExists ? 409 : 400).json({
        success: false,
        error: isExists
          ? 'This email address is already registered in Grobaax. Please use a dedicated corporate email address or log in if this is your corporate account.'
          : msg,
      });
    }

    createdAuthUserId = createdAuth.user.id;

    let supportingDocPath = '';
    let supportingDocName = '';
    if (supportingDocument?.dataUrl) {
      const uploaded = await uploadDataUrlToBucket({
        bucket: 'corporate-verification-docs',
        dataUrl: supportingDocument.dataUrl,
        fileName: supportingDocument.fileName || 'verification_doc',
        folder: createdAuthUserId,
        allowedMimes: ALLOWED_DOC_MIME,
      });
      supportingDocPath = uploaded.path;
      supportingDocName = String(supportingDocument.fileName || 'Supporting Document').slice(0, 120);
    }

    const { data: insertedCompany, error: insertErr } = await supabaseAdmin
      .from('corporate_accounts')
      .insert({
        auth_user_id: createdAuthUserId,
        account_type: 'corporate_advertiser',
        company_name: String(companyName).trim(),
        brand_name: String(brandName).trim(),
        industry: String(industry).trim(),
        registration_number: String(registrationNumber || '').trim(),
        website: normalizedWebsite,
        description: String(description).trim(),
        contact_name: String(contactName).trim(),
        official_email: cleanEmail,
        phone: String(phone).trim(),
        address: String(address).trim(),
        country: String(country).trim(),
        state: String(state).trim(),
        supporting_document_url: supportingDocPath,
        supporting_document_name: supportingDocName,
        status: 'Pending',
      })
      .select()
      .single();

    if (insertErr || !insertedCompany) {
      // Roll back auth user on failure
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
      return res.status(500).json({
        success: false,
        error: insertErr?.message || 'Failed to save corporate application.',
      });
    }

    // Issue fresh session token via stateless signInWithPassword
    const anonClient = createStatelessSupabaseClient();
    const { data: signInData } = await anonClient.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password),
    });

    await logCorporateAudit({
      actorUserId: insertedCompany.id,
      actorName: insertedCompany.company_name,
      actorRole: 'corporate_applicant',
      action: 'COMPANY_APPLICATION_SUBMITTED',
      targetType: 'corporate_account',
      targetId: insertedCompany.id,
      details: {
        companyName: insertedCompany.company_name,
        brandName: insertedCompany.brand_name,
        industry: insertedCompany.industry,
      },
    });

    return res.status(201).json({
      success: true,
      accessToken: signInData?.session?.access_token || '',
      refreshToken: signInData?.session?.refresh_token || '',
      company: mapCompanyRow(insertedCompany),
    });
  } catch (err: any) {
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => {});
    }
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to complete company application.',
    });
  }
});

corporateAdsRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Official business email and password are required.',
      });
    }

    const anonClient = createStatelessSupabaseClient();
    const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
      email: cleanEmail,
      password: String(password),
    });

    if (authErr || !authData?.user || !authData?.session) {
      return res.status(401).json({
        success: false,
        error: 'Invalid corporate email or password.',
      });
    }

    const { data: company } = await supabaseAdmin
      .from('corporate_accounts')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (!company) {
      return res.status(403).json({
        success: false,
        code: 'NOT_CORPORATE_ACCOUNT',
        error:
          'This email belongs to a student account, not a Corporate Advertiser account. Please register a corporate application at /apply.',
      });
    }

    return res.json({
      success: true,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      company: mapCompanyRow(company),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Corporate login failed.',
    });
  }
});

// ============================================================================
// 3. AUTHENTICATED COMPANY PROFILE, UPLOAD, BILLING & CAMPAIGNS
// ============================================================================

corporateAdsRouter.get('/me', requireCorporateAuth, async (req: Request, res: Response) => {
  try {
    const company = req.corporateCompany;
    await expireOverdueRecords(company.id);

    const { data: latestCompany } = await supabaseAdmin
      .from('corporate_accounts')
      .select('*')
      .eq('id', company.id)
      .single();

    const activeSub = await getActiveSubscriptionForCompany(company.id);

    const { data: latestSub } = await supabaseAdmin
      .from('corporate_subscriptions')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: campaigns } = await supabaseAdmin
      .from('corporate_ad_campaigns')
      .select('id, status, impressions_count, clicks_count')
      .eq('company_id', company.id);

    const totalImpressions = (campaigns || []).reduce(
      (s, c: any) => s + Number(c.impressions_count || 0),
      0
    );
    const totalClicks = (campaigns || []).reduce(
      (s, c: any) => s + Number(c.clicks_count || 0),
      0
    );
    const activeCampaignsCount = (campaigns || []).filter(
      (c: any) => c.status === 'Active'
    ).length;
    const ctr =
      totalImpressions > 0
        ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
        : 0;

    return res.json({
      success: true,
      company: mapCompanyRow(latestCompany || company),
      activeSubscription: mapSubscriptionRow(activeSub),
      latestSubscription: mapSubscriptionRow(latestSub),
      analyticsSummary: {
        totalCampaigns: (campaigns || []).length,
        activeCampaignsCount,
        totalImpressions,
        totalClicks,
        ctr,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

corporateAdsRouter.put('/profile', requireCorporateAuth, async (req: Request, res: Response) => {
  try {
    const company = req.corporateCompany;
    const {
      brandName,
      website,
      description,
      contactName,
      phone,
      address,
      country,
      state,
      registrationNumber,
    } = req.body || {};

    let cleanWebsite = company.website || '';
    if (website !== undefined) {
      if (String(website).trim() === '') {
        cleanWebsite = '';
      } else {
        const checked = sanitizeHttpUrl(website);
        if (!checked) {
          return res.status(400).json({ success: false, error: 'Invalid website URL.' });
        }
        cleanWebsite = checked;
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('corporate_accounts')
      .update({
        brand_name: brandName ? String(brandName).trim() : company.brand_name,
        website: cleanWebsite,
        description: description ? String(description).trim() : company.description,
        contact_name: contactName ? String(contactName).trim() : company.contact_name,
        phone: phone ? String(phone).trim() : company.phone,
        address: address ? String(address).trim() : company.address,
        country: country ? String(country).trim() : company.country,
        state: state ? String(state).trim() : company.state,
        registration_number:
          registrationNumber !== undefined
            ? String(registrationNumber).trim()
            : company.registration_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', company.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, company: mapCompanyRow(updated) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

corporateAdsRouter.post(
  '/upload-media',
  requireCorporateAuth,
  async (req: Request, res: Response) => {
    try {
      const company = req.corporateCompany;
      const { kind = 'creative', dataUrl, fileName = 'upload' } = req.body || {};

      if (kind === 'verification_doc') {
        const uploaded = await uploadDataUrlToBucket({
          bucket: 'corporate-verification-docs',
          dataUrl,
          fileName,
          folder: company.id,
          allowedMimes: ALLOWED_DOC_MIME,
        });
        await supabaseAdmin
          .from('corporate_accounts')
          .update({
            supporting_document_url: uploaded.path,
            supporting_document_name: String(fileName).slice(0, 120),
            updated_at: new Date().toISOString(),
          })
          .eq('id', company.id);

        return res.json({
          success: true,
          path: uploaded.path,
          fileName: String(fileName).slice(0, 120),
        });
      }

      const uploaded = await uploadDataUrlToBucket({
        bucket: 'corporate-ad-media',
        dataUrl,
        fileName,
        folder: company.id,
        allowedMimes: ALLOWED_CREATIVE_MIME,
      });

      return res.json({
        success: true,
        imageUrl: uploaded.url,
        path: uploaded.path,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: err?.message || 'Media upload failed.',
      });
    }
  }
);

// ============================================================================
// 4. CORPORATE PAYSTACK PAYMENT & IDEMPOTENT SUBSCRIPTION ACTIVATION
// ============================================================================

async function verifyAndActivateCorporatePayment(params: {
  payment: any;
  gatewayTx: any;
}) {
  const { payment, gatewayTx } = params;

  // Enforce verified Paystack status & paid amount >= plan price
  const paidNaira = gatewayTx.amount ? Number(gatewayTx.amount) / 100 : 0;
  const expectedNaira = Number(payment.amount_naira || 0);
  if (gatewayTx.status !== 'success' || paidNaira < expectedNaira) {
    if (['failed', 'abandoned', 'reversed'].includes(String(gatewayTx.status || '').toLowerCase())) {
      await supabaseAdmin
        .from('corporate_payments')
        .update({
          status: 'failed',
          gateway_response: String(gatewayTx.gateway_response || gatewayTx.status || 'Payment failed'),
          gateway_payload: gatewayTx,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id)
        .eq('status', 'pending');
    }
    return {
      verified: false,
      isPending: ['ongoing', 'pending', 'pending_bank_transfer'].includes(
        String(gatewayTx.status || '').toLowerCase()
      ),
      status: gatewayTx.status || 'failed',
    };
  }

  // Idempotent guard: atomic transition from non-success -> success
  const nowIso = new Date().toISOString();
  const receiptNumber = `GRBX-CORP-${new Date().getFullYear()}${String(
    new Date().getMonth() + 1
  ).padStart(2, '0')}-${payment.reference.slice(-6)}`;

  const { data: claimedPayment } = await supabaseAdmin
    .from('corporate_payments')
    .update({
      status: 'success',
      channel: gatewayTx.channel || 'paystack',
      gateway_response: String(gatewayTx.gateway_response || 'Approved'),
      gateway_payload: gatewayTx,
      receipt_number: payment.receipt_number || receiptNumber,
      paid_at: gatewayTx.paid_at || nowIso,
      verified_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', payment.id)
    .neq('status', 'success')
    .select()
    .maybeSingle();

  // If another concurrent call already activated this payment, return existing records cleanly
  if (!claimedPayment) {
    const { data: existingPay } = await supabaseAdmin
      .from('corporate_payments')
      .select('*')
      .eq('id', payment.id)
      .single();
    const { data: existingSub } = await supabaseAdmin
      .from('corporate_subscriptions')
      .select('*')
      .eq('payment_reference', payment.reference)
      .maybeSingle();
    return {
      verified: true,
      idempotent: true,
      payment: mapPaymentRow(existingPay || payment),
      subscription: mapSubscriptionRow(existingSub),
    };
  }

  // Load authoritative plan configuration from DB
  const { data: plan } = await supabaseAdmin
    .from('corporate_subscription_plans')
    .select('*')
    .eq('id', payment.plan_id)
    .single();

  const durationDays = Number(plan?.duration_days || 30);
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Supersede previous active subscription on upgrade/renewal
  await supabaseAdmin
    .from('corporate_subscriptions')
    .update({ status: 'superseded', updated_at: nowIso })
    .eq('company_id', payment.company_id)
    .eq('status', 'active');

  const { data: createdSub, error: subErr } = await supabaseAdmin
    .from('corporate_subscriptions')
    .insert({
      company_id: payment.company_id,
      plan_id: payment.plan_id,
      payment_id: claimedPayment.id,
      payment_reference: claimedPayment.reference,
      plan_name_snapshot: plan?.name || payment.plan_name_snapshot || 'Corporate Plan',
      monthly_price_snapshot: Number(plan?.monthly_price_naira || expectedNaira),
      duration_days_snapshot: durationDays,
      max_active_campaigns_snapshot: Number(plan?.max_active_campaigns || 1),
      campaign_duration_days_snapshot: Number(plan?.campaign_duration_days || durationDays),
      placement_eligibility_snapshot: plan?.placement_eligibility || ['school_blog_article_footer'],
      status: 'active',
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
    })
    .select()
    .single();

  if (subErr) {
    console.error('[CorporateAds] Subscription insert error:', subErr);
  } else if (createdSub) {
    await supabaseAdmin
      .from('corporate_payments')
      .update({ subscription_id: createdSub.id, updated_at: nowIso })
      .eq('id', claimedPayment.id);
    claimedPayment.subscription_id = createdSub.id;
  }

  return {
    verified: true,
    idempotent: false,
    payment: mapPaymentRow(claimedPayment),
    subscription: mapSubscriptionRow(createdSub),
  };
}

corporateAdsRouter.post(
  '/payments/initialize',
  requireCorporateAuth,
  async (req: Request, res: Response) => {
    try {
      const company = req.corporateCompany;
      if (company.status !== 'Approved') {
        return res.status(403).json({
          success: false,
          error:
            'Only Approved companies can subscribe to Corporate Advertising plans. Your current status is ' +
            company.status +
            '.',
        });
      }

      const { planId, callbackUrl } = req.body || {};
      if (!planId) {
        return res.status(400).json({ success: false, error: 'Subscription plan ID is required.' });
      }

      const { data: plan } = await supabaseAdmin
        .from('corporate_subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .maybeSingle();

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: 'Selected corporate subscription plan is unavailable or inactive.',
        });
      }

      const secretKey = getSecretKey();
      const publicKey = getPublicKey();
      if (!secretKey || (!secretKey.startsWith('sk_live_') && !secretKey.startsWith('sk_test_'))) {
        return res.status(503).json({
          success: false,
          code: 'PAYSTACK_NOT_CONFIGURED',
          error:
            'Paystack secret key (PAYSTACK_SECRET_KEY) is not configured on the server. Payment cannot be initialized.',
        });
      }

      const amountNaira = Number(plan.monthly_price_naira);
      const amountKobo = Math.round(amountNaira * 100);
      const reference = `GRBX_CORP_${Date.now()}_${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

      // Record pending payment before calling gateway
      const { data: pendingPay, error: payInsertErr } = await supabaseAdmin
        .from('corporate_payments')
        .insert({
          company_id: company.id,
          plan_id: plan.id,
          plan_name_snapshot: plan.name,
          reference,
          amount_naira: amountNaira,
          currency: plan.currency || 'NGN',
          status: 'pending',
          channel: 'paystack',
        })
        .select()
        .single();

      if (payInsertErr || !pendingPay) {
        return res.status(500).json({
          success: false,
          error: payInsertErr?.message || 'Could not create payment record.',
        });
      }

      let resolvedCallback = callbackUrl;
      if (!resolvedCallback) {
        const origin =
          (req.headers.origin as string) || 'https://advertise.grobaax.com';
        resolvedCallback = `${origin.replace(/\/+$/, '')}/dashboard?tab=billing&reference=${encodeURIComponent(
          reference
        )}`;
      }

      const psRes = await safePaystackFetch(
        `${getPaystackBaseUrl()}/transaction/initialize`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: company.official_email,
            amount: amountKobo,
            reference,
            currency: plan.currency || 'NGN',
            callback_url: resolvedCallback,
            channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr'],
            metadata: {
              channel_type: 'corporate_advertising',
              companyId: company.id,
              companyName: company.company_name,
              planId: plan.id,
              planName: plan.name,
              amountNaira,
            },
          }),
        }
      );

      if (!psRes.isJson || !psRes.data?.status || !psRes.data?.data) {
        await supabaseAdmin
          .from('corporate_payments')
          .update({
            status: 'failed',
            gateway_response: psRes.data?.message || `Gateway HTTP ${psRes.status}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pendingPay.id);

        return res.status(502).json({
          success: false,
          error:
            psRes.data?.message ||
            'Failed to initialize transaction with Paystack gateway.',
        });
      }

      return res.json({
        success: true,
        reference,
        authorizationUrl: psRes.data.data.authorization_url,
        accessCode: psRes.data.data.access_code,
        publicKey,
        amountNaira,
        currency: plan.currency || 'NGN',
        plan: mapPlanRow(plan),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.post(
  '/payments/verify',
  requireCorporateAuth,
  async (req: Request, res: Response) => {
    try {
      const company = req.corporateCompany;
      const reference = String(req.body?.reference || req.query?.reference || '').trim();
      if (!reference) {
        return res.status(400).json({ success: false, error: 'Payment reference is required.' });
      }

      const { data: payment } = await supabaseAdmin
        .from('corporate_payments')
        .select('*')
        .eq('reference', reference)
        .eq('company_id', company.id)
        .maybeSingle();

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Corporate payment reference not found for your company.',
        });
      }

      // Already verified previously -> idempotent return
      if (payment.status === 'success') {
        const { data: sub } = await supabaseAdmin
          .from('corporate_subscriptions')
          .select('*')
          .eq('payment_reference', payment.reference)
          .maybeSingle();
        return res.json({
          success: true,
          verified: true,
          idempotent: true,
          payment: mapPaymentRow(payment),
          subscription: mapSubscriptionRow(sub),
        });
      }

      const secretKey = getSecretKey();
      if (!secretKey) {
        return res.status(503).json({
          success: false,
          verified: false,
          error: 'Paystack secret key is not configured.',
        });
      }

      const psVerify = await safePaystackFetch(
        `${getPaystackBaseUrl()}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${secretKey}` },
        }
      );

      if (!psVerify.isJson || !psVerify.data?.status || !psVerify.data?.data) {
        return res.json({
          success: false,
          verified: false,
          status: 'failed',
          error: psVerify.data?.message || 'Unable to verify payment with Paystack.',
        });
      }

      const result = await verifyAndActivateCorporatePayment({
        payment,
        gatewayTx: psVerify.data.data,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.post('/payments/webhook', async (req: Request, res: Response) => {
  try {
    const secretKey = getSecretKey();
    const signature = req.headers['x-paystack-signature'];

    let event: any = null;
    if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
      event = req.body;
    } else {
      const bodyStr = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : String(req.body || '');
      if (secretKey && signature) {
        const hash = crypto.createHmac('sha512', secretKey).update(bodyStr).digest('hex');
        if (hash !== signature) {
          return res.status(400).send('Invalid signature');
        }
      }
      event = JSON.parse(bodyStr);
    }

    const reference = String(event?.data?.reference || '');
    if (reference.startsWith('GRBX_CORP_')) {
      const { data: payment } = await supabaseAdmin
        .from('corporate_payments')
        .select('*')
        .eq('reference', reference)
        .maybeSingle();

      if (payment) {
        if (event.event === 'charge.success') {
          await verifyAndActivateCorporatePayment({
            payment,
            gatewayTx: event.data,
          });
        } else if (event.event === 'charge.failed' && payment.status === 'pending') {
          await supabaseAdmin
            .from('corporate_payments')
            .update({
              status: 'failed',
              gateway_response: String(event.data?.gateway_response || 'Payment failed'),
              gateway_payload: event.data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id)
            .eq('status', 'pending');
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

corporateAdsRouter.get('/billing', requireCorporateAuth, async (req: Request, res: Response) => {
  try {
    const company = req.corporateCompany;
    await expireOverdueRecords(company.id);

    const [activeSub, subsRes, payRes] = await Promise.all([
      getActiveSubscriptionForCompany(company.id),
      supabaseAdmin
        .from('corporate_subscriptions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('corporate_payments')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false }),
    ]);

    return res.json({
      success: true,
      activeSubscription: mapSubscriptionRow(activeSub),
      subscriptions: (subsRes.data || []).map(mapSubscriptionRow),
      payments: (payRes.data || []).map(mapPaymentRow),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 5. COMPANY CAMPAIGN MANAGEMENT
// ============================================================================

corporateAdsRouter.get('/campaigns', requireCorporateAuth, async (req: Request, res: Response) => {
  try {
    const company = req.corporateCompany;
    await expireOverdueRecords(company.id);

    const { data, error } = await supabaseAdmin
      .from('corporate_ad_campaigns')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      campaigns: (data || []).map((row) => mapCampaignRow(row, company)),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

corporateAdsRouter.post('/campaigns', requireCorporateAuth, async (req: Request, res: Response) => {
  try {
    const company = req.corporateCompany;
    if (company.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        error: 'Only Approved companies can create advertising campaigns.',
      });
    }

    const activeSub = await getActiveSubscriptionForCompany(company.id);
    if (!activeSub) {
      return res.status(403).json({
        success: false,
        error:
          'An active corporate advertising subscription is required before creating or submitting campaigns.',
      });
    }

    const {
      campaignName,
      headline,
      adText,
      creativeImageUrl,
      destinationUrl,
      ctaLabel = 'Learn More',
      placementType = 'school_blog_article_footer',
      requestedDurationDays,
      submitForReview = true,
    } = req.body || {};

    if (!campaignName || String(campaignName).trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Campaign name is required.' });
    }
    if (!headline || String(headline).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'Advertisement headline is required.' });
    }
    if (!adText || String(adText).trim().length < 10) {
      return res.status(400).json({ success: false, error: 'Advertisement description text is required.' });
    }
    if (!creativeImageUrl || String(creativeImageUrl).trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Advertisement creative image is required.' });
    }

    const cleanDestUrl = sanitizeHttpUrl(destinationUrl);
    if (!cleanDestUrl) {
      return res.status(400).json({
        success: false,
        error: 'A valid destination website URL (https://...) is required.',
      });
    }

    const allowedPlacements: string[] = Array.isArray(activeSub.placement_eligibility_snapshot)
      ? activeSub.placement_eligibility_snapshot
      : ['school_blog_article_footer'];
    const targetPlacement = String(placementType || 'school_blog_article_footer');
    if (!allowedPlacements.includes(targetPlacement) && !allowedPlacements.includes('all')) {
      return res.status(403).json({
        success: false,
        error: 'Your current subscription plan does not permit the selected placement option.',
      });
    }

    const maxDuration = Number(activeSub.campaign_duration_days_snapshot || 30);
    const parsedDuration = Math.min(
      Math.max(1, Number(requestedDurationDays) || maxDuration),
      maxDuration
    );

    if (submitForReview) {
      const { count } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .in('status', ['Pending Review', 'Approved', 'Active']);

      if ((count || 0) >= Number(activeSub.max_active_campaigns_snapshot || 1)) {
        return res.status(403).json({
          success: false,
          error: `Your current plan allows a maximum of ${activeSub.max_active_campaigns_snapshot} active or pending campaign(s). Pause an active campaign or upgrade your plan.`,
        });
      }
    }

    // Company NEVER sets 'Active' or 'Approved' directly; only 'Draft' or 'Pending Review'
    const initialStatus = submitForReview ? 'Pending Review' : 'Draft';

    const { data: created, error } = await supabaseAdmin
      .from('corporate_ad_campaigns')
      .insert({
        company_id: company.id,
        subscription_id: activeSub.id,
        campaign_name: String(campaignName).trim(),
        headline: String(headline).trim(),
        ad_text: String(adText).trim(),
        creative_image_url: String(creativeImageUrl).trim(),
        destination_url: cleanDestUrl,
        cta_label: String(ctaLabel || 'Learn More').trim().slice(0, 40),
        placement_type: targetPlacement,
        requested_duration_days: parsedDuration,
        status: initialStatus,
      })
      .select()
      .single();

    if (error || !created) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Failed to save campaign.',
      });
    }

    return res.status(201).json({
      success: true,
      campaign: mapCampaignRow(created, company),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

corporateAdsRouter.patch(
  '/campaigns/:id',
  requireCorporateAuth,
  async (req: Request, res: Response) => {
    try {
      const company = req.corporateCompany;
      const { id } = req.params;
      if (!UUID_RE.test(id || '')) {
        return res.status(400).json({ success: false, error: 'Invalid campaign ID.' });
      }

      const { data: camp } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .maybeSingle();

      if (!camp) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const { action } = req.body || {};
      const nowIso = new Date().toISOString();

      if (action === 'pause') {
        if (camp.status !== 'Active') {
          return res.status(400).json({ success: false, error: 'Only Active campaigns can be paused.' });
        }
        const { data: updated } = await supabaseAdmin
          .from('corporate_ad_campaigns')
          .update({ status: 'Paused', updated_at: nowIso })
          .eq('id', camp.id)
          .select()
          .single();
        return res.json({ success: true, campaign: mapCampaignRow(updated, company) });
      }

      if (action === 'resume') {
        if (camp.status !== 'Paused' || !camp.reviewed_at) {
          return res.status(400).json({
            success: false,
            error: 'Only previously Admin-approved Paused campaigns can be resumed.',
          });
        }
        if (company.status !== 'Approved') {
          return res.status(403).json({
            success: false,
            error: 'Company must be Approved to resume campaigns.',
          });
        }
        const activeSub = await getActiveSubscriptionForCompany(company.id);
        if (!activeSub) {
          return res.status(403).json({
            success: false,
            error: 'An active corporate subscription is required to resume campaigns.',
          });
        }
        if (camp.expiry_date && new Date(camp.expiry_date).getTime() <= Date.now()) {
          return res.status(400).json({
            success: false,
            error: 'Campaign duration has expired. Please renew or create a new campaign.',
          });
        }
        const { count } = await supabaseAdmin
          .from('corporate_ad_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'Active');
        if ((count || 0) >= Number(activeSub.max_active_campaigns_snapshot || 1)) {
          return res.status(403).json({
            success: false,
            error: `Active campaign limit (${activeSub.max_active_campaigns_snapshot}) reached on your plan.`,
          });
        }

        const { data: updated } = await supabaseAdmin
          .from('corporate_ad_campaigns')
          .update({
            status: 'Active',
            subscription_id: activeSub.id,
            updated_at: nowIso,
          })
          .eq('id', camp.id)
          .select()
          .single();
        return res.json({ success: true, campaign: mapCampaignRow(updated, company) });
      }

      // Edit content / submit for Admin review
      if (!['Draft', 'Rejected', 'Paused', 'Pending Review'].includes(camp.status)) {
        return res.status(400).json({
          success: false,
          error: 'Pause the campaign before editing, or submit a new campaign.',
        });
      }

      const {
        campaignName,
        headline,
        adText,
        creativeImageUrl,
        destinationUrl,
        ctaLabel,
        requestedDurationDays,
        submitForReview,
      } = req.body || {};

      let cleanDestUrl = camp.destination_url;
      if (destinationUrl !== undefined) {
        const checked = sanitizeHttpUrl(destinationUrl);
        if (!checked) {
          return res.status(400).json({ success: false, error: 'Invalid destination URL.' });
        }
        cleanDestUrl = checked;
      }

      const activeSub = await getActiveSubscriptionForCompany(company.id);
      if (submitForReview) {
        if (company.status !== 'Approved' || !activeSub) {
          return res.status(403).json({
            success: false,
            error: 'Approved company and active subscription required to submit for review.',
          });
        }
        const { count } = await supabaseAdmin
          .from('corporate_ad_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .neq('id', camp.id)
          .in('status', ['Pending Review', 'Approved', 'Active']);
        if ((count || 0) >= Number(activeSub.max_active_campaigns_snapshot || 1)) {
          return res.status(403).json({
            success: false,
            error: `Plan limit of ${activeSub.max_active_campaigns_snapshot} active/pending campaigns reached.`,
          });
        }
      }

      const maxDuration = Number(activeSub?.campaign_duration_days_snapshot || camp.requested_duration_days || 30);
      const nextDuration =
        requestedDurationDays !== undefined
          ? Math.min(Math.max(1, Number(requestedDurationDays)), maxDuration)
          : camp.requested_duration_days;

      const nextStatus = submitForReview ? 'Pending Review' : 'Draft';

      const { data: updated, error } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .update({
          campaign_name: campaignName ? String(campaignName).trim() : camp.campaign_name,
          headline: headline ? String(headline).trim() : camp.headline,
          ad_text: adText ? String(adText).trim() : camp.ad_text,
          creative_image_url: creativeImageUrl
            ? String(creativeImageUrl).trim()
            : camp.creative_image_url,
          destination_url: cleanDestUrl,
          cta_label: ctaLabel ? String(ctaLabel).trim().slice(0, 40) : camp.cta_label,
          requested_duration_days: nextDuration,
          status: nextStatus,
          subscription_id: activeSub?.id || camp.subscription_id,
          rejection_reason: '',
          updated_at: nowIso,
        })
        .eq('id', camp.id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, campaign: mapCampaignRow(updated, company) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.delete(
  '/campaigns/:id',
  requireCorporateAuth,
  async (req: Request, res: Response) => {
    try {
      const company = req.corporateCompany;
      const { id } = req.params;
      if (!UUID_RE.test(id || '')) {
        return res.status(400).json({ success: false, error: 'Invalid campaign ID.' });
      }
      const { data: camp } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('id, status')
        .eq('id', id)
        .eq('company_id', company.id)
        .maybeSingle();

      if (!camp) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }
      if (!['Draft', 'Rejected'].includes(camp.status)) {
        return res.status(400).json({
          success: false,
          error: 'Only Draft or Rejected campaigns can be deleted.',
        });
      }

      await supabaseAdmin.from('corporate_ad_campaigns').delete().eq('id', id);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ============================================================================
// 6. ADMIN CORPORATE ADVERTISING MANAGEMENT & FINANCIAL REPORTING
// ============================================================================

corporateAdsRouter.get(
  '/admin/overview',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      await expireOverdueRecords();
      const fromParam = String(req.query.from || '').trim();
      const toParam = String(req.query.to || '').trim();

      const [companiesRes, plansRes, subsRes, paymentsRes, campaignsRes] = await Promise.all([
        supabaseAdmin.from('corporate_accounts').select('id, status'),
        supabaseAdmin.from('corporate_subscription_plans').select('id, name, is_active'),
        supabaseAdmin.from('corporate_subscriptions').select('id, status, plan_id, plan_name_snapshot'),
        supabaseAdmin.from('corporate_payments').select('*').order('created_at', { ascending: false }),
        supabaseAdmin
          .from('corporate_ad_campaigns')
          .select('id, status, impressions_count, clicks_count'),
      ]);

      const allPayments = paymentsRes.data || [];
      const fromTs = fromParam ? new Date(fromParam).getTime() : null;
      const toTs = toParam ? new Date(`${toParam}T23:59:59.999Z`).getTime() : null;

      const filteredPayments = allPayments.filter((p: any) => {
        const ts = new Date(p.paid_at || p.created_at).getTime();
        if (fromTs && !Number.isNaN(fromTs) && ts < fromTs) return false;
        if (toTs && !Number.isNaN(toTs) && ts > toTs) return false;
        return true;
      });

      const successfulPayments = filteredPayments.filter((p: any) => p.status === 'success');
      const pendingPayments = filteredPayments.filter((p: any) => p.status === 'pending');
      const failedPayments = filteredPayments.filter((p: any) => p.status === 'failed');

      const totalRevenueNaira = successfulPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount_naira || 0),
        0
      );
      const pendingAmountNaira = pendingPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount_naira || 0),
        0
      );
      const failedAmountNaira = failedPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount_naira || 0),
        0
      );

      // Revenue breakdown by plan
      const revByPlanMap = new Map<
        string,
        { planId: string; planName: string; revenueNaira: number; paymentCount: number }
      >();
      for (const p of successfulPayments) {
        const key = p.plan_id;
        const cur = revByPlanMap.get(key) || {
          planId: key,
          planName: p.plan_name_snapshot || key,
          revenueNaira: 0,
          paymentCount: 0,
        };
        cur.revenueNaira += Number(p.amount_naira || 0);
        cur.paymentCount += 1;
        revByPlanMap.set(key, cur);
      }

      const companies = companiesRes.data || [];
      const subs = subsRes.data || [];
      const campaigns = campaignsRes.data || [];

      const totalImpressions = campaigns.reduce(
        (s: number, c: any) => s + Number(c.impressions_count || 0),
        0
      );
      const totalClicks = campaigns.reduce(
        (s: number, c: any) => s + Number(c.clicks_count || 0),
        0
      );

      return res.json({
        success: true,
        overview: {
          totalRevenueNaira,
          successfulPaymentsCount: successfulPayments.length,
          pendingPaymentsCount: pendingPayments.length,
          pendingAmountNaira,
          failedPaymentsCount: failedPayments.length,
          failedAmountNaira,
          activeSubscriptionsCount: subs.filter((s: any) => s.status === 'active').length,
          expiredSubscriptionsCount: subs.filter((s: any) => s.status === 'expired').length,
          activeCampaignsCount: campaigns.filter((c: any) => c.status === 'Active').length,
          pendingCampaignsCount: campaigns.filter((c: any) => c.status === 'Pending Review').length,
          pendingCompaniesCount: companies.filter((c: any) => c.status === 'Pending').length,
          approvedCompaniesCount: companies.filter((c: any) => c.status === 'Approved').length,
          activePlansCount: (plansRes.data || []).filter((p: any) => p.is_active).length,
          totalImpressions,
          totalClicks,
          ctr:
            totalImpressions > 0
              ? Number(((totalClicks / totalImpressions) * 100).toFixed(2))
              : 0,
          revenueByPlan: Array.from(revByPlanMap.values()),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/companies',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const status = String(req.query.status || '').trim();
      const search = String(req.query.search || '').trim().toLowerCase();

      let q = supabaseAdmin
        .from('corporate_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (status && COMPANY_STATUSES.has(status)) {
        q = q.eq('status', status);
      }
      const { data, error } = await q;
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      let rows = (data || []).map(mapCompanyRow);
      if (search) {
        rows = rows.filter(
          (c: any) =>
            c.companyName.toLowerCase().includes(search) ||
            c.brandName.toLowerCase().includes(search) ||
            c.officialEmail.toLowerCase().includes(search) ||
            c.industry.toLowerCase().includes(search)
        );
      }

      return res.json({ success: true, companies: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/companies/:id/document-url',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!UUID_RE.test(id || '')) {
        return res.status(400).json({ success: false, error: 'Invalid company ID.' });
      }
      const { data: company } = await supabaseAdmin
        .from('corporate_accounts')
        .select('supporting_document_url, supporting_document_name')
        .eq('id', id)
        .maybeSingle();

      if (!company?.supporting_document_url) {
        return res.status(404).json({ success: false, error: 'No supporting document uploaded.' });
      }

      const { data: signed, error } = await supabaseAdmin.storage
        .from('corporate-verification-docs')
        .createSignedUrl(company.supporting_document_url, 600);

      if (error || !signed?.signedUrl) {
        return res.status(500).json({
          success: false,
          error: error?.message || 'Failed to generate signed document link.',
        });
      }

      return res.json({
        success: true,
        signedUrl: signed.signedUrl,
        fileName: company.supporting_document_name || 'Verification Document',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.patch(
  '/admin/companies/:id/status',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const admin = req.authUser!;
      const { id } = req.params;
      if (!UUID_RE.test(id || '')) {
        return res.status(400).json({ success: false, error: 'Invalid company ID.' });
      }
      const { status, adminFeedback = '' } = req.body || {};
      if (!COMPANY_STATUSES.has(status)) {
        return res.status(400).json({ success: false, error: 'Invalid company status.' });
      }
      if ((status === 'Rejected' || status === 'Suspended') && String(adminFeedback).trim().length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a clear reason/feedback when rejecting or suspending a company.',
        });
      }

      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('corporate_accounts')
        .update({
          status,
          admin_feedback: String(adminFeedback || '').trim(),
          reviewed_by: admin.id,
          reviewer_name: admin.name,
          reviewed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', id)
        .select()
        .single();

      if (error || !updated) {
        return res.status(404).json({ success: false, error: error?.message || 'Company not found.' });
      }

      // If rejected or suspended, suspend any active/approved campaigns immediately
      if (status === 'Suspended' || status === 'Rejected') {
        await supabaseAdmin
          .from('corporate_ad_campaigns')
          .update({
            status: 'Suspended',
            admin_feedback: `Paused due to company status change (${status}).`,
            updated_at: nowIso,
          })
          .eq('company_id', id)
          .in('status', ['Active', 'Approved', 'Pending Review']);
      }

      await logCorporateAudit({
        actorUserId: admin.id,
        actorName: admin.name,
        actorRole: admin.managerRole || admin.role,
        action: `COMPANY_STATUS_${status.toUpperCase()}`,
        targetType: 'corporate_account',
        targetId: id,
        details: {
          companyName: updated.company_name,
          status,
          adminFeedback: String(adminFeedback || '').trim(),
        },
      });

      return res.json({ success: true, company: mapCompanyRow(updated) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/plans',
  requireCorporateAdmin,
  async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('corporate_subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('monthly_price_naira', { ascending: true });
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, plans: (data || []).map(mapPlanRow) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.post(
  '/admin/plans',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const admin = req.authUser!;
      const {
        name,
        description = '',
        monthlyPriceNaira,
        durationDays = 30,
        maxActiveCampaigns = 1,
        campaignDurationDays = 30,
        placementEligibility = ['school_blog_article_footer'],
        features = [],
        isActive = true,
        sortOrder = 1,
      } = req.body || {};

      if (!name || String(name).trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Plan name is required.' });
      }
      const price = Number(monthlyPriceNaira);
      if (Number.isNaN(price) || price <= 0) {
        return res.status(400).json({ success: false, error: 'A valid positive price in Naira is required.' });
      }

      const planId = `corp_plan_${String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')}_${Date.now().toString(36)}`;

      const { data: created, error } = await supabaseAdmin
        .from('corporate_subscription_plans')
        .insert({
          id: planId,
          name: String(name).trim(),
          description: String(description).trim(),
          monthly_price_naira: price,
          currency: 'NGN',
          duration_days: Math.max(1, Number(durationDays) || 30),
          max_active_campaigns: Math.max(1, Number(maxActiveCampaigns) || 1),
          campaign_duration_days: Math.max(1, Number(campaignDurationDays) || 30),
          placement_eligibility: Array.isArray(placementEligibility) && placementEligibility.length > 0
            ? placementEligibility
            : ['school_blog_article_footer'],
          features: Array.isArray(features) ? features.filter(Boolean) : [],
          is_active: Boolean(isActive),
          sort_order: Number(sortOrder) || 1,
          created_by: admin.id,
          updated_by: admin.id,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      await logCorporateAudit({
        actorUserId: admin.id,
        actorName: admin.name,
        actorRole: admin.managerRole || admin.role,
        action: 'CORPORATE_PLAN_CREATED',
        targetType: 'corporate_subscription_plan',
        targetId: created.id,
        details: { name: created.name, monthlyPriceNaira: price },
      });

      return res.status(201).json({ success: true, plan: mapPlanRow(created) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.patch(
  '/admin/plans/:id',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const admin = req.authUser!;
      const { id } = req.params;
      const { data: existing } = await supabaseAdmin
        .from('corporate_subscription_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Corporate plan not found.' });
      }

      const b = req.body || {};
      const nextPrice =
        b.monthlyPriceNaira !== undefined
          ? Number(b.monthlyPriceNaira)
          : Number(existing.monthly_price_naira);
      if (Number.isNaN(nextPrice) || nextPrice <= 0) {
        return res.status(400).json({ success: false, error: 'Price must be positive.' });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('corporate_subscription_plans')
        .update({
          name: b.name !== undefined ? String(b.name).trim() : existing.name,
          description:
            b.description !== undefined ? String(b.description).trim() : existing.description,
          monthly_price_naira: nextPrice,
          duration_days:
            b.durationDays !== undefined
              ? Math.max(1, Number(b.durationDays))
              : existing.duration_days,
          max_active_campaigns:
            b.maxActiveCampaigns !== undefined
              ? Math.max(1, Number(b.maxActiveCampaigns))
              : existing.max_active_campaigns,
          campaign_duration_days:
            b.campaignDurationDays !== undefined
              ? Math.max(1, Number(b.campaignDurationDays))
              : existing.campaign_duration_days,
          placement_eligibility: Array.isArray(b.placementEligibility)
            ? b.placementEligibility
            : existing.placement_eligibility,
          features: Array.isArray(b.features) ? b.features.filter(Boolean) : existing.features,
          is_active: b.isActive !== undefined ? Boolean(b.isActive) : existing.is_active,
          sort_order: b.sortOrder !== undefined ? Number(b.sortOrder) : existing.sort_order,
          updated_by: admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      await logCorporateAudit({
        actorUserId: admin.id,
        actorName: admin.name,
        actorRole: admin.managerRole || admin.role,
        action: 'CORPORATE_PLAN_UPDATED',
        targetType: 'corporate_subscription_plan',
        targetId: id,
        details: { name: updated.name, monthlyPriceNaira: nextPrice, isActive: updated.is_active },
      });

      return res.json({ success: true, plan: mapPlanRow(updated) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/subscriptions',
  requireCorporateAdmin,
  async (_req: Request, res: Response) => {
    try {
      await expireOverdueRecords();
      const { data, error } = await supabaseAdmin
        .from('corporate_subscriptions')
        .select('*, corporate_accounts(company_name, brand_name, official_email)')
        .order('created_at', { ascending: false });
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({
        success: true,
        subscriptions: (data || []).map((row: any) => ({
          ...mapSubscriptionRow(row),
          companyName: row.corporate_accounts?.company_name || '',
          brandName: row.corporate_accounts?.brand_name || '',
          officialEmail: row.corporate_accounts?.official_email || '',
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/payments',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const status = String(req.query.status || '').trim();
      let q = supabaseAdmin
        .from('corporate_payments')
        .select('*, corporate_accounts(company_name, brand_name, official_email)')
        .order('created_at', { ascending: false });
      if (status && ['pending', 'success', 'failed'].includes(status)) {
        q = q.eq('status', status);
      }
      const { data, error } = await q;
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({
        success: true,
        payments: (data || []).map((row: any) => ({
          ...mapPaymentRow(row),
          companyName: row.corporate_accounts?.company_name || '',
          brandName: row.corporate_accounts?.brand_name || '',
          officialEmail: row.corporate_accounts?.official_email || '',
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/campaigns',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      await expireOverdueRecords();
      const status = String(req.query.status || '').trim();
      const search = String(req.query.search || '').trim().toLowerCase();

      let q = supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('*, corporate_accounts(company_name, brand_name, status)')
        .order('created_at', { ascending: false });

      if (status && CAMPAIGN_STATUSES.has(status)) {
        q = q.eq('status', status);
      }

      const { data, error } = await q;
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      let rows = (data || []).map((row: any) => mapCampaignRow(row));
      if (search) {
        rows = rows.filter(
          (c: any) =>
            c.campaignName.toLowerCase().includes(search) ||
            c.headline.toLowerCase().includes(search) ||
            c.companyName.toLowerCase().includes(search) ||
            c.brandName.toLowerCase().includes(search)
        );
      }

      return res.json({ success: true, campaigns: rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.patch(
  '/admin/campaigns/:id/review',
  requireCorporateAdmin,
  async (req: Request, res: Response) => {
    try {
      const admin = req.authUser!;
      const { id } = req.params;
      if (!UUID_RE.test(id || '')) {
        return res.status(400).json({ success: false, error: 'Invalid campaign ID.' });
      }

      const { action, rejectionReason = '', adminFeedback = '' } = req.body || {};
      const { data: camp } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .select('*, corporate_accounts(*)')
        .eq('id', id)
        .maybeSingle();

      if (!camp) {
        return res.status(404).json({ success: false, error: 'Campaign not found.' });
      }

      const now = new Date();
      const nowIso = now.toISOString();
      let updates: any = {
        reviewed_by: admin.id,
        reviewer_name: admin.name,
        reviewed_at: nowIso,
        updated_at: nowIso,
      };

      if (action === 'approve' || action === 'activate') {
        if (camp.corporate_accounts?.status !== 'Approved') {
          return res.status(400).json({
            success: false,
            error: 'Cannot activate campaign because the company is not Approved.',
          });
        }
        const activeSub = await getActiveSubscriptionForCompany(camp.company_id);
        if (!activeSub) {
          return res.status(400).json({
            success: false,
            error: 'Cannot activate campaign because the company has no active subscription.',
          });
        }
        const { count } = await supabaseAdmin
          .from('corporate_ad_campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', camp.company_id)
          .neq('id', camp.id)
          .eq('status', 'Active');
        if ((count || 0) >= Number(activeSub.max_active_campaigns_snapshot || 1)) {
          return res.status(400).json({
            success: false,
            error: `Company already has ${activeSub.max_active_campaigns_snapshot} active campaign(s) on their current plan.`,
          });
        }

        const durationDays = Math.min(
          Number(camp.requested_duration_days || 30),
          Number(activeSub.campaign_duration_days_snapshot || 30)
        );
        const rawEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const subEnd = new Date(activeSub.expiry_date);
        const finalExpiry = rawEnd.getTime() > subEnd.getTime() ? subEnd : rawEnd;

        updates = {
          ...updates,
          subscription_id: activeSub.id,
          status: 'Active',
          start_date: camp.start_date || nowIso,
          expiry_date: camp.expiry_date && new Date(camp.expiry_date) > now ? camp.expiry_date : finalExpiry.toISOString(),
          rejection_reason: '',
          admin_feedback: String(adminFeedback || 'Approved for School Blog placement.').trim(),
        };
      } else if (action === 'reject') {
        if (String(rejectionReason).trim().length < 3) {
          return res.status(400).json({
            success: false,
            error: 'A rejection reason is required when rejecting a campaign.',
          });
        }
        updates = {
          ...updates,
          status: 'Rejected',
          rejection_reason: String(rejectionReason).trim(),
          admin_feedback: String(rejectionReason).trim(),
        };
      } else if (action === 'pause') {
        updates = {
          ...updates,
          status: 'Paused',
          admin_feedback: String(adminFeedback || 'Paused by administrator.').trim(),
        };
      } else if (action === 'suspend' || action === 'remove') {
        updates = {
          ...updates,
          status: 'Suspended',
          rejection_reason: String(rejectionReason || adminFeedback || 'Removed by administrator.').trim(),
          admin_feedback: String(adminFeedback || rejectionReason || 'Suspended by administrator.').trim(),
        };
      } else {
        return res.status(400).json({ success: false, error: 'Unsupported review action.' });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('corporate_ad_campaigns')
        .update(updates)
        .eq('id', id)
        .select('*, corporate_accounts(company_name, brand_name, status)')
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      await logCorporateAudit({
        actorUserId: admin.id,
        actorName: admin.name,
        actorRole: admin.managerRole || admin.role,
        action: `CAMPAIGN_${String(action).toUpperCase()}`,
        targetType: 'corporate_ad_campaign',
        targetId: id,
        details: {
          campaignName: updated.campaign_name,
          companyName: updated.corporate_accounts?.company_name,
          status: updated.status,
          rejectionReason: updated.rejection_reason,
        },
      });

      return res.json({ success: true, campaign: mapCampaignRow(updated) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

corporateAdsRouter.get(
  '/admin/audit-logs',
  requireCorporateAdmin,
  async (_req: Request, res: Response) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('corporate_ad_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
      return res.json({ success: true, logs: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);
