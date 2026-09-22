import React, { useState, useEffect } from 'react';
import {
  subscribeContactSupportConfig,
  updateContactSupportConfig,
  ContactSupportConfig,
  DEFAULT_CONTACT_SUPPORT_CONFIG,
  buildWhatsAppLink,
  buildMailtoLink,
  buildTelLink,
  buildTelegramLink,
} from '../../lib/contactSupportService';
import { useApp } from '../../context/AppContext';
import {
  Headphones,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Mail,
  Phone,
  PhoneCall,
  Copy,
  Clock,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export function AdminContactSupportView() {
  const { userProfile } = useApp();
  const [config, setConfig] = useState<ContactSupportConfig>(DEFAULT_CONTACT_SUPPORT_CONFIG);
  const [formData, setFormData] = useState<ContactSupportConfig>(DEFAULT_CONTACT_SUPPORT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeContactSupportConfig((c) => {
      setConfig(c);
      setFormData(c);
    });
    return () => unsub();
  }, []);

  const handleChange = (field: keyof ContactSupportConfig, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccessMsg(null);

    try {
      const updated = await updateContactSupportConfig(
        formData,
        userProfile?.fullName || userProfile?.name || 'Admin'
      );
      setConfig(updated);
      setSaveSuccessMsg('Contact channels saved and updated live across the student platform!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save contact channels.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset contact channels back to system defaults?')) {
      setFormData(DEFAULT_CONTACT_SUPPORT_CONFIG);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl border border-blue-900/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
              Live Real-Time Sync
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-blue-400" />
            <span>Contact Channels & Student Support Configuration</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Configure the 3 primary support channels (WhatsApp, Email, Phone/Telegram) displayed under the Profile & Account Hub. Any edits here instantly reflect in real-time on the student app.
          </p>
        </div>

        {saveSuccessMsg && (
          <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-2xl text-xs font-bold animate-pulse">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CHANNEL 1: WHATSAPP CONFIGURATION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 1.794.887 2.806.887 3.181 0 5.767-2.586 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.467 9.953-9.969 9.953-1.611 0-3.125-.386-4.469-1.071l-5.562 1.458 1.488-5.431c-.767-1.393-1.196-2.993-1.196-4.695 0-5.486 4.468-9.953 9.969-9.953 5.502 0 9.739 4.467 9.739 9.739z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Channel 1
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    WhatsApp Desk
                  </h3>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.whatsappEnabled}
                  onChange={(e) => handleChange('whatsappEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  WhatsApp Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+2348012345678 or 08012345678"
                  value={formData.whatsappNumber}
                  onChange={(e) => handleChange('whatsappNumber', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Format: International (+234...) or local (080...).
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Display Label
                </label>
                <input
                  type="text"
                  placeholder="Chat on WhatsApp"
                  value={formData.whatsappLabel || ''}
                  onChange={(e) => handleChange('whatsappLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Default Greeting Text
                </label>
                <textarea
                  rows={2}
                  placeholder="Hello Grobaax Support, I need assistance with..."
                  value={formData.whatsappDefaultMessage}
                  onChange={(e) => handleChange('whatsappDefaultMessage', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-500">
                  Auto-populates in scholar&apos;s WhatsApp chat window when clicked.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={buildWhatsAppLink(formData.whatsappNumber, formData.whatsappDefaultMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-[11px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test WhatsApp Link</span>
                </a>
              </div>
            </div>
          </div>

          {/* CHANNEL 2: EMAIL CONFIGURATION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Channel 2
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Email Support Desk
                  </h3>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emailEnabled}
                  onChange={(e) => handleChange('emailEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Official Support Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="support@grobaax.com or grobaxycompany@gmail.com"
                  value={formData.supportEmail}
                  onChange={(e) => handleChange('supportEmail', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Display Label
                </label>
                <input
                  type="text"
                  placeholder="Email Support Desk"
                  value={formData.emailLabel || ''}
                  onChange={(e) => handleChange('emailLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Default Email Subject Line
                </label>
                <input
                  type="text"
                  placeholder="Grobaax Support Request"
                  value={formData.emailSubject}
                  onChange={(e) => handleChange('emailSubject', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <p className="text-[10px] text-slate-500">
                  Pre-populates the email client subject line.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={buildMailtoLink(formData.supportEmail, formData.emailSubject)}
                  className="w-full py-2 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-[11px]"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Test Email Link</span>
                </a>
              </div>
            </div>
          </div>

          {/* CHANNEL 3: PHONE & TELEGRAM CONFIGURATION */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500/30 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Channel 3
                  </span>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Phone & Telegram Line
                  </h3>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.phoneCallEnabled}
                  onChange={(e) => handleChange('phoneCallEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Telephone Hotline Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+2348012345678"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Telegram Username or Channel Link
                </label>
                <input
                  type="text"
                  placeholder="@grobaax_support or https://t.me/grobaax_support"
                  value={formData.telegramUsername || ''}
                  onChange={(e) => handleChange('telegramUsername', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Display Label
                </label>
                <input
                  type="text"
                  placeholder="Direct Support Line"
                  value={formData.phoneLabel || ''}
                  onChange={(e) => handleChange('phoneLabel', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <a
                  href={buildTelLink(formData.phoneNumber)}
                  className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-[11px]"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Test Phone Call Link</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* METADATA & SUPPORT HOURS */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Support Operating Hours & Status Badge</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Operating Hours Display Text
              </label>
              <input
                type="text"
                placeholder="Monday – Saturday: 8:00 AM – 9:00 PM WAT"
                value={formData.workingHours}
                onChange={(e) => handleChange('workingHours', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Live Status Badge Note
              </label>
              <input
                type="text"
                placeholder="Online Now • WhatsApp replies usually in ~2 minutes"
                value={formData.responseTimeNote}
                onChange={(e) => handleChange('responseTimeNote', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {saveError && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition cursor-pointer"
          >
            Reset to Defaults
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Publishing Channels...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Publish Contact Channels</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
