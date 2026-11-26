import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
} from 'firebase/messaging';
import { supabase } from './supabase';

export type PushCategoryKey =
  | 'connections'
  | 'messages'
  | 'announcements'
  | 'school_dome'
  | 'competitions'
  | 'school_blog'
  | 'wallet'
  | 'system';

export type PushCategoriesMap = Record<PushCategoryKey, boolean>;

export interface PushPreferencesState {
  userId?: string;
  pushEnabled: boolean;
  categories: PushCategoriesMap;
  updatedAt?: string;
}

export interface PushDeviceRecord {
  id: string;
  platform: 'web_android' | 'web_ios' | 'web_desktop';
  browser: string;
  deviceLabel: string;
  isStandalone: boolean;
  isCurrentDevice: boolean;
  tokenSuffix: string;
  lastSeenAt: string;
  createdAt: string;
}

export interface PublicPushConfigResponse {
  success: boolean;
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
  vapidPublicKey: string;
  firebaseConfigReady: boolean;
  vapidConfigured: boolean;
  serverDeliveryConfigured: boolean;
  pushFullyConfigured: boolean;
  credentialError?: string | null;
  missingKeys: string[];
}

export interface BrowserPushCapability {
  supported: boolean;
  status:
    | 'granted'
    | 'ready'
    | 'denied'
    | 'ios_install_required'
    | 'ios_version_unsupported'
    | 'unsupported'
    | 'missing_vapid';
  permission: NotificationPermission | 'unsupported';
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  iosVersion: number | null;
  browserLabel: string;
  platformType: 'web_android' | 'web_ios' | 'web_desktop';
  deviceLabel: string;
  guidance: string;
}

export const FCM_TOKEN_STORAGE_KEY = 'grobaax_fcm_token';
export const FCM_TOKEN_USER_STORAGE_KEY = 'grobaax_fcm_user_id';
export const PENDING_PUSH_DEST_KEY = 'grobaax_pending_push_dest';
const FCM_SW_URL = '/firebase-messaging-sw.js';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const FCM_APP_NAME = 'grobaax-fcm';

let cachedPushConfig: PublicPushConfigResponse | null = null;
let cachedPushConfigAt = 0;

export function getStoredFcmToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export async function getSupabaseAccessToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  } catch {
    return '';
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getSupabaseAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchPublicPushConfig(forceRefresh = false): Promise<PublicPushConfigResponse | null> {
  if (!forceRefresh && cachedPushConfig && Date.now() - cachedPushConfigAt < 60_000) {
    return cachedPushConfig;
  }
  try {
    const res = await fetch('/api/notifications/push-config');
    if (!res.ok) return cachedPushConfig;
    const data = (await res.json()) as PublicPushConfigResponse;
    if (data && data.success) {
      cachedPushConfig = data;
      cachedPushConfigAt = Date.now();
      return data;
    }
  } catch {}
  return cachedPushConfig;
}

export function detectIosVersion(ua: string): number | null {
  const match = ua.match(/OS (\d+)[_.](\d+)/i);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2] || 0);
  if (Number.isNaN(major)) return null;
  return major + minor / 10;
}

export function detectBrowserAndDeviceLabel(): {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  iosVersion: number | null;
  browserLabel: string;
  platformType: 'web_android' | 'web_ios' | 'web_desktop';
  deviceLabel: string;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
      iosVersion: null,
      browserLabel: 'Web Browser',
      platformType: 'web_desktop',
      deviceLabel: 'Web Device',
    };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as any).standalone);
  const iosVersion = isIOS ? detectIosVersion(ua) : null;

  let browserLabel = 'Browser';
  if (/Edg\//i.test(ua)) browserLabel = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browserLabel = 'Opera';
  else if (/CriOS/i.test(ua)) browserLabel = 'Chrome on iOS';
  else if (/FxiOS/i.test(ua)) browserLabel = 'Firefox on iOS';
  else if (/Chrome|Chromium/i.test(ua) && !/Edg/i.test(ua)) browserLabel = 'Chrome';
  else if (/Firefox/i.test(ua)) browserLabel = 'Firefox';
  else if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) browserLabel = 'Safari';

  const platformType: 'web_android' | 'web_ios' | 'web_desktop' = isIOS
    ? 'web_ios'
    : isAndroid
    ? 'web_android'
    : 'web_desktop';

  const osName = isIOS ? 'iPhone / iPad' : isAndroid ? 'Android' : 'Desktop';
  const deviceLabel = isStandalone ? `${osName} Home App (${browserLabel})` : `${osName} (${browserLabel})`;

  return {
    isIOS,
    isAndroid,
    isStandalone,
    iosVersion,
    browserLabel,
    platformType,
    deviceLabel,
  };
}

