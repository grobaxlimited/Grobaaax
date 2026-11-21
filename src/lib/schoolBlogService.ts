import {
  AdminBloggerRewardEntry,
  AdminRewardTransactionEntry,
  AdminSuspiciousViewSignal,
  ArticleRewardProgress,
  BloggerRewardSummary,
  SchoolBlogRecord,
  SchoolBlogArticle,
  SchoolBlogCategory,
  SchoolBlogReactionType,
  SchoolBlogContentBlock,
  SchoolBloggerApplication,
  SchoolBloggerAssignment,
  SchoolBlogReport,
  SchoolBlogAuditLog,
  SchoolBlogRewardMilestone,
} from '../types';
import { getAuthBearerHeaders } from './campusService';

export interface SchoolBlogViewerStatus {
  isHomeInstitution: boolean;
  isActiveBloggerForThisSchool: boolean;
  isSuspendedBloggerForThisSchool: boolean;
  bloggerRevokedStatus?: 'suspended' | 'removed' | null;
  myApplication: SchoolBloggerApplication | null;
  homeInstitutionId: string;
  homeInstitutionName: string;
  followerCount?: number;
  minFollowersRequired?: number;
  isRewardEligible?: boolean;
  hasActiveSubscription?: boolean;
  subscriptionTier?: string;
  subscriptionExpired?: boolean;
}

export interface SchoolBlogHomepageResponse {
  success: boolean;
  code?: string;
  requiresSubscription?: boolean;
  blogSuspended?: boolean;
  subscriptionTier?: string;
  subscriptionExpired?: boolean;
  blog?: SchoolBlogRecord;
  categoryCounts?: Record<string, number>;
  articles?: SchoolBlogArticle[];
  viewerStatus?: SchoolBlogViewerStatus;
  error?: string;
}

export interface SchoolBlogArticleDetailResponse {
  success: boolean;
  code?: string;
  requiresSubscription?: boolean;
  blogSuspended?: boolean;
  article?: SchoolBlogArticle;
  blog?: SchoolBlogRecord | null;
  error?: string;
}

const HOMEPAGE_CACHE_PREFIX = 'grbx_sb_home_v1_';
const HOMEPAGE_LOCAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const PREFETCH_COOLDOWN_MS = 20 * 1000;
const ARTICLE_CACHE_TTL_MS = 30 * 1000;

const homepageMemoryCache = new Map<string, { ts: number; data: SchoolBlogHomepageResponse }>();
const inflightHomepageRequests = new Map<string, Promise<SchoolBlogHomepageResponse>>();
const articleMemoryCache = new Map<string, { ts: number; data: SchoolBlogArticleDetailResponse }>();
const inflightArticleRequests = new Map<string, Promise<SchoolBlogArticleDetailResponse>>();

function normInstKey(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normUserScope(userId?: string | null): string {
  return String(userId || 'anon').trim() || 'anon';
}

function makeHomepageCacheKey(institutionKey: string, userId?: string | null): string {
  return `${normUserScope(userId)}::${normInstKey(institutionKey)}`;
}

function saveHomepageToCache(
  keys: Array<string | null | undefined>,
  userId: string | null | undefined,
  data: SchoolBlogHomepageResponse
) {
  if (!data?.success || !data?.blog) return;
  const ts = Date.now();
  const payloadStr = (() => {
    try {
      return JSON.stringify({ ts, data });
    } catch {
      return '';
    }
  })();

  const seen = new Set<string>();
  for (const rawKey of keys) {
    const k = normInstKey(rawKey);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const fullKey = makeHomepageCacheKey(k, userId);
    if (homepageMemoryCache.size > 40) {
      homepageMemoryCache.clear();
    }
    homepageMemoryCache.set(fullKey, { ts, data });

    if (payloadStr && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`${HOMEPAGE_CACHE_PREFIX}${fullKey}`, payloadStr);
      } catch {
        // Ignore storage quota errors
      }
    }
  }
}

