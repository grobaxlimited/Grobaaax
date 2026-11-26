import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Laptop,
  Trash2,
  Send,
  RefreshCw,
  Share,
  PlusSquare,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  BrowserPushCapability,
  PublicPushConfigResponse,
  PushCategoriesMap,
  PushCategoryKey,
  PushDeviceRecord,
  deletePushDevice,
  fetchPublicPushConfig,
  fetchPushDevices,
  fetchPushPreferences,
  getBrowserPushCapability,
  requestPermissionAndRegisterDevice,
  savePushPreferences,
  sendSelfTestPush,
  unregisterCurrentDeviceToken,
} from '../../lib/pushNotifications';

const CATEGORY_ITEMS: Array<{
  key: PushCategoryKey;
  label: string;
  desc: string;
}> = [
  {
    key: 'connections',
    label: 'Connection Requests & Updates',
    desc: 'New Campus connection requests and accepted connections',
  },
  {
    key: 'messages',
    label: 'Messages & Mentions',
    desc: 'Direct messages and conversation updates where messaging is available',
  },
  {
    key: 'announcements',
    label: 'Important Announcements',
    desc: 'Official platform notices, broadcasts, and urgent schedule updates',
  },
  {
    key: 'school_dome',
    label: 'School Dome Alerts',
    desc: 'Live School Dome questions, arena reminders, and round updates',
  },
  {
    key: 'competitions',
    label: 'Competitions & Results',
    desc: 'GUS tournaments, Institutional League updates, and competition results',
  },
  {
    key: 'school_blog',
    label: 'School Blog Reactions & Status',
    desc: 'Reactions on your articles and blogger review updates (no alerts when others publish posts)',
  },
  {
    key: 'wallet',
    label: 'Wallet & GP Rewards',
    desc: 'GP rewards, prize deposits, and wallet transaction confirmations',
  },
  {
    key: 'system',
    label: 'System & Account Security',
    desc: 'Account notices, security alerts, and device confirmations',
  },
];

const DEFAULT_CATEGORIES: PushCategoriesMap = {
  connections: true,
  messages: true,
  announcements: true,
  school_dome: true,
  competitions: true,
  school_blog: true,
  wallet: true,
  system: true,
};

