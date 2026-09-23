import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Coins, Sparkles, Zap, Flame } from 'lucide-react';

export const DailyGPGrabVisual: React.FC = () => {
  const [pulseAnswer, setPulseAnswer] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseAnswer((prev) => !prev);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full aspect-[4/3.2] max-h-[280px] sm:max-h-[320px] lg:max-h-[370px] xl:max-h-[410px] rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-b from-[#08182b] via-[#051121] to-[#040817] shadow-2xl shadow-cyan-950/40 p-3.5 sm:p-4 flex flex-col justify-between select-none">
      {/* Background Animated Particle Rays */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-4 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-6 left-6 w-36 h-36 bg-cyan-500/15 rounded-full blur-2xl" />
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70a_1px,transparent_1px),linear-gradient(to_bottom,#0284c70a_1px,transparent_1px)] bg-[size:16px_16px]" />
      </div>

      {/* Top Challenge Status & Timer Bar */}
      <div className="relative z-10 w-full flex items-center justify-between">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span>Individual Daily Challenge</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>15s Timer</span>
        </div>
      </div>

      {/* Simulated Live Question Interface Card */}
      <div className="relative z-10 w-full my-auto space-y-2">
        {/* Question Prompt */}
        <div className="p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Scholastic Assessment
          </span>
          <p className="text-xs sm:text-[13px] font-semibold text-white leading-snug">
            Which element has the atomic number 1 on the periodic table?
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Option A (Unselected) */}
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 text-xs flex items-center justify-between opacity-60">
            <span>A. Helium</span>
          </div>

          {/* Option B (Correct Answer Glowing Pulse) */}
          <div
            className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-all duration-500 ${
              pulseAnswer
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-950/60 scale-[1.02]'
                : 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
            }`}
          >
            <span>B. Hydrogen</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Animated Reward Pop-Up Badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-400/50 text-amber-300 text-xs font-black shadow-md shadow-amber-950/50 animate-bounce" style={{ animationDuration: '2.5s' }}>
            <Coins className="w-3.5 h-3.5 text-yellow-400 animate-coin-sparkle" />
            <span>100 GP+ Rewarded!</span>
          </div>

          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300">
            <Flame className="w-3 h-3 text-orange-400" />
            <span>5-Day Streak</span>
          </div>
        </div>
      </div>

      {/* Floating Ambient GP Coins */}
      <div className="relative z-10 w-full flex items-center justify-between px-1 text-[9.5px] text-slate-400 border-t border-white/[0.08] pt-1.5">
        <span className="flex items-center gap-1 text-slate-300">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Instant GP Balance Credit
        </span>
        <span className="font-semibold text-emerald-400">Monday – Friday</span>
      </div>
    </div>
  );
};
