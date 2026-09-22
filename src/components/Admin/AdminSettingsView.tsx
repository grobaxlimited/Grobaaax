import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PRIMARY_SUPER_ADMIN_UID, SystemSettings } from '../../types';
import {
  Settings,
  ShieldCheck,
  Database,
  CheckCircle2,
  Save,
  Clock,
  Coins,
  Building2,
  AlertTriangle,
  Megaphone,
  Sliders,
  Server,
  RefreshCw,
  Lock,
  Headphones,
} from 'lucide-react';
import { AdminContactSupportView } from './AdminContactSupportView';

export function AdminSettingsView() {
  const { systemSettings, updateSystemSettings } = useApp();
  const [formData, setFormData] = useState<SystemSettings>(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'academic' | 'competition' | 'wallet' | 'infrastructure' | 'contact'>('general');

  // Keep local form in sync if context changes
  React.useEffect(() => {
    setFormData(systemSettings);
  }, [systemSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSystemSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-blue-950/40">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-blue-400" /> Platform System Settings & Governance
          </h1>
          <p className="text-xs text-blue-200 mt-1">
            Configure system parameters, academic league rules, speed clock defaults, economy limits, and Firebase synchronization.
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4" /> System Settings Saved & Applied Live
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'general', label: 'General & Platform', icon: Sliders },
          { id: 'academic', label: 'Academic & League', icon: Building2 },
          { id: 'competition', label: 'Speed Clock & Rules', icon: Clock },
          { id: 'wallet', label: 'Economy & GP Limits', icon: Coins },
          { id: 'infrastructure', label: 'Firebase & Security', icon: Server },
          { id: 'contact', label: 'Contact Channels & Support', icon: Headphones },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSettingsTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
              activeSettingsTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: GENERAL & PLATFORM */}
        {activeSettingsTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-500" /> Platform Identity & Access
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Platform Public Name
                  </label>
                  <input
                    type="text"
                    value={formData.platformName}
                    onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">Allow New User Registrations</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      When enabled, new scholars can create accounts using Email/Password.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowNewRegistrations}
                    onChange={(e) => setFormData({ ...formData, allowNewRegistrations: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Platform Maintenance Mode
                    </div>
                    <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                      Locks public interactions and displays a scheduled maintenance banner.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.maintenanceMode}
                    onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">Live Community Feed</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Permits scholars to publish posts and academic discussions in Community.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.enableLiveCommunityFeed}
                    onChange={(e) => setFormData({ ...formData, enableLiveCommunityFeed: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Global Announcement Banner Settings */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-pink-500" /> Global Platform Announcement Banner
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white">Display Announcement Banner</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Shows a top alert bar across the entire Grobaax application.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.announcementBannerActive}
                    onChange={(e) => setFormData({ ...formData, announcementBannerActive: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Banner Message Content
                  </label>
                  <textarea
                    rows={3}
                    value={formData.announcementBannerText || ''}
                    onChange={(e) => setFormData({ ...formData, announcementBannerText: e.target.value })}
                    placeholder="Enter global broadcast text..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-medium leading-relaxed">
                  💡 Tip: Use this banner for emergency server schedules or nationwide academic league grand finals announcements.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC & LEAGUE */}
        {activeSettingsTab === 'academic' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" /> Academic League Governance Rules
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">Public League Standings Visibility</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Allow non-logged-in visitors to view institutional division standings.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.publicLeagueVisibility}
                  onChange={(e) => setFormData({ ...formData, publicLeagueVisibility: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">Auto-Approve Institutional Roster</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically verify universities and colleges added to the season roster.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.autoApproveInstitutions}
                  onChange={(e) => setFormData({ ...formData, autoApproveInstitutions: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">Require Student ID Verification</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enforces institution email or matriculation number validation before qualification match play.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.requireStudentVerification}
                  onChange={(e) => setFormData({ ...formData, requireStudentVerification: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white">Enable Open GUS Registration</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Scholars can register for upcoming Global Ultimate Search tournaments.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableGusRegistration}
                  onChange={(e) => setFormData({ ...formData, enableGusRegistration: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SPEED CLOCK & RULES */}
        {activeSettingsTab === 'competition' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Authoritative Live Speed Clock & Quiz Dynamics
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Default Question Timer (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={formData.defaultQuestionTimeSeconds}
                  onChange={(e) => setFormData({ ...formData, defaultQuestionTimeSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default time limit allocated per competitive question.</p>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Incorrect Penalty (Seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={formData.defaultPenaltyPerMistakeSeconds}
                  onChange={(e) => setFormData({ ...formData, defaultPenaltyPerMistakeSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Time subtracted from score or added to speed penalties.</p>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Clock Grace Period (Seconds)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.speedClockGraceSeconds}
                  onChange={(e) => setFormData({ ...formData, speedClockGraceSeconds: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Network latency buffer allowed before server locks answers.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ECONOMY & GP LIMITS */}
        {activeSettingsTab === 'wallet' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" /> GP Economy & Cash Withdrawal Governance
              </h3>
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded-lg text-[11px]">
                1 GP = ₦{(formData.gpToFiatRate || 1).toLocaleString()} NGN
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  GP to Naira Conversion Rate
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-500">
                    1 GP = ₦
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={formData.gpToFiatRate || 1}
                    onChange={(e) => setFormData({ ...formData, gpToFiatRate: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Direct conversion rate to Nigerian Naira (₦).</p>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Minimum Cash Out (GP)
                </label>
                <input
                  type="number"
                  min={100}
                  value={formData.minWithdrawalAmountGp || 3000}
                  onChange={(e) => setFormData({ ...formData, minWithdrawalAmountGp: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-amber-500 font-semibold mt-1">
                  Min Payout: ₦{((formData.minWithdrawalAmountGp || 3000) * (formData.gpToFiatRate || 1)).toLocaleString()} NGN
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Max Daily Withdrawal (GP)
                </label>
                <input
                  type="number"
                  min={1000}
                  value={formData.maxDailyWithdrawalGp}
                  onChange={(e) => setFormData({ ...formData, maxDailyWithdrawalGp: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Max Payout: ₦{(formData.maxDailyWithdrawalGp * (formData.gpToFiatRate || 1)).toLocaleString()} NGN
                </p>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  Registration Bonus (GP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.defaultFreeGpOnRegister}
                  onChange={(e) => setFormData({ ...formData, defaultFreeGpOnRegister: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Welcome balance on registration.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INFRASTRUCTURE & SECURITY */}
        {activeSettingsTab === 'infrastructure' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold">
                <ShieldCheck className="w-5 h-5" />
                <span>Primary Super Admin Authority</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-black">Authorized Super Admin UID</div>
                <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-300 dark:border-slate-800">
                  {PRIMARY_SUPER_ADMIN_UID}
                </div>
                <div className="text-[11px] text-emerald-500 font-bold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-4 h-4" /> Supreme Administrative Authority Enforced
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold">
                <Database className="w-5 h-5" />
                <span>Firebase Source of Truth</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
                <div className="text-slate-400 text-[10px] uppercase font-black">Firebase Project ID</div>
                <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-300 dark:border-slate-800">
                  ai-studio-grbxbox-f5f6e3af-7b8c-4cb3-b0be-448c38423a10
                </div>
                <div className="text-[11px] text-indigo-400 font-bold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-4 h-4" /> Live Real-time Firestore Synchronized
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CONTACT CHANNELS */}
        {activeSettingsTab === 'contact' && (
          <div className="space-y-6">
            <AdminContactSupportView />
          </div>
        )}

        {/* Global Save Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving to Firebase...' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

