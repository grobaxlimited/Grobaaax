import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LiveGusRoom } from './LiveGusRoom';
import { GusRegistrationModal } from './GusRegistrationModal';
import { GusWinnersView } from './GusWinnersView';
import {
  GusCompetition,
  GusLiveState,
  GusParticipantRecord,
} from '../../types';
import {
  ensureGusDefaultCompetition,
  subscribeToGusLiveState,
  subscribeToGusCompetition,
  subscribeToGusParticipant,
  registerForGusCompetition,
  DEFAULT_GUS_COMPETITION_ID,
  DEFAULT_GUS_SEASON_ID,
  SEED_GUS_ROUND_THEMES,
} from '../../lib/gusCompetition';
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  Users,
  Flame,
  Crown,
  HelpCircle,
  ChevronRight,
  UserCheck,
  Clock,
  Lock,
  Layers,
  ShieldCheck,
  Zap,
  Loader2,
  Radio,
} from 'lucide-react';

export const GusTab: React.FC = () => {
  const { currentUser, isSubscriber, markSectionAsRead } = useApp();

  // Clear gus notification badge when user views GUS tab
  useEffect(() => {
    if (markSectionAsRead) {
      markSectionAsRead('gus');
    }
  }, [markSectionAsRead]);

  // State
  const [competition, setCompetition] = useState<GusCompetition | null>(null);
  const [liveState, setLiveState] = useState<GusLiveState | null>(null);
  const [participant, setParticipant] = useState<GusParticipantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Modal & View toggles
  const [inLiveRoom, setInLiveRoom] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);

  // Initialize and Subscribe
  useEffect(() => {
    let unsubLive: (() => void) | undefined;
    let unsubComp: (() => void) | undefined;
    let unsubPart: (() => void) | undefined;

    const init = async () => {
      try {
        const comp = await ensureGusDefaultCompetition();
        setCompetition(comp);

        unsubComp = subscribeToGusCompetition(DEFAULT_GUS_COMPETITION_ID, c => {
          if (c) setCompetition(c);
        });

        unsubLive = subscribeToGusLiveState(DEFAULT_GUS_COMPETITION_ID, ls => {
          if (ls) setLiveState(ls);
          setLoading(false);
        });

        unsubPart = subscribeToGusParticipant(DEFAULT_GUS_COMPETITION_ID, currentUser.id, p => {
          if (p) setParticipant(p);
        });
      } catch (err) {
        console.warn('GUS initialization notice:', err);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubLive) unsubLive();
      if (unsubComp) unsubComp();
      if (unsubPart) unsubPart();
    };
  }, [currentUser.id]);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const record = await registerForGusCompetition(
        DEFAULT_GUS_COMPETITION_ID,
        {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          institution: currentUser.institution,
          department: currentUser.department,
          level: currentUser.level,
          tier: currentUser.gusTier,
        },
        Boolean(isSubscriber || currentUser.isSubscribed),
        DEFAULT_GUS_SEASON_ID
      );
      if (record) {
        setParticipant(record);
      }
      setShowRegModal(false);
    } catch (err) {
      console.error('Registration failed:', err);
      // Fallback local participant state so user is never blocked
      setParticipant({
        id: `${DEFAULT_GUS_COMPETITION_ID}_${currentUser.id}`,
        competitionId: DEFAULT_GUS_COMPETITION_ID,
        seasonId: DEFAULT_GUS_SEASON_ID,
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar || '',
        institution: currentUser.institution || 'Grobaax Academy',
        department: currentUser.department || 'General Sciences',
        level: currentUser.level || '300 Level',
        registrationStatus: 'REGISTERED',
        status: 'ACTIVE',
        currentRound: 1,
        currentQuestion: 1,
        questionsCompleted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        isPremium: Boolean(isSubscriber || currentUser.isSubscribed),
        registeredAt: new Date().toISOString(),
      });
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(`gus_registered_${DEFAULT_GUS_SEASON_ID}_${currentUser.id}`, 'true');
          localStorage.setItem(`gus_registered_${DEFAULT_GUS_COMPETITION_ID}_${currentUser.id}`, 'true');
        }
      } catch {}
      setShowRegModal(false);
    } finally {
      setIsRegistering(false);
    }
  };

  // If in Live Room
  if (inLiveRoom) {
    return (
      <LiveGusRoom
        competitionId={DEFAULT_GUS_COMPETITION_ID}
        onExit={() => setInLiveRoom(false)}
      />
    );
  }

  const isLocallyRegistered = typeof window !== 'undefined' && Boolean(
    localStorage.getItem(`gus_registered_${DEFAULT_GUS_SEASON_ID}_${currentUser.id}`) ||
    localStorage.getItem(`gus_registered_${DEFAULT_GUS_COMPETITION_ID}_${currentUser.id}`)
  );
  const isRegistered = participant?.registrationStatus === 'REGISTERED' || isLocallyRegistered;
  const isEliminated = participant?.status === 'ELIMINATED';
  const isLive = liveState?.status === 'LIVE';
  const isPaused = liveState?.status === 'PAUSED';
  const isCompleted = liveState?.status === 'COMPLETED';
  const isStandby = !isLive && !isPaused && !isCompleted;

  return (
    <div className="pb-24 pt-4 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100 animate-fadeIn">
      {/* 1. LARGE BROAD LIVE ROOM STATUS CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl p-6 sm:p-8 space-y-6 transition-colors">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

        {/* Top Badges */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 flex items-center gap-1.5 shadow-sm">
              <Trophy className="w-3 h-3 text-amber-500" />
              GUS Olympiad • 8 Rounds
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                isLive
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                  : isPaused
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                  : isCompleted
                  ? 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-400 border border-blue-200 dark:border-blue-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive
                    ? 'bg-emerald-500 animate-ping'
                    : isPaused
                    ? 'bg-amber-500 animate-pulse'
                    : isCompleted
                    ? 'bg-purple-500'
                    : 'bg-blue-500 animate-pulse'
                }`}
              />
              {isLive
                ? 'LIVE BROADCAST'
                : isPaused
                ? 'PAUSED BY ADMIN'
                : isCompleted
                ? 'COMPLETED'
                : 'STANDBY • WAITING FOR ADMIN'}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {competition?.title || 'GUS Season 1 — Grandmaster Elimination Olympiad'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Synchronized live competition consisting of exactly 8 rounds and 80 questions. Surviving scholars compete for the final grand prize pool!
          </p>
        </div>

        {/* Key Competition Metrics */}
        <div className="relative z-10 grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-center shadow-inner">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Current Stage</span>
            <span className="text-xs sm:text-sm lg:text-base font-black text-blue-600 dark:text-cyan-400">
              Round {liveState?.currentRound || 1} of 8
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Prize Pool</span>
            <span className="text-xs sm:text-sm lg:text-base font-black text-amber-600 dark:text-amber-400 font-mono">
              {competition?.prizePoolVisibility === 'VISIBLE'
                ? `${(competition.prizePoolGP || 500000).toLocaleString()} GP`
                : 'Locked'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Active Scholars</span>
            <span className="text-xs sm:text-sm lg:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {(liveState?.activeParticipants || competition?.totalParticipants || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* User Status Strip */}
        <div className="relative z-10 p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Your Status:</span>
            {isEliminated ? (
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Eliminated (Round {participant?.eliminatedAtRound || 1})
              </span>
            ) : isRegistered ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Registered Scholar (Active)
              </span>
            ) : (
              <span className="font-bold text-amber-600 dark:text-amber-400">Not Registered</span>
            )}
          </div>

          <div className="text-xs sm:text-sm font-mono font-bold text-blue-600 dark:text-cyan-400">
            {participant?.questionsCompleted || 0}/80 Solved
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="relative z-10 pt-1">
          {isRegistered ? (
            <button
              onClick={() => setInLiveRoom(true)}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base text-white flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                isEliminated
                  ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white'
                  : isLive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 shadow-emerald-600/30 animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:opacity-95 shadow-cyan-600/30'
              }`}
            >
              {isEliminated ? (
                <>
                  <Users className="w-4 h-4 text-cyan-400" /> Enter Live Spectator Arena
                </>
              ) : isLive ? (
                <>
                  <Play className="w-4 h-4" /> Enter Live Question Arena (Round {liveState?.currentRound || 1} Q{liveState?.currentQuestionOrder || 1})
                </>
              ) : isPaused ? (
                <>
                  <Clock className="w-4 h-4" /> Enter Live Room (Paused)
                </>
              ) : isCompleted ? (
                <>
                  <Trophy className="w-4 h-4 text-amber-300" /> View Concluded Grandmasters
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-cyan-300 animate-pulse" /> Enter Live Staging Lounge (Standby)
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowRegModal(true)}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-sm sm:text-base text-white flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Register for GUS Season 1
            </button>
          )}
        </div>
      </div>

      {/* 2. EIGHT-ROUND ROADMAP OVERVIEW */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
              8-Round Elimination Architecture
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              10 questions per round • 80 questions total • Synchronized server clock
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
            No GP Per-Question
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, idx) => {
            const roundNum = idx + 1;
            const theme = SEED_GUS_ROUND_THEMES[roundNum];
            const isCurrent = (liveState?.currentRound || 1) === roundNum;
            const isPassed = (liveState?.currentRound || 1) > roundNum;
            const requiresPremium = competition?.roundEligibility?.[roundNum] === 'PREMIUM_ONLY';

            return (
              <div
                key={roundNum}
                className={`p-4 rounded-2xl border transition-all text-xs space-y-2 ${
                  isCurrent
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm'
                    : isPassed
                    ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 opacity-80'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-[11px] text-blue-600 dark:text-cyan-400">
                    Round {roundNum} (10 Qs)
                  </span>
                  <div className="flex items-center gap-1">
                    {requiresPremium ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Premium
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Open
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1 text-xs sm:text-sm">
                  {theme?.title || `Round ${roundNum}`}
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Topic: {theme?.topic}</span>
                  {isCurrent && (
                    <span className="font-bold text-blue-600 dark:text-cyan-400 animate-pulse">
                      ● Active Now
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. RULES & ELIMINATION GOVERNANCE */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm text-xs sm:text-sm">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
          GUS Rules & Elimination System
        </h3>

        <ul className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed list-disc list-inside">
          <li>
            <strong>Synchronized Live Engine:</strong> Every eligible scholar answers the exact same question simultaneously on a server-controlled countdown.
          </li>
          <li>
            <strong>Zero-Tolerance Elimination:</strong> Submitting an incorrect answer or failing to submit before time runs out results in immediate elimination.
          </li>
          <li>
            <strong>Last Man Standing Prize Pool:</strong> GP is not awarded per question. The entire prize pool is awarded exclusively to final surviving Grandmasters at the end of Round 8.
          </li>
        </ul>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl transition-colors">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                Season 1 Enrollment
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Register for GUS Olympiad</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Enroll your verified scholar profile into the live elimination engine.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Scholar Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Institution:</span>
                <span className="font-bold text-blue-600 dark:text-cyan-400">{currentUser.institution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Academic Tier:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{currentUser.gusTier}</span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                disabled={isRegistering}
                onClick={() => setShowRegModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isRegistering}
                onClick={handleRegister}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-colors shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enrolling...
                  </>
                ) : (
                  'Confirm Registration'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
