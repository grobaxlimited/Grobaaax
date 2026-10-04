import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Gift,
  Coins,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Trophy,
  Award,
  Crown,
  ChevronRight,
  Flame,
} from 'lucide-react';

export interface SchoolDomeSpinSlice {
  amount: number;
  label: string;
  color: string;
  textColor: string;
}

// Exactly these 9 GP reward amounts as specified in requirements
export const SCHOOL_DOME_SPIN_SLICES: SchoolDomeSpinSlice[] = [
  { amount: 20, label: '20 GP', color: '#2563EB', textColor: '#FFFFFF' },
  { amount: 25, label: '25 GP', color: '#10B981', textColor: '#FFFFFF' },
  { amount: 30, label: '30 GP', color: '#8B5CF6', textColor: '#FFFFFF' },
  { amount: 35, label: '35 GP', color: '#EC4899', textColor: '#FFFFFF' },
  { amount: 40, label: '40 GP', color: '#06B6D4', textColor: '#FFFFFF' },
  { amount: 45, label: '45 GP', color: '#F59E0B', textColor: '#FFFFFF' },
  { amount: 50, label: '50 GP', color: '#6366F1', textColor: '#FFFFFF' },
  { amount: 100, label: '100 GP', color: '#DC2626', textColor: '#FFFFFF' },
  { amount: 200, label: '200 GP', color: '#EAB308', textColor: '#FFFFFF' },
];

interface SchoolDomeEliminationSpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasonId: string;
  seasonNumber: number;
  seasonTitle?: string;
  isRegistered: boolean;
  isEliminated: boolean;
  tierType: 'free' | 'premium' | 'vip';
  onSpinCompleted?: (rewardAmount: number, newBalance: number) => void;
}

