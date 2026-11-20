import { getAuthBearerHeaders } from './campusService';

export type CorporateAccountStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended';
export type CorporateCampaignStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Active'
  | 'Paused'
  | 'Expired'
  | 'Suspended';

export type SponsorTickerMode = 'none' | 'included' | 'required' | 'optional_upgrade';

export interface CorporateAccount {
  id: string;
  authUserId: string;
  accountType: 'corporate_advertiser';
  accountSource?: 'external_signup' | 'grobaax_user';
  companyName: string;
  brandName: string;
  logoUrl?: string;
  brandHighlightColor?: string;
  industry: string;
  registrationNumber: string;
  website: string;
  description: string;
  contactName: string;
  officialEmail: string;
  phone: string;
  address: string;
  country: string;
  state: string;
  supportingDocumentUrl: string;
  supportingDocumentName: string;
  status: CorporateAccountStatus;
  adminFeedback: string;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CorporatePlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceNaira: number;
  currency: string;
  durationDays: number;
  maxActiveCampaigns: number;
  campaignDurationDays: number;
  placementEligibility: string[];
  sponsorTickerMode?: SponsorTickerMode;
  maxTickerCampaigns?: number;
  tickerCampaignDurationDays?: number;
  tickerUpgradePriceNaira?: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CorporateSubscription {
  id: string;
  companyId: string;
  planId: string;
  paymentId?: string | null;
  paymentReference: string;
  planNameSnapshot: string;
  monthlyPriceSnapshot: number;
  durationDaysSnapshot: number;
  maxActiveCampaignsSnapshot: number;
  campaignDurationDaysSnapshot: number;
  placementEligibilitySnapshot: string[];
  sponsorTickerModeSnapshot?: SponsorTickerMode;
  maxTickerCampaignsSnapshot?: number;
  tickerCampaignDurationDaysSnapshot?: number;
  tickerUpgradePriceSnapshot?: number;
  tickerUpgradeActive?: boolean;
  tickerUpgradePaymentId?: string | null;
  status: 'active' | 'expired' | 'superseded' | string;
  startDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  brandName?: string;
  officialEmail?: string;
}

export interface CorporatePayment {
  id: string;
  companyId: string;
  subscriptionId?: string | null;
  planId: string;
  planNameSnapshot: string;
  purchaseType?: 'plan_subscription' | 'ticker_upgrade' | string;
  reference: string;
  receiptNumber?: string | null;
  amountNaira: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  channel: string;
  gatewayResponse: string;
  paidAt?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  brandName?: string;
  officialEmail?: string;
}

export interface CorporateAdCampaign {
  id: string;
  companyId: string;
  companyName?: string;
  brandName?: string;
  logoUrl?: string;
  brandHighlightColor?: string;
  companyStatus?: CorporateAccountStatus | string;
  subscriptionId?: string | null;
  campaignName: string;
  headline: string;
  adText: string;
  creativeImageUrl: string;
  destinationUrl: string;
  ctaLabel: string;
  placementType: string;
  requestedDurationDays: number;
  status: CorporateCampaignStatus;
  adminFeedback: string;
  rejectionReason: string;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  impressionsCount: number;
  clicksCount: number;
  ctr: number;
  lastServedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSponsoredBlogAd {
  campaignId: string;
  brandName: string;
  companyName: string;
  logoUrl?: string;
  brandHighlightColor?: string;
  headline: string;
  adText: string;
  creativeImageUrl: string;
  destinationUrl: string;
  ctaLabel: string;
  placementType: string;
}

export interface CorporateAnalyticsSummary {
  totalCampaigns: number;
  activeCampaignsCount: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
}

export interface CorporateTickerCampaign {
  id: string;
  companyId: string;
  companyName?: string;
  brandName?: string;
  brandHighlightColor?: string;
  companyStatus?: CorporateAccountStatus | string;
  subscriptionId?: string | null;
  campaignName: string;
  shortMessage: string;
  headline: string;
  fullDescription: string;
  ctaLabel: string;
  destinationUrl: string;
  requestedDurationDays: number;
  status: CorporateCampaignStatus;
  adminFeedback: string;
  rejectionReason: string;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  barImpressionsCount: number;
  barClicksCount: number;
  detailViewsCount: number;
  websiteClicksCount: number;
  websiteCtr: number;
  lastServedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSponsorTickerItem {
  tickerId: string;
  companyId: string;
  brandName: string;
  companyName: string;
  brandHighlightColor?: string;
  shortMessage: string;
  headline: string;
  fullDescription: string;
  ctaLabel: string;
  destinationUrl: string;
}

export interface CorporateTickerStats {
  totalTickerCampaigns: number;
  activeTickerCampaigns: number;
  pendingTickerCampaigns: number;
  totalBarImpressions: number;
  totalBarClicks: number;
  totalDetailViews: number;
  totalWebsiteClicks: number;
}

export interface CorporateAdminOverview {
  totalRevenueNaira: number;
  successfulPaymentsCount: number;
  pendingPaymentsCount: number;
  pendingAmountNaira: number;
  failedPaymentsCount: number;
  failedAmountNaira: number;
  activeSubscriptionsCount: number;
  expiredSubscriptionsCount: number;
  activeCampaignsCount: number;
  pendingCampaignsCount: number;
  totalCompaniesCount?: number;
  pendingCompaniesCount: number;
  approvedCompaniesCount: number;
  rejectedCompaniesCount?: number;
  suspendedCompaniesCount?: number;
  activePlansCount: number;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  activeTickerCampaignsCount?: number;
  pendingTickerCampaignsCount?: number;
  tickerStats?: CorporateTickerStats;
  revenueByPlan: Array<{
    planId: string;
    planName: string;
    revenueNaira: number;
    paymentCount: number;
  }>;
}

export interface CorporateAuditLog {
  id: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

const CORP_ACCESS_TOKEN_KEY = 'grobaax_corp_access_token';
const CORP_REFRESH_TOKEN_KEY = 'grobaax_corp_refresh_token';
const CORP_COMPANY_CACHE_KEY = 'grobaax_corp_company';
const CORP_PREFILL_STORAGE_KEY = 'grobaax_corp_completion_prefill';

export interface StudentCompletionPrefill {
  officialEmail: string;
  contactName?: string;
  phone?: string;
}

export function getStoredCompletionPrefill(): StudentCompletionPrefill | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CORP_PREFILL_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudentCompletionPrefill) : null;
  } catch {
    return null;
  }
}

export function setStoredCompletionPrefill(prefill: StudentCompletionPrefill | null) {
  if (typeof window === 'undefined') return;
  try {
    if (prefill) {
      window.sessionStorage.setItem(CORP_PREFILL_STORAGE_KEY, JSON.stringify(prefill));
    } else {
      window.sessionStorage.removeItem(CORP_PREFILL_STORAGE_KEY);
    }
  } catch {}
}

export function getStoredCorporateToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(CORP_ACCESS_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getStoredCorporateCompany(): CorporateAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CORP_COMPANY_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CorporateAccount) : null;
  } catch {
    return null;
  }
}

