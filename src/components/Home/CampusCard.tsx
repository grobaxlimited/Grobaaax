import React from 'react';
import { useApp } from '../../context/AppContext';
import { NIGERIAN_INSTITUTIONS } from '../../data/nigerianInstitutions';
import {
  GraduationCap,
  Building2,
  BookOpen,
  School,
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
  Users,
  QrCode,
  Sparkles,
  ExternalLink,
  Crown,
  Gem,
  Wifi,
  IdCard,
} from 'lucide-react';

export const CampusCard: React.FC = () => {
  const { currentUser, navigateToCommunitySubTab, openWalletModal } = useApp();

  // Institution resolution
  const instName =
    currentUser?.institutionName ||
    currentUser?.institution ||
    currentUser?.academicProfile?.institutionName ||
    'University of Lagos';

  const matchedInst = NIGERIAN_INSTITUTIONS.find(
    (i) =>
      i.name.toLowerCase() === instName.toLowerCase() ||
      i.shortName.toLowerCase() === instName.toLowerCase() ||
      instName.toLowerCase().includes(i.name.toLowerCase()) ||
      i.name.toLowerCase().includes(instName.toLowerCase())
  );

  const instCategory =
    matchedInst?.category ||
    currentUser?.institutionCategory ||
    currentUser?.academicProfile?.institutionCategory ||
    'University';

  const instState = matchedInst?.state || currentUser?.academicProfile?.state || 'Campus Hub';
  const instLogo = matchedInst?.logo || '🏛️';

  // Academic Details
  const facultyName =
    currentUser?.facultyName ||
    currentUser?.faculty ||
    currentUser?.academicProfile?.facultyName ||
    'Faculty of Science';

  const deptName =
    currentUser?.departmentName ||
    currentUser?.department ||
    currentUser?.academicProfile?.departmentName ||
    'Computer Science';

  const levelName =
    currentUser?.level ||
    currentUser?.academicProfile?.academicLevel ||
    '300 Level';

  const matricNumber =
    currentUser?.matricNumber ||
    currentUser?.academicProfile?.matricNumber ||
    `SCH-${(currentUser?.id || '2026').slice(0, 4).toUpperCase()}-VERIFIED`;

  const scholarName =
    currentUser?.displayName ||
    currentUser?.name ||
    'Registered Scholar';

  const username = currentUser?.username || 'scholar';

  const avatarUrl =
    currentUser?.avatar ||
    currentUser?.profileImage ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username || currentUser?.id || 'scholar')}`;

  const isVerified = Boolean(
    currentUser?.isVerified ||
    currentUser?.hasBlueBadge ||
    currentUser?.academicProfile?.isVerified ||
    currentUser?.tier === 'vip' ||
    currentUser?.tier === 'premium'
  );

  const isVip = currentUser?.tier === 'vip';
  const isPremium = currentUser?.tier === 'premium';

  return (
    <div
      id="home-campus-card-container"
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-indigo-500/40"
    >
      {/* CARD TOP ACCENT BANNER (Official Campus Header) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden">
        {/* Subtle decorative background watermarks */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-4 bottom-2 opacity-10 text-white pointer-events-none">
          <GraduationCap className="w-28 h-28" />
        </div>

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Institution Crest / Logo Emblem */}
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner">
              {instLogo}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                  {matchedInst?.type ? `${matchedInst.type} ${instCategory}` : instCategory}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Campus Network
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white leading-tight truncate" title={instName}>
                {instName}
              </h2>

              <p className="text-xs text-blue-200/90 font-medium flex items-center gap-2 flex-wrap">
                <span>{instState} State</span>
                <span className="opacity-60">•</span>
                <span>Official Digital Campus Pass</span>
              </p>
            </div>
          </div>

          {/* Smart Chip & NFC Contactless Visual Pill */}
          <div className="flex items-center gap-2 sm:self-start shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center gap-2 text-white text-xs font-bold">
              <Wifi className="w-3.5 h-3.5 text-blue-300 rotate-90" />
              <span className="text-[11px] uppercase tracking-wider">SMART ID</span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD MAIN BODY */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Scholar Identification Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Scholar Avatar */}
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={scholarName}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-sm bg-slate-200 dark:bg-slate-800"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(scholarName)}`;
                }}
              />
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs"
                title="Active on Campus"
              />
            </div>

            {/* Scholar Meta */}
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[300px]">
                  {scholarName}
                </h3>

                {isVerified && (
                  <span title="Verified Scholar">
                    <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
                  </span>
                )}

                {isVip && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-500" />
                    VIP
                  </span>
                )}

                {isPremium && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
                    <Gem className="w-3 h-3 text-blue-500" />
                    PREMIUM
                  </span>
                )}

                {/* Equipped Honour / Trophy Badge */}
                {currentUser?.equippedBadge && (
                  <span
                    className="px-1.5 py-0.5 rounded-md text-xs font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center justify-center shadow-2xs"
                    title={`Equipped Honour: ${typeof currentUser.equippedBadge === 'string' ? currentUser.equippedBadge : ((currentUser.equippedBadge as any).title || (currentUser.equippedBadge as any).name)}`}
                  >
                    <span>{typeof currentUser.equippedBadge === 'string' ? currentUser.equippedBadge.split(' ')[0] : ((currentUser.equippedBadge as any).icon || '⭐')}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                @{username}
              </p>

              <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                <span className="text-blue-600 dark:text-blue-400 font-extrabold">{levelName}</span>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{matricNumber}</span>
              </div>
            </div>
          </div>

          {/* Quick Matric & QR / Security Box */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700 text-xs shrink-0">
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <QrCode className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Campus Ledger ID</span>
            </div>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600">
              {matricNumber}
            </span>
          </div>
        </div>

        {/* Academic Details 2-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <School className="w-3.5 h-3.5 text-indigo-500" />
              <span>Registered Faculty</span>
            </div>
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={facultyName}>
              {facultyName}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              <span>Department / Major</span>
            </div>
            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate" title={deptName}>
              {deptName}
            </p>
          </div>
        </div>

        {/* Feature Highlights & Direct Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <Users className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Connect with fellow scholars, coursemates, and faculty WhatsApp study rooms.
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              id="campus-card-open-profile-btn"
              onClick={() => openWalletModal('profile')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <IdCard className="w-3.5 h-3.5 text-slate-500" />
              <span>View Full ID</span>
            </button>

            <button
              type="button"
              id="campus-card-open-directory-btn"
              onClick={() => navigateToCommunitySubTab('campus')}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <span>Open Campus Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
