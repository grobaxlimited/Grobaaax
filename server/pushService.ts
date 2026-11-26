import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { supabaseAdmin, isSuperAdmin } from '../src/lib/supabase';
import { isPrimarySuperAdmin } from '../src/lib/adminPermissions';
import bundledAppletConfig from '../firebase-applet-config.json';

export type PushCategory =
  | 'connections'
  | 'messages'
  | 'announcements'
  | 'school_dome'
  | 'competitions'
  | 'school_blog'
  | 'wallet'
  | 'system';

export type PushCategoriesMap = Record<PushCategory, boolean>;

export const DEFAULT_PUSH_CATEGORIES: PushCategoriesMap = {
  connections: true,
  messages: true,
  announcements: true,
  school_dome: true,
  competitions: true,
  school_blog: true,
  wallet: true,
  system: true,
};

export interface UserPushPreferences {
  userId: string;
  pushEnabled: boolean;
  categories: PushCategoriesMap;
  updatedAt: string;
}

export interface DispatchPushParams {
  eventType: string;
  category?: PushCategory;
  title: string;
  body: string;
  actionUrl?: string;
  notificationId?: string;
  dedupeKey?: string;
  recipientUserId?: string;
  recipientUserIds?: string[];
  targetRole?: string;
  excludeUserId?: string;
  data?: Record<string, string>;
}

export interface DispatchPushResult {
  success: boolean;
  configured: boolean;
  status: 'sent' | 'skipped' | 'unconfigured' | 'partial' | 'failed';
  eligibleUsers: number;
  targetedDevices: number;
  sentCount: number;
  failedCount: number;
  deactivatedTokens: number;
  reason?: string;
}

const INVALID_FCM_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
  'UNREGISTERED',
  'INVALID_ARGUMENT',
]);

const SUSPENDED_USER_STATUSES = new Set([
  'suspended',
  'deleted',
  'banned',
  'disabled',
  'inactive',
  'flagged',
  'restricted',
  'bot',
]);

const recentDedupeMemoryCache = new Map<string, number>();

let cachedAppletConfig: Record<string, string> | null = null;
let firebaseAdminInitAttempted = false;
let firebaseAdminApp: App | null = null;
let firebaseAdminCredentialError: string | null = null;

function readAppletConfigFile(): Record<string, string> {
  if (cachedAppletConfig) return cachedAppletConfig;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        cachedAppletConfig = parsed;
        return cachedAppletConfig!;
      }
    }
  } catch (err: any) {
    console.warn('[PushService] Could not parse firebase-applet-config.json:', err?.message || err);
  }
  if (bundledAppletConfig && typeof bundledAppletConfig === 'object') {
    cachedAppletConfig = bundledAppletConfig as unknown as Record<string, string>;
    return cachedAppletConfig;
  }
  cachedAppletConfig = {};
  return cachedAppletConfig;
}

export function getPublicFirebaseClientConfig() {
  const fileCfg = readAppletConfigFile();
  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY || fileCfg.apiKey || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || fileCfg.authDomain || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || fileCfg.projectId || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || fileCfg.storageBucket || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileCfg.messagingSenderId || '',
    appId: process.env.VITE_FIREBASE_APP_ID || fileCfg.appId || '',
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || fileCfg.measurementId || '',
  };
}

export function getVapidPublicKey(): string {
  return String(
    process.env.VITE_FIREBASE_VAPID_KEY ||
      process.env.FIREBASE_VAPID_KEY ||
      process.env.ITE_FIREBASE_VAPID_KEY ||
      ''
  ).trim();
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  let rawJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (
    (rawJson.startsWith("'") && rawJson.endsWith("'")) ||
    (rawJson.startsWith('"') && rawJson.endsWith('"') && !rawJson.startsWith('{"'))
  ) {
    rawJson = rawJson.slice(1, -1).trim();
  }
  if (rawJson) {
    try {
      const decoded = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed.client_email && parsed.private_key) {
        return parsed as ServiceAccount;
      }
    } catch (err: any) {
      firebaseAdminCredentialError = `Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${err?.message || 'parse error'}`;
      return null;
    }
  }

  const projectId = String(
    process.env.FIREBASE_PROJECT_ID || getPublicFirebaseClientConfig().projectId || ''
  ).trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKeyRaw = String(process.env.FIREBASE_PRIVATE_KEY || '').trim();

  if (projectId && clientEmail && privateKeyRaw) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    };
  }

  const credPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (credPath && fs.existsSync(credPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed.client_email && parsed.private_key) {
        return parsed as ServiceAccount;
      }
    } catch (err: any) {
      firebaseAdminCredentialError = `Invalid GOOGLE_APPLICATION_CREDENTIALS file: ${err?.message || 'parse error'}`;
      return null;
    }
  }

  return null;
}

