import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import {
  resolveAdminNotificationTab,
  resolveNotificationKind,
  setPendingCampusView,
} from '../../lib/notificationRouting';
import {
  Bell,
  X,
  ArrowRight,
  Sparkles,
  Trophy,
  Swords,
  Building2,
  Wallet,
  ShieldAlert,
  BookOpen,
  ShoppingBag,
  Gift,
  Smartphone,
  ShieldCheck,
  Megaphone,
  GraduationCap,
  Newspaper,
} from 'lucide-react';

/**
 * Plays a pleasant, subtle notification chime using Web Audio API
 */
export const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.28);

    // Second harmonious tone
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // D6
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.35);
      } catch {}
    }, 100);
  } catch {
    // AudioContext blocked by browser policy prior to user interaction
  }
};

/**
 * InAppPushToast
 * 
 * Renders real-time push notification toasts when new updates arrive for the active user.
 * Supports clicking to view details or dismissing.
 */
export const InAppPushToast: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    setActiveTab,
    viewMode,
    setViewMode,
    navigateToAdminTab,
    currentUser,
    openWalletModal,
    setCommunitySubTab,
  } = useApp();
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  const latestNotif = notifications && notifications.length > 0 ? notifications[0] : null;
  const latestNotifId = latestNotif?.id;
  const latestNotifIsRead = latestNotif?.isRead;

  useEffect(() => {
    if (!latestNotif) return;

    // First mount / initial load: register current latest as seen without alerting
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastSeenIdRef.current = latestNotif.id;
      return;
    }

    // When an actual new, unread notification arrives
    if (latestNotif.id !== lastSeenIdRef.current && !latestNotif.isRead) {
      lastSeenIdRef.current = latestNotif.id;
      setActiveToast(latestNotif);
      playNotificationSound();

      // Native browser notification if allowed (fallback when SW push isn't handling this item)
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(latestNotif.title || 'Grobaax Alert', {
            body: latestNotif.message,
            icon: '/pwa-192x192.png',
            badge: '/favicon.png',
          });
        }
      } catch {}

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [latestNotifId, latestNotifIsRead]);

  useEffect(() => {
    const handleForegroundPush = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail) return;
      const incomingId = String(detail.notificationId || detail.id || '').trim();
      if (incomingId && incomingId === lastSeenIdRef.current) {
        return;
      }
      if (incomingId) {
        lastSeenIdRef.current = incomingId;
      }
      const fcmNotif: NotificationItem = {
        id: incomingId || `fcm_${Date.now()}`,
        title: detail.title || 'Grobaax Alert',
        message: detail.body || detail.message || 'Open Grobaax to view this update.',
        type: (detail.category === 'school_dome'
          ? 'dome'
          : detail.category === 'connections'
          ? 'campus'
          : detail.category || 'announcement') as any,
        actionUrl: detail.destination || detail.url || '/home',
        timestamp: 'Just now',
        isRead: false,
      };
      setActiveToast(fcmNotif);
      playNotificationSound();
      setTimeout(() => {
        setActiveToast((curr) => (curr?.id === fcmNotif.id ? null : curr));
      }, 6000);
    };

    window.addEventListener('grobaax_foreground_push', handleForegroundPush);
    return () => window.removeEventListener('grobaax_foreground_push', handleForegroundPush);
  }, []);

  if (!activeToast) return null;

  const resolvedKind = resolveNotificationKind(activeToast);
  const target = (activeToast.actionUrl || '').toLowerCase();

  const handleAction = () => {
    markNotificationRead(activeToast.id);

    if (activeToast.targetRole === 'admin' || target.startsWith('/admin') || target.includes('admin')) {
      navigateToAdminTab(resolveAdminNotificationTab(activeToast));
      setActiveToast(null);
      return;
    }

    if (resolvedKind === 'school_blog') {
      setActiveTab('school_blog');
      setActiveToast(null);
      return;
    }

    if (resolvedKind === 'reward' || resolvedKind === 'wallet') {
      openWalletModal('history');
      setActiveToast(null);
      return;
    }

    if (activeToast.actionUrl) {
      if (target.includes('upgrade') || target.includes('membership') || target.includes('tier')) {
        openWalletModal('upgrade');
      } else if (target.startsWith('wallet:')) {
        const subTab = target.split(':')[1] || 'profile';
        openWalletModal(subTab as any);
      } else if (target.includes('profile')) {
        openWalletModal('profile');
      } else if (target.includes('wallet')) {
        openWalletModal('history');
      } else if (target.includes('gus') || target.includes('dome') || target.includes('arena') || target.includes('daily')) {
        setActiveTab('school_dome');
      } else if (target.includes('hint')) {
        setActiveTab('hints');
      } else if (target.includes('chat')) {
        setActiveTab('community');
      } else if (target.includes('campus') || target.includes('connection')) {
        setPendingCampusView('connections');
        if (setCommunitySubTab) {
          setCommunitySubTab('campus');
        }
        setActiveTab('community');
      } else if (target.includes('community') || target.includes('feed') || target.includes('minimart')) {
        setActiveTab('community');
      } else {
        setActiveTab('home');
      }
    } else if (resolvedKind === 'campus') {
      setPendingCampusView('connections');
      if (setCommunitySubTab) {
        setCommunitySubTab('campus');
      }
      setActiveTab('community');
    } else if (resolvedKind === 'hints') {
      setActiveTab('hints');
    } else if (resolvedKind === 'dome' || resolvedKind === 'league') {
      setActiveTab('school_dome');
    } else if (resolvedKind === 'gus') {
      setActiveTab('gus');
    } else if (resolvedKind === 'minimart') {
      setActiveTab('community');
    } else {
      setActiveTab('home');
    }
    setActiveToast(null);
  };

  const getToastIcon = (kind: string) => {
    switch (kind) {
      case 'school_blog':
        return <Newspaper className="w-5 h-5 text-blue-400" />;
      case 'campus':
        return <GraduationCap className="w-5 h-5 text-blue-400" />;
      case 'dome':
      case 'arena':
        return <Swords className="w-5 h-5 text-blue-400" />;
      case 'gus':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'league':
        return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'wallet':
        return <Wallet className="w-5 h-5 text-amber-400" />;
      case 'reward':
        return <Gift className="w-5 h-5 text-emerald-400" />;
      case 'academic_library':
      case 'library':
        return <BookOpen className="w-5 h-5 text-teal-400" />;
      case 'vtu':
        return <Smartphone className="w-5 h-5 text-indigo-400" />;
      case 'minimart':
        return <ShoppingBag className="w-5 h-5 text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-5 h-5 text-blue-400" />;
      case 'system':
        return <ShieldCheck className="w-5 h-5 text-blue-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <aside
      aria-label="New push alert"
      aria-live="polite"
      className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
    >
      <div
        id="grobax-push-toast-card"
        className="p-4 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white border border-blue-500/40 shadow-2xl shadow-blue-950/60 backdrop-blur-md space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 shrink-0">
              {getToastIcon(resolvedKind)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                  {resolvedKind === 'campus'
                    ? 'Campus Connection'
                    : resolvedKind === 'school_blog'
                    ? 'School Blog'
                    : 'New Update'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              </div>
              <h4 className="text-xs font-bold text-white line-clamp-1">
                {activeToast.title}
              </h4>
            </div>
          </div>

          <button
            id="btn-dismiss-push-toast"
            onClick={() => {
              if (activeToast?.id) {
                markNotificationRead(activeToast.id);
              }
              setActiveToast(null);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Full Details of Person Sending Chat Request */}
        {(resolvedKind === 'campus' || activeToast.senderInstitution || activeToast.senderDepartment) && (
          <div className="p-2.5 rounded-xl bg-slate-800/90 border border-blue-500/30 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              {activeToast.senderAvatar ? (
                <img
                  src={activeToast.senderAvatar}
                  alt={activeToast.senderName || 'Scholar'}
                  className="w-8 h-8 rounded-full object-cover border border-blue-400/40 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-400/30">
                  {activeToast.senderName ? activeToast.senderName[0].toUpperCase() : 'S'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-white truncate text-xs">
                    {activeToast.senderName || 'Scholar'}
                  </p>
                  {activeToast.senderTier && activeToast.senderTier !== 'free' && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {activeToast.senderTier}
                    </span>
                  )}
                </div>
                {activeToast.senderInstitution && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-300 font-medium truncate mt-0.5">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{activeToast.senderInstitution}</span>
                  </div>
                )}
              </div>
            </div>

            {(activeToast.senderFaculty || activeToast.senderDepartment) && (
              <div className="pt-1.5 border-t border-slate-700/60 flex items-center gap-1.5 text-[10px] text-slate-300">
                <GraduationCap className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">
                  {[activeToast.senderFaculty, activeToast.senderDepartment].filter(Boolean).join(' • ')}
                </span>
                {activeToast.senderLevel && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-700 text-[9px] font-semibold shrink-0 text-slate-300 ml-auto">
                    {activeToast.senderLevel}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {activeToast.message}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
          <span className="text-[10px] text-slate-400 font-medium">
            {activeToast.timestamp || 'Just now'}
          </span>
          <button
            id="btn-view-push-toast"
            onClick={handleAction}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
          >
            <span>
              {resolvedKind === 'school_blog'
                ? 'Open School Blog'
                : resolvedKind === 'campus'
                ? 'Review & Connect'
                : activeToast.targetRole === 'admin' ||
                  target.includes('library') ||
                  resolvedKind === 'academic_library'
                ? 'Review in Vault'
                : 'View'}
            </span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
