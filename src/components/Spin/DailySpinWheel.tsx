import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Gift,
  Coins,
  History,
  X,
  ExternalLink,
  ChevronRight,
  Flame,
  Lock,
} from 'lucide-react';

export interface SpinRewardSlice {
  amount: number;
  label: string;
  color: string;
  textColor: string;
}

// Exactly these 8 GP reward amounts as specified in requirements
export const DEFAULT_SPIN_SLICES: SpinRewardSlice[] = [
  { amount: 5, label: '5 GP', color: '#F59E0B', textColor: '#FFFFFF' },
  { amount: 10, label: '10 GP', color: '#2563EB', textColor: '#FFFFFF' },
  { amount: 15, label: '15 GP', color: '#10B981', textColor: '#FFFFFF' },
  { amount: 20, label: '20 GP', color: '#8B5CF6', textColor: '#FFFFFF' },
  { amount: 25, label: '25 GP', color: '#4F46E5', textColor: '#FFFFFF' },
  { amount: 30, label: '30 GP', color: '#EC4899', textColor: '#FFFFFF' },
  { amount: 35, label: '35 GP', color: '#06B6D4', textColor: '#FFFFFF' },
  { amount: 50, label: '50 GP', color: '#EAB308', textColor: '#FFFFFF' },
];

interface DailySpinWheelProps {
  onOpenWallet?: () => void;
  className?: string;
}