export async function getBrowserPushCapability(
  config?: PublicPushConfigResponse | null
): Promise<BrowserPushCapability> {
  const info = detectBrowserAndDeviceLabel();
  const hasBaseApis =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  if (info.isIOS) {
    if (info.iosVersion !== null && info.iosVersion < 16.4) {
      return {
        ...info,
        supported: false,
        status: 'ios_version_unsupported',
        permission: hasBaseApis ? Notification.permission : 'unsupported',
        guidance:
          'Web push notifications on iPhone and iPad require iOS/iPadOS 16.4 or later and adding Grobaax to your Home Screen.',
      };
    }

    if (!info.isStandalone) {
      return {
        ...info,
        supported: false,
        status: 'ios_install_required',
        permission: hasBaseApis ? Notification.permission : 'unsupported',
        guidance:
          'On iPhone and iPad (iOS 16.4+), tap Share in Safari and choose "Add to Home Screen", then open Grobaax from your Home Screen icon before enabling web push notifications.',
      };
    }
  }

  let messagingSupported = false;
  try {
    messagingSupported = hasBaseApis && 'PushManager' in window && (await isSupported());
  } catch {
    messagingSupported = false;
  }

  if (!messagingSupported) {
    return {
      ...info,
      supported: false,
      status: 'unsupported',
      permission: hasBaseApis ? Notification.permission : 'unsupported',
      guidance:
        'This browser environment does not support background Web Push notifications. Use Android Chrome, supported desktop browsers, or Grobaax installed on an iOS 16.4+ Home Screen.',
    };
  }

  const permission = Notification.permission;
  const resolvedConfig = config !== undefined ? config : await fetchPublicPushConfig();
  const hasVapid = Boolean(
    resolvedConfig?.vapidPublicKey || (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY
  );

  if (permission === 'denied') {
    return {
      ...info,
      supported: true,
      status: 'denied',
      permission,
      guidance:
        'Browser notification permission is currently blocked for Grobaax. To re-enable alerts on this device, allow notifications in your browser or system site settings.',
    };
  }

  if (!hasVapid || (resolvedConfig && !resolvedConfig.firebaseConfigReady)) {
    return {
      ...info,
      supported: true,
      status: 'missing_vapid',
      permission,
      guidance:
        'Firebase Web Push (VAPID key or web app config) is not yet configured for this environment. In-app Grobaax notifications continue working normally.',
    };
  }

  if (permission === 'granted') {
    return {
      ...info,
      supported: true,
      status: 'granted',
      permission,
      guidance:
        'Browser notifications are allowed on this device. You can manage your Grobaax notification categories and registered devices below.',
    };
  }

  return {
    ...info,
    supported: true,
    status: 'ready',
    permission,
    guidance:
      'Enable push notifications to receive Grobaax alerts on your phone lock screen and notification panel, even when the tab is closed.',
  };
}

function getOrInitMessagingInstance(
  firebaseConfig: PublicPushConfigResponse['firebaseConfig']
): { app: FirebaseApp; messaging: Messaging } | null {
  try {
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId || !firebaseConfig?.appId) {
      return null;
    }
    const existing = getApps().find((a) => a.name === FCM_APP_NAME);
    const app = existing || initializeApp(firebaseConfig, FCM_APP_NAME);
    const messaging = getMessaging(app);
    return { app, messaging };
  } catch (err) {
    console.warn('[Push] Messaging init notice:', err);
    return null;
  }
}