function getFirebaseAdminMessaging(): Messaging | null {
  if (firebaseAdminApp) {
    return getMessaging(firebaseAdminApp);
  }

  if (firebaseAdminInitAttempted && !firebaseAdminApp) {
    // Retry if env vars were injected dynamically after boot
    const existing = getApps().find((a) => a?.name === 'grobaax-push');
    if (existing) {
      firebaseAdminApp = existing;
      return getMessaging(firebaseAdminApp);
    }
  }

  firebaseAdminInitAttempted = true;
  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    return null;
  }

  try {
    const existing = getApps().find((a) => a?.name === 'grobaax-push');
    firebaseAdminApp =
      existing ||
      initializeApp(
        {
          credential: cert(serviceAccount),
          projectId:
            (serviceAccount as any).project_id ||
            serviceAccount.projectId ||
            getPublicFirebaseClientConfig().projectId ||
            undefined,
        },
        'grobaax-push'
      );
    firebaseAdminCredentialError = null;
    return getMessaging(firebaseAdminApp);
  } catch (err: any) {
    firebaseAdminCredentialError = err?.message || 'Failed to initialize Firebase Admin Messaging';
    console.warn('[PushService] Firebase Admin init notice:', firebaseAdminCredentialError);
    return null;
  }
}

export function getPushConfigurationStatus() {
  const clientConfig = getPublicFirebaseClientConfig();
  const vapidPublicKey = getVapidPublicKey();
  const serviceAccount = parseServiceAccountFromEnv();
  const clientReady = Boolean(
    clientConfig.apiKey &&
      clientConfig.projectId &&
      clientConfig.messagingSenderId &&
      clientConfig.appId
  );
  const vapidReady = Boolean(vapidPublicKey);
  const serverReady = Boolean(serviceAccount);
  const serverProjectId = String(
    (serviceAccount as any)?.project_id || serviceAccount?.projectId || ''
  ).trim();
  const clientProjectId = String(clientConfig.projectId || '').trim();
  const projectMismatch = Boolean(
    serverProjectId && clientProjectId && serverProjectId !== clientProjectId
  );

  const missingKeys: string[] = [];
  if (!clientReady) {
    missingKeys.push('VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_MESSAGING_SENDER_ID / VITE_FIREBASE_APP_ID');
  }
  if (!vapidReady) {
    missingKeys.push('VITE_FIREBASE_VAPID_KEY');
  }
  if (!serverReady) {
    missingKeys.push('FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)');
  }
  if (projectMismatch) {
    missingKeys.push(
      `Matching VITE_FIREBASE_* project config (frontend uses ${clientProjectId}, service account uses ${serverProjectId})`
    );
  }

  const mismatchError = projectMismatch
    ? `Firebase project mismatch: client uses "${clientProjectId}" while server service account uses "${serverProjectId}".`
    : null;

  return {
    firebaseConfigReady: clientReady,
    vapidConfigured: vapidReady,
    serverDeliveryConfigured: serverReady,
    projectMismatch,
    pushFullyConfigured: clientReady && vapidReady && serverReady && !projectMismatch,
    credentialError: firebaseAdminCredentialError || mismatchError,
    missingKeys,
  };
}

export function getPublicPushConfig() {
  const status = getPushConfigurationStatus();
  return {
    firebaseConfig: getPublicFirebaseClientConfig(),
    vapidPublicKey: getVapidPublicKey(),
    ...status,
  };
}