export function getCachedSchoolBlogHomepage(
  institutionKey: string,
  userId?: string | null
): SchoolBlogHomepageResponse | null {
  const k = normInstKey(institutionKey);
  if (!k) return null;
  const fullKey = makeHomepageCacheKey(k, userId);

  const mem = homepageMemoryCache.get(fullKey);
  if (mem?.data?.success && mem.data.blog) {
    return mem.data;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${HOMEPAGE_CACHE_PREFIX}${fullKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts?: number; data?: SchoolBlogHomepageResponse };
        if (
          parsed?.data?.success &&
          parsed?.data?.blog &&
          typeof parsed.ts === 'number' &&
          Date.now() - parsed.ts <= HOMEPAGE_LOCAL_MAX_AGE_MS
        ) {
          homepageMemoryCache.set(fullKey, { ts: parsed.ts, data: parsed.data });
          return parsed.data;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return null;
}

export function invalidateSchoolBlogHomepageCache(institutionKey?: string) {
  if (!institutionKey) {
    homepageMemoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(HOMEPAGE_CACHE_PREFIX)) {
            toRemove.push(key);
          }
        }
        toRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch {}
    }
    return;
  }

  const target = normInstKey(institutionKey);
  for (const k of Array.from(homepageMemoryCache.keys())) {
    if (k.endsWith(`::${target}`)) {
      homepageMemoryCache.delete(k);
    }
  }
  if (typeof window !== 'undefined') {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(HOMEPAGE_CACHE_PREFIX) && key.endsWith(`::${target}`)) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {}
  }
}

export function invalidateSchoolBlogArticleCache(articleId?: string) {
  if (!articleId) {
    articleMemoryCache.clear();
    return;
  }
  for (const k of Array.from(articleMemoryCache.keys())) {
    if (k.endsWith(`::${articleId}`)) {
      articleMemoryCache.delete(k);
    }
  }
}

async function apiJson<T = any>(
  url: string,
  options: RequestInit = {},
  withAuth: boolean = false
): Promise<{ ok: boolean; status: number; data: T }> {
  const baseHeaders: Record<string, string> = withAuth
    ? await getAuthBearerHeaders()
    : { 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { success: false, error: 'Unexpected server response.' };
  }
  return { ok: res.ok, status: res.status, data: parsed as T };
}

export async function listAllSchoolBlogs(params?: { search?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category && params.category !== 'All') qs.set('category', params.category);
  const res = await apiJson<{ success: boolean; blogs?: SchoolBlogRecord[]; error?: string }>(
    `/api/school-blogs${qs.toString() ? `?${qs.toString()}` : ''}`,
    { method: 'GET' },
    true
  );
  return res.data;
}

export async function fetchSchoolBlogHomepage(params: {
  institutionKey: string;
  category?: 'All Posts' | SchoolBlogCategory;
  search?: string;
  institutionCategory?: string;
  userId?: string | null;
}): Promise<SchoolBlogHomepageResponse> {
  const isUnfilteredAll =
    (!params.category || params.category === 'All Posts') && !params.search?.trim();
  const dedupeKey = isUnfilteredAll
    ? makeHomepageCacheKey(params.institutionKey, params.userId)
    : `${makeHomepageCacheKey(params.institutionKey, params.userId)}::${params.category || ''}::${params.search || ''}`;

  const existingInflight = inflightHomepageRequests.get(dedupeKey);
  if (existingInflight) {
    return existingInflight;
  }

  const reqPromise = (async () => {
    const qs = new URLSearchParams();
    if (params.category && params.category !== 'All Posts') qs.set('category', params.category);
    if (params.search) qs.set('search', params.search);
    if (params.institutionCategory) qs.set('institutionCategory', params.institutionCategory);

    const encodedKey = encodeURIComponent(params.institutionKey);
    const res = await apiJson<SchoolBlogHomepageResponse>(
      `/api/school-blogs/institution/${encodedKey}${qs.toString() ? `?${qs.toString()}` : ''}`,
      { method: 'GET' },
      true
    );
    if (isUnfilteredAll && res.data?.success && res.data?.blog) {
      saveHomepageToCache(
        [params.institutionKey, res.data.blog.institutionId, res.data.blog.institutionName],
        params.userId,
        res.data
      );
    }
    return res.data;
  })().finally(() => {
    inflightHomepageRequests.delete(dedupeKey);
  });

  inflightHomepageRequests.set(dedupeKey, reqPromise);
  return reqPromise;
}

