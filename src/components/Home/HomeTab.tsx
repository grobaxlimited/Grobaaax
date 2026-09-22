import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { EventDetailsModal } from './EventDetailsModal';
import { CampusCard } from './CampusCard';
import {
  PlatformEventItem,
  PlatformEventCategory,
  PLATFORM_EVENT_CATEGORIES,
  OFFICIAL_EVENT_HOST,
} from '../../types';
import { resolveEventChannel } from '../../utils/eventNavigation';
import { db, collection, onSnapshot, query, orderBy } from '../../lib/firebase';
import {
  Trophy,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Sparkles,
  Clock,
  Search,
  ShoppingBag,
  GraduationCap,
  Flame,
  Award,
  Zap,
  Compass,
  Building2,
  Users,
  BookOpen,
  Smartphone,
  Swords,
} from 'lucide-react';

export const HomeTab: React.FC = () => {
  const {
    setActiveTab,
    events: contextEvents,
    markSectionAsRead,
    currentUser,
    navigateToCommunitySubTab,
    navigateToEventChannel,
    openWalletModal,
  } = useApp();

  // Clear home notification badge when user views Home tab
  useEffect(() => {
    if (markSectionAsRead) {
      markSectionAsRead('home');
    }
  }, [markSectionAsRead]);

  // Use platform events from global AppContext to eliminate redundant Firestore listeners
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<PlatformEventItem | null>(null);
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('All');
  const platformEvents = (contextEvents as any as PlatformEventItem[]) || [];
  const isLoadingEvents = false;

  // Display platform events (Published events for users)
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

  const getCategoryBadgeColor = (cat: PlatformEventCategory) => {
    switch (cat) {
      case 'school_dome':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'gus':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'academic_olympiad':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'chatroom_live':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'campus_hackathon':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'others':
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div id="grobax-home-tab" className="pb-24 pt-4 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ======================================================== */}
      {/* 1. PROFESSIONAL GROBAAX WELCOME & PILLARS INTRO SECTION */}
      {/* ======================================================== */}
      <section
        id="home-welcome-section"
        className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 sm:p-8 lg:p-10 border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="relative space-y-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Campus Academic Hub</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Welcome to Grobaax
            </h1>

            <p className="text-sm sm:text-base lg:text-lg font-bold text-blue-600 dark:text-blue-400">
              Represent your school title, conquer academic arenas, and connect with scholars nationwide.
            </p>

            <p className="text-xs sm:text-sm lg:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed font-medium">
              Grobaax is an education-focused platform where students discover useful academic resources in the <strong>Academic Library</strong>, test knowledge through <strong>Daily GP Grab</strong>, represent their institution as the last school standing in the <strong>School Dome Arena</strong>, recharge instant <strong>VTU Airtime & Data</strong>, connect with fellow scholars via the <strong>Campus Mini Mart</strong>, and build verified student networks on <strong>Campus</strong>.
            </p>
          </div>

          {/* Academic & Platform Pillars Quick Action / Highlight Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {/* 1. School Dome Arena Pillar */}
            <div
              id="home-pillar-school-dome-card"
              onClick={() => setActiveTab('school_dome')}
              className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-50 to-amber-500/5 dark:from-amber-950/20 dark:via-slate-800/80 dark:to-slate-900 hover:bg-white dark:hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500/60 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Swords className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      School Dome Arena
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black border border-amber-500/30">
                      CHAMPIONSHIP
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Represent your institution as the Last School Standing! Survive elimination rounds of rapid academic questions to claim achievement and your equal share of the grand GP prize pool.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                <span>Enter School Dome</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. Daily GP Grab Pillar */}
            <div
              id="home-pillar-gus-card"
              onClick={() => setActiveTab('daily_qa')}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Daily GP Grab
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] font-black border border-amber-500/30">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Participate in daily real-time search queries and challenge questions to boost your knowledge and earn GP points.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                <span>Enter Daily GP Grab</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. Academic Library Pillar Card */}
            <div
              id="home-pillar-library-card"
              onClick={() => setActiveTab('library')}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      Academic Library
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 text-[9px] font-black border border-sky-500/30">
                      LIBRARY
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Generate study-grade, curriculum-aligned academic handouts, worked examples, and exam review questions tailored to your exact Nigerian tertiary institution.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                <span>Generate Academic Handouts</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 3. Instant VTU Services (Airtime & Data) Pillar Card */}
            <div
              id="home-pillar-vtu-card"
              onClick={() => openWalletModal('airtime_data')}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Instant VTU Services
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[9px] font-black border border-emerald-500/30">
                      VTU
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Instant airtime recharge and affordable mobile data bundles for MTN, Airtel, Glo, and 9mobile directly from your student dashboard.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Recharge Airtime & Data</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 4. Mini Mart & Skills Listing Pillar */}
            <div
              id="home-pillar-minimart-card"
              onClick={() => navigateToCommunitySubTab('minimart')}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      Mini Mart & Skills Listing
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] font-black border border-amber-500/30">
                      MARKET
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Buy, sell campus essentials, textbooks, gadgets, and list student freelance services safely in your institution.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                <span>Explore Mini Mart</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 5. Campus Pillar */}
            <div
              id="home-pillar-campus-card"
              onClick={() => navigateToCommunitySubTab('campus')}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Campus
                    </h2>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[9px] font-black border border-indigo-500/30">
                      SCHOLARS
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Connect with verified students, course coursemates, and faculty peers across institutions with verified WhatsApp study chats.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <span>Explore Campus</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 1.5 OFFICIAL CAMPUS CARD (STUDENT SCHOLAR IDENTITY)     */}
      {/* ======================================================== */}
      <section id="home-campus-card-section">
        <CampusCard />
      </section>

      {/* ======================================================== */}
      {/* 2. ADMIN-CREATED EVENTS SECTION (REAL-TIME FIRESTORE) */}
      {/* ======================================================== */}
      <section id="admin-created-events-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Official Campus Events</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-black border border-blue-500/20">
                  REAL-TIME
                </span>
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Official tournaments, academic olympiads & verified campus competitions created by administrators
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setEventCategoryFilter('All')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                eventCategoryFilter === 'All'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Events
            </button>
            {PLATFORM_EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setEventCategoryFilter(cat.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  eventCategoryFilter === cat.id
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {isLoadingEvents ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            Loading official events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No published events found right now. Check back soon for new official tournaments and academic events!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredEvents.map((ev: PlatformEventItem) => {
              const catObj = PLATFORM_EVENT_CATEGORIES.find((c) => c.id === ev.category);
              const catLabel = catObj?.label || ev.category;
              const hasPrize = Boolean(ev.prizeReward && ev.prizeReward.trim() !== '' && ev.prizeReward.trim() !== '0');
              const channelInfo = resolveEventChannel(ev);

              return (
                <Card
                  key={ev.id}
                  id={`home-event-card-${ev.id}`}
                  className="p-0 overflow-hidden transition-all hover:border-blue-500/40 hover:shadow-md flex flex-col justify-between group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
                >
                  {/* Card Cover Image: Direct click navigates to proper channel */}
                  <div
                    className="relative h-36 w-full bg-slate-950 overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (navigateToEventChannel) {
                        navigateToEventChannel(ev);
                      }
                    }}
                    title={`Click to enter ${channelInfo.label}`}
                  >
                    <img
                      src={
                        ev.imageUrl ||
                        ev.image ||
                        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    {/* Category & Status Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${getCategoryBadgeColor(
                          ev.category
                        )} bg-slate-950/80`}
                      >
                        {catObj?.shortLabel || catLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
                        Official Event
                      </span>
                    </div>

                    {/* Event Title */}
                    <div className="absolute bottom-2.5 left-3 right-3">
                      <h3 className="text-sm font-black text-white leading-tight drop-shadow-sm line-clamp-1 group-hover:text-blue-300 transition-colors">
                        {ev.title}
                      </h3>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>
                          Hosted by{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {ev.host || OFFICIAL_EVENT_HOST}
                          </strong>
                        </span>
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Date Window
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.startDate && ev.endDate ? `${ev.startDate} to ${ev.endDate}` : ev.date || 'Active Event'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" /> Time & Audience
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ev.eventTime || ev.time || '18:00 UTC'} • All Users
                          </span>
                        </div>

                        {/* Reward field ONLY rendered if configured */}
                        {hasPrize && (
                          <div className="flex items-center justify-between text-xs pt-0.5 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Reward
                            </span>
                            <span className="font-black text-amber-600 dark:text-amber-400">
                              {ev.prizeReward}
                            </span>
                          </div>
                        )}

                        {/* Destination Channel Route */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-blue-500" /> Destination
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${channelInfo.badgeClass}`}>
                            {channelInfo.label}
                          </span>
                        </div>
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons: Direct to proper channel + Details */}
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <Button
                        id={`enter-event-channel-btn-${ev.id}`}
                        variant="primary"
                        size="sm"
                        className="flex-1 justify-center font-bold text-xs cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigateToEventChannel) {
                            navigateToEventChannel(ev);
                          }
                        }}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        {channelInfo.actionText}
                      </Button>

                      <Button
                        id={`view-event-details-btn-${ev.id}`}
                        variant="outline"
                        size="sm"
                        className="px-3 text-xs font-bold shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEventForDetails(ev);
                        }}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* EVENT DETAILS MODAL OVERLAY */}
      {selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          onClose={() => setSelectedEventForDetails(null)}
        />
      )}
    </div>
  );
};
