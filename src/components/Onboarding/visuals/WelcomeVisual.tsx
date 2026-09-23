import React from 'react';
import { BookOpen, Trophy, Users, Coins, GraduationCap, Sparkles, Building2, Globe } from 'lucide-react';

export const WelcomeVisual: React.FC = () => {
  return (
    <div className="relative w-full aspect-[4/3.2] max-h-[280px] sm:max-h-[310px] rounded-3xl overflow-hidden border border-blue-500/25 bg-gradient-to-b from-[#071330] via-[#050e24] to-[#040817] shadow-2xl shadow-blue-950/60 p-4 flex flex-col items-center justify-center select-none">
      {/* Background Animated Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e3a8a0f_1px,transparent_1px),linear-gradient(to_bottom,#1e3a8a0f_1px,transparent_1px)] bg-[size:20px_20px]" />
      </div>

      {/* Orbiting Satellite / Constellation Center */}
      <div className="relative flex items-center justify-center w-full max-w-[260px] h-[190px]">
        {/* Radar concentric waves */}
        <div className="absolute w-24 h-24 rounded-full border border-blue-400/20 animate-radar-ping pointer-events-none" />
        <div className="absolute w-36 h-36 rounded-full border border-cyan-400/15 pointer-events-none" />
        <div className="absolute w-48 h-48 rounded-full border border-blue-500/10 pointer-events-none" />

        {/* Central Glowing Shield Crest */}
        <div className="relative z-10 w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 p-0.5 shadow-xl shadow-blue-600/40 animate-float-slow">
          <div className="w-full h-full rounded-[22px] bg-[#071536] flex flex-col items-center justify-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent" />
            <GraduationCap className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
            <span className="text-[9px] font-black tracking-widest text-blue-200 uppercase mt-0.5">
              GROBAAX
            </span>
          </div>
        </div>

        {/* Orbit Node 1: Learn (Top Left) */}
        <div className="absolute -top-1 left-3 sm:left-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 shadow-lg shadow-blue-950 backdrop-blur-md animate-bounce" style={{ animationDuration: '4s' }}>
          <div className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center text-blue-300">
            <BookOpen className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-bold text-blue-100">Learn</span>
        </div>

        {/* Orbit Node 2: Compete (Top Right) */}
        <div className="absolute -top-1 right-3 sm:right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-400/40 shadow-lg shadow-amber-950 backdrop-blur-md animate-bounce" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }}>
          <div className="w-5 h-5 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300">
            <Trophy className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-bold text-amber-200">Compete</span>
        </div>

        {/* Orbit Node 3: Connect (Bottom Left) */}
        <div className="absolute -bottom-1 left-2 sm:left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-400/40 shadow-lg shadow-cyan-950 backdrop-blur-md animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
          <div className="w-5 h-5 rounded-full bg-cyan-500/30 flex items-center justify-center text-cyan-300">
            <Users className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-bold text-cyan-200">Connect</span>
        </div>

        {/* Orbit Node 4: Earn (Bottom Right) */}
        <div className="absolute -bottom-1 right-2 sm:right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 shadow-lg shadow-emerald-950 backdrop-blur-md animate-bounce" style={{ animationDuration: '4.2s', animationDelay: '1.5s' }}>
          <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300">
            <Coins className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-bold text-emerald-200">Earn GP</span>
        </div>
      </div>

      {/* Floating Bottom Status Pill */}
      <div className="relative z-10 mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-slate-300 text-[10.5px] font-medium backdrop-blur-sm">
        <Sparkles className="w-3 h-3 text-cyan-400" />
        <span>Nigeria's Inter-Institutional Academic Arena</span>
      </div>
    </div>
  );
};