export function prefetchSchoolBlogHomepage(params: {
  institutionKey?: string | null;
  institutionCategory?: string;
  userId?: string | null;
}): void {
  const inst = String(params.institutionKey || '').trim();
  if (!inst) return;
  const fullKey = makeHomepageCacheKey(inst, params.userId);
  const mem = homepageMemoryCache.get(fullKey);
  if (mem && Date.now() - mem.ts < PREFETCH_COOLDOWN_MS) {
    return;
  }
  if (inflightHomepageRequests.has(fullKey)) {
    return;
  }
  fetchSchoolBlogHomepage({
    institutionKey: inst,
    institutionCategory: params.institutionCategory,
    userId: params.userId,
  }).catch(() => {});
}

export function getCachedSchoolBlogArticle(
  articleId: string,
  userId?: string | null
): SchoolBlogArticleDetailResponse | null {
  if (!articleId) return null;
  const key = `${normUserScope(userId)}::${articleId}`;
  const hit = articleMemoryCache.get(key);
  if (hit && Date.now() - hit.ts <= ARTICLE_CACHE_TTL_MS) {
    return hit.data;
  }
  return null;
}

export async function fetchSchoolBlogArticle(
  articleId: string,
  options?: { userId?: string | null; force?: boolean }
): Promise<SchoolBlogArticleDetailResponse> {
  const key = `${normUserScope(options?.userId)}::${articleId}`;
  if (!options?.force) {
    const cached = getCachedSchoolBlogArticle(articleId, options?.userId);
    if (cached) return cached;
  }

  const inflight = inflightArticleRequests.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const res = await apiJson<SchoolBlogArticleDetailResponse>(
      `/api/school-blogs/articles/${encodeURIComponent(articleId)}`,
      { method: 'GET' },
      true
    );
    if (res.data?.success && res.data.article) {
      if (articleMemoryCache.size > 100) articleMemoryCache.clear();
      articleMemoryCache.set(key, { ts: Date.now(), data: res.data });
    }
    return res.data;
  })().finally(() => {
    inflightArticleRequests.delete(key);
  });

  inflightArticleRequests.set(key, promise);
  return promise;
}

export function prefetchSchoolBlogArticle(articleId: string, userId?: string | null): void {
  if (!articleId) return;
  if (getCachedSchoolBlogArticle(articleId, userId)) return;
  fetchSchoolBlogArticle(articleId, { userId }).catch(() => {});
}

export async function trackSchoolBlogArticleView(articleId: string) {
  const res = await apiJson<{
    success: boolean;
    counted?: boolean;
    eligible?: boolean;
    reason?: string;
    viewsCount?: number;
  }>(
    `/api/school-blogs/articles/${encodeURIComponent(articleId)}/view`,
    { method: 'POST', body: JSON.stringify({}) },
    true
  );
  if (res.data?.counted) {
    invalidateSchoolBlogArticleCache(articleId);
  }
  return res.data;
}

export async function reactToSchoolBlogArticle(
  articleId: string,
  reactionType: SchoolBlogReactionType
) {
  const res = await apiJson<{
    success: boolean;
    userReaction?: SchoolBlogReactionType | null;
    reactionsCount?: number;
    reactionBreakdown?: Record<SchoolBlogReactionType, number>;
    error?: string;
  }>(
    `/api/school-blogs/articles/${encodeURIComponent(articleId)}/react`,
    {
      method: 'POST',
      body: JSON.stringify({ reactionType }),
    },
    true
  );
  if (res.data?.success) {
    invalidateSchoolBlogArticleCache(articleId);
    invalidateSchoolBlogHomepageCache();
  }
  return res.data;
}

export async function reportSchoolBlogArticle(articleId: string, reason: string) {
  const res = await apiJson<{ success: boolean; message?: string; error?: string }>(
    `/api/school-blogs/articles/${encodeURIComponent(articleId)}/report`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
    true
  );
  return res.data;
}

export async function fetchMyBloggerStatus() {
  const res = await apiJson<{
    success: boolean;
    homeInstitutionId?: string;
    homeInstitutionName?: string;
    department?: string;
    level?: string;
    followerCount?: number;
    minFollowersRequired?: number;
    isRewardEligible?: boolean;
    hasActiveSubscription?: boolean;
    subscriptionTier?: string;
    subscriptionExpired?: boolean;
    requiresSubscription?: boolean;
    activeAssignment?: SchoolBloggerAssignment | null;
    applications?: SchoolBloggerApplication[];
    error?: string;
  }>('/api/school-blogs/my-blogger-status', { method: 'GET' }, true);
  return res.data;
}

