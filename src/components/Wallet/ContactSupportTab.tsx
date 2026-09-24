import React, { useState, useEffect } from 'react';
import {
  subscribeContactSupportConfig,
  ContactSupportConfig,
  DEFAULT_CONTACT_SUPPORT_CONFIG,
  buildWhatsAppLink,
  buildMailtoLink,
  buildTelLink,
  buildTelegramLink,
} from '../../lib/contactSupportService';
import { openExternalWhatsApp } from '../../lib/whatsappUtils';
import {
  Mail,
  Phone,
  PhoneCall,
  Headphones,
  Copy,
  Check,
  ExternalLink,
  Clock,
  ShieldCheck,
  Send,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Info,
} from 'lucide-react';

interface ContactSupportTabProps {
  userEmail?: string;
  userName?: string;
}

export const ContactSupportTab: React.FC<ContactSupportTabProps> = ({
  userEmail,
  userName,
}) => {
  const [config, setConfig] = useState<ContactSupportConfig>(DEFAULT_CONTACT_SUPPORT_CONFIG);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Quick In-App Message state
  const [inquirySubject, setInquirySubject] = useState('General Inquiry');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  useEffect(() => {
    const unsub = subscribeContactSupportConfig((c) => {
      setConfig((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(c)) return prev;
        return c;
      });
    });
    return () => unsub();
  }, []);

  const handleCopy = (text: string, type: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = () => {
    const customText = inquiryMessage.trim()
      ? `Hello Grobaax Support, my name is ${userName || 'Scholar'}. ${inquiryMessage.trim()}`
      : config.whatsappDefaultMessage;
    const url = buildWhatsAppLink(config.whatsappNumber, customText);
    openExternalWhatsApp(url);
  };

  const handleSendEmail = () => {
    const subject = `[Grobaax Support] ${inquirySubject} — ${userName || 'Scholar'}`;
    const body = inquiryMessage.trim()
      ? `User: ${userName || 'Scholar'}\nEmail: ${userEmail || 'N/A'}\n\nMessage:\n${inquiryMessage.trim()}`
      : `Hello Grobaax Support Team,\n\nI need assistance regarding: ${inquirySubject}.\n\nAccount: ${userEmail || 'Scholar'}`;
    const url = buildMailtoLink(config.supportEmail, subject, body);
    window.location.href = url;
  };

  const handleCallPhone = () => {
    const url = buildTelLink(config.phoneNumber);
    window.location.href = url;
  };

  const handleOpenTelegram = () => {
    if (!config.telegramUsername) return;
    const url = buildTelegramLink(config.telegramUsername);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMessage.trim()) return;

    // Trigger WhatsApp or Email with prepared inquiry
    handleOpenWhatsApp();
    setInquirySent(true);
    setTimeout(() => setInquirySent(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Support Desk Status Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white border border-blue-900/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{config.responseTimeNote || 'Support Active & Online'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Headphones className="w-6 h-6 text-blue-400" />
              <span>Contact Grobaax Support Desk</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Have questions about your campus league, GP tokens, School Dome challenges, or student account? Our dedicated academic support team is ready to assist you.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-xs space-y-1.5 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-blue-300 font-bold">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Support Hours</span>
            </div>
            <p className="text-slate-200 text-[11px] font-semibold">
              {config.workingHours || 'Mon – Sat: 8:00 AM – 9:00 PM WAT'}
            </p>
            <p className="text-[10px] text-slate-400">
              WhatsApp inquiries receive instant prioritized response.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Forms of Direct Contact Channels */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Select Your Preferred Contact Channel</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            3 Direct Contact Options
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* OPTION 1: WHATSAPP */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
              Fastest Response
            </div>

            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                {/* Custom WhatsApp SVG icon */}
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 1.794.887 2.806.887 3.181 0 5.767-2.586 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.467 9.953-9.969 9.953-1.611 0-3.125-.386-4.469-1.071l-5.562 1.458 1.488-5.431c-.767-1.393-1.196-2.993-1.196-4.695 0-5.486 4.468-9.953 9.969-9.953 5.502 0 9.739 4.467 9.739 9.739z" />
                </svg>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Channel 1 • Instant Messaging
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {config.whatsappLabel || 'Chat on WhatsApp'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {config.whatsappDescription || 'Direct one-on-one instant messaging with our verified support team.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between gap-2 text-xs">
                <span className="font-black text-emerald-900 dark:text-emerald-300 truncate">
                  {config.whatsappNumber || '+2348000000000'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(config.whatsappNumber, 'whatsapp')}
                  className="p-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition cursor-pointer shrink-0"
                  title="Copy WhatsApp number"
                >
                  {copiedType === 'whatsapp' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {config.whatsappEnabled !== false ? (
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 1.794.887 2.806.887 3.181 0 5.767-2.586 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.467 9.953-9.969 9.953-1.611 0-3.125-.386-4.469-1.071l-5.562 1.458 1.488-5.431c-.767-1.393-1.196-2.993-1.196-4.695 0-5.486 4.468-9.953 9.969-9.953 5.502 0 9.739 4.467 9.739 9.739z" />
                  </svg>
                  <span>Chat with us on WhatsApp</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl text-center">
                  WhatsApp Support Temporarily Paused
                </div>
              )}
              <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                Directly opens WhatsApp app or Web
              </p>
            </div>
          </div>

          {/* OPTION 2: EMAIL SUPPORT */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/40 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
              Official Desk
            </div>

            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Mail className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Channel 2 • Formal Inquiries
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {config.emailLabel || 'Email Support Desk'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {config.emailDescription || 'Send detailed tickets, account inquiries, or verification documents.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex items-center justify-between gap-2 text-xs">
                <span className="font-black text-blue-900 dark:text-blue-300 truncate">
                  {config.supportEmail || 'support@grobaax.com'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(config.supportEmail, 'email')}
                  className="p-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition cursor-pointer shrink-0"
                  title="Copy support email"
                >
                  {copiedType === 'email' ? (
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {config.emailEnabled !== false ? (
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email Support</span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl text-center">
                  Email Support Paused
                </div>
              )}
              <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                Replies usually within 1–2 hours
              </p>
            </div>
          </div>

          {/* OPTION 3: PHONE CALL / TELEPHONE & TELEGRAM */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500/40 shadow-md hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-2xl bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
              Urgent Line
            </div>

            <div className="space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PhoneCall className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Channel 3 • Urgent Voice & Telegram
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {config.phoneLabel || 'Direct Support Line'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {config.phoneDescription || 'Call our student support desk or reach out via official Telegram channel.'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between gap-2 text-xs">
                <span className="font-black text-amber-900 dark:text-amber-300 truncate">
                  {config.phoneNumber || '+2348000000000'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(config.phoneNumber, 'phone')}
                  className="p-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 transition cursor-pointer shrink-0"
                  title="Copy phone number"
                >
                  {copiedType === 'phone' ? (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2">
                {config.phoneCallEnabled !== false ? (
                  <button
                    type="button"
                    onClick={handleCallPhone}
                    className="flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-2xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Support</span>
                  </button>
                ) : (
                  <div className="flex-1 py-3 px-3 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs rounded-2xl text-center">
                    Calls Offline
                  </div>
                )}
                {config.telegramUsername && config.telegramEnabled !== false && (
                  <button
                    type="button"
                    onClick={handleOpenTelegram}
                    className="flex-1 py-3 px-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-xs rounded-2xl transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
                Available during standard academic office hours
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick In-App Message Dispatcher */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Compose Quick Support Request</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Type your question below and dispatch directly to WhatsApp or Email in one click.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Scholar:
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-blue-600 dark:text-blue-400">
              {userName || 'Logged In Scholar'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitQuickMessage} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Issue Category / Subject
              </label>
              <select
                value={inquirySubject}
                onChange={(e) => setInquirySubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="GP Wallet & Withdrawal">GP Wallet & Cash Out</option>
                <option value="VTU Airtime / Mobile Data">VTU Airtime / Mobile Data Delivery</option>
                <option value="School Dome Elimination Arena">School Dome Elimination Arena</option>
                <option value="Daily GP Grab">Daily GP Grab</option>
                <option value="Student ID & Scholarship Verification">Student ID Verification</option>
                <option value="Account & Security Access">Account & Security Access</option>
                <option value="Campus Academic League">Campus Academic League</option>
                <option value="Other Assistance">Other Assistance</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contact Method Preference
              </label>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex-1 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 1.794.887 2.806.887 3.181 0 5.767-2.586 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.467 9.953-9.969 9.953-1.611 0-3.125-.386-4.469-1.071l-5.562 1.458 1.488-5.431c-.767-1.393-1.196-2.993-1.196-4.695 0-5.486 4.468-9.953 9.969-9.953 5.502 0 9.739 4.467 9.739 9.739z" />
                  </svg>
                  <span>Use WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="flex-1 py-2.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Use Email</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Your Message or Issue Details
            </label>
            <textarea
              rows={3}
              required
              value={inquiryMessage}
              onChange={(e) => setInquiryMessage(e.target.value)}
              placeholder="Describe what you need assistance with (e.g. question challenge query, withdrawal status, phone number change...)"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>All communications are securely handled by the official Grobaax Administration.</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.001.572 1.794.887 2.806.887 3.181 0 5.767-2.586 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm9.969 5.766c0 5.485-4.467 9.953-9.969 9.953-1.611 0-3.125-.386-4.469-1.071l-5.562 1.458 1.488-5.431c-.767-1.393-1.196-2.993-1.196-4.695 0-5.486 4.468-9.953 9.969-9.953 5.502 0 9.739 4.467 9.739 9.739z" />
                </svg>
                <span>Chat via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleSendEmail}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Email</span>
              </button>
            </div>
          </div>

          {inquirySent && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>WhatsApp launcher initialized! Connect with our team to resolve your inquiry.</span>
            </div>
          )}
        </form>
      </div>

      {/* Frequently Asked Inquiries Section */}
      <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
        <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>Quick Assistance & FAQs</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <h5 className="font-bold text-slate-900 dark:text-white">
              GP Conversion & Withdrawals
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              GP cashouts are processed via Paystack directly to your verified Nigerian bank account within 24 hours of approval.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <h5 className="font-bold text-slate-900 dark:text-white">
              VTU Airtime & Mobile Data
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Recharges are dispatched automatically. If a network operator experiences delayed delivery, the transaction is reconciled within 30 minutes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <h5 className="font-bold text-slate-900 dark:text-white">
              School Dome Elimination
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Registration closes the moment Question #1 is launched by the Arbiter. Prize pools are automatically split equally among surviving scholars.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