async function getPushServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE);
    if (existing) return existing;
    return await navigator.serviceWorker.register(FCM_SW_URL, {
      scope: FCM_SW_SCOPE,
    });
  } catch (err) {
    console.warn('[Push] SW registration notice:', err);
    return null;
  }
}

async function saveTokenToBackend(token: string): Promise<{ success: boolean; device?: PushDeviceRecord; error?: string }> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) {
    return { success: false, error: 'Sign in required before registering device push token.' };
  }

  const info = detectBrowserAndDeviceLabel();
  const res = await fetch('/api/notifications/devices/register', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token,
      platform: info.platformType,
      browser: info.browserLabel,
      deviceLabel: info.deviceLabel,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      isStandalone: info.isStandalone,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return { success: false, error: data?.error || 'Could not save device token.' };
  }

  try {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {}

  return { success: true, device: data.device };
}

export async function requestPermissionAndRegisterDevice(): Promise<{
  success: boolean;
  token?: string;
  device?: PushDeviceRecord;
  permission?: NotificationPermission | 'unsupported';
  error?: string;
}> {
  const cfg = await fetchPublicPushConfig(true);
  const capability = await getBrowserPushCapability(cfg);

  if (!capability.supported) {
    return {
      success: false,
      permission: capability.permission,
      error: capability.guidance,
    };
  }

  if (capability.status === 'missing_vapid' || !cfg?.vapidPublicKey) {
    return {
      success: false,
      permission: capability.permission,
      error:
        'Missing Firebase VAPID key (VITE_FIREBASE_VAPID_KEY). Configure VAPID and service-account keys to activate device token registration.',
    };
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      error:
        permission === 'denied'
          ? 'Notification permission was denied in your browser. Grobaax will not ask again automatically.'
          : 'Notification permission was dismissed.',
    };
  }

  const registration = await getPushServiceWorkerRegistration();
  if (!registration) {
    return {
      success: false,
      permission,
      error: 'Unable to register the background push service worker.',
    };
  }

  const instance = getOrInitMessagingInstance(cfg.firebaseConfig);
  if (!instance) {
    return {
      success: false,
      permission,
      error: 'Firebase Messaging configuration is incomplete.',
    };
  }

  try {
    const token = await getToken(instance.messaging, {
      vapidKey: cfg.vapidPublicKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return {
        success: false,
        permission,
        error: 'FCM did not return a registration token for this browser.',
      };
    }

    const saved = await saveTokenToBackend(token);
    if (!saved.success) {
      return { success: false, permission, error: saved.error };
    }

    return {
      success: true,
      token,
      device: saved.device,
      permission,
    };
  } catch (err: any) {
    return {
      success: false,
      permission,
      error: err?.message || 'Failed to obtain FCM registration token.',
    };
  }
}