export const DailySpinWheel: React.FC<DailySpinWheelProps> = ({ onOpenWallet, className = '' }) => {
  const { currentUser, transactions, setCurrentUser, openWalletModal, addTransaction } = useApp();

  const [canSpin, setCanSpin] = useState<boolean | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [lastSpinDate, setLastSpinDate] = useState<string | null>(null);
  const [lastRewardAmount, setLastRewardAmount] = useState<number | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);

  // Result Celebration Modal State
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [wonReward, setWonReward] = useState<number | null>(null);
  const [wonTransaction, setWonTransaction] = useState<any | null>(null);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  // History Tab / Modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Error state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const canvasConfettiRef = useRef<HTMLCanvasElement | null>(null);

  const activeUserId = currentUser?.id || '';
  const isLoggedIn = Boolean(activeUserId && activeUserId !== 'guest');

  // Load spin status from backend
  const fetchSpinStatus = async () => {
    if (!isLoggedIn) {
      setCanSpin(false);
      setIsLoadingStatus(false);
      return;
    }

    try {
      setIsLoadingStatus(true);
      setErrorMessage(null);
      const res = await fetch(`/api/spin/status/${activeUserId}`);
      const data = await res.json();

      if (data.success) {
        setCanSpin(data.canSpin);
        setSecondsRemaining(data.secondsUntilNextSpin || 0);
        setLastSpinDate(data.lastSpinDate || null);
        if (data.lastReward) {
          setLastRewardAmount(data.lastReward);
        }
      } else {
        setCanSpin(false);
      }
    } catch (err) {
      console.warn('[Spin Wheel] Failed to fetch backend status:', err);
      // Fallback check on user profile
      const todayStr = new Date().toISOString().split('T')[0];
      const hasSpunLocal = (currentUser as any)?.lastSpinDate === todayStr;
      setCanSpin(!hasSpunLocal);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchSpinStatus();
  }, [activeUserId, isLoggedIn]);

  // Live Countdown Timer for next available spin
  useEffect(() => {
    if (canSpin === false && secondsRemaining > 0) {
      const timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            fetchSpinStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canSpin, secondsRemaining]);

  // Format seconds into HH:MM:SS
  const formattedCountdown = useMemo(() => {
    if (secondsRemaining <= 0) return '00:00:00';
    const h = Math.floor(secondsRemaining / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [secondsRemaining]);

  // Confetti burst animation on victory
  const fireConfetti = () => {
    const canvas = canvasConfettiRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#F59E0B', '#2563EB', '#10B981', '#8B5CF6', '#EC4899', '#EF4444', '#FCD34D'];
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
        y: canvas.height / 2 - 80,
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
          p.vy += 0.35; // gravity
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
  const handleSpinClick = async () => {
    if (isSpinning) return;

    if (!isLoggedIn) {
      alert('Please log in or register to claim your free daily spin!');
      return;
    }

    if (canSpin === false) {
      alert('You have already used your free spin today! Return tomorrow for another chance.');
      return;
    }

    setIsSpinning(true);
    setErrorMessage(null);

    try {
      // 1. Backend executes authoritatively: checks daily limit, picks weighted reward, credits balance, creates tx
      const response = await fetch('/api/spin/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUserId,
          userName: currentUser?.name || (currentUser as any)?.username || 'Scholar',
          userEmail: currentUser?.email || '',
          institutionName: currentUser?.institutionName || (currentUser as any)?.institution || '',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setIsSpinning(false);
        if (result.code === 'ALREADY_SPUN_TODAY') {
          setCanSpin(false);
          setSecondsRemaining(result.secondsUntilNextSpin || getSecondsUntilMidnightLocal());
          setErrorMessage('You have already spun today. Return tomorrow for your next spin!');
        } else {
          setErrorMessage(result.message || 'Unable to execute spin. Please try again.');
        }
        return;
      }

      // 2. Compute Target Rotation Angle so pointer lands on the exact winning slice
      // Wheel has 8 slices (45° each). Slices are centered at index * 45°.
      // Pointer is at the TOP (0°). To bring slice `k` to the top, rotate clockwise by (360 - k * 45)°.
      const winningIndex = typeof result.sliceIndex === 'number' ? result.sliceIndex : 0;
      const sliceAngle = 360 / DEFAULT_SPIN_SLICES.length; // 45°
      const targetSliceOffset = 360 - winningIndex * sliceAngle;

      // Add a slight natural jitter within [-8°, +8°] to keep it realistic while strictly inside slice
      const jitter = (Math.random() - 0.5) * 14;

      // Spin at least 6 full revolutions (2160°) forward from current angle
      const fullRotations = 360 * 6; // 2160°
      const nextDegree =
        currentRotationRef.current +
        fullRotations +
        (targetSliceOffset - (currentRotationRef.current % 360) + 360) % 360 +
        jitter;

      currentRotationRef.current = nextDegree;
      setRotationDegrees(nextDegree);

      // 3. Wait for the spinning animation to complete (4.5s)
      setTimeout(() => {
        setIsSpinning(false);
        setCanSpin(false);
        setSecondsRemaining(result.secondsUntilNextSpin || getSecondsUntilMidnightLocal());
        setWonReward(result.rewardAmount);
        setWonTransaction(result.transaction);
        setShowCelebration(true);

        // Update user state immediately in UI
        if (typeof result.newBalance === 'number') {
          setCurrentUser((prev) => ({
            ...prev,
            gpBalance: result.newBalance,
            walletBalance: result.newBalance,
            totalGpEarned: (Number(prev.totalGpEarned) || 0) + result.rewardAmount,
            lastSpinDate: result.transaction?.meta?.spinDate || new Date().toISOString().split('T')[0],
          }));

          // Record authoritative transaction in wallet transactions log
          if (addTransaction) {
            addTransaction({
              type: 'spin_reward',
              amount: result.rewardAmount,
              unit: 'GP',
              title: result.transaction?.title || 'Daily Spin Wheel Reward',
              description: result.transaction?.description || `Daily Lucky Wheel Reward (+${result.rewardAmount} GP credited)`,
              isCredit: true,
              transactionId: result.transaction?.transactionId || result.transaction?.id,
              userId: activeUserId,
              userName: currentUser?.name || (currentUser as any)?.username || 'Scholar',
              userEmail: currentUser?.email || '',
              institutionName: currentUser?.institutionName || '',
              meta: result.transaction?.meta || {
                feature: 'daily_spin_wheel',
                rewardAmount: result.rewardAmount,
                spinDate: result.transaction?.meta?.spinDate || new Date().toISOString().split('T')[0],
              },
            });
          }

          // Dispatch event so all components update immediately
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

        // Trigger victory confetti
        fireConfetti();
      }, 4600);
    } catch (err: any) {
      console.error('[Spin Wheel] Spin execution failed:', err);
      setIsSpinning(false);
      setErrorMessage('Network connection error while executing spin. Please check your internet connection.');
    }
  };

  const getSecondsUntilMidnightLocal = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  };

  // Fetch User's Spin History
  const fetchUserSpinHistory = async () => {
    if (!activeUserId) return;
    setIsLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`/api/spin/history/${activeUserId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions)) {
        setHistoryList(data.transactions);
      } else {
        // Fallback to filtering global transactions
        const filtered = transactions.filter(
          (t) => (t.userId === activeUserId || !t.userId) && t.type === 'spin_reward'
        );
        setHistoryList(filtered);
      }
    } catch {
      const filtered = transactions.filter(
        (t) => (t.userId === activeUserId || !t.userId) && t.type === 'spin_reward'
      );
      setHistoryList(filtered);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCopyTx = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedTxId(txId);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  // Recent spin transactions filtered from local ledger for quick preview
  const userSpinTxs = useMemo(() => {
    return transactions.filter(
      (t) => (t.userId === activeUserId || !t.userId) && t.type === 'spin_reward'
    );
  }, [transactions, activeUserId]);

  return (
    <section
      id="grobaax-daily-spin-feature"
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl p-5 sm:p-7 lg:p-8 ${className}`}
    >
      {/* Hidden celebration confetti canvas */}
      <canvas
        ref={canvasConfettiRef}
        className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/30 to-amber-600/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
              1 Free Spin Daily
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Win Up To 50 GP
            </span>
            {canSpin && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse">
                Ready to Spin
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>🎡</span>
            <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
              Grobaax Daily Spin Wheel
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Every registered scholar receives <strong>1 free spin every calendar day</strong>. Spin the wheel to claim bonus GP rewards added directly to your wallet!
          </p>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={fetchUserSpinHistory}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-bold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="View your past spin rewards"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Spin History</span>
          </button>

          <button
            onClick={() => (onOpenWallet ? onOpenWallet() : openWalletModal('history'))}
            className="px-3.5 py-2 rounded-xl bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-200 text-xs font-bold transition border border-indigo-700/50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Wallet Ledger</span>
          </button>
        </div>
      </div>

      {/* Main Wheel & Info Area */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-6">
        {/* Left Side: Interactive Spinning Wheel Component (lg: 6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-92 md:h-92 flex items-center justify-center">
            {/* Outer Glowing Golden Rim */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-1.5 shadow-[0_0_35px_rgba(245,158,11,0.35)] animate-pulse">
              <div className="w-full h-full rounded-full bg-slate-950 p-2 relative flex items-center justify-center overflow-hidden">
                {/* 16 Rim Indicator Bulbs */}
                {Array.from({ length: 16 }).map((_, idx) => {
                  const angle = (idx * 360) / 16;
                  const rad = (angle * Math.PI) / 180;
                  const r = 48.5; // percent from center
                  const left = 50 + r * Math.cos(rad);
                  const top = 50 + r * Math.sin(rad);
                  return (
                    <div
                      key={idx}
                      className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
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

            {/* Pointer / Needle Indicator at TOP (12 o'clock) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              <div
                className={`transition-transform duration-75 ${
                  isSpinning ? 'animate-bounce' : ''
                }`}
              >
                {/* Needle Shape */}
                <svg
                  width="36"
                  height="42"
                  viewBox="0 0 36 42"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 42L4 12C2.5 9 5 4 8.5 4H27.5C31 4 33.5 9 32 12L18 42Z"
                    fill="url(#needle-gradient)"
                    stroke="#FBBF24"
                    strokeWidth="2.5"
                  />
                  <circle cx="18" cy="14" r="5" fill="#FFFFFF" />
                  <defs>
                    <linearGradient id="needle-gradient" x1="18" y1="4" x2="18" y2="42" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F59E0B" />
                      <stop offset="0.6" stopColor="#DC2626" />
                      <stop offset="1" stopColor="#991B1B" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Rotating Wheel Container */}
            <div
              ref={wheelRef}
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning
                  ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)'
                  : 'none',
              }}
              className="relative w-[88%] h-[88%] rounded-full shadow-2xl overflow-hidden cursor-pointer select-none"
              onClick={!isSpinning && canSpin ? handleSpinClick : undefined}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {DEFAULT_SPIN_SLICES.map((slice, i) => (
                    <radialGradient
                      key={`grad-${i}`}
                      id={`slice-grad-${i}`}
                      cx="50%"
                      cy="50%"
                      r="65%"
                    >
                      <stop offset="20%" stopColor={slice.color} />
                      <stop offset="100%" stopColor={slice.color} stopOpacity="0.82" />
                    </radialGradient>
                  ))}
                  <filter id="slice-shadow">
                    <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#000" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* Slices Rendering */}
                {DEFAULT_SPIN_SLICES.map((slice, i) => {
                  const numSlices = DEFAULT_SPIN_SLICES.length;
                  const sliceAngle = 360 / numSlices; // 45°
                  // Slices centered at i * 45°, top is 12 o'clock (-90° in standard polar coords)
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

                  // Arc path
                  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                  // Text positioning
                  const midAngleDeg = i * sliceAngle - 90;
                  const textR = 125;
                  const textX = cx + textR * Math.cos((midAngleDeg * Math.PI) / 180);
                  const textY = cy + textR * Math.sin((midAngleDeg * Math.PI) / 180);

                  return (
                    <g key={i}>
                      {/* Wedge */}
                      <path
                        d={pathData}
                        fill={`url(#slice-grad-${i})`}
                        stroke="#1E1B4B"
                        strokeWidth="3.5"
                      />

                      {/* Slice Divider Accent Line */}
                      <line
                        x1={cx}
                        y1={cy}
                        x2={x1}
                        y2={y1}
                        stroke="#FFFFFF"
                        strokeOpacity="0.25"
                        strokeWidth="1.5"
                      />

                      {/* Label Text */}
                      <text
                        x={textX}
                        y={textY}
                        fill={slice.textColor}
                        fontSize={slice.amount === 50 ? '21' : '19'}
                        fontWeight="900"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${i * sliceAngle}, ${textX}, ${textY})`}
                        filter="url(#slice-shadow)"
                      >
                        {slice.label}
                      </text>

                      {/* Star or Crown indicator for Highest Reward (50 GP) */}
                      {slice.amount === 50 && (
                        <text
                          x={cx + 160 * Math.cos((midAngleDeg * Math.PI) / 180)}
                          y={cy + 160 * Math.sin((midAngleDeg * Math.PI) / 180)}
                          fill="#FFFFFF"
                          fontSize="13"
                          textAnchor="middle"
                          dominantBaseline="central"
                          transform={`rotate(${i * sliceAngle}, ${cx + 160 * Math.cos((midAngleDeg * Math.PI) / 180)}, ${cy + 160 * Math.sin((midAngleDeg * Math.PI) / 180)})`}
                        >
                          ★
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Metallic Hub & Action Button */}
            <div
              onClick={!isSpinning && canSpin ? handleSpinClick : undefined}
              className={`absolute z-20 w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex flex-col items-center justify-center transition-all ${
                canSpin && !isSpinning
                  ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 cursor-pointer hover:scale-105 active:scale-95'
                  : 'bg-gradient-to-tr from-slate-800 to-slate-900 cursor-not-allowed'
              }`}
            >
              {isSpinning ? (
                <RefreshCw className="w-7 h-7 text-white animate-spin" />
              ) : canSpin ? (
                <>
                  <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                    TAP TO
                  </span>
                  <span className="text-base font-black text-white uppercase tracking-tight drop-shadow-md">
                    SPIN
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-amber-400/80 mb-0.5" />
                  <span className="text-[9px] font-bold text-slate-300 uppercase">
                    SPUN
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Status, Rewards Table & Spin Button (lg: 6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Status Alert Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              canSpin
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  canSpin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {canSpin ? <Gift className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white">
                    {canSpin
                      ? 'Free Daily Spin Available!'
                      : 'You Have Already Spun Today!'}
                  </h3>
                  {!canSpin && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 text-[11px] font-mono font-bold border border-amber-400/30">
                      Next: {formattedCountdown}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {canSpin
                    ? 'You have 1 free spin ready for today. Press the button below or tap the wheel hub to spin and win GP instantly!'
                    : `Your free spin for today has been recorded. The wheel resets every calendar day at midnight (UTC). Return tomorrow for your next free spin!`}
                </p>

                {lastRewardAmount && !canSpin && (
                  <div className="text-[11px] text-amber-300/90 font-medium pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Today’s reward: <strong>+{lastRewardAmount} GP</strong> credited to your balance</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reward Slices Preview Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
              <span>Wheel Reward Amounts (8 Slices)</span>
              <span className="text-[11px] text-amber-400 flex items-center gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Daily GP Payout
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_SPIN_SLICES.map((slice, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-center transition-transform hover:scale-102 ${
                    slice.amount === 50
                      ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border-amber-400/60 shadow-xs'
                      : 'bg-slate-800/60 border-slate-700/80'
                  }`}
                >
                  <div
                    className="text-xs sm:text-sm font-black tracking-tight"
                    style={{ color: slice.color }}
                  >
                    {slice.label}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium mt-0.5">
                    {slice.amount <= 10
                      ? 'Common'
                      : slice.amount <= 20
                      ? 'Frequent'
                      : slice.amount <= 30
                      ? 'Standard'
                      : slice.amount === 35
                      ? 'Rare'
                      : 'Jackpot ★'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Large Interactive Spin Button */}
          <div className="pt-2">
            <button
              onClick={handleSpinClick}
              disabled={isSpinning || canSpin === false || !isLoggedIn}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                canSpin && !isSpinning && isLoggedIn
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-80'
              }`}
            >
              {isSpinning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Spinning Wheel... Good Luck!</span>
                </>
              ) : canSpin && isLoggedIn ? (
                <>
                  <Sparkles className="w-5 h-5 text-amber-950" />
                  <span>Spin Now — 100% Free</span>
                </>
              ) : !isLoggedIn ? (
                <span>Log In To Claim Free Daily Spin</span>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Already Spun Today • Returns in {formattedCountdown}</span>
                </>
              )}
            </button>
          </div>

          {/* Recent user spin history teaser */}
          {userSpinTxs.length > 0 && (
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Last Spin: <strong>+{userSpinTxs[0].amount} GP</strong></span>
                <span className="text-slate-500">({userSpinTxs[0].date})</span>
              </span>
              <button
                onClick={fetchUserSpinHistory}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
              >
                View all ({userSpinTxs.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESULT CELEBRATION MODAL                                                  */}
      {/* ========================================================================= */}
      {showCelebration && wonReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-400 shadow-2xl p-6 sm:p-8 text-center space-y-5 animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon Banner */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
              <Gift className="w-10 h-10 text-slate-950" />
            </div>

            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                🎉 Daily Spin Winner!
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                +{wonReward} GP Won!
              </h3>
              <p className="text-xs text-slate-300">
                Congratulations scholar! That exact reward has been credited immediately to your Grobaax wallet balance.
              </p>
            </div>

            {/* Transaction Receipt Card */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-slate-400">Transaction Title:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Spin Reward
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-slate-400">Reward Added:</span>
                <span className="font-black text-emerald-400 text-sm">+{wonReward} GP</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
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

              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-slate-400">Reference ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-300 text-[11px]">
                    {wonTransaction?.transactionId || wonTransaction?.id || 'TX_SPIN_REF'}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyTx(wonTransaction?.transactionId || wonTransaction?.id || '')
                    }
                    className="p-1 rounded text-slate-400 hover:text-white"
                    title="Copy reference ID"
                  >
                    {copiedTxId === (wonTransaction?.transactionId || wonTransaction?.id) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCelebration(false);
                  if (onOpenWallet) onOpenWallet();
                  else openWalletModal('history');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>View In Wallet</span>
              </button>
              <button
                onClick={() => setShowCelebration(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* USER SPIN TRANSACTIONS HISTORY MODAL                                      */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[85vh] rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl p-6 sm:p-7 flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Your Spin Reward History</h3>
                  <p className="text-xs text-slate-400">
                    Official ledger entries recorded from your daily spin claims
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading spin history...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Gift className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">No Spin Transactions Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Take your free daily spin on the wheel above to record your first spin transaction!
                  </p>
                </div>
              ) : (
                historyList.map((tx, idx) => (
                  <div
                    key={tx.id || tx.transactionId || idx}
                    className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Spin Reward
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Completed
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {tx.date || (tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Recent')}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                        <span>Ref: {tx.transactionId || tx.id}</span>
                        <button
                          onClick={() => handleCopyTx(tx.transactionId || tx.id)}
                          className="p-0.5 hover:text-white"
                          title="Copy reference ID"
                        >
                          {copiedTxId === (tx.transactionId || tx.id) ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="text-base font-black text-emerald-400">
                        +{tx.amount} GP
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Total spins: <strong>{historyList.length}</strong>
              </span>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