export const PushNotificationSettingsPanel: React.FC = () => {
  const { currentUser, updateUserProfile } = useApp();

  const [pushConfig, setPushConfig] = useState<PublicPushConfigResponse | null>(null);
  const [capability, setCapability] = useState<BrowserPushCapability | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean>(
    currentUser.notificationPreferences
      ? (currentUser.notificationPreferences as any).enablePush !== false &&
          currentUser.notificationPreferences.pushEnabled !== false
      : true
  );
  const [categories, setCategories] = useState<PushCategoriesMap>(() => {
    const legacy = currentUser.notificationPreferences as any;
    return {
      ...DEFAULT_CATEGORIES,
      school_dome: legacy?.matchAlerts === false ? false : true,
      competitions: legacy?.gusAlerts === false || legacy?.gusReminders === false ? false : true,
      wallet: legacy?.walletAlerts === false || legacy?.walletTransactions === false ? false : true,
      connections: legacy?.communityMentions === false ? false : true,
      announcements: legacy?.adminBroadcasts === false ? false : true,
    };
  });

  const [devices, setDevices] = useState<PushDeviceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnablingDevice, setIsEnablingDevice] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const cfg = await fetchPublicPushConfig(true);
      setPushConfig(cfg);
      const [cap, prefs, devRes] = await Promise.all([
        getBrowserPushCapability(cfg),
        fetchPushPreferences(),
        fetchPushDevices(),
      ]);
      setCapability(cap);
      if (prefs) {
        setPushEnabled(prefs.pushEnabled);
        setCategories(prefs.categories);
      }
      setDevices(devRes.devices || []);
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const syncLegacyUserPrefs = (nextEnabled: boolean, nextCats: PushCategoriesMap) => {
    const updatedPrefs = {
      ...(currentUser.notificationPreferences || {}),
      enablePush: nextEnabled,
      pushEnabled: nextEnabled,
      matchAlerts: nextCats.school_dome,
      gusAlerts: nextCats.competitions,
      gusReminders: nextCats.competitions,
      walletAlerts: nextCats.wallet,
      walletTransactions: nextCats.wallet,
      communityMentions: nextCats.connections,
      adminBroadcasts: nextCats.announcements,
    };
    updateUserProfile({ notificationPreferences: updatedPrefs });
  };

  const handleEnableThisDevice = async () => {
    setFeedback(null);
    setIsEnablingDevice(true);
    try {
      const res = await requestPermissionAndRegisterDevice();
      const updatedCap = await getBrowserPushCapability(pushConfig);
      setCapability(updatedCap);
      if (res.success) {
        const devRes = await fetchPushDevices();
        setDevices(devRes.devices || []);
        setFeedback({
          type: 'success',
          text: 'This device is registered for external Grobaax push notifications.',
        });
      } else {
        setFeedback({
          type: res.permission === 'denied' ? 'error' : 'info',
          text: res.error || 'Could not enable browser push notifications on this device.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Unable to enable push notifications right now.',
      });
    } finally {
      setIsEnablingDevice(false);
    }
  };

  const handleToggleMasterPush = async (enabled: boolean) => {
    setPushEnabled(enabled);
    syncLegacyUserPrefs(enabled, categories);
    setIsSavingPrefs(true);
    setFeedback(null);
    try {
      const saved = await savePushPreferences({ pushEnabled: enabled });
      if (saved) {
        setPushEnabled(saved.pushEnabled);
        setCategories(saved.categories);
      }

      if (
        enabled &&
        capability?.supported &&
        capability.status !== 'denied' &&
        capability.status !== 'iframe_restricted' &&
        capability.status !== 'missing_vapid' &&
        !devices.some((d) => d.isCurrentDevice)
      ) {
        const regRes = await requestPermissionAndRegisterDevice();
        const updatedCap = await getBrowserPushCapability(pushConfig);
        setCapability(updatedCap);
        if (regRes.success) {
          const devRes = await fetchPushDevices();
          setDevices(devRes.devices || []);
          setFeedback({
            type: 'success',
            text: 'External push notifications enabled and this device is registered.',
          });
          return;
        }
      }

      setFeedback({
        type: 'info',
        text: enabled
          ? 'External push notifications enabled for your Grobaax account.'
          : 'External push notifications paused for your account. In-app alerts inside Grobaax remain active.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Failed to save notification preference.',
      });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleToggleCategory = async (key: PushCategoryKey, checked: boolean) => {
    const nextCategories = { ...categories, [key]: checked };
    setCategories(nextCategories);
    syncLegacyUserPrefs(pushEnabled, nextCategories);
    setIsSavingPrefs(true);
    try {
      const saved = await savePushPreferences({ categories: { [key]: checked } });
      if (saved) {
        setCategories(saved.categories);
      }
    } catch {} finally {
      setIsSavingPrefs(false);
    }
  };

  const handleRemoveDevice = async (device: PushDeviceRecord) => {
    setRemovingDeviceId(device.id);
    setFeedback(null);
    try {
      if (device.isCurrentDevice) {
        await unregisterCurrentDeviceToken();
      } else {
        await deletePushDevice(device.id);
      }
      const devRes = await fetchPushDevices();
      setDevices(devRes.devices || []);
      setFeedback({
        type: 'info',
        text: `Removed "${device.deviceLabel}" from external push delivery.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Could not remove that device right now.',
      });
    } finally {
      setRemovingDeviceId(null);
    }
  };

  const handleSendTestPush = async () => {
    setIsSendingTest(true);
    setFeedback(null);
    try {
      const res = await sendSelfTestPush();
      if (res.success && (res.sentCount || 0) > 0) {
        setFeedback({
          type: 'success',
          text: `Test push sent to ${res.sentCount} registered device${res.sentCount === 1 ? '' : 's'}. Check your notification tray.`,
        });
      } else if (res.status === 'unconfigured') {
        setFeedback({
          type: 'info',
          text: res.reason || 'Push server credentials are not configured yet. Missing environment setup is required before external push delivery.',
        });
      } else {
        setFeedback({
          type: 'info',
          text: res.reason || res.error || 'No eligible active devices received the test notification.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Test notification request failed.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const currentDeviceRegistered = devices.some((d) => d.isCurrentDevice);

  return (
    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            <span>Notification & External Push Preferences</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control both your Grobaax notification categories and which devices receive lock-screen or notification-panel alerts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={isLoading}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition cursor-pointer shrink-0"
          title="Refresh notification status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : feedback.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 1. Grobaax Account Notification Preferences (Master + Categories) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-start gap-2.5 pr-3">
            {pushEnabled ? (
              <Bell className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            ) : (
              <BellOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white">
                External Push Notifications (Grobaax Account)
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Receive lock-screen and notification-panel pushes across your registered devices. Turning this off pauses external pushes without disabling in-app alerts.
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={pushEnabled}
            disabled={isSavingPrefs}
            onChange={(e) => void handleToggleMasterPush(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-600 cursor-pointer shrink-0"
          />
        </div>

        <div className={`space-y-2 transition-opacity ${pushEnabled ? 'opacity-100' : 'opacity-60'}`}>
          {CATEGORY_ITEMS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
            >
              <div className="pr-3">
                <div className="font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={categories[item.key] !== false}
                disabled={isSavingPrefs || !pushEnabled}
                onChange={(e) => void handleToggleCategory(item.key, e.target.checked)}
                className="w-4 h-4 text-blue-900 dark:text-blue-400 rounded focus:ring-blue-900 cursor-pointer shrink-0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Registered Devices List */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-extrabold text-slate-900 dark:text-white">
            Registered Push Devices ({devices.length})
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {capability?.supported &&
              capability.status !== 'denied' &&
              capability.status !== 'iframe_restricted' &&
              capability.status !== 'missing_vapid' &&
              (!currentDeviceRegistered || capability.status !== 'granted') && (
                <button
                  type="button"
                  onClick={handleEnableThisDevice}
                  disabled={isEnablingDevice}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>
                    {isEnablingDevice
                      ? 'Registering...'
                      : capability.status === 'granted'
                      ? 'Register This Device'
                      : 'Enable on This Device'}
                  </span>
                </button>
              )}

            {devices.length > 0 && (
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isSendingTest || !pushEnabled}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-blue-500" />
                <span>{isSendingTest ? 'Sending...' : 'Send Test Push'}</span>
              </button>
            )}
          </div>
        </div>

        {capability?.status === 'ios_install_required' && (
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-slate-700 dark:text-slate-200 space-y-1.5">
            <div className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone & iPad (iOS 16.4+)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-1">
              <span>Tap</span>
              <Share className="w-3.5 h-3.5 text-blue-500 inline" />
              <strong>Share</strong>
              <span>→</span>
              <PlusSquare className="w-3.5 h-3.5 text-blue-500 inline" />
              <strong>Add to Home Screen</strong>
              <span>and open Grobaax from your Home Screen icon to enable web push notifications.</span>
            </p>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 py-1">
            No devices are registered for external push on this account yet.
          </p>
        ) : (
          <div className="space-y-2">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {dev.platform === 'web_desktop' ? (
                    <Laptop className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                      <span>{dev.deviceLabel}</span>
                      {dev.isCurrentDevice && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                          This device
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Last synced {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString() : 'recently'}
                      {dev.tokenSuffix ? ` • ${dev.tokenSuffix}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveDevice(dev)}
                  disabled={removingDeviceId === dev.id}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                  title="Remove device from push notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{removingDeviceId === dev.id ? 'Removing...' : 'Remove'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