export async function syncPushDeviceSilentlyIfGranted(userId: string): Promise<void> {
  if (!userId || userId === 'guest' || typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const cfg = await fetchPublicPushConfig();
    if (!cfg?.vapidPublicKey || !cfg.firebaseConfigReady) return;
    if (!(await isSupported())) return;

    const registration = await getPushServiceWorkerRegistration();
    if (!registration) return;

    const instance = getOrInitMessagingInstance(cfg.firebaseConfig);
    if (!instance) return;

    const token = await getToken(instance.messaging, {
      vapidKey: cfg.vapidPublicKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    const prevToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || '';
    const prevUid = localStorage.getItem(FCM_TOKEN_USER_STORAGE_KEY) || '';
    if (prevToken === token && prevUid === userId) {
      return;
    }

    const saved = await saveTokenToBackend(token);
    if (saved.success) {
      localStorage.setItem(FCM_TOKEN_USER_STORAGE_KEY, userId);
    }
  } catch {}
}

export async function unregisterCurrentDeviceToken(): Promise<boolean> {
  const token = getStoredFcmToken();
  try {
    if (token) {
      const headers = await getAuthHeaders();
      if (headers['Authorization']) {
        await fetch('/api/notifications/devices/unregister', {
          method: 'POST',
          headers,
          body: JSON.stringify({ token }),
        });
      }
    }
  } catch {}

  try {
    const cfg = await fetchPublicPushConfig();
    if (cfg?.firebaseConfigReady && (await isSupported())) {
      const instance = getOrInitMessagingInstance(cfg.firebaseConfig);
      if (instance) {
        await deleteToken(instance.messaging).catch(() => {});
      }
    }
  } catch {}

  try {
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
    localStorage.removeItem(FCM_TOKEN_USER_STORAGE_KEY);
  } catch {}
  return true;
}

export async function fetchPushDevices(): Promise<{
  devices: PushDeviceRecord[];
  pushStatus?: Partial<PublicPushConfigResponse>;
}> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) return { devices: [] };
  const currentToken = getStoredFcmToken();
  const qs = currentToken ? `?currentToken=${encodeURIComponent(currentToken)}` : '';
  const res = await fetch(`/api/notifications/devices${qs}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) return { devices: [] };
  return {
    devices: Array.isArray(data.devices) ? data.devices : [],
    pushStatus: data.pushStatus,
  };
}

export async function deletePushDevice(deviceId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization'] || !deviceId) return false;
  const res = await fetch(`/api/notifications/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return Boolean(res.ok && data?.success);
}

export async function fetchPushPreferences(): Promise<PushPreferencesState | null> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) return null;
  const res = await fetch('/api/notifications/preferences', { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) return null;
  return data.preferences || null;
}

export async function savePushPreferences(patch: {
  pushEnabled?: boolean;
  categories?: Partial<PushCategoriesMap>;
}): Promise<PushPreferencesState | null> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) return null;
  const res = await fetch('/api/notifications/preferences', {
    method: 'PUT',
    headers,
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) return null;
  return data.preferences || null;
}

export async function sendSelfTestPush(): Promise<{
  success: boolean;
  status?: string;
  sentCount?: number;
  reason?: string;
  error?: string;
}> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) {
    return { success: false, error: 'Authentication required.' };
  }
  const res = await fetch('/api/notifications/test-self', {
    method: 'POST',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return { success: false, error: data?.error || 'Failed to send test push notification.' };
  }
  return {
    success: true,
    status: data.pushResult?.status,
    sentCount: Number(data.pushResult?.sentCount || 0),
    reason: data.pushResult?.reason,
  };
}

export async function triggerVerifiedPushEvent(payload: {
  eventType: string;
  title?: string;
  message?: string;
  type?: string;
  actionUrl?: string;
  notificationId?: string;
  dedupeKey?: string;
  recipientUserId?: string;
  targetRole?: string;
  excludeUserId?: string;
  requestId?: string;
}): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    if (!headers['Authorization']) return;
    await fetch('/api/notifications/trigger-event', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {}
}

export async function subscribeForegroundFcmMessages(
  onReceive: (payload: MessagePayload) => void
): Promise<() => void> {
  if (typeof window === 'undefined') return () => {};
  try {
    if (!(await isSupported())) return () => {};
    const cfg = await fetchPublicPushConfig();
    if (!cfg?.firebaseConfigReady) return () => {};
    const instance = getOrInitMessagingInstance(cfg.firebaseConfig);
    if (!instance) return () => {};
    return onMessage(instance.messaging, onReceive);
  } catch {
    return () => {};
  }
}

export function setPendingPushDestination(dest: string) {
  if (typeof window === 'undefined' || !dest) return;
  try {
    sessionStorage.setItem(PENDING_PUSH_DEST_KEY, dest);
  } catch {}
}

export function capturePendingPushDestinationFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const dest = url.searchParams.get('push_dest');
    if (dest) {
      sessionStorage.setItem(PENDING_PUSH_DEST_KEY, dest);
      url.searchParams.delete('push_dest');
      const nextUrl = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', nextUrl || '/');
      return dest;
    }
  } catch {}
  return null;
}

export function consumePendingPushDestination(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = sessionStorage.getItem(PENDING_PUSH_DEST_KEY);
    if (val) {
      sessionStorage.removeItem(PENDING_PUSH_DEST_KEY);
      return val;
    }
  } catch {}
  return null;
}