export function resolvePushCategory(
  rawType?: string | null,
  actionUrl?: string | null,
  title?: string | null
): PushCategory {
  const t = String(rawType || '').toLowerCase().trim();
  const a = String(actionUrl || '').toLowerCase().trim();
  const h = String(title || '').toLowerCase().trim();

  if (t === 'campus' || a.includes('campus') || a.includes('connection') || h.includes('connection')) {
    return 'connections';
  }
  if (t === 'message' || t === 'messages' || t === 'chat' || a.includes('chat')) {
    return 'messages';
  }
  if (t === 'wallet' || t === 'reward' || a.includes('wallet') || h.includes('gp reward')) {
    return 'wallet';
  }
  if (t === 'school_blog' || a.includes('school-blog') || a.includes('school_blog') || h.includes('school blog') || h.includes('blogger')) {
    return 'school_blog';
  }
  if (t === 'dome' || t === 'arena' || a.includes('school_dome') || a.includes('dome') || h.includes('school dome')) {
    return 'school_dome';
  }
  if (t === 'gus' || t === 'league' || a.includes('gus') || a.includes('league') || h.includes('result') || h.includes('tournament') || h.includes('competition')) {
    return 'competitions';
  }
  if (t === 'announcement' || h.includes('announcement') || h.includes('broadcast')) {
    return 'announcements';
  }
  return 'system';
}

export function resolvePushDestinationUrl(actionUrl?: string | null, category?: PushCategory): string {
  const raw = String(actionUrl || '').trim();
  let dest = raw;

  if (!dest) {
    switch (category) {
      case 'connections':
        dest = '/community?tab=campus&view=connections';
        break;
      case 'messages':
        dest = '/community?tab=campus&view=connections';
        break;
      case 'school_dome':
        dest = '/school_dome';
        break;
      case 'competitions':
        dest = '/gus';
        break;
      case 'school_blog':
        dest = '/school-blog';
        break;
      case 'wallet':
        dest = '/wallet';
        break;
      default:
        dest = '/home';
        break;
    }
  }

  // Normalize bare action strings like "school_dome" or "school_dome_results" or "#school_dome"
  const clean = dest.replace(/^#/, '');
  return `/?push_dest=${encodeURIComponent(clean)}`;
}

export function sanitizeNotificationPreview(text: string, maxLen: number = 150): string {
  let cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  // Redact email addresses, long numeric tokens, and WhatsApp links/phone numbers for lock-screen privacy
  cleaned = cleaned.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email hidden]');
  cleaned = cleaned.replace(/https?:\/\/wa\.me\/\S+/gi, 'WhatsApp');
  cleaned = cleaned.replace(/\+?\d[\d\s-]{8,}\d/g, '[number]');
  if (cleaned.length > maxLen) {
    return `${cleaned.slice(0, maxLen - 1).trim()}…`;
  }
  return cleaned;
}