export const SchoolDomeEliminationSpinModal: React.FC<SchoolDomeEliminationSpinModalProps> = ({
  isOpen,
  onClose,
  seasonId,
  seasonNumber,
  seasonTitle,
  isRegistered,
  isEliminated,
  tierType,
  onSpinCompleted,
}) => {
  const { currentUser, setCurrentUser, openWalletModal, addTransaction } = useApp();

  // Mode: 'prompt' (Initial Thank you pop-up) | 'wheel' (Active spin wheel) | 'result' (Won reward modal)
  const [viewState, setViewState] = useState<'prompt' | 'wheel' | 'result'>('prompt');

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [spinsUsed, setSpinsUsed] = useState<number>(0);
  const [maxSpins, setMaxSpins] = useState<number>(tierType === 'vip' ? 2 : 1);
  const [spinsRemaining, setSpinsRemaining] = useState<number>(tierType === 'vip' ? 2 : 1);

  // Result state
  const [wonReward, setWonReward] = useState<number | null>(null);
  const [wonTransaction, setWonTransaction] = useState<any | null>(null);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const canvasConfettiRef = useRef<HTMLCanvasElement | null>(null);

  const activeUserId = currentUser?.id || '';

  // Reset modal state whenever a new season is active or modal is opened
  useEffect(() => {
    if (isOpen) {
      const freshMax = tierType === 'vip' ? 2 : 1;
      setMaxSpins(freshMax);
      setSpinsRemaining(freshMax);
      setSpinsUsed(0);
      setWonReward(null);
      setWonTransaction(null);
      setViewState('prompt');
      setErrorMessage(null);
    }
  }, [isOpen, seasonId, tierType]);

  // Check spin eligibility and status for this season on open
  useEffect(() => {
    if (!isOpen || !seasonId || !activeUserId) return;

    let isMounted = true;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/spin/school-dome/status/${seasonId}/${activeUserId}?tier=${tierType}`);
        const data = await res.json();
        if (isMounted && data.success) {
          if (typeof data.spinsUsed === 'number') setSpinsUsed(data.spinsUsed);
          if (typeof data.maxSpins === 'number') setMaxSpins(data.maxSpins);
          if (typeof data.spinsRemaining === 'number') setSpinsRemaining(data.spinsRemaining);
        }
      } catch (e) {
        console.warn('[Elimination Spin] Status fetch fallback:', e);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [isOpen, seasonId, activeUserId, tierType]);

  // Confetti effect
  const fireConfetti = () => {
    const canvas = canvasConfettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#FBBF24', '#38BDF8'];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      vRot: number;
      life: number;
    }> = [];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2 - 60,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        life: 1,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p) => {
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35;
          p.rotation += p.vRot;
          p.life -= 0.012;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();

          active = true;
        }
      });

      if (active) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();
  };

  // Execute Spin Action
  const handleSpinNow = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/spin/school-dome/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          userId: activeUserId,
          tierType,
          seasonNumber,
          seasonTitle: seasonTitle || `Season ${seasonNumber}`,
          userName: currentUser?.name || (currentUser as any)?.username || 'Scholar',
          userEmail: currentUser?.email || '',
          institutionName: currentUser?.institutionName || (currentUser as any)?.institution || '',
          isRegistered: true,
          isEliminated: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setIsSpinning(false);
        setErrorMessage(result.message || 'Unable to execute spin. Please try again.');
        return;
      }

      // 9 slices on wheel: each slice angle is 360 / 9 = 40°
      // Slice k is centered at k * 40°.
      // To bring slice k to the top (12 o'clock, 0°), rotate clockwise by (360 - k * 40)°.
      const winningIndex = typeof result.sliceIndex === 'number' ? result.sliceIndex : 0;
      const sliceAngle = 360 / SCHOOL_DOME_SPIN_SLICES.length; // 40°
      const targetOffset = 360 - winningIndex * sliceAngle;

      // Subtle realistic jitter within [-6°, +6°] (strictly within ±20° slice width)
      const jitter = (Math.random() - 0.5) * 12;

      // 6 full turns = 2160°
      const fullRotations = 360 * 6;
      const nextDegree =
        currentRotationRef.current +
        fullRotations +
        (targetOffset - (currentRotationRef.current % 360) + 360) % 360 +
        jitter;

      currentRotationRef.current = nextDegree;
      setRotationDegrees(nextDegree);

      // Wait for wheel animation (4.5s)
      setTimeout(() => {
        setIsSpinning(false);
        setWonReward(result.rewardAmount);
        setWonTransaction(result.transaction);
        setSpinsUsed(result.spinsUsed || spinsUsed + 1);
        setMaxSpins(result.maxSpins || maxSpins);
        setSpinsRemaining(result.spinsRemaining ?? Math.max(0, maxSpins - (spinsUsed + 1)));
        setViewState('result');

        // Immediately update global wallet balance
        if (typeof result.newBalance === 'number') {
          setCurrentUser((prev) => ({
            ...prev,
            gpBalance: result.newBalance,
            walletBalance: result.newBalance,
            totalGpEarned: (Number(prev.totalGpEarned) || 0) + result.rewardAmount,
          }));

          // Record authoritative transaction in wallet transactions log so both user and admin see it immediately
          if (addTransaction) {
            addTransaction({
              type: 'school_dome_spin_bonus',
              amount: result.rewardAmount,
              unit: 'GP',
              title: result.transaction?.title || 'School Dome Elimination Spin Bonus',
              description:
                result.transaction?.description ||
                `School Dome ${seasonTitle || `Season #${seasonNumber}`} Elimination Participation Bonus (+${result.rewardAmount} GP)`,
              isCredit: true,
              transactionId: result.transaction?.transactionId || result.transaction?.id,
              userId: activeUserId,
              userName: currentUser?.name || (currentUser as any)?.username || 'Scholar',
              userEmail: currentUser?.email || '',
              institutionName: currentUser?.institutionName || (currentUser as any)?.institution || '',
              meta: result.transaction?.meta || {
                feature: 'school_dome_elimination_spin',
                seasonId,
                seasonNumber,
                seasonTitle: seasonTitle || `Season #${seasonNumber}`,
                subscriptionTier: tierType.toUpperCase(),
                eliminationStatus: 'Eliminated',
                spinNumber: result.spinsUsed || spinsUsed + 1,
                maxSpins: result.maxSpins || maxSpins,
                rewardAmount: result.rewardAmount,
                sliceIndex: winningIndex,
              },
            });
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('grobaax_gp_awarded', {
                detail: {
                  userId: activeUserId,
                  gpAwarded: result.rewardAmount,
                  newBalance: result.newBalance,
                },
              })
            );
          }
        }

        if (onSpinCompleted) {
          onSpinCompleted(result.rewardAmount, result.newBalance);
        }

        fireConfetti();
      }, 4600);
    } catch (err: any) {
      console.error('[Elimination Spin] Execution error:', err);
      setIsSpinning(false);
      setErrorMessage('Network connection error while executing spin. Please try again.');
    }
  };

  const handleCopyTx = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedTxId(txId);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  if (!isOpen) return null;

  // Free users must never see this modal
  if (tierType === 'free') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <canvas
        ref={canvasConfettiRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-indigo-500/40 shadow-2xl overflow-hidden p-6 sm:p-7 text-white">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer z-20"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient background glow */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* ================================================================= */}
        {/* 1. INITIAL SPECIAL PROMPT POP-UP                                  */}
        {/* ================================================================= */}
        {viewState === 'prompt' && (
          <div className="relative z-10 text-center space-y-5 py-2">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Gift className="w-9 h-9 text-slate-950" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {tierType === 'vip' ? 'VIP Scholar Exclusive' : 'Premium Scholar Exclusive'}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Thank You for Participating!
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                You have been eliminated from this School Dome season.
              </p>

              <p className="text-xs sm:text-sm font-bold text-amber-300 max-w-sm mx-auto">
                Spin for your bonus participation reward.
              </p>
            </div>

            {/* Perks Callout */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">Season:</span>
                <span className="font-bold text-white">
                  {seasonTitle || `School Dome Season #${seasonNumber}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">Your Status:</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10.5px]">
                  {tierType === 'vip'
                    ? `VIP Scholar (${spinsRemaining} Spin${spinsRemaining !== 1 ? 's' : ''} Available)`
                    : 'Premium Scholar (1 Spin Available)'}
                </span>
              </div>
            </div>

            {/* Main Action Button */}
            <div className="pt-2 space-y-2.5">
              <button
                onClick={() => setViewState('wheel')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>SPIN NOW</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition font-semibold"
              >
                Claim Later (Saved in Season Arena)
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. THE 9-SLICE SCHOOL DOME ELIMINATION SPIN WHEEL                 */}
        {/* ================================================================= */}
        {viewState === 'wheel' && (
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>
                  {seasonTitle || `Season #${seasonNumber}`} Elimination Bonus
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Spin Your Participation Bonus
              </h3>
              <p className="text-[11px] text-slate-400">
                {tierType === 'vip'
                  ? `VIP Scholar Bonus (Spin ${Math.min(maxSpins, spinsUsed + 1)} of ${maxSpins})`
                  : 'Premium Scholar Bonus (1 Spin Allowed)'}
              </p>
            </div>

            {/* The Wheel Container */}
            <div className="relative w-68 h-68 sm:w-76 sm:h-76 flex items-center justify-center my-2">
              {/* Outer Golden Border Rim with 18 bulbs */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-1.5 shadow-[0_0_35px_rgba(245,158,11,0.35)]">
                <div className="w-full h-full rounded-full bg-slate-950 p-2 relative flex items-center justify-center overflow-hidden">
                  {Array.from({ length: 18 }).map((_, idx) => {
                    const angle = (idx * 360) / 18;
                    const rad = (angle * Math.PI) / 180;
                    const r = 48.5;
                    const left = 50 + r * Math.cos(rad);
                    const top = 50 + r * Math.sin(rad);
                    return (
                      <div
                        key={idx}
                        className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                          isSpinning
                            ? idx % 2 === 0
                              ? 'bg-amber-300 shadow-[0_0_6px_#FCD34D]'
                              : 'bg-white shadow-[0_0_6px_#FFFFFF]'
                            : 'bg-amber-400/80 shadow-[0_0_4px_#F59E0B]'
                        }`}
                        style={{ left: `${left}%`, top: `${top}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Pointer / Needle at 12 o'clock */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                <div className={`transition-transform duration-75 ${isSpinning ? 'animate-bounce' : ''}`}>
                  <svg
                    width="34"
                    height="40"
                    viewBox="0 0 36 42"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 42L4 12C2.5 9 5 4 8.5 4H27.5C31 4 33.5 9 32 12L18 42Z"
                      fill="url(#needle-gradient-dome)"
                      stroke="#FBBF24"
                      strokeWidth="2.5"
                    />
                    <circle cx="18" cy="14" r="5" fill="#FFFFFF" />
                    <defs>
                      <linearGradient id="needle-gradient-dome" x1="18" y1="4" x2="18" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F59E0B" />
                        <stop offset="0.6" stopColor="#DC2626" />
                        <stop offset="1" stopColor="#991B1B" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Rotating Wheel */}
              <div
                ref={wheelRef}
                style={{
                  transform: `rotate(${rotationDegrees}deg)`,
                  transition: isSpinning
                    ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)'
                    : 'none',
                }}
                className="relative w-[88%] h-[88%] rounded-full shadow-2xl overflow-hidden select-none"
              >
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  <defs>
                    {SCHOOL_DOME_SPIN_SLICES.map((slice, i) => (
                      <radialGradient
                        key={`grad-sd-${i}`}
                        id={`slice-grad-sd-${i}`}
                        cx="50%"
                        cy="50%"
                        r="65%"
                      >
                        <stop offset="20%" stopColor={slice.color} />
                        <stop offset="100%" stopColor={slice.color} stopOpacity="0.85" />
                      </radialGradient>
                    ))}
                    <filter id="sd-shadow">
                      <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
                    </filter>
                  </defs>

                  {/* 9 Slices: 40° each */}
                  {SCHOOL_DOME_SPIN_SLICES.map((slice, i) => {
                    const numSlices = SCHOOL_DOME_SPIN_SLICES.length; // 9
                    const sliceAngle = 360 / numSlices; // 40°
                    const startAngleDeg = i * sliceAngle - sliceAngle / 2 - 90;
                    const endAngleDeg = i * sliceAngle + sliceAngle / 2 - 90;

                    const startRad = (startAngleDeg * Math.PI) / 180;
                    const endRad = (endAngleDeg * Math.PI) / 180;

                    const cx = 200;
                    const cy = 200;
                    const r = 196;

                    const x1 = cx + r * Math.cos(startRad);
                    const y1 = cy + r * Math.sin(startRad);
                    const x2 = cx + r * Math.cos(endRad);
                    const y2 = cy + r * Math.sin(endRad);

                    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                    // Text position
                    const midAngleDeg = i * sliceAngle - 90;
                    const textR = 125;
                    const textX = cx + textR * Math.cos((midAngleDeg * Math.PI) / 180);
                    const textY = cy + textR * Math.sin((midAngleDeg * Math.PI) / 180);

                    return (
                      <g key={i}>
                        <path
                          d={pathData}
                          fill={`url(#slice-grad-sd-${i})`}
                          stroke="#0F172A"
                          strokeWidth="3.5"
                        />
                        <line
                          x1={cx}
                          y1={cy}
                          x2={x1}
                          y2={y1}
                          stroke="#FFFFFF"
                          strokeOpacity="0.25"
                          strokeWidth="1.5"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill={slice.textColor}
                          fontSize={slice.amount >= 100 ? '19' : '20'}
                          fontWeight="900"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${i * sliceAngle}, ${textX}, ${textY})`}
                          filter="url(#sd-shadow)"
                        >
                          {slice.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Center Wheel Hub */}
              <div
                onClick={!isSpinning ? handleSpinNow : undefined}
                className={`absolute z-20 w-18 h-18 rounded-full border-4 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center transition-all ${
                  !isSpinning
                    ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-gradient-to-tr from-slate-800 to-slate-900 cursor-not-allowed'
                }`}
              >
                {isSpinning ? (
                  <RefreshCw className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <>
                    <span className="text-[9px] font-black text-amber-950 uppercase tracking-wider">
                      TAP
                    </span>
                    <span className="text-sm font-black text-white uppercase tracking-tight drop-shadow-md">
                      SPIN
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Spin Action Button */}
            <div className="w-full pt-1">
              <button
                onClick={handleSpinNow}
                disabled={isSpinning}
                className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  !isSpinning
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {isSpinning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Spinning for Reward...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>
                      SPIN WHEEL ({tierType === 'vip' ? `Spin ${Math.min(maxSpins, spinsUsed + 1)} of ${maxSpins}` : '1 Spin'})
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. REWARD WON CELEBRATION MODAL                                   */}
        {/* ================================================================= */}
        {viewState === 'result' && wonReward && (
          <div className="relative z-10 text-center space-y-4 py-2">
            <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
              <Gift className="w-9 h-9 text-slate-950" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Participation Reward Credited!
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                +{wonReward} GP Won!
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Thank you for competing in {seasonTitle || `School Dome Season #${seasonNumber}`}. Your reward has been added to your GP wallet balance.
              </p>
            </div>

            {/* Transaction Card */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-left text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span className="text-slate-400">Transaction:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  School Dome Elimination Spin Bonus
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span className="text-slate-400">Reward:</span>
                <span className="font-black text-emerald-400 text-sm">+{wonReward} GP</span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span className="text-slate-400">Season:</span>
                <span className="text-slate-200 font-semibold">
                  School Dome {seasonTitle || `Season ${seasonNumber}`}
                </span>
              </div>

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span className="text-slate-400">Date &amp; Time:</span>
                <span className="text-slate-200 font-medium">
                  {wonTransaction?.date ||
                    new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }) +
                      ' — ' +
                      new Date().toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Reference ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-300 text-[11px]">
                    {wonTransaction?.transactionId || wonTransaction?.id || 'TX_DOME_SPIN'}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyTx(wonTransaction?.transactionId || wonTransaction?.id || '')
                    }
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {copiedTxId === (wonTransaction?.transactionId || wonTransaction?.id) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              {/* If VIP user has a 2nd spin remaining */}
              {spinsRemaining > 0 ? (
                <button
                  onClick={() => {
                    setWonReward(null);
                    setErrorMessage(null);
                    setViewState('wheel');
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>SPIN 2ND VIP BONUS ({spinsRemaining} Left)</span>
                </button>
              ) : null}

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    onClose();
                    openWalletModal('history');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>View in Wallet</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