export function setCorporateSession(params: {
  accessToken: string;
  refreshToken?: string;
  company?: CorporateAccount | null;
}) {
  if (typeof window === 'undefined') return;
  try {
    if (params.accessToken) {
      window.localStorage.setItem(CORP_ACCESS_TOKEN_KEY, params.accessToken);
    }
    if (params.refreshToken) {
      window.localStorage.setItem(CORP_REFRESH_TOKEN_KEY, params.refreshToken);
    }
    if (params.company) {
      window.localStorage.setItem(CORP_COMPANY_CACHE_KEY, JSON.stringify(params.company));
    }
  } catch {}
}

export function clearCorporateSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CORP_ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(CORP_REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(CORP_COMPANY_CACHE_KEY);
    window.sessionStorage.removeItem(CORP_PREFILL_STORAGE_KEY);
  } catch {}
}

async function parseJsonSafe<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return { success: false, error: 'Unexpected server response.' } as unknown as T;
  }
}

async function corporateFetch<T = any>(
  path: string,
  options: RequestInit = {},
  authMode: 'none' | 'corporate' | 'admin' = 'none'
): Promise<T & { success?: boolean; error?: string; code?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authMode === 'corporate') {
    const token = getStoredCorporateToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } else if (authMode === 'admin') {
    const adminHeaders = await getAuthBearerHeaders();
    Object.assign(headers, adminHeaders);
  }

  try {
    const res = await fetch(`/api/corporate${path}`, {
      ...options,
      headers,
    });

    if (authMode === 'corporate' && res.status === 401) {
      clearCorporateSession();
    }

    return parseJsonSafe<T & { success?: boolean; error?: string; code?: string }>(res);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unable to reach Corporate Portal server.',
    } as T & { success?: boolean; error?: string; code?: string };
  }
}

