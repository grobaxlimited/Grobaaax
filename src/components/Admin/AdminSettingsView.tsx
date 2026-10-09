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
  Youtube,
  Play,
  ExternalLink,
  Clipboard,
  Smartphone,
  Apple,
  Download,
  PackageCheck,
  BookOpen,
} from 'lucide-react';
import { AdminContactSupportView } from './AdminContactSupportView';
import { getYouTubeEmbedUrl } from '../../lib/youtubeUtils';

export function AdminSettingsView() {
  const { systemSettings, updateSystemSettings } = useApp();
  const [formData, setFormData] = useState<SystemSettings>(systemSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'academic' | 'competition' | 'wallet' | 'infrastructure' | 'contact' | 'mobile'>('general');

  // Dedicated save state for Platform Guide Video section
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoSavedSuccess, setVideoSavedSuccess] = useState(false);
  const [videoSaveError, setVideoSaveError] = useState<string | null>(null);

  // Prevent background sync/polling from overwriting form fields while user is editing
  const isDirtyRef = React.useRef(false);

  // Keep local form in sync only when user has NOT modified the form
  React.useEffect(() => {
    if (!isDirtyRef.current) {
      setFormData(systemSettings);
    }
  }, [systemSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setVideoSaveError(null);
    try {
      await updateSystemSettings(formData);
      isDirtyRef.current = false;
      setSavedSuccess(true);
      setVideoSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setVideoSavedSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setVideoSaveError(err?.message || 'Failed to save system settings. Please try again.');
      setTimeout(() => setVideoSaveError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVideoSettings = async () => {
    setVideoSaving(true);
    setVideoSaveError(null);
    try {
      const videoPatch = {
        welcomeVideoActive: formData.welcomeVideoActive !== false,
        welcomeVideoUrl: (formData.welcomeVideoUrl || '').trim(),
        welcomeVideoTitle: (formData.welcomeVideoTitle || '').trim(),
        welcomeVideoDescription: (formData.welcomeVideoDescription || '').trim(),
      };
      await updateSystemSettings(videoPatch);
      setFormData(prev => ({ ...prev, ...videoPatch }));
      isDirtyRef.current = false;
      setVideoSavedSuccess(true);
      setTimeout(() => setVideoSavedSuccess(false), 4500);
    } catch (err: any) {
      console.error('Error saving video settings:', err);
      setVideoSaveError(err?.message || 'Failed to save video guide settings. Please check your connection and try again.');
      setTimeout(() => setVideoSaveError(null), 5000);
    } finally {
      setVideoSaving(false);
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
          { id: 'mobile', label: 'Android & iOS App Packaging', icon: Smartphone },
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

            {/* Platform YouTube Guide Video Settings (Welcome Pop-up Box) */}
            <div className="md:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
                    <Youtube className="w-3.5 h-3.5" />
                  </div>
                  <span>Platform Guide Video (Welcome Pop-up Box)</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider">
                  Live on Home Page
                </span>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure the animated YouTube video box displayed on the home page. When scholars click the box, this video opens in an interactive pop-up player explaining every function of Grobaax.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">Enable Video Guide Box</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Displays the animated video box next to the Welcome section on Home.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.welcomeVideoActive !== false}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setFormData({ ...formData, welcomeVideoActive: e.target.checked });
                      }}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        YouTube Video Link / URL
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Supports youtu.be, watch?v=, shorts
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          id="admin-welcome-video-url-input"
                          type="text"
                          value={formData.welcomeVideoUrl || ''}
                          onChange={(e) => {
                            isDirtyRef.current = true;
                            setFormData({ ...formData, welcomeVideoUrl: e.target.value });
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData?.getData('text');
                            if (pasted) {
                              e.preventDefault();
                              isDirtyRef.current = true;
                              setFormData(prev => ({ ...prev, welcomeVideoUrl: pasted.trim() }));
                            }
                          }}
                          placeholder="e.g. https://youtu.be/... or https://www.youtube.com/watch?v=..."
                          className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-xs sm:text-sm"
                        />
                        {formData.welcomeVideoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              isDirtyRef.current = true;
                              setFormData(prev => ({ ...prev, welcomeVideoUrl: '' }));
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                            title="Clear URL"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const clipText = await navigator.clipboard.readText();
                            if (clipText && clipText.trim()) {
                              isDirtyRef.current = true;
                              setFormData(prev => ({ ...prev, welcomeVideoUrl: clipText.trim() }));
                            } else {
                              const el = document.getElementById('admin-welcome-video-url-input');
                              if (el) el.focus();
                            }
                          } catch (err) {
                            const el = document.getElementById('admin-welcome-video-url-input');
                            if (el) el.focus();
                          }
                        }}
                        className="px-3 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer"
                        title="Paste URL directly from clipboard"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        <span>Paste Link</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Video Guide Title
                    </label>
                    <input
                      type="text"
                      value={formData.welcomeVideoTitle || ''}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setFormData({ ...formData, welcomeVideoTitle: e.target.value });
                      }}
                      placeholder="e.g. How Grobaax Works: Complete Platform Guide"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Video Guide Description / Platform Explanations
                    </label>
                    <textarea
                      rows={3}
                      value={formData.welcomeVideoDescription || ''}
                      onChange={(e) => {
                        isDirtyRef.current = true;
                        setFormData({ ...formData, welcomeVideoDescription: e.target.value });
                      }}
                      placeholder="Explain what scholars will learn in this video..."
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                {/* Live Video Embed Preview */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Live Video Preview (No Autoplay)</span>
                    {formData.welcomeVideoUrl && (
                      <a
                        href={formData.welcomeVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:text-red-400 font-bold flex items-center gap-1 text-[10px]"
                      >
                        <span>Open on YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-700 flex items-center justify-center shadow-inner">
                    {getYouTubeEmbedUrl(formData.welcomeVideoUrl, false) ? (
                      <iframe
                        key={formData.welcomeVideoUrl}
                        src={getYouTubeEmbedUrl(formData.welcomeVideoUrl, false) || ''}
                        title="Video Preview"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <div className="p-6 text-center space-y-2 text-slate-400">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                          <Play className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold">Enter a valid YouTube link to preview player</p>
                        <p className="text-[10px] text-slate-500">Supports watch?v=, youtu.be, shorts, and embed links</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dedicated Save Row for Platform Guide Video */}
                <div className="lg:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    {videoSavedSuccess && (
                      <span className="text-emerald-500 font-bold text-xs flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-pulse">
                        <CheckCircle2 className="w-4 h-4" /> Platform Guide Video Settings Saved Live!
                      </span>
                    )}
                    {videoSaveError && (
                      <span className="text-rose-500 font-bold text-xs flex items-center gap-1.5 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                        <span>⚠️ {videoSaveError}</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={videoSaving}
                    onClick={handleSaveVideoSettings}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-black text-xs shadow-md shadow-red-600/25 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{videoSaving ? 'Saving Video Settings...' : 'Save Video Guide Settings'}</span>
                  </button>
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

        {/* TAB 7: ANDROID & iOS APP PACKAGING */}
        {activeSettingsTab === 'mobile' && (
          <div className="space-y-6 text-xs">
            {/* Header Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Grobaax Native App Distribution Suite
                    </h3>
                    <p className="text-slate-400 text-xs">
                      Single-codebase packaging for Google Play (Android .apk / .aab) &amp; Apple App Store (iOS)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Application ID: com.grobaax.app
                  </span>
                </div>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                The packaged applications display the exact same Grobaax experience, connecting to the live backend, Firestore database, and authentication. When users open Grobaax inside the packaged Android or iOS apps, PWA install prompts are automatically suppressed. Normal browser users at <strong className="text-white">https://www.grobaax.com/</strong> continue to receive the full PWA experience.
              </p>
            </div>

            {/* Download Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Android Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-black text-sm text-slate-900 dark:text-white">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <span>Android Package</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      .APK &amp; .AAB
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    Complete Android Studio / Gradle project containing all web assets, AndroidManifest.xml, and build targets.
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1.5">
                    <div className="text-slate-500 dark:text-slate-400">1. Build testing APK:</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">cd android &amp;&amp; ./gradlew assembleDebug</div>
                    <div className="text-slate-500 dark:text-slate-400 pt-1">2. Build Google Play Store AAB:</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">cd android &amp;&amp; ./gradlew bundleRelease</div>
                  </div>
                </div>

                <a
                  href="/api/download/android"
                  download="grobaax-android-project.zip"
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Android Project (.zip)</span>
                </a>
              </div>

              {/* iOS Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-black text-sm text-slate-900 dark:text-white">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Apple className="w-4 h-4" />
                      </div>
                      <span>iOS Package</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Xcode Project
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    Complete Xcode project with configured bundle identifier, App Store privacy descriptions, and launch screen.
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1.5">
                    <div className="text-slate-500 dark:text-slate-400">1. Open in Xcode:</div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold">npx cap open ios</div>
                    <div className="text-slate-500 dark:text-slate-400 pt-1">2. Distribute to App Store:</div>
                    <div className="text-blue-600 dark:text-blue-400 font-bold">Product &gt; Archive &gt; Distribute App</div>
                  </div>
                </div>

                <a
                  href="/api/download/ios"
                  download="grobaax-ios-project.zip"
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download iOS Project (.zip)</span>
                </a>
              </div>
            </div>

            {/* Complete Suite & Guide */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-xs">
                    Complete Mobile Packaging Suite (.zip)
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Contains both Android &amp; iOS native projects plus the distribution guide.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href="/api/download/guide"
                  download="MOBILE_PACKAGING_GUIDE.md"
                  className="py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Guide (.md)</span>
                </a>
                <a
                  href="/api/download/mobile-suite"
                  download="grobaax-mobile-packaging-suite.zip"
                  className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Suite (.zip)</span>
                </a>
              </div>
            </div>
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