export function sanitizeNotificationTitle(title: string, maxLen: number = 70): string {
  const cleaned = String(title || 'Grobaax Update').replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1).trim()}…` : cleaned;
}

function normalizeCategories(raw: any): PushCategoriesMap {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    connections: src.connections !== false,
    messages: src.messages !== false,
    announcements: src.announcements !== false,
    school_dome: src.school_dome !== false,
    competitions: src.competitions !== false,
    school_blog: src.school_blog !== false,
    wallet: src.wallet !== false,
    system: src.system !== false,
  };
}

function mergeLegacyPrefsIntoCategories(legacy: any, categories: PushCategoriesMap): PushCategoriesMap {
  if (!legacy || typeof legacy !== 'object') return categories;
  return {
    ...categories,
    school_dome: legacy.matchAlerts === false ? false : categories.school_dome,
    competitions: (legacy.gusAlerts === false || legacy.gusReminders === false) ? false : categories.competitions,
    wallet: (legacy.walletAlerts === false || legacy.walletTransactions === false) ? false : categories.wallet,
    connections: legacy.communityMentions === false ? false : categories.connections,
    announcements: legacy.adminBroadcasts === false ? false : categories.announcements,
  };
}

export async function getUserPushPreferences(userId: string): Promise<UserPushPreferences> {
  const [{ data: prefRow }, { data: userRow }] = await Promise.all([
    supabaseAdmin
      .from('push_notification_preferences')
      .select('user_id, push_enabled, categories, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const legacy = userRow?.data?.notificationPreferences;
  if (prefRow) {
    return {
      userId,
      pushEnabled: prefRow.push_enabled !== false,
      categories: normalizeCategories(prefRow.categories),
      updatedAt: prefRow.updated_at || new Date().toISOString(),
    };
  }

  const pushEnabled =
    legacy && typeof legacy === 'object'
      ? legacy.enablePush !== false && legacy.pushEnabled !== false
      : true;

  return {
    userId,
    pushEnabled,
    categories: mergeLegacyPrefsIntoCategories(legacy, { ...DEFAULT_PUSH_CATEGORIES }),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateUserPushPreferences(
  userId: string,
  patch: { pushEnabled?: boolean; categories?: Partial<PushCategoriesMap> }
): Promise<UserPushPreferences> {
  const current = await getUserPushPreferences(userId);
  const nextPushEnabled =
    typeof patch.pushEnabled === 'boolean' ? patch.pushEnabled : current.pushEnabled;
  const nextCategories = normalizeCategories({
    ...current.categories,
    ...(patch.categories || {}),
  });
  const nowIso = new Date().toISOString();

  await supabaseAdmin.from('push_notification_preferences').upsert(
    {
      user_id: userId,
      push_enabled: nextPushEnabled,
      categories: nextCategories,
      updated_at: nowIso,
    },
    { onConflict: 'user_id' }
  );

  // Sync compatible flags onto users.data.notificationPreferences for seamless preservation
  try {
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('id, data')
      .eq('id', userId)
      .maybeSingle();

    if (userRow?.data) {
      const existingLegacy =
        userRow.data.notificationPreferences && typeof userRow.data.notificationPreferences === 'object'
          ? userRow.data.notificationPreferences
          : {};
      await supabaseAdmin
        .from('users')
        .update({
          data: {
            ...userRow.data,
            notificationPreferences: {
              ...existingLegacy,
              enablePush: nextPushEnabled,
              pushEnabled: nextPushEnabled,
              matchAlerts: nextCategories.school_dome,
              gusAlerts: nextCategories.competitions,
              gusReminders: nextCategories.competitions,
              walletAlerts: nextCategories.wallet,
              walletTransactions: nextCategories.wallet,
              communityMentions: nextCategories.connections,
              adminBroadcasts: nextCategories.announcements,
            },
            updatedAt: nowIso,
          },
          updated_at: nowIso,
        })
        .eq('id', userId);
    }
  } catch (syncErr: any) {
    console.warn('[PushService] Preference mirror notice:', syncErr?.message || syncErr);
  }

  return {
    userId,
    pushEnabled: nextPushEnabled,
    categories: nextCategories,
    updatedAt: nowIso,
  };
}

export async function registerUserPushDevice(params: {
  userId: string;
  token: string;
  platform?: 'web_android' | 'web_ios' | 'web_desktop';
  browser?: string;
  deviceLabel?: string;
  userAgent?: string;
  isStandalone?: boolean;
}) {
  const token = String(params.token || '').trim();
  if (!token || token.length < 20 || token.length > 4096) {
    throw new Error('Invalid FCM device registration token.');
  }

  const platform =
    params.platform === 'web_android' || params.platform === 'web_ios' || params.platform === 'web_desktop'
      ? params.platform
      : 'web_desktop';
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('push_device_tokens')
    .upsert(
      {
        user_id: params.userId,
        token,
        platform,
        browser: String(params.browser || 'Browser').slice(0, 80),
        device_label: String(params.deviceLabel || 'Web Device').slice(0, 120),
        user_agent: String(params.userAgent || '').slice(0, 400),
        is_standalone: Boolean(params.isStandalone),
        is_active: true,
        failed_count: 0,
        last_error: null,
        last_seen_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'token' }
    )
    .select('id, user_id, platform, browser, device_label, is_standalone, is_active, last_seen_at, created_at')
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to save push device token.');
  }

  // Ensure user has a default preference row created cleanly if none exists
  await supabaseAdmin
    .from('push_notification_preferences')
    .upsert(
      {
        user_id: params.userId,
        push_enabled: true,
        categories: DEFAULT_PUSH_CATEGORIES,
        updated_at: nowIso,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  return {
    id: data.id,
    userId: data.user_id,
    platform: data.platform,
    browser: data.browser,
    deviceLabel: data.device_label,
    isStandalone: Boolean(data.is_standalone),
    isActive: Boolean(data.is_active),
    lastSeenAt: data.last_seen_at,
    createdAt: data.created_at,
  };
}

export async function listUserPushDevices(userId: string, currentToken?: string) {
  const { data, error } = await supabaseAdmin
    .from('push_device_tokens')
    .select('id, token, platform, browser, device_label, is_standalone, is_active, failed_count, last_error, last_seen_at, created_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(error.message || 'Failed to fetch registered devices.');
  }

  const trimmedCurrent = String(currentToken || '').trim();
  return (data || [])
    .filter((d: any) => d.is_active !== false)
    .map((d: any) => ({
      id: d.id,
      platform: d.platform,
      browser: d.browser,
      deviceLabel: d.device_label,
      isStandalone: Boolean(d.is_standalone),
      isCurrentDevice: Boolean(trimmedCurrent && d.token === trimmedCurrent),
      tokenSuffix: typeof d.token === 'string' && d.token.length > 10 ? `…${d.token.slice(-8)}` : '',
      lastSeenAt: d.last_seen_at,
      createdAt: d.created_at,
    }));
}

export async function removeUserPushDevice(userId: string, deviceId: string): Promise<boolean> {
  const { error, count } = await supabaseAdmin
    .from('push_device_tokens')
    .delete({ count: 'exact' })
    .eq('id', deviceId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to remove device.');
  }
  return Number(count || 0) > 0;
}

export async function unregisterUserPushDeviceByToken(userId: string, token: string): Promise<boolean> {
  const clean = String(token || '').trim();
  if (!clean) return false;
  const { error, count } = await supabaseAdmin
    .from('push_device_tokens')
    .delete({ count: 'exact' })
    .eq('token', clean)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to unregister token.');
  }
  return Number(count || 0) > 0;
}

function isUserActiveRow(rawUser: any): boolean {
  if (!rawUser || typeof rawUser !== 'object') return false;
  if (rawUser.isDeleted === true || rawUser.isBot === true || rawUser.isFlagged === true) return false;
  const status = String(rawUser.accountStatus || 'active').toLowerCase().trim();
  return !SUSPENDED_USER_STATUSES.has(status);
}

function userMatchesTargetRole(userId: string, rawUser: any, targetRole?: string): boolean {
  const roleTarget = String(targetRole || 'ALL').trim();
  if (!roleTarget || roleTarget.toUpperCase() === 'ALL') return true;
  const uRole = String(rawUser?.role || 'student').toLowerCase().trim();

  if (roleTarget === 'admin') {
    return (
      uRole === 'admin' ||
      uRole === 'super_admin' ||
      uRole === 'moderator' ||
      uRole === 'manager' ||
      Boolean(rawUser?.isAdmin || rawUser?.isSuperAdmin || rawUser?.managerRole) ||
      isSuperAdmin(userId, rawUser?.email) ||
      isPrimarySuperAdmin(userId, rawUser?.email)
    );
  }
  if (roleTarget === 'representative') {
    return Boolean(rawUser?.isRepresentative || uRole === 'representative');
  }
  if (roleTarget === 'student') {
    return uRole === 'student' || (!rawUser?.isAdmin && !rawUser?.isSuperAdmin);
  }
  return uRole === roleTarget.toLowerCase();
}

async function claimDeliveryDedupe(
  dedupeKey: string | undefined,
  eventType: string,
  category: PushCategory,
  recipientKey: string,
  notificationId?: string
): Promise<boolean> {
  if (!dedupeKey) return true;

  const now = Date.now();
  // Clean expired memory keys
  if (recentDedupeMemoryCache.size > 2000) {
    for (const [k, exp] of recentDedupeMemoryCache.entries()) {
      if (exp <= now) recentDedupeMemoryCache.delete(k);
    }
  }
  const existingMem = recentDedupeMemoryCache.get(dedupeKey);
  if (existingMem && existingMem > now) {
    return false;
  }
  recentDedupeMemoryCache.set(dedupeKey, now + 10 * 60 * 1000);

  try {
    const { error } = await supabaseAdmin.from('push_delivery_logs').insert({
      dedupe_key: dedupeKey,
      notification_id: notificationId || null,
      event_type: eventType,
      category,
      recipient_user_id: recipientKey,
      status: 'pending',
    });
    if (error) {
      if (error.code === '23505') {
        return false;
      }
    }
  } catch {}
  return true;
}

async function updateDeliveryLog(
  dedupeKey: string | undefined,
  patch: { status: string; sentCount?: number; failedCount?: number; errorCode?: string | null }
) {
  if (!dedupeKey) return;
  try {
    await supabaseAdmin
      .from('push_delivery_logs')
      .update({
        status: patch.status,
        sent_count: patch.sentCount ?? 0,
        failed_count: patch.failedCount ?? 0,
        error_code: patch.errorCode || null,
      })
      .eq('dedupe_key', dedupeKey);
  } catch {}
}

export async function dispatchExternalPush(params: DispatchPushParams): Promise<DispatchPushResult> {
  const category = params.category || resolvePushCategory(params.eventType, params.actionUrl, params.title);
  const title = sanitizeNotificationTitle(params.title);
  const body = sanitizeNotificationPreview(params.body);
  const destinationUrl = resolvePushDestinationUrl(params.actionUrl, category);
  const recipientKey = params.recipientUserId || (params.recipientUserIds?.length ? 'multi' : `role:${params.targetRole || 'ALL'}`);
  const normalizedDedupeKey = params.dedupeKey ? `${params.dedupeKey}:${recipientKey}` : undefined;

  const canProceed = await claimDeliveryDedupe(
    normalizedDedupeKey,
    params.eventType,
    category,
    recipientKey,
    params.notificationId
  );

  if (!canProceed) {
    return {
      success: true,
      configured: getPushConfigurationStatus().serverDeliveryConfigured,
      status: 'skipped',
      eligibleUsers: 0,
      targetedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      deactivatedTokens: 0,
      reason: 'Duplicate push prevented',
    };
  }

  try {
    // 1. Resolve candidate active device tokens first (fast path: only query preferences for users who actually have active devices!)
    let tokenQuery = supabaseAdmin
      .from('push_device_tokens')
      .select('id, user_id, token, platform, failed_count')
      .eq('is_active', true);

    if (params.recipientUserId) {
      tokenQuery = tokenQuery.eq('user_id', params.recipientUserId);
    } else if (Array.isArray(params.recipientUserIds) && params.recipientUserIds.length > 0) {
      tokenQuery = tokenQuery.in('user_id', params.recipientUserIds);
    }

    const { data: tokenRows, error: tokenErr } = await tokenQuery.limit(5000);
    if (tokenErr) {
      await updateDeliveryLog(normalizedDedupeKey, { status: 'failed', errorCode: tokenErr.message });
      return {
        success: false,
        configured: false,
        status: 'failed',
        eligibleUsers: 0,
        targetedDevices: 0,
        sentCount: 0,
        failedCount: 0,
        deactivatedTokens: 0,
        reason: tokenErr.message,
      };
    }

    const rawTokens = (tokenRows || []).filter(
      (r: any) => r.token && (!params.excludeUserId || r.user_id !== params.excludeUserId)
    );

    if (rawTokens.length === 0) {
      const serverConfigured = Boolean(getFirebaseAdminMessaging());
      await updateDeliveryLog(normalizedDedupeKey, {
        status: serverConfigured ? 'skipped' : 'unconfigured',
        errorCode: serverConfigured ? 'NO_ACTIVE_DEVICES' : 'FCM_UNCONFIGURED',
      });
      return {
        success: true,
        configured: serverConfigured,
        status: 'skipped',
        eligibleUsers: 0,
        targetedDevices: 0,
        sentCount: 0,
        failedCount: 0,
        deactivatedTokens: 0,
        reason: 'No active registered devices for target audience',
      };
    }

    const candidateUserIds = Array.from(new Set(rawTokens.map((t: any) => String(t.user_id))));

    // 2. Verify users are active, match targetRole (for broadcasts), and respect push notification preferences
    const userMap = new Map<string, any>();
    const prefMap = new Map<string, { pushEnabled: boolean; categories: PushCategoriesMap }>();

    for (let i = 0; i < candidateUserIds.length; i += 150) {
      const slice = candidateUserIds.slice(i, i + 150);
      const [{ data: uRows }, { data: pRows }] = await Promise.all([
        supabaseAdmin.from('users').select('id, data').in('id', slice),
        supabaseAdmin
          .from('push_notification_preferences')
          .select('user_id, push_enabled, categories')
          .in('user_id', slice),
      ]);
      for (const u of uRows || []) userMap.set(u.id, u.data);
      for (const p of pRows || []) {
        prefMap.set(p.user_id, {
          pushEnabled: p.push_enabled !== false,
          categories: normalizeCategories(p.categories),
        });
      }
    }

    const eligibleUserIds = new Set<string>();
    for (const uid of candidateUserIds) {
      const uData = userMap.get(uid);
      if (uData && !isUserActiveRow(uData)) continue;

      if (!params.recipientUserId && !(params.recipientUserIds?.length)) {
        if (!userMatchesTargetRole(uid, uData || {}, params.targetRole)) continue;
      }

      const explicitPref = prefMap.get(uid);
      const legacyPref = uData?.notificationPreferences;
      const pushEnabled = explicitPref
        ? explicitPref.pushEnabled
        : legacyPref
        ? legacyPref.enablePush !== false && legacyPref.pushEnabled !== false
        : true;
      if (!pushEnabled) continue;

      const effectiveCats = explicitPref
        ? explicitPref.categories
        : mergeLegacyPrefsIntoCategories(legacyPref, { ...DEFAULT_PUSH_CATEGORIES });
      if (effectiveCats[category] === false) continue;

      eligibleUserIds.add(uid);
    }

    const eligibleTokens = rawTokens.filter((t: any) => eligibleUserIds.has(String(t.user_id)));
    if (eligibleTokens.length === 0) {
      const serverConfigured = Boolean(getFirebaseAdminMessaging());
      await updateDeliveryLog(normalizedDedupeKey, {
        status: 'skipped',
        errorCode: 'PREFERENCES_OR_AUDIENCE_FILTERED',
      });
      return {
        success: true,
        configured: serverConfigured,
        status: 'skipped',
        eligibleUsers: 0,
        targetedDevices: 0,
        sentCount: 0,
        failedCount: 0,
        deactivatedTokens: 0,
        reason: 'Filtered out by recipient preferences or audience role',
      };
    }

    // 3. Verify FCM Admin SDK credentials exist
    const messaging = getFirebaseAdminMessaging();
    if (!messaging) {
      await updateDeliveryLog(normalizedDedupeKey, {
        status: 'unconfigured',
        errorCode: 'MISSING_FIREBASE_SERVICE_ACCOUNT',
      });
      return {
        success: true,
        configured: false,
        status: 'unconfigured',
        eligibleUsers: eligibleUserIds.size,
        targetedDevices: eligibleTokens.length,
        sentCount: 0,
        failedCount: 0,
        deactivatedTokens: 0,
        reason: firebaseAdminCredentialError || 'Firebase Admin service account credentials are not configured on the server.',
      };
    }

    // 4. Deliver via FCM Multicast in batches of 500
    let sentCount = 0;
    let failedCount = 0;
    let deactivatedTokens = 0;
    let lastErrorCode: string | null = null;
    const tag = `grobaax-${category}-${params.notificationId || Date.now()}`;

    for (let i = 0; i < eligibleTokens.length; i += 500) {
      const batch = eligibleTokens.slice(i, i + 500);
      const tokenStrings = batch.map((b: any) => String(b.token));

      const response = await messaging.sendEachForMulticast({
        tokens: tokenStrings,
        notification: {
          title,
          body,
        },
        data: {
          title,
          body,
          url: destinationUrl,
          destination: String(params.actionUrl || ''),
          category,
          eventType: params.eventType,
          notificationId: String(params.notificationId || ''),
          icon: '/pwa-192x192.png',
          badge: '/favicon.png',
          tag,
          ...(params.data || {}),
        },
        webpush: {
          headers: {
            Urgency: category === 'school_dome' || category === 'connections' ? 'high' : 'normal',
          },
          notification: {
            title,
            body,
            icon: '/pwa-192x192.png',
            badge: '/favicon.png',
            tag,
            renotify: false,
          },
          fcmOptions: {
            link: destinationUrl,
          },
        },
      });

      sentCount += response.successCount;
      failedCount += response.failureCount;

      const invalidIds: string[] = [];
      const softFailUpdates: Array<{ id: string; code: string; prevCount: number }> = [];

      response.responses.forEach((r, idx) => {
        if (!r.success && r.error) {
          const code = String(r.error.code || r.error.message || 'UNKNOWN_FCM_ERROR');
          lastErrorCode = code;
          const row = batch[idx];
          if (INVALID_FCM_TOKEN_CODES.has(code) || code.includes('not-registered') || code.includes('UNREGISTERED')) {
            invalidIds.push(row.id);
          } else {
            softFailUpdates.push({
              id: row.id,
              code,
              prevCount: Number(row.failed_count || 0),
            });
          }
        }
      });

      if (invalidIds.length > 0) {
        deactivatedTokens += invalidIds.length;
        await supabaseAdmin
          .from('push_device_tokens')
          .update({
            is_active: false,
            last_error: 'UNREGISTERED_TOKEN',
            updated_at: new Date().toISOString(),
          })
          .in('id', invalidIds);
      }

      if (softFailUpdates.length > 0) {
        await Promise.all(
          softFailUpdates.map((sf) =>
            supabaseAdmin
              .from('push_device_tokens')
              .update({
                failed_count: sf.prevCount + 1,
                last_error: sf.code.slice(0, 180),
                is_active: sf.prevCount + 1 < 5,
                updated_at: new Date().toISOString(),
              })
              .eq('id', sf.id)
          )
        );
      }
    }

    const finalStatus: DispatchPushResult['status'] =
      sentCount > 0 && failedCount === 0
        ? 'sent'
        : sentCount > 0
        ? 'partial'
        : 'failed';

    await updateDeliveryLog(normalizedDedupeKey, {
      status: finalStatus,
      sentCount,
      failedCount,
      errorCode: lastErrorCode,
    });

    return {
      success: sentCount > 0 || failedCount === 0,
      configured: true,
      status: finalStatus,
      eligibleUsers: eligibleUserIds.size,
      targetedDevices: eligibleTokens.length,
      sentCount,
      failedCount,
      deactivatedTokens,
      reason: lastErrorCode || undefined,
    };
  } catch (err: any) {
    console.warn('[PushService] dispatchExternalPush exception:', err?.message || err);
    await updateDeliveryLog(normalizedDedupeKey, {
      status: 'failed',
      errorCode: String(err?.message || 'EXCEPTION').slice(0, 180),
    });
    return {
      success: false,
      configured: Boolean(getFirebaseAdminMessaging()),
      status: 'failed',
      eligibleUsers: 0,
      targetedDevices: 0,
      sentCount: 0,
      failedCount: 0,
      deactivatedTokens: 0,
      reason: err?.message || 'Push dispatch failed',
    };
  }
}

export async function deactivateTokensByIds(tokenIds: string[]) {
  if (!tokenIds.length) return;
  await supabaseAdmin
    .from('push_device_tokens')
    .update({ is_active: false, last_error: 'UNREGISTERED_TOKEN', updated_at: new Date().toISOString() })
    .in('id', tokenIds);
}