// ---------------------------------------------------------------------------
// Public endpoints (Plans + School Blog Ad Serving & Deduplicated Tracking)
// ---------------------------------------------------------------------------

export async function fetchPublicCorporatePlans(): Promise<{
  success: boolean;
  plans: CorporatePlan[];
  error?: string;
}> {
  const data = await corporateFetch<{ plans?: CorporatePlan[] }>('/plans', { method: 'GET' }, 'none');
  return {
    success: Boolean(data.success),
    plans: Array.isArray(data.plans) ? data.plans : [],
    error: data.error,
  };
}

export async function serveSchoolBlogAd(params: {
  articleId?: string;
  institutionId?: string;
}): Promise<{ success: boolean; ad: PublicSponsoredBlogAd | null }> {
  const qs = new URLSearchParams();
  if (params.articleId) qs.set('articleId', params.articleId);
  if (params.institutionId) qs.set('institutionId', params.institutionId);
  try {
    const res = await fetch(
      `/api/corporate/serve-ad${qs.toString() ? `?${qs.toString()}` : ''}`,
      { method: 'GET' }
    );
    const data = await parseJsonSafe<{ success?: boolean; ad?: PublicSponsoredBlogAd | null }>(res);
    return { success: Boolean(data.success), ad: data.ad || null };
  } catch {
    return { success: false, ad: null };
  }
}

export async function recordCorporateAdImpression(params: {
  campaignId: string;
  articleId: string;
  institutionId?: string;
}) {
  try {
    const headers = await getAuthBearerHeaders().catch(() => ({
      'Content-Type': 'application/json',
    }));
    const res = await fetch(
      `/api/corporate/ads/${encodeURIComponent(params.campaignId)}/impression`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          articleId: params.articleId,
          institutionId: params.institutionId || '',
        }),
      }
    );
    return await parseJsonSafe(res);
  } catch {
    return { success: false };
  }
}

export async function recordCorporateAdClick(params: {
  campaignId: string;
  articleId: string;
  institutionId?: string;
}) {
  try {
    const headers = await getAuthBearerHeaders().catch(() => ({
      'Content-Type': 'application/json',
    }));
    const res = await fetch(
      `/api/corporate/ads/${encodeURIComponent(params.campaignId)}/click`,
      {
        method: 'POST',
        headers,
        keepalive: true,
        body: JSON.stringify({
          articleId: params.articleId,
          institutionId: params.institutionId || '',
        }),
      }
    );
    return await parseJsonSafe(res);
  } catch {
    return { success: false };
  }
}

