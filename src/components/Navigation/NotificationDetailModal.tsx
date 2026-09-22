import React from 'react';
import { createPortal } from 'react-dom';
import { NotificationItem } from '../../types';
import { useApp, formatNotificationTime } from '../../context/AppContext';
import {
  X,
  Bell,
  Swords,
  Trophy,
  Building2,
  Wallet,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  ShoppingBag,
  Gift,
  Smartphone,
  ShieldCheck,
  Megaphone,
  ArrowRight,
  Crown,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  onClose: () => void;
  onMarkAsRead?: (id: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  onClose,
  onMarkAsRead,
}) => {
  const { setActiveTab, openWalletModal, navigateToAdminTab, currentUser, setCommunitySubTab, markNotificationRead } = useApp();

  const markCurrentAsRead = React.useCallback(() => {
    if (!notification) return;
    if (onMarkAsRead) {
      onMarkAsRead(notification.id);
    } else if (markNotificationRead) {
      markNotificationRead(notification.id);
    }
  }, [notification, onMarkAsRead, markNotificationRead]);

  // Mark notification as read as soon as it is opened/viewed in this modal
  React.useEffect(() => {
    if (notification && !notification.isRead) {
      markCurrentAsRead();
    }
  }, [notification?.id, notification?.isRead, markCurrentAsRead]);

  if (!notification) return null;

  const handleDismiss = () => {
    markCurrentAsRead();
    onClose();
  };

  const handleActionNavigate = () => {
    markCurrentAsRead();
    onClose();

    const userRoleStr = String(currentUser?.role || '').toLowerCase();
    const isAdminUser = userRoleStr === 'admin' || userRoleStr === 'super_admin';

    if (
      notification.targetRole === 'admin' ||
      notification.actionUrl?.includes('admin:library') ||
      (isAdminUser && notification.type === 'academic_library')
    ) {
      navigateToAdminTab('library');
      return;
    }

    const target = (notification.actionUrl || '').toLowerCase();

    if (notification.actionUrl) {
      if (target.includes('upgrade') || target.includes('membership') || target.includes('tier')) {
        openWalletModal('upgrade');
        return;
      }
      if (target.startsWith('wallet:')) {
        const sub = target.split(':')[1] || 'profile';
        openWalletModal(sub as any);
        return;
      }
      if (target.includes('profile')) {
        openWalletModal('profile');
        return;
      }
      if (target.includes('wallet')) {
        openWalletModal('history');
        return;
      }
      if (target.includes('gus')) {
        setActiveTab('gus');
        return;
      }
      if (target.includes('daily_qa') || target.includes('daily')) {
        setActiveTab('daily_qa');
        return;
      }
      if (target.includes('campus') || target.includes('connection')) {
        setActiveTab('community');
        if (setCommunitySubTab) {
          setCommunitySubTab('campus');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('grobax_open_campus_view', { detail: 'connections' }));
        }
        return;
      }
      if (target.includes('library')) {
        setActiveTab('library');
        return;
      }
      if (target.includes('hint')) {
        setActiveTab('hints');
        return;
      }
      if (target.includes('community')) {
        setActiveTab('community');
        return;
      }
    }

    if (notification.type === 'hints' || notification.type === 'hint') {
      setActiveTab('hints');
      return;
    }

    if (notification.type === 'campus') {
      setActiveTab('community');
      if (setCommunitySubTab) {
        setCommunitySubTab('campus');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('grobax_open_campus_view', { detail: 'connections' }));
      }
      return;
    }

    if (notification.type === 'dome' || target.includes('dome') || target.includes('school_dome')) {
      if (target.includes('result')) {
        setActiveTab('school_dome_results');
      } else {
        setActiveTab('school_dome');
      }
      return;
    }

    if (notification.type === 'reward') {
      openWalletModal('history');
    } else if (notification.type === 'gus') {
      setActiveTab('gus');
    } else if (notification.type === 'academic_library' || notification.type === 'library') {
      setActiveTab('library');
    } else {
      setActiveTab('home');
    }
  };

  const getActionLabel = () => {
    const target = (notification.actionUrl || '').toLowerCase();
    if (target.includes('dome') || notification.type === 'dome') {
      if (target.includes('result')) {
        return { label: 'View Season Results & Winners', icon: <Trophy className="w-4 h-4 text-amber-300" /> };
      }
      return { label: 'Enter School Dome Arena', icon: <Swords className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('upgrade') || target.includes('tier') || target.includes('membership')) {
      return { label: 'Explore Membership Tiers', icon: <Crown className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('profile') || target === 'wallet:profile') {
      return { label: 'View Trophy Cabinet & Pass', icon: <Trophy className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('wallet') || notification.type === 'reward') {
      return { label: 'View Wallet & Ledger', icon: <Wallet className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('gus') || notification.type === 'gus') {
      return { label: 'Enter GUS Olympiad', icon: <Trophy className="w-4 h-4 text-amber-300" /> };
    }
    if (target.includes('campus') || notification.type === 'campus') {
      return { label: 'Open Campus Connections & Chat', icon: <GraduationCap className="w-4 h-4 text-blue-300" /> };
    }
    if (target.includes('library') || notification.type === 'academic_library') {
      return { label: 'Go to Academic Vault', icon: <BookOpen className="w-4 h-4 text-teal-300" /> };
    }
    if (target.includes('hint') || notification.type === 'hints' || notification.type === 'hint') {
      return { label: 'Explore Competition Hints', icon: <Lightbulb className="w-4 h-4 text-amber-300" /> };
    }
    return { label: 'View Activity', icon: <ArrowRight className="w-4 h-4" /> };
  };

  const actionMeta = getActionLabel();

  const getNotifBadge = (type: string) => {
    switch (type) {
      case 'dome':
      case 'arena':
        return {
          icon: <Swords className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          label: 'Speed Quiz & Arena',
          style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'gus':
        return {
          icon: <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          label: 'Daily GP Grab',
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'league':
        return {
          icon: <Building2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          label: 'Campus League',
          style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'wallet':
        return {
          icon: <Wallet className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
          label: 'GP Wallet & Rewards',
          style: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'reward':
        return {
          icon: <Gift className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
          label: 'Scholar Milestone Reward',
          style: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'academic_library':
      case 'library':
        return {
          icon: <BookOpen className="w-5 h-5 text-teal-500 dark:text-teal-400" />,
          label: 'AI Academic Handout Library',
          style: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
        };
      case 'vtu':
        return {
          icon: <Smartphone className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
          label: 'Telecom Airtime & Data',
          style: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
      case 'campus':
        return {
          icon: <GraduationCap className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
          label: 'Campus Connection Request',
          style: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'minimart':
        return {
          icon: <ShoppingBag className="w-5 h-5 text-blue-400" />,
          label: 'Campus Minimart',
          style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        };
      case 'announcement':
        return {
          icon: <Megaphone className="w-5 h-5 text-blue-400" />,
          label: 'Campus Announcement',
          style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        };
      case 'hints':
      case 'hint':
        return {
          icon: <Lightbulb className="w-5 h-5 text-amber-400" />,
          label: 'Competition Strategic Hints',
          style: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      default:
        return {
          icon: <Bell className="w-5 h-5 text-blue-400" />,
          label: 'System Notification',
          style: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        };
    }
  };

  const badgeInfo = getNotifBadge(notification.type);

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Modal Dialog Body - Dark Blue Aesthetic */}
      <div className="relative w-full max-w-lg overflow-hidden bg-gradient-to-b from-[#071d3d] via-[#021024] to-[#010915] border border-blue-500/35 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl shadow-blue-950/90 text-white my-auto z-10 animate-in zoom-in-95 duration-150">
        {/* Subtle dark blue ambient glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-blue-950/70 border border-transparent hover:border-blue-800/40 transition cursor-pointer z-20"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="relative z-10 flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-[#031b3b] border border-blue-500/40 flex items-center justify-center shrink-0 shadow-md shadow-blue-950/50">
            {badgeInfo.icon}
          </div>
          <div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeInfo.style}`}
            >
              {badgeInfo.label}
            </span>
            <h3 className="font-extrabold text-base sm:text-lg leading-snug mt-1 text-white">
              {notification.title}
            </h3>
          </div>
        </div>

        {/* Timestamp & Status info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-y border-blue-900/50 py-2.5 px-1">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" /> Received: {formatNotificationTime(notification) || notification.timestamp}
          </span>
          <div className="flex items-center gap-2 font-bold">
            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Read
            </span>
            {notification.targetUserId || notification.userId ? (
              <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                Direct Award
              </span>
            ) : (
              <span className="text-blue-400 flex items-center gap-1 text-[10px]">
                Broadcast
              </span>
            )}
          </div>
        </div>

        {/* Scholar Profile & Origin Card for Chat Requests */}
        {(notification.type === 'campus' || notification.senderInstitution || notification.senderDepartment) && (
          <div className="relative z-10 p-4 rounded-2xl bg-[#021733]/90 border border-blue-700/40 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Scholar Origin & Profile</span>
              </span>
              {notification.senderTier && notification.senderTier !== 'free' && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {notification.senderTier} Scholar
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {notification.senderAvatar ? (
                <img
                  src={notification.senderAvatar}
                  alt={notification.senderName || 'Scholar'}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-500/40 shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-blue-900/40 text-blue-300 flex items-center justify-center font-black text-base shrink-0 border border-blue-500/40">
                  {notification.senderName ? notification.senderName[0].toUpperCase() : 'S'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {notification.senderName || 'Campus Scholar'}
                </h4>
                {notification.senderInstitution && (
                  <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5 mt-0.5 truncate">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{notification.senderInstitution}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-blue-900/50 text-xs">
              {notification.senderFaculty && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">Faculty</span>
                  <span className="font-bold text-slate-200 truncate">
                    {notification.senderFaculty}
                  </span>
                </div>
              )}
              {notification.senderDepartment && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">Department</span>
                  <span className="font-bold text-slate-200 truncate">
                    {notification.senderDepartment}
                  </span>
                </div>
              )}
              {notification.senderLevel && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">Academic Level</span>
                  <span className="font-bold text-slate-200 truncate">
                    {notification.senderLevel}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notification Body / Message Text */}
        <div className="relative z-10 p-5 rounded-2xl bg-[#011429]/95 border border-blue-900/60 space-y-2.5 shadow-inner">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">
            {notification.type === 'campus' ? 'Connection Request Note' : 'Message Body'}
          </span>
          <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-blue-900/60 bg-[#021327] hover:bg-blue-950/70 text-slate-200 hover:text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleActionNavigate}
            className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-950/80 border border-blue-400/30 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            {actionMeta.icon}
            <span>{actionMeta.label}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