export async function submitBloggerApplication(params: {
  targetInstitutionId?: string;
  targetInstitutionName?: string;
  department?: string;
  level?: string;
  reason: string;
  experience?: string;
  additionalInfo?: string;
}) {
  const res = await apiJson<{
    success: boolean;
    activated?: boolean;
    revoked?: boolean;
    requiresSubscription?: boolean;
    code?: string;
    message?: string;
    application?: SchoolBloggerApplication;
    error?: string;
  }>(
    '/api/school-blogs/applications',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    true
  );
  if (res.data?.success) {
    invalidateSchoolBlogHomepageCache();
  }
  return res.data;
}

export async function withdrawBloggerApplication(applicationId: string) {
  const res = await apiJson<{
    success: boolean;
    message?: string;
    application?: SchoolBloggerApplication;
    error?: string;
  }>(
    `/api/school-blogs/applications/${encodeURIComponent(applicationId)}/withdraw`,
    { method: 'POST', body: JSON.stringify({}) },
    true
  );
  if (res.data?.success) {
    invalidateSchoolBlogHomepageCache();
  }
  return res.data;
}

export async function fetchBloggerStudioArticles() {
  const res = await apiJson<{
    success: boolean;
    hasActiveSubscription?: boolean;
    subscriptionTier?: string;
    subscriptionExpired?: boolean;
    requiresSubscription?: boolean;
    assignment?: SchoolBloggerAssignment;
    articles?: SchoolBlogArticle[];
    error?: string;
  }>('/api/school-blogs/studio/articles', { method: 'GET' }, true);
  return res.data;
}

export interface BloggerRewardsResponse {
  success: boolean;
  assignment?: SchoolBloggerAssignment;
  summary?: BloggerRewardSummary;
  articleProgress?: ArticleRewardProgress[];
  milestones?: SchoolBlogRewardMilestone[];
  error?: string;
}

export async function fetchBloggerRewards(): Promise<BloggerRewardsResponse> {
  const res = await apiJson<BloggerRewardsResponse>(
    '/api/school-blogs/studio/rewards',
    { method: 'GET' },
    true
  );
  return res.data;
}

export async function uploadSchoolBlogImage(dataUrl: string, fileName: string) {
  const res = await apiJson<{
    success: boolean;
    code?: string;
    requiresSubscription?: boolean;
    imageUrl?: string;
    storagePath?: string;
    error?: string;
  }>(
    '/api/school-blogs/studio/upload-image',
    {
      method: 'POST',
      body: JSON.stringify({ dataUrl, fileName }),
    },
    true
  );
  return res.data;
}

export async function createSchoolBlogArticle(params: {
  targetInstitutionId: string;
  title: string;
  excerpt?: string;
  category: SchoolBlogCategory;
  coverImageUrl: string;
  contentBlocks: SchoolBlogContentBlock[];
  contentText?: string;
  status: 'draft' | 'published';
}) {
  const res = await apiJson<{
    success: boolean;
    code?: string;
    requiresSubscription?: boolean;
    message?: string;
    article?: SchoolBlogArticle;
    error?: string;
  }>(
    '/api/school-blogs/studio/articles',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    true
  );
  if (res.data?.success) {
    invalidateSchoolBlogHomepageCache();
  }
  return res.data;
}