export async function fetchActiveSponsorTickerAds(): Promise<{
  success: boolean;
  items: PublicSponsorTickerItem[];
}> {
  try {
    const res = await fetch('/api/corporate/ticker/active', { method: 'GET' });
    const data = await parseJsonSafe<{ success?: boolean; items?: PublicSponsorTickerItem[] }>(res);
    return {
      success: Boolean(data.success),
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch {
    return { success: false, items: [] };
  }
}

export async function recordSponsorTickerEvents(params: {
  eventType: 'bar_impression' | 'bar_click' | 'detail_view' | 'website_click';
  tickerId?: string;
  tickerIds?: string[];
}) {
  try {
    const headers = await getAuthBearerHeaders().catch(() => ({
      'Content-Type': 'application/json',
    }));
    const res = await fetch('/api/corporate/ticker/events', {
      method: 'POST',
      headers,
      keepalive: params.eventType === 'website_click',
      body: JSON.stringify(params),
    });
    return await parseJsonSafe<{
      success?: boolean;
      recordedCount?: number;
      destinationUrl?: string;
    }>(res);
  } catch {
    return { success: false };
  }
}

// ---------------------------------------------------------------------------
// Corporate Account Auth & Workspace
// ---------------------------------------------------------------------------

export interface CorporateRegistrationPayload {
  companyName: string;
  brandName: string;
  industry: string;
  registrationNumber?: string;
  website?: string;
  description: string;
  contactName: string;
  officialEmail: string;
  phone: string;
  address: string;
  country: string;
  state: string;
  password: string;
  brandHighlightColor?: string;
  companyLogo?: {
    dataUrl: string;
    fileName: string;
  } | null;
  supportingDocument?: {
    dataUrl: string;
    fileName: string;
  } | null;
}

export async function registerCorporateAccount(payload: CorporateRegistrationPayload) {
  const data = await corporateFetch<{
    accessToken?: string;
    refreshToken?: string;
    company?: CorporateAccount;
  }>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'none'
  );
  if (data.success && data.accessToken && data.company) {
    setStoredCompletionPrefill(null);
    setCorporateSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      company: data.company,
    });
  }
  return data;
}

export async function loginCorporateAccount(email: string, password: string) {
  const data = await corporateFetch<{
    accessToken?: string;
    refreshToken?: string;
    company?: CorporateAccount;
    requiresApplicationCompletion?: boolean;
    prefill?: StudentCompletionPrefill;
  }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    'none'
  );
  if (data.success && data.accessToken && data.company) {
    setStoredCompletionPrefill(null);
    setCorporateSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      company: data.company,
    });
  } else if (data.success && data.accessToken && data.requiresApplicationCompletion) {
    setCorporateSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    if (data.prefill) {
      setStoredCompletionPrefill(data.prefill);
    }
  }
  return data;
}

export async function completeCorporateApplication(
  payload: Omit<CorporateRegistrationPayload, 'password'>
) {
  const data = await corporateFetch<{
    accessToken?: string;
    company?: CorporateAccount;
  }>(
    '/auth/complete-application',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'corporate'
  );
  if (data.success && data.company) {
    setStoredCompletionPrefill(null);
    setCorporateSession({
      accessToken: data.accessToken || getStoredCorporateToken(),
      company: data.company,
    });
  }
  return data;
}

export function logoutCorporateAccount() {
  clearCorporateSession();
}

export async function requestCorporatePasswordReset(email: string) {
  return corporateFetch<{ message?: string }>(
    '/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
    'none'
  );
}

