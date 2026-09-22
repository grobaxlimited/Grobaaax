import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  Sliders,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Crown,
  Shield,
  Clock,
  Save,
  RotateCcw,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HandoutDailyLimitConfig, HandoutAdminStats } from '../../types';
import {
  fetchHandoutSettings,
  saveHandoutSettings,
  fetchHandoutAdminStats,
  DEFAULT_HANDOUT_SETTINGS,
} from '../../lib/handoutService';

export const AdminLibraryView: React.FC = () => {
  const { currentUser } = useApp();

  // Settings state
  const [settings, setSettings] = useState<HandoutDailyLimitConfig>(DEFAULT_HANDOUT_SETTINGS);
  const [isVipUnlimited, setIsVipUnlimited] = useState<boolean>(true);
  const [vipCustomLimit, setVipCustomLimit] = useState<number>(100);

  // Stats state
  const [stats, setStats] = useState<HandoutAdminStats>({
    totalGenerated: 0,
    generatedToday: 0,
    generatedThisMonth: 0,
    freeGenerations: 0,
    premiumGenerations: 0,
    vipGenerations: 0,
    lastUpdated: new Date().toISOString(),
  });

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentSettings, currentStats] = await Promise.all([
        fetchHandoutSettings(),
        fetchHandoutAdminStats(),
      ]);

      setSettings(currentSettings);
      setStats(currentStats);

      if (currentSettings.vipDailyLimit === 'unlimited') {
        setIsVipUnlimited(true);
      } else {
        setIsVipUnlimited(false);
        setVipCustomLimit(Number(currentSettings.vipDailyLimit) || 100);
      }
    } catch (err) {
      console.warn('Error loading admin handout data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setToastMessage(null);

    try {
      const payload: Partial<HandoutDailyLimitConfig> = {
        freeDailyLimit: Math.max(1, Number(settings.freeDailyLimit) || 2),
        premiumDailyLimit: Math.max(1, Number(settings.premiumDailyLimit) || 30),
        vipDailyLimit: isVipUnlimited ? 'unlimited' : Math.max(1, Number(vipCustomLimit) || 100),
      };

      const updated = await saveHandoutSettings(payload, currentUser?.displayName || 'Admin');
      setSettings(updated);

      setToastMessage({
        type: 'success',
        text: 'Handout generation limits successfully updated and live on server!',
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err?.message || 'Failed to save handout settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all handout generation limits to default values (Free: 2/day, Premium: 30/day, VIP: Unlimited)?')) {
      setSettings({ ...DEFAULT_HANDOUT_SETTINGS });
      setIsVipUnlimited(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
              AI Handout System Administration
            </h1>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Live Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Monitor real-time AI generation metrics, enforce subscription tiers, and configure daily generation allowances without touching code.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Usage Statistics Overview */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-500" />
          AI Generation Usage Analytics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Generated */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Handouts Generated
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.totalGenerated.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">All-time across all users</div>
          </div>

          {/* Generated Today */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Generated Today
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.generatedToday.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">Active daily requests</div>
          </div>

          {/* Generated This Month */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Generated This Month
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.generatedThisMonth.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">Monthly cumulative usage</div>
          </div>
        </div>

        {/* Tier Distribution Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Free Tier Usage</span>
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              {stats.freeGenerations}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Premium Tier Usage</span>
            </div>
            <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
              {stats.premiumGenerations}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Crown className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">VIP Tier Usage</span>
            </div>
            <span className="font-bold text-sm text-purple-600 dark:text-purple-400">
              {stats.vipGenerations}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Tier Allowance Configuration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-500" />
              Subscription Tier Daily Generation Limits
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              These limits are enforced server-side before the Google Gemini API is called, preventing unauthorized AI consumption.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Free Tier Limit */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Free Tier
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                Default: 2
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Max Handouts / Day
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.freeDailyLimit}
                onChange={(e) =>
                  setSettings({ ...settings, freeDailyLimit: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Standard students without active subscription. When exhausted, the system guides them to upgrade.
            </p>
          </div>

          {/* Premium Tier Limit */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Premium Tier
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                Default: 30
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Max Handouts / Day
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={settings.premiumDailyLimit}
                onChange={(e) =>
                  setSettings({ ...settings, premiumDailyLimit: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Subscribers on Premium plans. Enables intensive daily academic research and exam preparation.
            </p>
          </div>

          {/* VIP Tier Limit */}
          <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> VIP Tier
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
                Unlimited / Custom
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Limit Mode</span>
                <button
                  type="button"
                  onClick={() => setIsVipUnlimited(!isVipUnlimited)}
                  className={`text-xs font-bold px-2 py-0.5 rounded-md transition ${
                    isVipUnlimited
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isVipUnlimited ? 'Unlimited' : 'Custom Number'}
                </button>
              </div>

              {!isVipUnlimited ? (
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={vipCustomLimit}
                  onChange={(e) => setVipCustomLimit(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <div className="px-3 py-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 text-xs font-bold text-center">
                  Unlimited Handouts Active
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              VIP patrons with full unrestricted access to continuous AI synthesis.
            </p>
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {settings.updatedAt && (
              <span>
                Last updated on {new Date(settings.updatedAt).toLocaleDateString('en-GB')} by{' '}
                <strong>{settings.updatedBy || 'Admin'}</strong>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save & Enforce Limits'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
