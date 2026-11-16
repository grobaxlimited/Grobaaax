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
  myApplication: SchoolBloggerApplication | null;
  homeInstitutionId: string;
  homeInstitutionName: string;
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
}): Promise<SchoolBlogHomepageResponse> {
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
  return res.data;
}

export async function fetchSchoolBlogArticle(articleId: string) {
  const res = await apiJson<{
    success: boolean;
    code?: string;
    requiresSubscription?: boolean;
    blogSuspended?: boolean;
    article?: SchoolBlogArticle;
    blog?: SchoolBlogRecord | null;
    error?: string;
  }>(`/api/school-blogs/articles/${encodeURIComponent(articleId)}`, { method: 'GET' }, true);
  return res.data;
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
    activeAssignment?: SchoolBloggerAssignment | null;
    applications?: SchoolBloggerApplication[];
    error?: string;
  }>('/api/school-blogs/my-blogger-status', { method: 'GET' }, true);
  return res.data;
}

export async function submitBloggerApplication(params: {
  targetInstitutionId?: string;
  targetInstitutionName?: string;
  reason: string;
  experience: string;
}) {
  const res = await apiJson<{
    success: boolean;
    code?: string;
    requiresSubscription?: boolean;
    subscriptionExpired?: boolean;
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
  return res.data;
}

export async function fetchBloggerStudioArticles() {
  const res = await apiJson<{
    success: boolean;
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
  return res.data;
}

// ----------------- ADMIN FUNCTIONS -----------------

export interface AdminSchoolBlogOverview {
  success: boolean;
  summary?: {
    totalInstitutionsWithBlogs: number;
    activeInstitutionsCount?: number;
    pendingApplicationsCount: number;
    activeBloggersCount: number;
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