export async function completeCorporatePasswordReset(
  recoveryToken: string,
  newPassword: string
) {
  const data = await corporateFetch<{
    accessToken?: string;
    refreshToken?: string;
    company?: CorporateAccount;
  }>(
    '/auth/reset-password',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${recoveryToken}`,
      },
      body: JSON.stringify({ newPassword }),
    },
    'none'
  );
  if (data.success && data.accessToken && data.company) {
    setCorporateSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      company: data.company,
    });
  }
  return data;
}

export async function fetchCorporateMe() {
  const data = await corporateFetch<{
    company?: CorporateAccount;
    activeSubscription?: CorporateSubscription | null;
    latestSubscription?: CorporateSubscription | null;
    analyticsSummary?: CorporateAnalyticsSummary;
  }>('/me', { method: 'GET' }, 'corporate');
  if (data.success && data.company) {
    setCorporateSession({
      accessToken: getStoredCorporateToken(),
      company: data.company,
    });
  }
  return data;
}

export async function updateCorporateProfile(payload: {
  brandName?: string;
  website?: string;
  description?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  country?: string;
  state?: string;
  registrationNumber?: string;
  brandHighlightColor?: string;
  logoUrl?: string;
}) {
  const data = await corporateFetch<{ company?: CorporateAccount }>(
    '/profile',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    'corporate'
  );
  if (data.success && data.company) {
    setCorporateSession({
      accessToken: getStoredCorporateToken(),
      company: data.company,
    });
  }
  return data;
}

export async function uploadCorporateMedia(params: {
  kind: 'creative' | 'verification_doc' | 'logo';
  dataUrl: string;
  fileName: string;
}) {
  const data = await corporateFetch<{
    imageUrl?: string;
    path?: string;
    fileName?: string;
    company?: CorporateAccount;
  }>(
    '/upload-media',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    'corporate'
  );
  if (data.success && data.company) {
    setCorporateSession({
      accessToken: getStoredCorporateToken(),
      company: data.company,
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Billing & Paystack Payments
// ---------------------------------------------------------------------------

export async function initializeCorporatePayment(
  planId: string,
  callbackUrl?: string,
  purchaseType: 'plan_subscription' | 'ticker_upgrade' = 'plan_subscription'
) {
  return corporateFetch<{
    reference?: string;
    authorizationUrl?: string;
    accessCode?: string;
    amountNaira?: number;
    currency?: string;
    plan?: CorporatePlan;
  }>(
    '/payments/initialize',
    {
      method: 'POST',
      body: JSON.stringify({ planId, callbackUrl, purchaseType }),
    },
    'corporate'
  );
}

export async function verifyCorporatePayment(reference: string) {
  return corporateFetch<{
    verified?: boolean;
    idempotent?: boolean;
    isPending?: boolean;
    status?: string;
    payment?: CorporatePayment;
    subscription?: CorporateSubscription | null;
  }>(
    '/payments/verify',
    {
      method: 'POST',
      body: JSON.stringify({ reference }),
    },
    'corporate'
  );
}

export async function fetchCorporateBilling() {
  return corporateFetch<{
    activeSubscription?: CorporateSubscription | null;
    subscriptions?: CorporateSubscription[];
    payments?: CorporatePayment[];
  }>('/billing', { method: 'GET' }, 'corporate');
}

// ---------------------------------------------------------------------------
// Corporate Campaigns
// ---------------------------------------------------------------------------

export async function fetchCorporateCampaigns() {
  return corporateFetch<{ campaigns?: CorporateAdCampaign[] }>(
    '/campaigns',
    { method: 'GET' },
    'corporate'
  );
}

export async function createCorporateCampaign(payload: {
  campaignName: string;
  headline: string;
  adText: string;
  creativeImageUrl: string;
  destinationUrl: string;
  ctaLabel?: string;
  placementType?: string;
  requestedDurationDays?: number;
  submitForReview?: boolean;
  brandHighlightColor?: string;
  applyColorToBrand?: boolean;
}) {
  return corporateFetch<{ campaign?: CorporateAdCampaign }>(
    '/campaigns',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'corporate'
  );
}

export async function updateCorporateCampaign(
  id: string,
  payload:
    | { action: 'pause' | 'resume' }
    | {
        campaignName?: string;
        headline?: string;
        adText?: string;
        creativeImageUrl?: string;
        destinationUrl?: string;
        ctaLabel?: string;
        requestedDurationDays?: number;
        submitForReview?: boolean;
        brandHighlightColor?: string;
        applyColorToBrand?: boolean;
      }
) {
  return corporateFetch<{ campaign?: CorporateAdCampaign }>(
    `/campaigns/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'corporate'
  );
}