export async function updateSchoolBlogArticle(
  articleId: string,
  params: {
    title?: string;
    excerpt?: string;
    category?: SchoolBlogCategory;
    coverImageUrl?: string;
    contentBlocks?: SchoolBlogContentBlock[];
    contentText?: string;
    status?: 'draft' | 'published' | 'unpublished';
  }
) {
  const res = await apiJson<{
    success: boolean;
    code?: string;
    requiresSubscription?: boolean;
    message?: string;
    article?: SchoolBlogArticle;
    error?: string;
  }>(
    `/api/school-blogs/studio/articles/${encodeURIComponent(articleId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(params),
    },
    true
  );
  if (res.data?.success) {
    invalidateSchoolBlogArticleCache(articleId);
    invalidateSchoolBlogHomepageCache();
  }
  return res.data;
}

// ----------------- ADMIN FUNCTIONS -----------------

export interface AdminSchoolBlogOverview {
  success: boolean;
  summary?: {
    totalInstitutionsWithBlogs: number;
    activeInstitutionsCount?: number;
    totalApplicationsCount?: number;
    pendingApplicationsCount: number;
    rejectedApplicationsCount?: number;
    withdrawnApplicationsCount?: number;
    activeBloggersCount: number;
    suspendedBloggersCount?: number;
    removedBloggersCount?: number;
    publishedArticlesCount: number;
    totalArticlesCount: number;
    openReportsCount: number;
  };
  rewardSummary?: {
    totalGpCredited: number;
    totalMilestonesPaid: number;
    totalEligibleViews: number;
    rewardedBloggersCount: number;
    flaggedAnomaliesCount: number;
  };
  blogs?: Array<SchoolBlogRecord & { totalArticlesCount?: number }>;
  applications?: SchoolBloggerApplication[];
  bloggers?: SchoolBloggerAssignment[];
  articles?: SchoolBlogArticle[];
  reports?: SchoolBlogReport[];
  auditLogs?: SchoolBlogAuditLog[];
  bloggerRewards?: AdminBloggerRewardEntry[];
  rewardMilestones?: Array<
    SchoolBlogRewardMilestone & { bloggerName?: string; institutionName?: string }
  >;
  rewardTransactions?: AdminRewardTransactionEntry[];
  suspiciousActivity?: AdminSuspiciousViewSignal[];
  error?: string;
}

export async function fetchAdminSchoolBlogOverview(): Promise<AdminSchoolBlogOverview> {
  const res = await apiJson<AdminSchoolBlogOverview>(
    '/api/school-blogs/admin/overview',
    { method: 'GET' },
    true
  );
  return res.data;
}

export async function adminUpdateSchoolBlogStatus(
  institutionId: string,
  status: 'active' | 'suspended',
  reason?: string,
  description?: string
) {
  const res = await apiJson<{
    success: boolean;
    message?: string;
    blog?: SchoolBlogRecord;
    error?: string;
  }>(
    `/api/school-blogs/admin/blogs/${encodeURIComponent(institutionId)}/status`,
    { method: 'POST', body: JSON.stringify({ status, reason, description }) },
    true
  );
  return res.data;
}

export async function adminApproveBloggerApplication(applicationId: string, reviewNotes?: string) {
  const res = await apiJson<{
    success: boolean;
    message?: string;
    application?: SchoolBloggerApplication;
    assignment?: SchoolBloggerAssignment;
    error?: string;
  }>(
    `/api/school-blogs/admin/applications/${encodeURIComponent(applicationId)}/approve`,
    { method: 'POST', body: JSON.stringify({ reviewNotes }) },
    true
  );
  return res.data;
}

export async function adminRejectBloggerApplication(applicationId: string, reviewNotes?: string) {
  const res = await apiJson<{
    success: boolean;
    message?: string;
    application?: SchoolBloggerApplication;
    error?: string;
  }>(
    `/api/school-blogs/admin/applications/${encodeURIComponent(applicationId)}/reject`,
    { method: 'POST', body: JSON.stringify({ reviewNotes }) },
    true
  );
  return res.data;
}

export async function adminUpdateBloggerStatus(
  assignmentId: string,
  status: 'active' | 'suspended' | 'removed',
  reason?: string
) {
  const res = await apiJson<{
    success: boolean;
    message?: string;
    assignment?: SchoolBloggerAssignment;
    error?: string;
  }>(
    `/api/school-blogs/admin/bloggers/${encodeURIComponent(assignmentId)}/status`,
    { method: 'POST', body: JSON.stringify({ status, reason }) },
    true
  );
  return res.data;
}

export async function adminModerateSchoolBlogArticle(
  articleId: string,
  action: 'remove' | 'unpublish' | 'restore',
  reason?: string
) {
  const res = await apiJson<{
    success: boolean;
    message?: string;
    article?: SchoolBlogArticle;
    error?: string;
  }>(
    `/api/school-blogs/admin/articles/${encodeURIComponent(articleId)}/moderate`,
    { method: 'POST', body: JSON.stringify({ action, reason }) },
    true
  );
  return res.data;
}

export async function adminDismissBlogReport(reportId: string) {
  const res = await apiJson<{ success: boolean; message?: string; error?: string }>(
    `/api/school-blogs/admin/reports/${encodeURIComponent(reportId)}/dismiss`,
    { method: 'POST', body: JSON.stringify({}) },
    true
  );
  return res.data;
}
