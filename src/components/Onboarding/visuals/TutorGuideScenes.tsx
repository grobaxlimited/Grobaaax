import React, { useEffect, useState } from 'react';
import {
  Home,
  Swords,
  Lightbulb,
  Newspaper,
  Users,
  Bell,
  Wallet,
  Sparkles,
  Play,
  ArrowRight,
  ShoppingBag,
  GraduationCap,
  Calendar,
  Trophy,
  ScrollText,
  Radio,
  CheckCircle2,
  Clock,
  Shield,
  Lock,
  Smartphone,
  CreditCard,
  Crown,
  MousePointerClick,
  UserCheck,
  Search,
} from 'lucide-react';

interface SceneProps {
  isPlaying: boolean;
}

/**
 * Shared animated cursor pointer indicator with tap ripple ring.
 * Coordinates are percentages relative to the stage container.
 */
const AnimatedCursor: React.FC<{
  x: number;
  y: number;
  clicking?: boolean;
  label?: string;
}> = ({ x, y, clicking = false, label }) => (
  <div
    className="pointer-events-none absolute z-30 transition-all duration-700 ease-out"
    style={{
      left: `${x}%`,
      top: `${y}%`,
      transform: 'translate(-25%, -20%)',
    }}
  >
    {/* Tap ripple */}
    {clicking && (
      <span className="absolute -left-3 -top-3 w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-400/25 animate-ping" />
    )}
    <div
      className={`relative flex items-center gap-1.5 transition-transform duration-200 ${
        clicking ? 'scale-90' : 'scale-100'
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/40 border-2 border-white flex items-center justify-center">
        <MousePointerClick className="w-4 h-4 stroke-[2.4]" />
      </div>
      {label && (
        <span className="px-2 py-0.5 rounded-md bg-slate-950/90 text-white text-[10px] font-bold tracking-tight whitespace-nowrap shadow-md border border-white/15">
          {label}
        </span>
      )}
    </div>
  </div>
);

/**
 * STEP 1: Welcome Banner + Top Navigation Map
 */
export const SceneWelcomeNavigation: React.FC<SceneProps> = ({ isPlaying }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setTick((t) => (t + 1) % 6);
    }, 1500);
    return () => clearInterval(id);
  }, [isPlaying]);

  const navTargets = [
    { id: 'home', label: 'Home', icon: Home, x: 11, y: 12 },
    { id: 'school_dome', label: 'School Dome', icon: Swords, x: 25, y: 12 },
    { id: 'hints', label: 'Hints', icon: Lightbulb, x: 38, y: 12 },
    { id: 'school_blog', label: 'School Blog', icon: Newspaper, x: 51, y: 12 },
    { id: 'community', label: 'Community', icon: Users, x: 64, y: 12 },
    { id: 'explore', label: 'Explore Competitions', icon: Play, x: 28, y: 74 },
  ];

  const active = navTargets[tick];
  const isClicking = tick === 5 || tick === 1;

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden p-3 flex flex-col justify-between select-none">
      {/* Mock Top Navigation Bar */}
      <div className="relative z-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-2 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1">
          {navTargets.slice(0, 5).map((item, idx) => {
            const Icon = item.icon;
            const isHighlighted = tick === idx;
            return (
              <div
                key={item.id}
                className={`px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all duration-300 ${
                  isHighlighted
                    ? 'bg-blue-700 text-white shadow-md shadow-blue-600/30 scale-105'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline text-[10px] font-bold">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div className="px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-[10px] font-black text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            <span>91 GP</span>
          </div>
        </div>
      </div>

      {/* Mock Hero Banner */}
      <div className="relative mt-2.5 flex-1 rounded-2xl bg-gradient-to-r from-[#0d3fa8] via-[#104ec7] to-[#1c64e6] p-4 text-white flex items-center justify-between gap-3 overflow-hidden shadow-lg">
        <div className="space-y-1.5 relative z-10 max-w-[65%]">
          <p className="text-[11px] font-bold text-blue-100">Welcome to</p>
          <p className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
            Groba<span className="text-[#ffbe1a]">ax</span>
          </p>
          <p className="text-[10px] italic text-blue-100 font-semibold">
            Learn • Compete • Win
          </p>
          <div className="pt-1.5">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffbe1a] text-slate-950 font-black text-[10px] shadow-md transition-transform duration-300 ${
                tick === 5 ? 'scale-105 ring-4 ring-white/50' : ''
              }`}
            >
              <Play className="w-2.5 h-2.5 fill-current" />
              <span>Explore Competitions</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border border-white/20 flex flex-col items-center justify-center shrink-0 shadow-inner animate-float-slow">
          <Trophy className="w-10 h-10 text-[#ffbe1a] drop-shadow" />
          <span className="text-[9px] font-extrabold tracking-wider uppercase text-blue-100 mt-1">
            Season #1
          </span>
        </div>
      </div>

      {/* Live Step Caption */}
      <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="font-bold text-slate-700 dark:text-slate-200">
          Focused Control:{' '}
          <span className="text-blue-600 dark:text-blue-400">{active.label}</span>
        </span>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Tap any tab at the top bar
        </span>
      </div>

      <AnimatedCursor
        x={active.x}
        y={active.y}
        clicking={isClicking}
        label={active.label}
      />
    </div>
  );
};

/**
 * STEP 2: Core Sections — Mini Mart, Campus, Hints & School Blog
 */
export const SceneCoreSections: React.FC<SceneProps> = ({ isPlaying }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setSelectedIdx((i) => (i + 1) % 4);
    }, 2000);
    return () => clearInterval(id);
  }, [isPlaying]);

  const cards = [
    {
      title: 'Mini Mart & Skills',
      tag: 'MARKET',
      summary: 'Buy & sell textbooks, campus gadgets & student freelance services.',
      cta: 'Explore Mini Mart',
      icon: ShoppingBag,
      bg: 'from-[#fff9ea] to-[#ffeac9] border-amber-200',
      iconBg: 'bg-[#ffeed0] text-[#ff7a00]',
      btnBg: 'bg-[#ff7a00]',
      x: 78,
      y: 17,
    },
    {
      title: 'Campus',
      tag: 'SCHOLARS',
      summary: 'Connect with verified peers on WhatsApp across 100+ schools.',
      cta: 'Explore Campus',
      icon: GraduationCap,
      bg: 'from-[#fbf8ff] to-[#ebdfff] border-purple-200',
      iconBg: 'bg-[#eee4ff] text-[#7c3aed]',
      btnBg: 'bg-[#6d28d9]',
      x: 78,
      y: 38,
    },
    {
      title: 'Hints',
      tag: 'STRATEGY',
      summary: 'Official competition clues & syllabus breakdowns for School Dome.',
      cta: 'Explore Hints',
      icon: Lightbulb,
      bg: 'from-[#f1fdf7] to-[#d6f6e5] border-emerald-200',
      iconBg: 'bg-[#daf5e6] text-[#059669]',
      btnBg: 'bg-[#059669]',
      x: 78,
      y: 59,
    },
    {
      title: 'School Blog',
      tag: 'NEWSROOM',
      summary: 'Verified campus journalism — read updates or write articles to earn GP.',
      cta: 'Read School Blog',
      icon: Newspaper,
      bg: 'from-[#f0f7ff] to-[#d9eaff] border-blue-200',
      iconBg: 'bg-[#dbeafe] text-[#1d4ed8]',
      btnBg: 'bg-[#1d4ed8]',
      x: 78,
      y: 81,
    },
  ];

  const activeCard = cards[selectedIdx];

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden p-3 flex flex-col justify-between gap-2 select-none">
      <div className="space-y-1.5">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          const isCurrent = idx === selectedIdx;
          return (
            <button
              key={c.title}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`w-full text-left rounded-xl p-2 bg-gradient-to-r ${c.bg} border flex items-center justify-between gap-2 transition-all duration-300 cursor-pointer ${
                isCurrent
                  ? 'ring-2 ring-blue-600 shadow-md scale-[1.01]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {c.title}
                    </span>
                    <span className="text-[9px] font-black text-slate-600 tracking-wider">
                      {c.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 truncate">
                    {c.summary}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-white font-bold text-[9.5px] shrink-0 ${c.btnBg}`}
              >
                {c.cta}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatedCursor
        x={activeCard.x}
        y={activeCard.y}
        clicking={true}
        label={activeCard.title}
      />
    </div>
  );
};

/**
 * STEP 3: Official Campus Events & Tournament Entry
 */
export const SceneOfficialEvents: React.FC<SceneProps> = ({ isPlaying }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % 3);
    }, 1800);
    return () => clearInterval(id);
  }, [isPlaying]);

  const cursorMap = [
    { x: 35, y: 26, label: 'Filter Category' },
    { x: 78, y: 80, label: 'Inspect Rules & Info' },
    { x: 34, y: 80, label: 'Enter Live Arena' },
  ];

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-[#080f24] border border-blue-900/70 overflow-hidden p-3.5 text-white flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-900/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ff9800] text-slate-950 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider">
              Official Campus Events
            </p>
            <p className="text-[10px] text-slate-400">
              Tournaments, Olympiads &amp; School Dome
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[9px] font-black uppercase">
          REAL-TIME
        </span>
      </div>

      {/* Category Filter Row */}
      <div className="flex items-center gap-1.5 py-2 overflow-hidden">
        {['All Events', 'School Dome', 'Championship', 'Olympiad'].map((tab, idx) => (
          <span
            key={tab}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
              (phase === 0 && idx === 1) || (phase !== 0 && idx === 0)
                ? 'bg-[#ffbe1a] text-slate-950 shadow-xs'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Event Card Replica */}
      <div className="rounded-2xl bg-slate-900 border border-slate-700/80 p-3 space-y-2.5 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="inline-block px-2 py-0.5 rounded-md bg-[#ffbe1a] text-slate-950 text-[9px] font-black uppercase">
              SCHOOL DOME
            </span>
            <h4 className="text-sm font-black text-white mt-1">
              School Dome Season 1
            </h4>
            <p className="text-[10.5px] text-slate-300 mt-0.5">
              Hosted by Global Academic Directorate • <strong className="text-amber-400">50,000 GP Pool</strong>
            </p>
          </div>
          <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
        </div>

        {phase === 1 && (
          <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-500/40 text-[10.5px] text-blue-100 animate-in fade-in duration-200">
            Date Window: Sat &amp; Sun at 5:00 PM • Open to Verified Scholars
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span
            className={`text-[11px] font-black flex items-center gap-1 transition-all ${
              phase === 2 ? 'text-[#ffbe1a] scale-105' : 'text-blue-400'
            }`}
          >
            <span>Enter School Dome Arena</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>

          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              phase === 1
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800 text-slate-200'
            }`}
          >
            Details
          </span>
        </div>
      </div>

      <AnimatedCursor
        x={cursorMap[phase].x}
        y={cursorMap[phase].y}
        clicking={true}
        label={cursorMap[phase].label}
      />
    </div>
  );
};

/**
 * STEP 4: School Dome Registration & Live Battle Questions
 */
export const SceneSchoolDomeRegister: React.FC<SceneProps> = ({ isPlaying }) => {
  const [stage, setStage] = useState(0); // 0: Prompt Register, 1: Registered!, 2: Answer Question

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setStage((s) => (s + 1) % 3);
    }, 2200);
    return () => clearInterval(id);
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between select-none">
      {/* Arena Header Replica */}
      <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-900 dark:text-white">
            <span className="text-blue-500">#</span> 💬 school-dome
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[10px] font-black text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{stage === 0 ? '48' : '49'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </span>
        </div>
        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
          Season #1 • 50,000 GP
        </span>
      </div>

      {/* Registration Status Banner */}
      <div className="p-2.5">
        {stage === 0 ? (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-amber-800 dark:text-amber-200">
              <Swords className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Season #1 Registration is OPEN!</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-xs shrink-0">
              <UserCheck className="w-3 h-3" />
              <span>Register</span>
            </span>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-[#eaf8ee] dark:bg-[#0f2d1e] border border-[#c3ebcb] dark:border-[#1c4b31] flex items-center gap-2 text-[10.5px] font-bold text-[#1b7a37] dark:text-[#4ade80]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>You are Registered for Season #1! Question #1 locks registration.</span>
          </div>
        )}
      </div>

      {/* Live Question Card Preview */}
      <div className="px-2.5 pb-3 flex-1 flex flex-col justify-center">
        <div
          className={`rounded-2xl p-3 border transition-all duration-300 ${
            stage === 2
              ? 'bg-slate-900 text-white border-amber-500/60 shadow-lg scale-[1.01]'
              : 'bg-white dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold mb-1.5">
            <span className="text-amber-500 uppercase tracking-wider">
              Live Elimination Q1
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-black">
              <Clock className="w-3 h-3" />
              <span>{stage === 2 ? '00:18s' : '00:25s'}</span>
            </span>
          </div>
          <p className="text-xs font-bold leading-snug">
            Which organelle is responsible for ATP synthesis in eukaryotic cells?
          </p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-[10.5px] text-slate-200">
              {stage === 2 ? 'Mitochondria ✓' : 'Type your answer fast...'}
            </div>
            <span
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${
                stage === 2
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {stage === 2 ? 'Survived!' : 'Reply'}
            </span>
          </div>
        </div>
      </div>

      <AnimatedCursor
        x={stage === 0 ? 84 : stage === 1 ? 35 : 85}
        y={stage === 0 ? 28 : stage === 1 ? 28 : 79}
        clicking={stage === 0 || stage === 2}
        label={
          stage === 0
            ? '1. Tap Register to Compete'
            : stage === 1
            ? '2. Confirmed in Season'
            : '3. Submit Answer Before Timer Ends'
        }
      />
    </div>
  );
};

/**
 * STEP 5: View Contenders, Standing & Knockouts Modal
 */
export const SceneArenaContenders: React.FC<SceneProps> = ({ isPlaying }) => {
  const [modalOpen, setModalOpen] = useState(true);
  const [rosterTab, setRosterTab] = useState<'standing' | 'knockout' | 'all'>('standing');

  useEffect(() => {
    if (!isPlaying) return;
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % 4;
      if (step === 0) {
        setModalOpen(false);
      } else if (step === 1) {
        setModalOpen(true);
        setRosterTab('standing');
      } else if (step === 2) {
        setModalOpen(true);
        setRosterTab('knockout');
      } else {
        setModalOpen(true);
        setRosterTab('all');
      }
    }, 1700);
    return () => clearInterval(id);
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden p-3 flex flex-col justify-between select-none">
      {/* Arena Header with Spotlighted Contenders Icon */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800 dark:text-white">
            # 💬 school-dome
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-black ring-4 ring-blue-500/25 shadow-md cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>12 Standing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold">Tap to inspect</span>
      </div>

      {/* Simulated Contenders Modal */}
      <div
        className={`mt-2 flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col transition-all duration-300 ${
          modalOpen ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'
        }`}
      >
        <div className="px-3 py-2 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-xs font-black">Season #1 Contenders</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
            50,000 GP Pool
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 pt-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
          {[
            { id: 'standing', label: 'Standing (12)' },
            { id: 'knockout', label: 'Knocked Out (37)' },
            { id: 'all', label: 'All Enrolled (49)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRosterTab(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                rosterTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scholar List */}
        <div className="p-2.5 space-y-1.5 flex-1">
          {[
            { name: 'Adebayo T.', school: 'UNILAG', status: rosterTab === 'knockout' ? 'Eliminated Q2' : 'Standing ✓' },
            { name: 'Chidinma O.', school: 'UNIBEN', status: rosterTab === 'knockout' ? 'Timeout Q3' : 'Standing ✓' },
          ].map((row) => (
            <div
              key={row.name}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px]"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{row.name}</span>
                <span className="ml-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  • {row.school}
                </span>
              </div>
              <span
                className={`text-[10px] font-black ${
                  rosterTab === 'knockout'
                    ? 'text-rose-500'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AnimatedCursor
        x={modalOpen ? (rosterTab === 'standing' ? 20 : rosterTab === 'knockout' ? 50 : 80) : 39}
        y={modalOpen ? 41 : 11}
        clicking={true}
        label={modalOpen ? `Inspect ${rosterTab}` : 'Click People Counter'}
      />
    </div>
  );
};

/**
 * STEP 6: Arena Results (Trophy) & Official Rules (Scroll)
 */
export const SceneArenaResultsRules: React.FC<SceneProps> = ({ isPlaying }) => {
  const [view, setView] = useState<'results' | 'rules'>('results');

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setView((v) => (v === 'results' ? 'rules' : 'results'));
    }, 2500);
    return () => clearInterval(id);
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden p-3 flex flex-col justify-between select-none">
      {/* Arena Header Highlighting Trophy & Rules Icons */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-800 dark:text-white">
            # 💬 school-dome
          </span>
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="p-1 text-slate-400">
              <Radio className="w-3 h-3" />
            </span>
            <button
              type="button"
              onClick={() => setView('results')}
              className={`p-1 rounded-md transition cursor-pointer ${
                view === 'results'
                  ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-400/40'
                  : 'text-slate-500'
              }`}
              title="Champions Results"
            >
              <Trophy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rules Scroll Button */}
        <button
          type="button"
          onClick={() => setView('rules')}
          className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 text-[10px] font-bold transition cursor-pointer ${
            view === 'rules'
              ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/40'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300/70'
          }`}
        >
          <ScrollText className="w-3.5 h-3.5" />
          <span>Rules</span>
        </button>
      </div>

      {/* Switched Content Preview */}
      {view === 'results' ? (
        <div className="mt-2 flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                SEASON 1 RESULTS
              </p>
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase">
                LAST PEOPLE STANDING
              </p>
            </div>
            <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-[10px] text-slate-500">
              <Search className="w-3 h-3" />
              <span>Search season...</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              { name: 'Ibrahim S.', school: 'ABU Zaria', prize: '25,000 GP' },
              { name: 'Grace M.', school: 'UNN Nsukka', prize: '25,000 GP' },
            ].map((w) => (
              <div key={w.name} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{w.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{w.school}</p>
                </div>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  +{w.prize}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-2 animate-in fade-in duration-200">
          <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <ScrollText className="w-4 h-4 text-amber-500" />
            <span>School Dome Official Rules</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Trophy className="w-3.5 h-3.5 text-amber-500 mb-1" />
              <p className="font-bold text-slate-900 dark:text-white">Equal Pool</p>
              <p className="text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                Shared by survivors
              </p>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
              <Shield className="w-3.5 h-3.5 text-rose-500 mb-1" />
              <p className="font-bold text-slate-900 dark:text-white">Elimination</p>
              <p className="text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                Wrong or timeout
              </p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
              <Lock className="w-3.5 h-3.5 text-blue-500 mb-1" />
              <p className="font-bold text-slate-900 dark:text-white">Lock-In</p>
              <p className="text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                Register pre-Q1
              </p>
            </div>
          </div>
        </div>
      )}

      <AnimatedCursor
        x={view === 'results' ? 37 : 88}
        y={12}
        clicking={true}
        label={view === 'results' ? 'Tap Trophy for Results' : 'Tap Scroll for Rules'}
      />
    </div>
  );
};

/**
 * STEP 7: GP Balance Wallet & Profile Hub
 */
export const SceneWalletProfile: React.FC<SceneProps> = ({ isPlaying }) => {
  const [step, setStep] = useState(0); // 0: Highlight GP Pill, 1: Show Wallet Hub Actions

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setStep((s) => (s + 1) % 3);
    }, 2000);
    return () => clearInterval(id);
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full min-h-[265px] sm:min-h-[300px] rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden p-3 flex flex-col justify-between select-none">
      {/* Top Bar highlighting GP Wallet Pill */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
          Top Navigation Bar
        </span>
        <div
          className={`px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all ${
            step === 0 ? 'ring-4 ring-amber-400/60 scale-105' : ''
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>91 GP</span>
          <Sparkles className="w-3 h-3 text-amber-300" />
        </div>
      </div>

      {/* Wallet & Profile Hub Preview */}
      <div className="mt-2 flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scholar Wallet &amp; Profile Hub
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              25,091 GP{' '}
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                (₦25,091)
              </span>
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">
            1 GP = ₦1
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              step === 1
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-500/30'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-[10px] font-black text-slate-900 dark:text-white">
              Airtime &amp; Data
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">24/7 VTU</p>
          </div>

          <div
            className={`p-2 rounded-xl border text-center transition-all ${
              step === 2
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 ring-2 ring-blue-500/30'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] font-black text-slate-900 dark:text-white">
              Withdraw Cash
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">Bank transfer</p>
          </div>

          <div className="p-2 rounded-xl border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-center">
            <Crown className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] font-black text-slate-900 dark:text-white">
              Membership
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">Tiers &amp; Profile</p>
          </div>
        </div>
      </div>

      <AnimatedCursor
        x={step === 0 ? 84 : step === 1 ? 22 : 52}
        y={step === 0 ? 11 : 73}
        clicking={true}
        label={
          step === 0
            ? 'Click GP Pill Anytime'
            : step === 1
            ? 'Redeem Airtime & Data'
            : 'Cash Out to Bank'
        }
      />
    </div>
  );
};