export async function deleteCorporateCampaign(id: string) {
  return corporateFetch(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'corporate');
}

// ---------------------------------------------------------------------------
// Corporate Sponsor Ticker Campaigns (Text-only, Isolated from Blog Campaigns)
// ---------------------------------------------------------------------------

export async function fetchCorporateTickerCampaigns() {
  return corporateFetch<{ tickerCampaigns?: CorporateTickerCampaign[] }>(
    '/ticker-campaigns',
    { method: 'GET' },
    'corporate'
  );
}

export async function createCorporateTickerCampaign(payload: {
  campaignName: string;
  shortMessage: string;
  headline: string;
  fullDescription: string;
  destinationUrl: string;
  ctaLabel?: string;
  requestedDurationDays?: number;
  submitForReview?: boolean;
  brandHighlightColor?: string;
  applyColorToBrand?: boolean;
}) {
  return corporateFetch<{ tickerCampaign?: CorporateTickerCampaign }>(
    '/ticker-campaigns',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'corporate'
  );
}

export async function updateCorporateTickerCampaign(
  id: string,
  payload:
    | { action: 'pause' | 'resume' }
    | {
        campaignName?: string;
        shortMessage?: string;
        headline?: string;
        fullDescription?: string;
        destinationUrl?: string;
        ctaLabel?: string;
        requestedDurationDays?: number;
        submitForReview?: boolean;
        brandHighlightColor?: string;
        applyColorToBrand?: boolean;
      }
) {
  return corporateFetch<{ tickerCampaign?: CorporateTickerCampaign }>(
    `/ticker-campaigns/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'corporate'
  );
}

export async function deleteCorporateTickerCampaign(id: string) {
  return corporateFetch(`/ticker-campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'corporate');
}

// ---------------------------------------------------------------------------
// Main Admin Dashboard Endpoints (uses Student Admin JWT cleanly)
// ---------------------------------------------------------------------------

export async function adminFetchCorporateOverview(from?: string, to?: string) {
  const qs = new URLSearchParams();
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  return corporateFetch<{ overview?: CorporateAdminOverview }>(
    `/admin/overview${qs.toString() ? `?${qs.toString()}` : ''}`,
    { method: 'GET' },
    'admin'
  );
}

export async function adminFetchCorporateCompanies(status?: string, search?: string) {
  const qs = new URLSearchParams();
  if (status && status !== 'All') qs.set('status', status);
  if (search) qs.set('search', search);
  return corporateFetch<{ companies?: CorporateAccount[] }>(
    `/admin/companies${qs.toString() ? `?${qs.toString()}` : ''}`,
    { method: 'GET' },
    'admin'
  );
}

export async function adminFetchCompanyDocumentUrl(companyId: string) {
  return corporateFetch<{ signedUrl?: string; fileName?: string }>(
    `/admin/companies/${encodeURIComponent(companyId)}/document-url`,
    { method: 'GET' },
    'admin'
  );
}

