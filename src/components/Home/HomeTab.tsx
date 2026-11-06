import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { EventDetailsModal } from './EventDetailsModal';
import { WelcomeVideoModal } from './WelcomeVideoModal';
import {
  PlatformEventItem,
  PLATFORM_EVENT_CATEGORIES,
  OFFICIAL_EVENT_HOST,
} from '../../types';
import { resolveEventChannel } from '../../utils/eventNavigation';
import {
  Trophy,
  ShieldCheck,
  Calendar,
  ArrowRight,
  ShoppingBag,
  GraduationCap,
  Users,
  Lightbulb,
  Play,
  Zap,
} from 'lucide-react';

export const HomeTab: React.FC = () => {
  const {
    setActiveTab,
    events: contextEvents,
    markSectionAsRead,
    navigateToCommunitySubTab,
    navigateToEventChannel,
    openWalletModal,
    systemSettings,
  } = useApp();

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<PlatformEventItem | null>(null);
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('All');

  // Clear home notification badge when user views Home tab
  useEffect(() => {
    if (markSectionAsRead) {
      markSectionAsRead('home');
    }
  }, [markSectionAsRead]);

  const platformEvents = (contextEvents as any as PlatformEventItem[]) || [];
  const sourceEvents = platformEvents.length > 0 ? platformEvents : (contextEvents as any) || [];
  const publishedEvents = sourceEvents.filter((ev: PlatformEventItem) => {
    if (!ev.status) return true;
    const s = String(ev.status).toLowerCase();
    return s === 'published' || s === 'active';
  });

  const filteredEvents = publishedEvents.filter((ev: PlatformEventItem) => {
    if (eventCategoryFilter === 'All') return true;
    return ev.category === eventCategoryFilter;
  });

  // Default featured event displayed when no published event matches
  const fallbackEvent: PlatformEventItem = {
    id: 'school-dome-s1-featured',
    title: 'School Dome Season 1',
    category: 'school_dome',
    host: 'Global Academic Directorate',
    startDate: '2026-11-07',
    endDate: '2026-12-06',
    date: '2026-11-07 to 2026-12-06',
    time: '5:00PM',
    eventTime: '5:00PM',
    prizeReward: '50,000 GP Prize Pool',
    status: 'Published',
    imageUrl: '/images/campus_stadium_banner.jpg',
    description: 'Survive rapid elimination rounds to earn academic glory and your equal share of the grand GP prize pool.',
    audience: 'all_users',
  };

  const displayEvents = filteredEvents.length > 0 ? filteredEvents : (eventCategoryFilter === 'All' || eventCategoryFilter === 'school_dome' ? [fallbackEvent] : []);

  return (
    <div id="grobax-home-tab" className="pb-24 pt-2 space-y-4 sm:space-y-5 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      {/* ======================================================== */}
      {/* 1. HERO BANNER CARD */}
      {/* ======================================================== */}
      <section
        id="home-welcome-hero-banner"
        className="relative overflow-hidden rounded-[26px] sm:rounded-3xl bg-gradient-to-r from-[#0d3fa8] via-[#104ec7] to-[#1c64e6] text-white p-5 sm:p-7 md:p-8 shadow-xl"
      >
        {/* Ambient background glow & soft university silhouette accents */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/4 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-8">
          {/* Left Text Block */}
          <div className="space-y-1.5 sm:space-y-2 flex-1 text-left w-full">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none">
              Welcome to
            </h2>
            <div className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-none">
              Groba<span className="text-[#ffbe1a]">ax</span>
            </div>
            <p className="text-sm sm:text-base italic font-semibold text-blue-100 tracking-wide pt-1">
              Learn • Compete • Win
            </p>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-md leading-relaxed font-normal pt-1">
              Represent your school, showcase your knowledge and earn GP rewards!
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('school_dome')}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#ffbe1a] hover:bg-[#ffcd38] active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Explore Competitions</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Right 3D Trophy Visual */}
          <div className="relative w-44 sm:w-56 md:w-64 lg:w-72 aspect-square flex items-center justify-center shrink-0">
            {/* Glowing Golden Ring Behind Trophy */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-400/30 via-yellow-300/20 to-blue-300/20 blur-xl animate-pulse" />
            <img
              src="/images/home_hero_trophy.jpg"
              alt="Grobaax Academic Championship Trophy"
              className="w-full h-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.45)] relative z-10 rounded-2xl"
              onError={(e) => {
                // Fallback to stylized SVG trophy if image is unavailable
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Carousel Indicator Dots */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 mt-3 sm:mt-4">
          <span className="w-6 h-1.5 rounded-full bg-[#ffbe1a]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-200/40" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-200/40" />
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. THREE QUICK ACTION CARDS (3 COLUMNS) */}
      {/* ======================================================== */}
      <section id="home-quick-action-cards" className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Card 1: School Dome Season 1 (Blue) */}
        <div className="bg-gradient-to-b from-[#1877f2] via-[#1264df] to-[#0a47b8] rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-white text-center flex flex-col items-center justify-between shadow-md relative overflow-hidden group">
          <div className="flex flex-col items-center w-full">
            <Trophy className="w-7 h-7 sm:w-9 sm:h-9 text-white mb-1 drop-shadow-sm group-hover:scale-110 transition-transform" />
            <h3 className="text-[11px] sm:text-sm font-black leading-tight text-white mt-1">
              School Dome<br />Season 1
            </h3>
            <p className="text-[9px] sm:text-[11px] text-blue-100 font-medium mt-1">
              Watch this Guide
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            className="mt-2.5 sm:mt-3 w-full py-1.5 sm:py-2 px-1 sm:px-2 rounded-full bg-white hover:bg-blue-50 text-[#1264df] font-black text-[10px] sm:text-xs shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <span className="truncate">Watch Video</span>
            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current shrink-0" />
          </button>
        </div>

        {/* Card 2: Championship (Purple) */}
        <div className="bg-gradient-to-b from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-white text-center flex flex-col items-center justify-between shadow-md relative overflow-hidden group">
          <div className="flex flex-col items-center w-full">
            <Calendar className="w-7 h-7 sm:w-9 sm:h-9 text-white mb-1 drop-shadow-sm group-hover:scale-110 transition-transform" />
            <h3 className="text-[11px] sm:text-sm font-black leading-tight text-white mt-1">
              Championship
            </h3>
            <p className="text-[9px] sm:text-[11px] text-purple-100 font-medium mt-1 leading-tight">
              Saturday &amp; Sunday • 5:00 PM
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('school_dome')}
            className="mt-2.5 sm:mt-3 w-full py-1.5 sm:py-2 px-1 sm:px-2 rounded-full bg-white hover:bg-purple-50 text-[#7c3aed] font-black text-[10px] sm:text-xs shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <span className="truncate">Enter School Dome</span>
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
          </button>
        </div>

        {/* Card 3: 24/7 Redemption (Teal/Emerald) */}
        <div className="bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-white text-center flex flex-col items-center justify-between shadow-md relative overflow-hidden group">
          <div className="flex flex-col items-center w-full">
            <Calendar className="w-7 h-7 sm:w-9 sm:h-9 text-white mb-1 drop-shadow-sm group-hover:scale-110 transition-transform" />
            <h3 className="text-[11px] sm:text-sm font-black leading-tight text-white mt-1">
              24/7 Redemption
            </h3>
            <p className="text-[9px] sm:text-[11px] text-emerald-100 font-medium mt-1 leading-tight">
              Instant top-up &amp; more...
            </p>
          </div>
          <button
            type="button"
            onClick={() => openWalletModal('airtime_data')}
            className="mt-2.5 sm:mt-3 w-full py-1.5 sm:py-2 px-1 sm:px-2 rounded-full bg-white hover:bg-emerald-50 text-[#059669] font-black text-[10px] sm:text-xs shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <span className="truncate">Redeem Now</span>
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. THREE HORIZONTAL FEATURE CARDS */}
      {/* ======================================================== */}
      <section id="home-feature-cards" className="space-y-3 sm:space-y-3.5">
        {/* Card A: Mini Mart & Skills (Peach/Amber) */}
        <div className="bg-gradient-to-r from-[#fff9ea] via-[#fff5e3] to-[#ffeac9] border border-amber-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 relative overflow-hidden shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-md transition-all">
          {/* Faint Shopping Cart Watermark Background */}
          <div className="absolute right-28 sm:right-40 -top-4 -bottom-4 w-32 pointer-events-none opacity-[0.08] flex items-center justify-center text-amber-600">
            <ShoppingBag className="w-32 h-32" />
          </div>

          <div className="flex items-start sm:items-center gap-3 relative z-10">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#ffeed0] border border-[#ffcf87] flex items-center justify-center text-[#ff7a00] shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Mini Mart &amp; Skills
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#ffc107]/25 border border-[#ffc107]/50 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                  MARKET
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 max-w-xl leading-relaxed">
                Buy, sell campus essentials, textbooks, gadgets, and list student freelance services safely in your institution.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateToCommunitySubTab('minimart')}
            className="relative z-10 px-4 py-2 rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ff9800] hover:from-[#f06e00] hover:to-[#e68900] active:scale-95 text-white font-black text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-all cursor-pointer"
          >
            <span>Explore Mini Mart</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Card B: Campus (Lavender/Purple) */}
        <div className="bg-gradient-to-r from-[#fbf8ff] via-[#f4edff] to-[#ebdfff] border border-purple-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 relative overflow-hidden shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-md transition-all">
          {/* Faint Scholars Watermark Background */}
          <div className="absolute right-28 sm:right-40 -top-4 -bottom-4 w-32 pointer-events-none opacity-[0.08] flex items-center justify-center text-purple-700">
            <Users className="w-32 h-32" />
          </div>

          <div className="flex items-start sm:items-center gap-3 relative z-10">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#eee4ff] border border-[#d3beff] flex items-center justify-center text-[#7c3aed] shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Campus
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#c084fc]/25 border border-[#c084fc]/50 text-purple-900 text-[10px] font-black uppercase tracking-wider">
                  SCHOLARS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 max-w-xl leading-relaxed">
                Connect with verified students, course coursemates, and faculty peers across institutions with verified WhatsApp study chats.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateToCommunitySubTab('campus')}
            className="relative z-10 px-4 py-2 rounded-full bg-gradient-to-r from-[#5b4fe9] to-[#7c3aed] hover:from-[#4b3ed9] hover:to-[#6d28d9] active:scale-95 text-white font-black text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-all cursor-pointer"
          >
            <span>Explore Campus</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Card C: Hints (Mint/Emerald) */}
        <div className="bg-gradient-to-r from-[#f1fdf7] via-[#e5faf0] to-[#d6f6e5] border border-emerald-200/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 relative overflow-hidden shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-md transition-all">
          {/* Faint Target Watermark Background */}
          <div className="absolute right-28 sm:right-40 -top-4 -bottom-4 w-32 pointer-events-none opacity-[0.08] flex items-center justify-center text-emerald-700">
            <Zap className="w-32 h-32" />
          </div>

          <div className="flex items-start sm:items-center gap-3 relative z-10">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#daf5e6] border border-[#a6e8c4] flex items-center justify-center text-[#ff9800] shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                  Hints
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-[#34d399]/25 border border-[#34d399]/50 text-emerald-950 text-[10px] font-black uppercase tracking-wider">
                  STRATEGY
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 max-w-xl leading-relaxed">
                Access official competition hints, syllabus breakdowns, and tactical question clues for School Dome Arena.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('hints')}
            className="relative z-10 px-4 py-2 rounded-full bg-gradient-to-r from-[#0d9488] to-[#059669] hover:from-[#0f766e] hover:to-[#047857] active:scale-95 text-white font-black text-xs shadow-sm flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-all cursor-pointer"
          >
            <span>Explore Hints</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. OFFICIAL CAMPUS EVENTS SECTION CARD */}
      {/* ======================================================== */}
      <section
        id="admin-created-events-section"
        className="bg-[#080f24] border border-blue-950/80 rounded-[26px] sm:rounded-3xl p-4 sm:p-5 md:p-6 text-white shadow-2xl space-y-4"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-blue-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff9800] text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
                OFFICIAL CAMPUS EVENTS
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-300">
                Official tournaments, academic olympiads &amp; verified campus competitions
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-[#1877f2] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
            REAL-TIME
          </span>
        </div>

        {/* Filter Pills Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setEventCategoryFilter('All')}
            className={`px-3.5 py-1 rounded-full text-xs font-black transition whitespace-nowrap cursor-pointer ${
              eventCategoryFilter === 'All'
                ? 'bg-[#ffbe1a] text-slate-950 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80'
            }`}
          >
            All Events
          </button>
          {PLATFORM_EVENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setEventCategoryFilter(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                eventCategoryFilter === cat.id
                  ? 'bg-[#ffbe1a] text-slate-950 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Events Cards */}
        <div className="space-y-3.5 pt-1">
          {displayEvents.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/80 border border-blue-900/40 text-xs text-slate-400">
              No campus events found under this category right now.
            </div>
          ) : (
            displayEvents.map((ev: PlatformEventItem) => {
              const catObj = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === ev.category);
              const catLabel = catObj?.label || ev.category;
              const hasPrize = Boolean(ev.prizeReward && ev.prizeReward.trim() !== '' && ev.prizeReward.trim() !== '0');
              const channelInfo = resolveEventChannel(ev);

              return (
                <div
                  key={ev.id}
                  id={`home-event-card-${ev.id}`}
                  onClick={() => {
                    if (navigateToEventChannel) {
                      navigateToEventChannel(ev);
                    }
                  }}
                  className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col md:flex-row group"
                >
                  {/* Left: Stadium Image Banner */}
                  <div className="relative md:w-5/12 lg:w-4/12 h-44 md:h-auto min-h-[170px] bg-slate-950 overflow-hidden shrink-0">
                    <img
                      src={
                        ev.imageUrl ||
                        ev.image ||
                        '/images/campus_stadium_banner.jpg'
                      }
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/campus_stadium_banner.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-950/40" />

                    {/* Yellow Category Tag on Image */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-3 py-1 rounded-full bg-[#ffbe1a] text-slate-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-sm">
                        {catObj?.shortLabel || 'SCHOOL DOME'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Event Information */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between text-slate-900 dark:text-white space-y-2.5">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ev.title}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1877f2]/15 text-[#1877f2] dark:text-blue-400 text-[10px] font-black uppercase tracking-wider shrink-0 border border-blue-500/20">
                          OFFICIAL EVENT
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {/* Hosted by */}
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-semibold">
                            Hosted by <strong className="text-slate-900 dark:text-white">{ev.host || OFFICIAL_EVENT_HOST}</strong>
                          </span>
                        </div>

                        {/* Date Window */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-medium">
                            Date Window: <strong className="text-slate-800 dark:text-slate-200">{ev.startDate && ev.endDate ? `${ev.startDate} to ${ev.endDate}` : ev.date || '2026-11-07 to 2026-12-06'}</strong>
                          </span>
                        </div>

                        {/* Time & Audience */}
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="font-medium">
                            Time &amp; Audience: <strong className="text-slate-800 dark:text-slate-200">{ev.eventTime || ev.time || '5:00PM'} • {ev.audience || 'All Users'}</strong>
                          </span>
                        </div>

                        {/* Reward */}
                        {hasPrize && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-medium">
                              Reward: <strong className="text-[#ff7a00] dark:text-amber-400 font-black text-sm">{ev.prizeReward}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>{channelInfo.actionText || 'Enter School Dome Arena'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventForDetails(ev);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Pop-up Video Lightbox Modal */}
      <WelcomeVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={systemSettings?.welcomeVideoUrl}
        title={systemSettings?.welcomeVideoTitle || 'School Dome Season 1 Guide'}
        description={systemSettings?.welcomeVideoDescription || 'Watch this quick video walkthrough to learn every platform function, compete in School Dome Arena, and earn GP.'}
      />

      {/* Event Details Modal */}
      {selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          onClose={() => setSelectedEventForDetails(null)}
        />
      )}
    </div>
  );
};

