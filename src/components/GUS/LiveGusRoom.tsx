import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GusLiveState,
  GusParticipantRecord,
  GusCompetition,
} from '../../types';
import {
  subscribeToGusLiveState,
  subscribeToGusParticipant,
  submitGusAnswer,
  DEFAULT_GUS_COMPETITION_ID,
  SEED_GUS_ROUND_THEMES,
} from '../../lib/gusCompetition';
import {
  Trophy,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Crown,
  Sparkles,
  Zap,
  Eye,
  Lock,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Send,
  HelpCircle,
  ShieldCheck,
  Radio,
  Users,
} from 'lucide-react';

interface LiveGusRoomProps {
  competitionId?: string;
  onExit: () => void;
}

export const LiveGusRoom: React.FC<LiveGusRoomProps> = ({
  competitionId = DEFAULT_GUS_COMPETITION_ID,
  onExit,
}) => {
  const { currentUser, isSubscriber } = useApp();

  // Synchronized Firestore state
  const [liveState, setLiveState] = useState<GusLiveState | null>(null);
  const [participant, setParticipant] = useState<GusParticipantRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // User Interactive Typed Answer State
  const [typedAnswer, setTypedAnswer] = useState('');
  const [lockedAnswer, setLockedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
  } | null>(null);

  // Countdown timer derived from server endsAt timestamp
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);
  const [isSpectating, setIsSpectating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Track active question ID to reset local selection on question transition
  const activeQuestionId = liveState?.question?.id;
  const currentRound = liveState?.currentRound || 1;
  const currentQOrder = liveState?.currentQuestionOrder || 1;

  // 1. Subscribe to Live State
  useEffect(() => {
    const unsubLive = subscribeToGusLiveState(competitionId, state => {
      setLiveState(state);
      setLoading(false);
    });

    const unsubPart = subscribeToGusParticipant(competitionId, currentUser.id, part => {
      setParticipant(part);
    });

    return () => {
      unsubLive();
      unsubPart();
    };
  }, [competitionId, currentUser.id]);

  // 2. Reset answer selection whenever the live question changes
  useEffect(() => {
    setTypedAnswer('');
    setLockedAnswer(null);
    setSubmissionResult(null);
    setIsSubmitting(false);

    // Auto-focus input for next question if active
    setTimeout(() => {
      if (inputRef.current && participant?.status === 'ACTIVE' && liveState?.status === 'LIVE') {
        inputRef.current.focus();
      }
    }, 150);
  }, [activeQuestionId, currentRound, currentQOrder]);

  // 3. Synchronized Server Countdown
  useEffect(() => {
    if (!liveState || liveState.status !== 'LIVE' || !liveState.questionEndsAt) {
      if (liveState?.status === 'PAUSED') {
        setSecondsRemaining(liveState.timeLimitSeconds || 20);
      }
      return;
    }

    const calculateTime = () => {
      const diffMs = liveState.questionEndsAt - Date.now();
      const sec = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsRemaining(sec);

      // Auto-evaluate timeout if time reaches 0 and participant hasn't submitted yet
      if (sec === 0 && !submissionResult && participant?.status === 'ACTIVE' && lockedAnswer === null) {
        handleTimeout();
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 500);
    return () => clearInterval(interval);
  }, [liveState?.questionEndsAt, liveState?.status, submissionResult, participant?.status, lockedAnswer]);

  // Auto-timeout submission
  const handleTimeout = async () => {
    if (lockedAnswer !== null || submissionResult || participant?.status !== 'ACTIVE') return;
    try {
      const res = await submitGusAnswer(competitionId, currentUser.id, currentRound, currentQOrder, -1);
      setSubmissionResult({
        submitted: true,
        isCorrect: false,
        correctAnswer: res.correctAnswer,
        explanation: res.explanation,
      });
      setLockedAnswer('TIME_EXPIRED');
    } catch (err) {
      console.warn('Auto timeout notice:', err);
    }
  };

  // Submit Typed Answer
  const handleLockInTypedAnswer = async () => {
    const cleanAnswer = typedAnswer.trim();
    if (
      !cleanAnswer ||
      lockedAnswer !== null ||
      isSubmitting ||
      participant?.status !== 'ACTIVE' ||
      liveState?.status !== 'LIVE' ||
      secondsRemaining <= 0
    ) {
      return;
    }

    setLockedAnswer(cleanAnswer);
    setIsSubmitting(true);

    try {
      const res = await submitGusAnswer(
        competitionId,
        currentUser.id,
        currentRound,
        currentQOrder,
        cleanAnswer
      );

      setSubmissionResult({
        submitted: true,
        isCorrect: res.isCorrect,
        correctAnswer: res.correctAnswer,
        explanation: res.explanation,
      });
    } catch (err: any) {
      console.error('Answer submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLockInTypedAnswer();
    }
  };

  const isEliminated = participant?.status === 'ELIMINATED';
  const isCompleted = participant?.status === 'COMPLETED' || liveState?.status === 'COMPLETED';
  const roundTheme = liveState?.currentRoundName || SEED_GUS_ROUND_THEMES[currentRound]?.title || `Round ${currentRound}`;

  // Check premium eligibility for current round
  const requiresPremium = liveState?.roundEligibility === 'PREMIUM_ONLY';
  const isEligible = !requiresPremium || isSubscriber || currentUser.isSubscribed;

  const timerColor = useMemo(() => {
    if (secondsRemaining <= 5) {
      return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 animate-pulse';
    }
    if (secondsRemaining <= 10) {
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30';
    }
    return 'text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border-blue-200 dark:border-cyan-500/30';
  }, [secondsRemaining]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 dark:border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Connecting to GUS Live Arena...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Synchronizing live competition engine clock and participants...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW: FINAL WINNERS / CONCLUDED STAGE
  // ==========================================
  if (isCompleted || (liveState?.status === 'COMPLETED' && !isSpectating)) {
    const winners = liveState?.winners || [];
    const isUserWinner = winners.some(w => w.userId === currentUser.id);
    const userWinnerRecord = winners.find(w => w.userId === currentUser.id);

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to GUS Hub
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-400/50 dark:border-amber-500/40 p-6 sm:p-8 text-center space-y-6 shadow-xl dark:shadow-2xl transition-colors">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Crown className="w-10 h-10 text-amber-400 animate-bounce" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 uppercase">
              Olympiad Concluded • Season Final
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              GUS Season Grandmasters
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
              All elimination rounds have concluded. The survivors have conquered the arena and claimed the prize pool!
            </p>
          </div>

          {/* User Specific Reward Status */}
          {isUserWinner && userWinnerRecord && (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-gradient-to-r dark:from-amber-500/20 dark:via-yellow-500/20 dark:to-amber-500/20 border-2 border-amber-400 text-center space-y-2">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest block">
                🏆 YOU ARE A GUS GRANDMASTER CHAMPION!
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                +{userWinnerRecord.gpAwarded.toLocaleString()} GP
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-200">
                Credited directly to your wallet with the permanent Grandmaster Scholar Badge!
              </p>
            </div>
          )}

          {/* Winners List */}
          <div className="space-y-3 max-w-xl mx-auto pt-2 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
              Final Surviving Champions ({winners.length})
            </h3>
            {winners.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                No participants survived all rounds. The prize pool rolls over into the next season.
              </div>
            ) : (
              winners.map((w, idx) => (
                <div
                  key={w.id || idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-700 dark:text-amber-400 font-black text-sm flex items-center justify-center">
                      #{w.position}
                    </span>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white">{w.userName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{w.institution}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-sm text-amber-600 dark:text-amber-400">
                      {w.gpAwarded.toLocaleString()} GP
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">All Rounds Clean</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: SUBSCRIPTION REQUIRED FOR ROUND
  // ==========================================
  if (!isEligible && !isEliminated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-5 animate-fadeIn">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return to GUS Hub
        </button>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-indigo-500/40 space-y-5 shadow-xl dark:shadow-2xl text-center transition-colors">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
              Round {currentRound} Requirement
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Subscription Required</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Round {currentRound} is an advanced elimination stage restricted to verified premium scholars. Upgrade your account to continue your survival streak!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>Your Current Record:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{participant?.questionsCompleted || 0} Questions Completed</span>
            </div>
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <span>Status:</span>
              <span className="font-bold text-blue-600 dark:text-cyan-400">Eligible on Subscription Upgrade</span>
            </div>
          </div>

          <button
            onClick={onExit}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-sm text-white hover:opacity-95 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Upgrade Plan & Unlock Round {currentRound}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: WAITING FOR ADMIN TO START COMPETITION
  // If the admin has not started the competition (status is not LIVE or PAUSED),
  // hide all live questions and show the Synchronized Staging Lounge.
  // ==========================================
  const isEngineLive = liveState?.status === 'LIVE' || liveState?.status === 'PAUSED';

  if (!isEngineLive) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to GUS Hub
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl text-[11px] font-mono font-bold tracking-wider bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              STANDBY • WAITING FOR ADMIN
            </span>
          </div>
        </div>

        {/* Staging Lounge Main Card */}
        <div className="relative rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden transition-colors text-center">
          {/* Subtle Ambient Lighting */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Animated Broadcast Radar Icon */}
          <div className="relative z-10 mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-cyan-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-cyan-500/10 animate-ping rounded-full pointer-events-none" />
              <Radio className="w-9 h-9 text-cyan-400 animate-pulse relative z-10" />
            </div>
          </div>

          {/* Staging Title and Explanation */}
          <div className="relative z-10 space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-blue-500/30">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              GUS Live Synchronized Staging Lounge
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Waiting for Administrator to Start Competition
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              The live question broadcast will activate simultaneously on your screen as soon as the administrator launches Round 1. Stay on this screen so you don't miss the countdown clock.
            </p>
          </div>

          {/* Connected Scholar Status Card */}
          <div className="relative z-10 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-left max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Your Enrolled Profile
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Registered Scholar (Standing By)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-11 h-11 rounded-2xl object-cover border border-cyan-500/30 shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">{currentUser.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUser.institution} • {currentUser.department}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Tier</span>
                <span className="text-xs font-black text-amber-500">{currentUser.gusTier}</span>
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Grid */}
          <div className="relative z-10 grid grid-cols-3 gap-2.5 max-w-lg mx-auto text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Enrolled Scholars</span>
              <span className="font-mono font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                {(liveState?.activeParticipants || 1).toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Elimination Scope</span>
              <span className="font-mono font-black text-xs sm:text-sm text-blue-600 dark:text-cyan-400">
                8 Rounds (80 Qs)
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">Prize Pool</span>
              <span className="font-mono font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                {(liveState?.prizePoolGP || 500000).toLocaleString()} GP
              </span>
            </div>
          </div>

          {/* Synchronized Server Radar Pulse */}
          <div className="relative z-10 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-800 dark:text-blue-200 flex items-center justify-center gap-2 max-w-lg mx-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-cyan-400 animate-ping" />
            <span className="font-semibold">
              Synchronized socket active • Auto-broadcasting when live clock begins
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN GUS LIVE ROOM (Broad Live Room Card + Inner Question Card)
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Exit Control */}
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to GUS
        </button>

        <div className="flex items-center gap-2">
          {liveState?.prizePoolVisibility === 'VISIBLE' && (
            <div className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-mono font-bold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {(liveState.prizePoolGP || 500000).toLocaleString()} GP Pool
            </div>
          )}

          <div
            className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
              liveState?.status === 'LIVE'
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                : liveState?.status === 'PAUSED'
                ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${liveState?.status === 'LIVE' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            {liveState?.status || 'WAITING'}
          </div>
        </div>
      </div>

      {/* 1. LARGE BROAD LIVE ROOM CARD (Adaptive Light & Dark Mode) */}
      <div className="relative rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl p-4 sm:p-6 space-y-5 overflow-hidden transition-colors">
        {/* Subtle Background Lighting Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Live Room Header Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                Round {currentRound} of {liveState?.totalRounds || 8}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Question {currentQOrder}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {roundTheme}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Participants Remaining */}
            <div className="px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-sm">
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
              <div className="text-right">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-bold block leading-none">Surviving</span>
                <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                  {(liveState?.activeParticipants || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Prominent Synchronized Countdown Timer */}
            <div
              className={`px-3.5 py-1.5 rounded-2xl border font-mono font-black text-sm sm:text-base flex items-center gap-2 shadow-sm ${timerColor}`}
            >
              <Clock className="w-4 h-4" />
              <span>{secondsRemaining}s</span>
            </div>
          </div>
        </div>

        {/* Participant Status Bar */}
        <div className="relative z-10 flex items-center justify-between text-xs px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Your Status:</span>
            {isEliminated ? (
              <span className="font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> ELIMINATED (Spectator Mode)
              </span>
            ) : submissionResult?.submitted ? (
              <span className="font-black text-blue-600 dark:text-cyan-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Answer Submitted: "{lockedAnswer}"
              </span>
            ) : (
              <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Active Scholar
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold">
            {participant?.questionsCompleted || 0} Solved
          </div>
        </div>

        {/* 2. INNER QUESTION CARD (Visually separated, spacious typed-answer focus) */}
        <div className="relative z-10 rounded-2xl bg-slate-50/80 dark:bg-slate-950/90 border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 shadow-inner">
          {/* Question Metadata Pill */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3 text-xs">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/20 shadow-sm">
              {liveState?.question?.topic || 'Academic Discipline'}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
              Difficulty: {liveState?.question?.difficulty || 'Medium'}
            </span>
          </div>

          {/* Question Text */}
          <div className="py-2">
            <p className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {liveState?.question?.question || 'Waiting for live competition question broadcast...'}
            </p>
          </div>

          {/* TYPED-ANSWER INPUT SECTION */}
          {!isEliminated ? (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Type Your Answer Below:
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={lockedAnswer !== null ? lockedAnswer : typedAnswer}
                    disabled={
                      lockedAnswer !== null ||
                      liveState?.status !== 'LIVE' ||
                      secondsRemaining <= 0 ||
                      isSubmitting
                    }
                    onChange={e => setTypedAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your exact academic answer here..."
                    autoCapitalize="none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-slate-900 dark:text-white font-medium text-sm sm:text-base placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 disabled:cursor-not-allowed outline-none transition-all shadow-sm"
                  />
                </div>

                <button
                  onClick={handleLockInTypedAnswer}
                  disabled={
                    !typedAnswer.trim() ||
                    lockedAnswer !== null ||
                    liveState?.status !== 'LIVE' ||
                    secondsRemaining <= 0 ||
                    isSubmitting
                  }
                  className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-sm hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer shrink-0"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 font-mono text-[10px]">Enter ↵</kbd> to submit</span>
                <span>Typed response is validated immediately</span>
              </div>
            </div>
          ) : (
            /* Spectator Mode Notice */
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-center space-y-2 shadow-sm">
              <div className="inline-flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                <Eye className="w-4 h-4" /> Spectator Mode Active
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                You are viewing the live competition stream. Questions and participant countdowns synchronize in real time.
              </p>
            </div>
          )}

          {/* Submission Feedback & Solution Notes */}
          {submissionResult?.submitted && (
            <div
              className={`p-4 rounded-2xl border text-xs text-left space-y-2 animate-fadeIn ${
                submissionResult.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="font-bold flex items-center gap-2 text-sm">
                {submissionResult.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Correct! You survived this question. Advancing on countdown...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <span>Incorrect Answer! You have been eliminated from this season.</span>
                  </>
                )}
              </div>

              {submissionResult.correctAnswer && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 space-y-1 shadow-sm">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Correct Academic Solution:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">{submissionResult.correctAnswer}</span>
                </div>
              )}

              {submissionResult.explanation && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 leading-relaxed">
                  {submissionResult.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Live Engine Status Footer */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 animate-pulse" />
            <span>GUS Realtime Typed Engine: Active</span>
          </div>
          <div className="font-mono text-slate-500 dark:text-slate-400">
            {liveState?.title || 'Grandmaster Elimination Olympiad'}
          </div>
        </div>
      </div>

      {/* 3. ELIMINATION OVERLAY MODAL (Shown upon elimination) */}
      {isEliminated && !isSpectating && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-400/60 dark:border-rose-500/40 p-6 sm:p-8 text-center space-y-5 shadow-2xl text-slate-900 dark:text-white">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                Eliminated • Round {currentRound} Question {currentQOrder}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Competition Ended</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {participant?.eliminationReason === 'Time Expired'
                  ? 'Your response was not submitted before the timer expired.'
                  : 'Your typed answer did not match the required academic answer.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-left">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Questions Completed:</span>
                <span className="font-bold text-slate-900 dark:text-white">{participant?.questionsCompleted || 0}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Survival Status:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">Eliminated</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => setIsSpectating(true)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <Eye className="w-4 h-4" /> Watch as Spectator
              </button>

              <button
                onClick={onExit}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Return to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