export async function adminUpdateCompanyStatus(
  companyId: string,
  status: CorporateAccountStatus,
  adminFeedback: string = ''
) {
  return corporateFetch<{ company?: CorporateAccount }>(
    `/admin/companies/${encodeURIComponent(companyId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status, adminFeedback }),
    },
    'admin'
  );
}

export async function adminFetchCorporatePlans() {
  return corporateFetch<{ plans?: CorporatePlan[] }>('/admin/plans', { method: 'GET' }, 'admin');
}

export async function adminCreateCorporatePlan(payload: {
  name: string;
  description: string;
  monthlyPriceNaira: number;
  durationDays: number;
  maxActiveCampaigns: number;
  campaignDurationDays: number;
  placementEligibility: string[];
  sponsorTickerMode?: SponsorTickerMode;
  maxTickerCampaigns?: number;
  tickerCampaignDurationDays?: number;
  tickerUpgradePriceNaira?: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}) {
  return corporateFetch<{ plan?: CorporatePlan }>(
    '/admin/plans',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'admin'
  );
}

export async function adminUpdateCorporatePlan(
  planId: string,
  payload: Partial<{
    name: string;
    description: string;
    monthlyPriceNaira: number;
    durationDays: number;
    maxActiveCampaigns: number;
    campaignDurationDays: number;
    placementEligibility: string[];
    sponsorTickerMode: SponsorTickerMode;
    maxTickerCampaigns: number;
    tickerCampaignDurationDays: number;
    tickerUpgradePriceNaira: number;
    features: string[];
    isActive: boolean;
    sortOrder: number;
  }>
) {
  return corporateFetch<{ plan?: CorporatePlan }>(
    `/admin/plans/${encodeURIComponent(planId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'admin'
  );
}

export async function adminFetchCorporateSubscriptions() {
  return corporateFetch<{ subscriptions?: CorporateSubscription[] }>(
    '/admin/subscriptions',
    { method: 'GET' },
    'admin'
  );
}

export async function adminFetchCorporatePayments(status?: string) {
  const qs = new URLSearchParams();
  if (status && status !== 'All') qs.set('status', status);
  return corporateFetch<{ payments?: CorporatePayment[] }>(
    `/admin/payments${qs.toString() ? `?${qs.toString()}` : ''}`,
    { method: 'GET' },
    'admin'
  );
}

export async function adminFetchCorporateCampaigns(status?: string, search?: string) {
  const qs = new URLSearchParams();
  if (status && status !== 'All') qs.set('status', status);
  if (search) qs.set('search', search);
  return corporateFetch<{ campaigns?: CorporateAdCampaign[] }>(
    `/admin/campaigns${qs.toString() ? `?${qs.toString()}` : ''}`,
    { method: 'GET' },
    'admin'
  );
}

export async function adminReviewCorporateCampaign(
  campaignId: string,
  payload: {
    action: 'approve' | 'reject' | 'pause' | 'suspend';
    rejectionReason?: string;
    adminFeedback?: string;
  }
) {
  return corporateFetch<{ campaign?: CorporateAdCampaign }>(
    `/admin/campaigns/${encodeURIComponent(campaignId)}/review`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'admin'
  );
}

export async function adminFetchCorporateAuditLogs() {
  return corporateFetch<{ logs?: CorporateAuditLog[] }>(
    '/admin/audit-logs',
    { method: 'GET' },
    'admin'
  );
}

export async function adminFetchCorporateTickerCampaigns(status?: string, search?: string) {
  const qs = new URLSearchParams();
  if (status && status !== 'All') qs.set('status', status);
  if (search) qs.set('search', search);
  return corporateFetch<{ tickerCampaigns?: CorporateTickerCampaign[] }>(
    `/admin/ticker-campaigns${qs.toString() ? `?${qs.toString()}` : ''}`,
    { method: 'GET' },
    'admin'
  );
}

export async function adminReviewCorporateTickerCampaign(
  tickerId: string,
  payload: {
    action: 'approve' | 'reject' | 'pause' | 'suspend';
    rejectionReason?: string;
    adminFeedback?: string;
  }
) {
  return corporateFetch<{ tickerCampaign?: CorporateTickerCampaign }>(
    `/admin/ticker-campaigns/${encodeURIComponent(tickerId)}/review`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    'admin'
  );
}

export async function adminDeleteCorporateTickerCampaign(tickerId: string) {
  return corporateFetch(
    `/admin/ticker-campaigns/${encodeURIComponent(tickerId)}`,
    { method: 'DELETE' },
    'admin'
  );
}
